const crypto = require("crypto");

const Conversation = require("../models/Conversation");
const Order = require("../models/Order");
const Service = require("../models/Service");
const getRazorpayInstance = require("../../payment/razorpay");

const getAuthorizedOrder = async (orderId, user) => {
  const order = await Order.findById(orderId)
    .populate("service", "title category price")
    .populate("buyer", "name email avatarUrl")
    .populate("provider", "name email avatarUrl");

  if (!order) {
    return { error: { status: 404, message: "Order not found" } };
  }

  const userId = user._id.toString();
  const isParticipant =
    order.buyer._id.toString() === userId || order.provider._id.toString() === userId;
  const isAdmin = user.roles.includes("admin");

  if (!isParticipant && !isAdmin) {
    return { error: { status: 403, message: "Not allowed to access this order" } };
  }

  return { order };
};

const createOrder = async (req, res) => {
  try {
    const { serviceId, requirements, campusLocation, scheduledFor } = req.body;

    if (!serviceId) {
      return res.status(400).json({ message: "serviceId is required" });
    }

    const service = await Service.findById(serviceId).populate("provider", "name email");
    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    if (service.status !== "active") {
      return res.status(400).json({ message: "This service is not available for booking" });
    }

    if (service.provider._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot place an order on your own service" });
    }

    const order = await Order.create({
      service: service._id,
      buyer: req.user._id,
      provider: service.provider._id,
      requirements,
      campusLocation,
      scheduledFor,
      quotedPrice: service.price,
      totalAmount: service.price
    });

    await Conversation.findOneAndUpdate(
      {
        order: order._id
      },
      {
        $setOnInsert: {
          participants: [req.user._id, service.provider._id],
          service: service._id,
          order: order._id
        }
      },
      {
        new: true,
        upsert: true
      }
    );

    const populatedOrder = await Order.findById(order._id)
      .populate("service", "title category price")
      .populate("buyer", "name email avatarUrl")
      .populate("provider", "name email avatarUrl");

    res.status(201).json({
      message: "Order created successfully",
      order: populatedOrder
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const { type = "all", status } = req.query;
    const filter = {};

    if (type === "buyer") {
      filter.buyer = req.user._id;
    } else if (type === "provider") {
      filter.provider = req.user._id;
    } else {
      filter.$or = [{ buyer: req.user._id }, { provider: req.user._id }];
    }

    if (status) {
      filter.status = status;
    }

    const orders = await Order.find(filter)
      .populate("service", "title category price")
      .populate("buyer", "name email avatarUrl")
      .populate("provider", "name email avatarUrl")
      .sort({ createdAt: -1 });

    res.json({ count: orders.length, orders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getOrderById = async (req, res) => {
  try {
    const result = await getAuthorizedOrder(req.params.id, req.user);
    if (result.error) {
      return res.status(result.error.status).json({ message: result.error.message });
    }

    res.json({ order: result.order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "status is required" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const userId = req.user._id.toString();
    const isBuyer = order.buyer.toString() === userId;
    const isProvider = order.provider.toString() === userId;
    const isAdmin = req.user.roles.includes("admin");

    const allowedStatusMap = {
      accepted: isProvider || isAdmin,
      in_progress: isProvider || isAdmin,
      completed: isProvider || isBuyer || isAdmin,
      cancelled: isBuyer || isProvider || isAdmin,
      disputed: isBuyer || isProvider || isAdmin
    };

    if (!allowedStatusMap[status]) {
      return res.status(403).json({ message: "You cannot update this order to the requested status" });
    }

    order.status = status;
    await order.save();

    const populatedOrder = await Order.findById(order._id)
      .populate("service", "title category price")
      .populate("buyer", "name email avatarUrl")
      .populate("provider", "name email avatarUrl");

    res.json({
      message: "Order status updated successfully",
      order: populatedOrder
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createRazorpayOrder = async (req, res) => {
  try {
    const razorpay = getRazorpayInstance();
    if (!razorpay) {
      return res.status(500).json({ message: "Razorpay is not configured" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const isBuyer = order.buyer.toString() === req.user._id.toString();
    const isAdmin = req.user.roles.includes("admin");

    if (!isBuyer && !isAdmin) {
      return res.status(403).json({ message: "Only the buyer can initiate payment" });
    }

    const paymentOrder = await razorpay.orders.create({
      amount: Math.round(order.totalAmount * 100),
      currency: "INR",
      receipt: `receipt_${order._id.toString().slice(-10)}`,
      notes: {
        orderId: order._id.toString(),
        serviceId: order.service.toString()
      }
    });

    order.razorpayOrderId = paymentOrder.id;
    order.paymentStatus = "created";
    await order.save();

    res.json({
      message: "Razorpay order created successfully",
      paymentOrder
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const verifyRazorpayPayment = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ message: "Payment verification fields are required" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const isBuyer = order.buyer.toString() === req.user._id.toString();
    const isAdmin = req.user.roles.includes("admin");

    if (!isBuyer && !isAdmin) {
      return res.status(403).json({ message: "Only the buyer can verify payment" });
    }

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (order.razorpayOrderId && order.razorpayOrderId !== razorpayOrderId) {
      order.paymentStatus = "failed";
      await order.save();
      return res.status(400).json({ message: "Payment order mismatch" });
    }

    if (generatedSignature !== razorpaySignature) {
      order.paymentStatus = "failed";
      await order.save();
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    order.razorpayOrderId = razorpayOrderId;
    order.razorpayPaymentId = razorpayPaymentId;
    order.razorpaySignature = razorpaySignature;
    order.paymentStatus = "paid";
    await order.save();

    res.json({
      message: "Payment verified successfully",
      order
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  createRazorpayOrder,
  verifyRazorpayPayment
};
