const express = require("express");
const cors = require("cors");
const messageRoutes = require("./routes/message.routes");
const authRoutes = require("./routes/auth.routes");
const errorHandler = require("./middleware/error-handler");

const app = express();

app.use(cors({
  origin: "http://localhost:3001",
  credentials: true,
  exposedHeaders: ["Retry-After", "RateLimit", "RateLimit-Policy"],
}));
// Cookies are sent automatically, so reject writes from other browser origins.
app.use((req, res, next) => {
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      ((req.get("Origin") && req.get("Origin") !== "http://localhost:3001") ||
       req.get("Sec-Fetch-Site") === "cross-site")) {
    return res.status(403).json({ success: false, message: "مصدر الطلب غير مسموح." });
  }
  next();
});
app.use(express.json());

app.use("/api/messages", messageRoutes);
app.use("/api/auth", authRoutes);
app.use(errorHandler);

module.exports = app;
