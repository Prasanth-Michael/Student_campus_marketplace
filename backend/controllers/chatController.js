const mongoose = require("mongoose");

const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

const isParticipant = (conversation, userId) => {
  return conversation.participants.some((participant) => participant.toString() === userId.toString());
};

const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id
    })
      .populate("participants", "name email avatarUrl roles")
      .populate("service", "title category")
      .populate("order", "status totalAmount")
      .sort({ lastMessageAt: -1, updatedAt: -1 });

    res.json({ count: conversations.length, conversations });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createOrGetConversation = async (req, res) => {
  try {
    const { participantId, serviceId, orderId } = req.body;

    if (!participantId) {
      return res.status(400).json({ message: "participantId is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(participantId)) {
      return res.status(400).json({ message: "Invalid participantId" });
    }

    if (participantId === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot create a conversation with yourself" });
    }

    const participantIds = [req.user._id.toString(), participantId].sort();

    const existingConversation = await Conversation.findOne({
      participants: { $all: participantIds, $size: 2 },
      ...(serviceId ? { service: serviceId } : {}),
      ...(orderId ? { order: orderId } : {})
    })
      .populate("participants", "name email avatarUrl roles")
      .populate("service", "title category")
      .populate("order", "status totalAmount");

    if (existingConversation) {
      return res.json({
        message: "Conversation fetched successfully",
        conversation: existingConversation
      });
    }

    const conversation = await Conversation.create({
      participants: participantIds,
      service: serviceId || undefined,
      order: orderId || undefined
    });

    const populatedConversation = await Conversation.findById(conversation._id)
      .populate("participants", "name email avatarUrl roles")
      .populate("service", "title category")
      .populate("order", "status totalAmount");

    res.status(201).json({
      message: "Conversation created successfully",
      conversation: populatedConversation
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMessages = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (!isParticipant(conversation, req.user._id)) {
      return res.status(403).json({ message: "You are not part of this conversation" });
    }

    const messages = await Message.find({
      conversation: req.params.conversationId
    })
      .populate("sender", "name email avatarUrl")
      .sort({ createdAt: 1 });

    res.json({ count: messages.length, messages });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { conversationId, text, attachments } = req.body;

    if (!conversationId || !text) {
      return res.status(400).json({ message: "conversationId and text are required" });
    }

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (!isParticipant(conversation, req.user._id)) {
      return res.status(403).json({ message: "You are not part of this conversation" });
    }

    const message = await Message.create({
      conversation: conversationId,
      sender: req.user._id,
      text,
      attachments: Array.isArray(attachments) ? attachments : [],
      readBy: [req.user._id]
    });

    conversation.lastMessage = text;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    const populatedMessage = await Message.findById(message._id).populate(
      "sender",
      "name email avatarUrl"
    );

    const io = req.app.get("io");
    conversation.participants.forEach((participantId) => {
      io.to(`user:${participantId.toString()}`).emit("message:new", {
        conversationId: conversation._id,
        message: populatedMessage
      });
    });

    res.status(201).json({
      message: "Message sent successfully",
      messageItem: populatedMessage
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getConversations,
  createOrGetConversation,
  getMessages,
  sendMessage
};
