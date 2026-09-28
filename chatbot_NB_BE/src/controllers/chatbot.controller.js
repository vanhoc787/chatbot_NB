const serviceModule = require("../services/chatbot.services");

const getChatGPTResponse =
  (serviceModule && serviceModule.getChatGPTResponse) ||
  (serviceModule && serviceModule.default) ||
  (typeof serviceModule === "function" ? serviceModule : null);

/**
 * Controller xử lý request từ client
 * Gọi service -> trả JSON response
 */
async function generateChatResponse(req, res) {
  try {
    if (!getChatGPTResponse || typeof getChatGPTResponse !== "function") {
      console.error("❌ [ChatbotController] Service function getChatGPTResponse is not available");
      return res.status(500).json({
        error: "service_unavailable",
        message: "Chatbot service is not available",
      });
    }

    const { prompt, model, options } = req.body || {};
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "prompt_required" });
    }

    const result = await getChatGPTResponse(prompt, model, options);

    // Normalize result to a text string
    let text = "";
    if (result == null) {
      text = "";
    } else if (typeof result === "string") {
      text = result;
    } else if (typeof result === "object" && "text" in result && typeof result.text === "string") {
      text = result.text;
    } else {
      // Fallback: stringify other types
      text = String(result);
    }

    return res.status(200).json({ text });
  } catch (error) {
    console.error("❌ [ChatbotController] Lỗi:", error);
    return res.status(500).json({
      error: "generation_failed",
      message: error && error.message ? error.message : "Gemini API error",
    });
  }
}

module.exports = { generateChatResponse };