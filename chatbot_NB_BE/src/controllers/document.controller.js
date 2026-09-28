const { validationResult } = require("express-validator");
const documentService = require("../services/document.services");

const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

exports.getAllDocuments = async (req, res) => {
    try {
        const documents = await documentService.getAllDocuments(req.user.employee_code);
        res.status(200).json({
            success: true,
            documents: documents,
        });
    } catch (error) {
        // 2. Xử lý lỗi nếu có
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.importDocx = async (req, res) => {
    try {
        // Kiểm tra file có tồn tại trong request không
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'Không có file nào được tải lên.' });
        }

        // uploaderId là optional, lấy từ req.user nếu có (ví dụ middleware xác thực đã gắn user)
        const uploaderId = req.user.employee_code;
        const files = req.files;

        // Gọi service xử lý import (đã nhận buffer, originalname, uploaderId)
        const result = await documentService.importDocx({
            files: files,
            uploaderId,
        });

        // Tính toán sơ bộ số lượng thành công (tùy chọn)
        const successCount = result.filter(r => r.status === 'success').length;
        const total = result.length;

        // Trả về response dạng tổng hợp
        return res.status(200).json({
            message: `Đã xử lý ${total} file. Thành công: ${successCount}/${total}`,
            data: result // Trả về mảng chi tiết: [{ fileName, status, documentId, ... }, ...]
        });
    } catch (err) {
        console.error(err);
        // Nếu service ném DuplicateContentError => trả 409 Conflict
        if (err && err.name === 'DuplicateContentError') {
            return res.status(409).json({ message: err.message, fileName: err.fileName, existingId: err.existingId });
        }
        return res.status(500).json({ message: err.message });
    }

};

exports.getAllTextsForTraining = async (req, res, next) => {
  try {
    // optional: require auth, e.g. admin only
    // if (!req.user || !req.user.isAdmin) return res.status(403).json({ error: 'Forbidden' });

    // optional query params: ?limit=100&offset=0
    const limit = req.query.limit ? Math.min(1000, parseInt(req.query.limit, 10)) : undefined;
    const offset = req.query.offset ? Math.max(0, parseInt(req.query.offset, 10)) : undefined;

    const result = await documentService.fetchAllTexts({ limit, offset });
    
    return res.json({ data: result });
  } catch (err) {
    next(err);
  }
};

exports.deleteDocumentById = async (req, res) => {
    const { id } = req.params;

    try {
        // 1. Gọi service để xóa document theo ID
        const result = await documentService.deleteDocumentById(id);
        res.status(200).json(result);
    } catch (error) {
        // 2. Xử lý lỗi nếu document không tồn tại hoặc không thể xóa
        res.status(404).json({ success: false, message: error.message });
    }
}


