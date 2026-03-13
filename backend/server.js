const http = require("http");
const path = require("path");

const cors = require("cors");
const dotenv = require("dotenv");
const express = require("express");
const morgan = require("morgan");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const chatRoutes = require("./routes/chatRoutes");
const orderRoutes = require("./routes/orderRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const initializeChatSocket = require("./sockets/chatSocket");

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);
const frontendPath = path.join(__dirname, "..", "frontend");
const PORT = process.env.PORT || 5000;

const allowedOrigins = new Set(
  [
    process.env.CLIENT_URL,
    `http://localhost:${PORT}`,
    `http://127.0.0.1:${PORT}`,
    "http://localhost:5500",
    "http://127.0.0.1:5500"
  ].filter(Boolean)
);

const isAllowedOrigin = (origin) => {
  return !origin || allowedOrigins.has(origin);
};

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Socket origin not allowed"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"]
  }
});

app.set("io", io);

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed"));
    },
    credentials: true
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(express.static(frontendPath));

app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    timestamp: new Date().toISOString()
  });
});

app.get("/api/config/client", (req, res) => {
  res.json({
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || ""
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/chat", chatRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(error.statusCode || 500).json({
    message: error.message || "Internal server error"
  });
});

initializeChatSocket(io);

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
