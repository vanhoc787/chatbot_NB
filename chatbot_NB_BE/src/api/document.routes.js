const express = require("express");
const router = express.Router();
const multer = require('multer');
const { body } = require("express-validator");
const authorize  = require("../middleware/auth.middleware").authorize;
const protect = require("../middleware/auth.middleware").protect;
const documentController = require("../controllers/document.controller");

const upload = multer({
  storage: multer.memoryStorage(),           // giữ file trong bộ nhớ (buffer) — phù hợp cho xử lý nhanh, nhỏ
  limits: { fileSize: 50 * 1024 * 1024 },   // giới hạn 50MB
});

router.get(
    "/",
    protect, // 1. Yêu cầu đăng nhập
    documentController.getAllDocuments // 3. Xử lý logic
);

router.post(
    "/import-docx",
    upload.array('files', 10),
    protect, // 1. Yêu cầu đăng nhập
    documentController.importDocx // 4. Xử lý logic
);

router.get(
    '/getAllTexts',
    protect, // 1. Yêu cầu đăng nhập
    documentController.getAllTextsForTraining
);

router.delete(
    "/:id",
    protect, // 1. Yêu cầu đăng nhập
    documentController.deleteDocumentById // 3. Xử lý logic
);

module.exports = router;