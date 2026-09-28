const AppDataSource = require("../config/dataSource");
const bcrypt = require("bcrypt");
const { Not } = require("typeorm");
const path = require('path');
const { saveFileLocal, sha256, extractTextFromDocx, chunkTextSimple } = require('../utils/fileHelpers');
const { OpenAIEmbeddings } = require('./embeddings.langchain');
const vectorstore = require('./vectorstore.pg');

// Normalize filename encoding
function normalizeFilename(name) {
    if (!name) return name;
    try {
        const base = path.basename(String(name));
        return Buffer.from(base, 'latin1').toString('utf8');
    } catch (e) {
        return name;
    }
}

exports.getAllDocuments = async (user_employee_code) => {
    const documentRepository = AppDataSource.getRepository("Documents");
    return await documentRepository.find({
        where: { user_id: user_employee_code },
        order: { create_time: "DESC" }
    });
};

/**
 * Hàm nội bộ: Xử lý logic cho 1 file duy nhất.
 * (Được tách ra từ hàm importDocx cũ để tái sử dụng trong vòng lặp)
 */
const _processSingleFile = async (file, uploaderId) => {
    const { buffer, originalname } = file;
    
    const contentHash = sha256(buffer);
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();

    try {
        // 1. Check trùng lặp
        const existing = await queryRunner.manager.findOne('Documents', { where: { content_hash: contentHash } });
        if (existing) {
            return { 
                fileName: originalname,
                status: 'skipped', 
                reason: 'Duplicate content',
                documentId: existing.id 
            };
        }

        // 2. Lưu file local & Extract text
        const savedFile = await saveFileLocal(buffer, originalname);
        const rawText = await extractTextFromDocx(buffer);
        const cleaned = rawText.replace(/\r\n/g, '\n').replace(/\n{2,}/g, '\n\n').trim();

        // 3. Chunking
        const chunks = chunkTextSimple(cleaned, 2000, 200);

        // 4. Transaction lưu DB
        await queryRunner.startTransaction();
        const docRepo = queryRunner.manager.getRepository('Documents');
        const chunkRepo = queryRunner.manager.getRepository('DocumentChunk');

        const safeTitle = normalizeFilename(originalname);
        const docEntity = docRepo.create({
            title: safeTitle,
            file_path: savedFile.relPath,
            file_size: savedFile.size,
            content_hash: contentHash,
            full_text: cleaned,
            header_content: cleaned ? String(cleaned).substring(0, 250) : null,
            user_id: uploaderId
        });

        const savedDoc = await docRepo.save(docEntity);

        for (let i = 0; i < chunks.length; i++) {
            const c = chunks[i];
            const chunkEntity = chunkRepo.create({
                document: savedDoc,
                chunk_index: i,
                text: c.text,
                start_char: c.start,
                end_char: c.end,
                tokens_est: c.tokens
            });
            await chunkRepo.save(chunkEntity);
        }

        await queryRunner.commitTransaction();

        // 5. Embeddings & Vector Store (Thực hiện sau khi commit DB thành công)
        try {
            const savedChunks = await chunkRepo.find({ where: { document: savedDoc }, order: { chunk_index: 'ASC' } });
            if (savedChunks && savedChunks.length) {
                const embedder = new OpenAIEmbeddings();
                const texts = savedChunks.map(c => c.text || '');
                const embeddings = await embedder.embedDocuments(texts);
                
                for (let j = 0; j < savedChunks.length; j++) {
                    const sc = savedChunks[j];
                    const emb = embeddings[j];
                    await vectorstore.upsertEmbedding({
                        chunk_id: sc.id,
                        document_id: savedDoc.id,
                        document_name: savedDoc.title || null,
                        text: sc.text,
                        embedding: emb
                    });
                }
            }
        } catch (e) {
            console.error(`Embedding failed for file ${originalname}`, e);
            // Không throw lỗi ở đây để tránh báo lỗi cho user nếu DB đã lưu thành công
        }

        return { 
            fileName: originalname, 
            status: 'success', 
            documentId: savedDoc.id 
        };

    } catch (err) {
        if (queryRunner.isTransactionActive) {
            await queryRunner.rollbackTransaction();
        }
        console.error(`Error processing file ${originalname}:`, err);
        return { 
            fileName: originalname, 
            status: 'error', 
            error: err.message 
        };
    } finally {
        await queryRunner.release();
    }
};

/**
 * UPDATED: Hàm chính xử lý import nhiều file
 * Input: { files: Array<MulterFile>, uploaderId: string }
 */
exports.importDocx = async ({ files, uploaderId }) => {
    // Ensure DataSource initialized
    if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
    }

    if (!files || files.length === 0) {
        throw new Error("Không có file nào được tải lên.");
    }

    const results = [];

    // [Loop] Xử lý tuần tự từng file để đảm bảo an toàn transaction và tránh quá tải rate limit của OpenAI
    for (const file of files) {
        const result = await _processSingleFile(file, uploaderId);
        results.push(result);
    }

    return results; 
};

exports.fetchAllTexts = async (opts = {}) => {
    if (!AppDataSource.isInitialized) await AppDataSource.initialize();
    const limit = opts.limit ? Math.min(1000, parseInt(opts.limit, 10)) : null;
    const offset = opts.offset ? Math.max(0, parseInt(opts.offset, 10)) : null;

    const params = [];
    let sql = `
        SELECT
        d.id,
        d.title,
        d.full_text,
        COALESCE(
            string_agg(c.text, ' ' ORDER BY c.chunk_index),
            d.full_text,
            ''
        ) AS combined_text,
        d.create_time
        FROM "Documents" d
        LEFT JOIN "DocumentChunk" c ON c."documentId" = d.id
    `;

    sql += ` GROUP BY d.id`;
    sql += ` ORDER BY d.create_time ASC`;

    if (limit) {
        sql += ` LIMIT $${params.length + 1}`;
        params.push(limit);
    }
    if (offset) {
        sql += ` OFFSET $${params.length + 1}`;
        params.push(offset);
    }

    const raw = await AppDataSource.query(sql, params);
    return raw.map(r => ({
        id: r.id,
        title: r.title || null,
        text: r.combined_text || '',
        created_at: r.created_time
    }));
};

exports.deleteDocumentById = async (id) => {
    const documentRepository = AppDataSource.getRepository("Documents");
    const conver = await documentRepository.findOne({
        where: { id: id },
    });

    if (!conver) {
        throw new Error("file không tồn tại.");
    }

    await documentRepository.remove(conver);
    return { success: true, message: "Xóa file thành công." };
};