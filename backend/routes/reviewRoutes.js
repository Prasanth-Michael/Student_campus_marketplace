const express = require("express");

const {
  createReview,
  getServiceReviews,
  getProviderReviews
} = require("../controllers/reviewController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/service/:serviceId", getServiceReviews);
router.get("/provider/:providerId", getProviderReviews);
router.post("/", protect, createReview);

module.exports = router;
