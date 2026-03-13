const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
      }
    ],
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service"
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order"
    },
    lastMessage: {
      type: String,
      trim: true
    },
    lastMessageAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

conversationSchema.index({ participants: 1 });

module.exports = mongoose.model("Conversation", conversationSchema);
