const express = require("express");

const {
  getConversations,
  createOrGetConversation,
  getMessages,
  sendMessage
} = require("../controllers/chatController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/conversations", getConversations);
router.post("/conversations", createOrGetConversation);
router.get("/conversations/:conversationId/messages", getMessages);
router.post("/messages", sendMessage);

module.exports = router;
