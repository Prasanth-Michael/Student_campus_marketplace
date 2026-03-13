const jwt = require("jsonwebtoken");

const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");

const getSocketUser = async (socket) => {
  const authToken =
    socket.handshake.auth?.token ||
    socket.handshake.headers.authorization?.replace("Bearer ", "");

  if (!authToken) {
    return null;
  }

  try {
    const decoded = jwt.verify(authToken, process.env.JWT_SECRET);
    return User.findById(decoded.id).select("_id name email avatarUrl roles");
  } catch (error) {
    return null;
  }
};

const initializeChatSocket = (io) => {
  io.use(async (socket, next) => {
    const user = await getSocketUser(socket);
    if (!user) {
      return next(new Error("Unauthorized socket connection"));
    }

    socket.user = user;
    next();
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.user._id.toString()}`);

    socket.on("conversation:join", async (conversationId) => {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return socket.emit("chat:error", { message: "Conversation not found" });
      }

      const isParticipant = conversation.participants.some(
        (participant) => participant.toString() === socket.user._id.toString()
      );

      if (!isParticipant) {
        return socket.emit("chat:error", { message: "Access denied to conversation" });
      }

      socket.join(`conversation:${conversationId}`);
    });

    socket.on("message:send", async (payload) => {
      try {
        const { conversationId, text, attachments = [] } = payload;

        if (!conversationId || !text) {
          return socket.emit("chat:error", { message: "conversationId and text are required" });
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          return socket.emit("chat:error", { message: "Conversation not found" });
        }

        const isParticipant = conversation.participants.some(
          (participant) => participant.toString() === socket.user._id.toString()
        );

        if (!isParticipant) {
          return socket.emit("chat:error", { message: "You are not part of this conversation" });
        }

        const message = await Message.create({
          conversation: conversationId,
          sender: socket.user._id,
          text,
          attachments,
          readBy: [socket.user._id]
        });

        conversation.lastMessage = text;
        conversation.lastMessageAt = new Date();
        await conversation.save();

        const populatedMessage = await Message.findById(message._id).populate(
          "sender",
          "name email avatarUrl"
        );

        io.to(`conversation:${conversationId}`).emit("message:new", {
          conversationId,
          message: populatedMessage
        });

        conversation.participants.forEach((participantId) => {
          io.to(`user:${participantId.toString()}`).emit("conversation:updated", {
            conversationId,
            lastMessage: text,
            lastMessageAt: conversation.lastMessageAt
          });
        });
      } catch (error) {
        socket.emit("chat:error", { message: error.message });
      }
    });

    socket.on("message:read", async ({ conversationId }) => {
      if (!conversationId) {
        return;
      }

      await Message.updateMany(
        {
          conversation: conversationId,
          readBy: { $ne: socket.user._id }
        },
        {
          $push: { readBy: socket.user._id }
        }
      );

      io.to(`conversation:${conversationId}`).emit("message:read", {
        conversationId,
        userId: socket.user._id
      });
    });
  });
};

module.exports = initializeChatSocket;
