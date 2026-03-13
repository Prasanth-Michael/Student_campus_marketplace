const express = require("express");

const {
  createOrder,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  createRazorpayOrder,
  verifyRazorpayPayment
} = require("../controllers/orderController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/mine", getMyOrders);
router.get("/:id", getOrderById);
router.post("/", createOrder);
router.patch("/:id/status", updateOrderStatus);
router.post("/:id/payment/create", createRazorpayOrder);
router.post("/:id/payment/verify", verifyRazorpayPayment);

module.exports = router;
