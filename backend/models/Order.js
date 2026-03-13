const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    requirements: {
      type: String,
      trim: true
    },
    campusLocation: {
      type: String,
      trim: true
    },
    scheduledFor: {
      type: Date
    },
    quotedPrice: {
      type: Number,
      required: true,
      min: 0
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "in_progress", "completed", "cancelled", "disputed"],
      default: "pending"
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "created", "paid", "failed", "refunded"],
      default: "unpaid"
    },
    razorpayOrderId: {
      type: String,
      trim: true
    },
    razorpayPaymentId: {
      type: String,
      trim: true
    },
    razorpaySignature: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Order", orderSchema);
