const Review = require("../models/Review");
const Order = require("../models/Order");
const Service = require("../models/Service");
const User = require("../models/User");

const recalculateRatings = async (serviceId, providerId) => {
  const reviews = await Review.find({ service: serviceId });
  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = reviews.length ? totalRating / reviews.length : 0;

  await Service.findByIdAndUpdate(serviceId, {
    averageRating,
    totalReviews: reviews.length
  });

  const providerReviews = await Review.find({ provider: providerId });
  const providerTotalRating = providerReviews.reduce((sum, review) => sum + review.rating, 0);
  const providerAverageRating = providerReviews.length ? providerTotalRating / providerReviews.length : 0;

  await User.findByIdAndUpdate(providerId, {
    averageRating: providerAverageRating,
    totalReviews: providerReviews.length
  });
};

const createReview = async (req, res) => {
  try {
    const { orderId, rating, comment } = req.body;

    if (!orderId || !rating) {
      return res.status(400).json({ message: "orderId and rating are required" });
    }

    const order = await Order.findById(orderId).populate("service");
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.buyer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the buyer can submit a review" });
    }

    if (order.status !== "completed") {
      return res.status(400).json({ message: "A review can only be added after the order is completed" });
    }

    const existingReview = await Review.findOne({ order: orderId });
    if (existingReview) {
      return res.status(409).json({ message: "This order has already been reviewed" });
    }

    const review = await Review.create({
      order: orderId,
      service: order.service._id,
      reviewer: req.user._id,
      provider: order.provider,
      rating,
      comment
    });

    await recalculateRatings(order.service._id, order.provider);

    const populatedReview = await Review.findById(review._id)
      .populate("reviewer", "name avatarUrl")
      .populate("provider", "name avatarUrl");

    res.status(201).json({
      message: "Review submitted successfully",
      review: populatedReview
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getServiceReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ service: req.params.serviceId })
      .populate("reviewer", "name avatarUrl department")
      .sort({ createdAt: -1 });

    res.json({ count: reviews.length, reviews });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProviderReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ provider: req.params.providerId })
      .populate("reviewer", "name avatarUrl department")
      .populate("service", "title category")
      .sort({ createdAt: -1 });

    res.json({ count: reviews.length, reviews });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createReview,
  getServiceReviews,
  getProviderReviews
};
