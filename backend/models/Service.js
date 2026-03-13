const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      required: true,
      trim: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    deliveryTime: {
      type: String,
      trim: true
    },
    location: {
      type: String,
      trim: true
    },
    tags: {
      type: [String],
      default: []
    },
    images: {
      type: [String],
      default: []
    },
    status: {
      type: String,
      enum: ["draft", "active", "paused", "archived"],
      default: "active"
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    averageRating: {
      type: Number,
      default: 0
    },
    totalReviews: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

serviceSchema.index({ title: "text", description: "text", category: "text", tags: "text" });

module.exports = mongoose.model("Service", serviceSchema);
