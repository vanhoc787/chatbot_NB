const { OpenAI } = require("openai"); 
const documentService = require("./document.services");
const { OpenAIEmbeddings } = require('./embeddings.langchain');
const vectorstore = require('./vectorstore.pg');

// 2. Khởi tạo OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const getNoAnswerInstruction = `\n\nIMPORTANT: Prioritize answering using the provided documents. If the documents contain the answer, respond based solely on them. Citation Rules:You MUST place the citation on a separate, new line at the very END of your response. Use the exact format: \n[Thông tin này được trích từ tài liệu: <file_name>].  Missing Information: If the documents are missing information or insufficient to provide a complete answer, you may supplement with your own knowledge, however, you MUST explicitly state the following phrase before providing any external information: 'Thông tin này không có hoặc không đầy đủ trong tài liệu được cung cấp, tôi đang bổ sung dựa trên kiến thức bên ngoài:'. Do not fabricate facts that contradict the provided context. Ensure that the file names cited match the uploaded files exactly.`;

const formatDocs = (docs, separator = "\n\n---\n\n") => {
  // Hàm helper để làm sạch text (dùng chung cho cả Header và Body)
  const cleanText = (text) => {
    return (text || "")
      .replace(/\n\s*\n/g, '\n') // Thay thế nhiều dòng trống liên tiếp bằng 1 dòng
      .replace(/[ \t]+/g, ' ')    // Thay thế nhiều khoảng trắng/tab bằng 1 space
      .trim();
  };

  return docs.map((d, index) => {
    // 1. Lấy tiêu đề
    const title = d.title || d.document_name || `doc:${d.id || 'unknown'}`;

    // 2. Lấy nội dung Header (Bối cảnh chung) và Chunk (Chi tiết tìm thấy)
    const headerInfo = cleanText(d.header_content); 
    const specificChunk = cleanText(d.text);

    return `
      === ${title} ===

      [PHẦN 1: BỐI CẢNH & THÔNG TIN CHUNG CỦA TÀI LIỆU]
      (Phần này chứa thông tin tiêu đề, ngày tháng, các bên liên quan để xác định ngữ cảnh)
      ${headerInfo || "Không có thông tin bối cảnh."}

      [PHẦN 2: ĐOẠN TRÍCH DẪN CHI TIẾT TÌM THẤY]
      (Phần này là nội dung cụ thể liên quan trực tiếp đến câu hỏi)
      ${specificChunk}
      ============================================
    `;
  }).join(separator);
};

/**
 * Gọi API ChatGPT để sinh câu trả lời
 */
async function getChatGPTResponse(prompt, model = process.env.CHATGPT_MODEL || "gpt-4o-mini", options = {}) {
  // 3. Kiểm tra API Key của OpenAI
  if (!process.env.OPENAI_API_KEY) throw new Error("Thiếu OPENAI_API_KEY trong .env");

  let systemContent = "You are a helpful assistant."; // System prompt mặc định
  const docCtx = options?.documentContext;

  if (docCtx?.enabled) {
    let docs = [];
    const k = 5;
    
    try {
      const embedder = new OpenAIEmbeddings();
      const qEmbedding = await embedder.embedQuery(prompt);
      docs = await vectorstore.searchByEmbedding(qEmbedding, k);
    } catch (e) {
      console.error('[OpenAIService] Vector search failed, falling back', e);
    }

    if (!docs || docs.length === 0) {
      throw new Error("Lỗi trong quá trình Embeddings hoặc không tìm thấy tài liệu liên quan!");
    }

    let combined = formatDocs(docs);
    if (docCtx.maxChars && combined.length > docCtx.maxChars) {
      combined = combined.slice(0, docCtx.maxChars) + "\n\n[TRUNCATED]";
    }
    console.log("📥 [training text]:", combined);

    // 4. OpenAI hỗ trợ vai trò "system" riêng biệt, rất sạch sẽ
    systemContent = `You are provided the following documents (used as context). Use them to answer the user's prompt where relevant.\n\n${combined}${getNoAnswerInstruction}`;
  }

  // console.log("📥 [Input Prompt]:", JSON.stringify(prompt));
  // console.log(`[DEBUG DEVICE] Length: ${prompt.length}`);
  // console.log("📥 [training text]:", JSON.stringify(combined));

  try {
    // 5. Cấu trúc gọi API của OpenAI (Chat Completion)
    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      seed: 123,
      max_completion_tokens: options?.maxOutputTokens ?? 4096, 
    });;
    console.log("000000000000000000000", response);

    const text = response.choices[0]?.message?.content || "";
    
    console.log("✅ [OpenAIService] Trả về:", text);
    return text;

  } catch (error) {
    console.error("❌ [OpenAIService] Lỗi gọi OpenAI API:", error);
    throw error;
  }
}

module.exports = { getChatGPTResponse };