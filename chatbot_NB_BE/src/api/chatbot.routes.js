const express = require("express");
const router = express.Router();
const { generateChatResponse } = require("../controllers/chatbot.controller");

// POST /api/chatbot/generate
router.post("/generate", generateChatResponse);

module.exports = router;