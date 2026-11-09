const express = require("express");
const cors = require("cors");
const messageRoutes = require("./routes/message.routes");
const authRoutes = require("./routes/auth.routes");
const errorHandler = require("./middleware/error-handler");

const app = express();
const pool = require('./config/db');
const { frontendOrigin } = require('./config/google');
const allowedOrigins = new Set([frontendOrigin()]);
if (process.env.NODE_ENV !== 'production') allowedOrigins.add('http://localhost:3001');
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

app.get('/health', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try { await pool.query('SELECT 1'); res.json({ status: 'ok' }); }
  catch { res.status(503).json({ status: 'unavailable' }); }
});

app.use(cors({
  origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)),
  credentials: true,
  exposedHeaders: ["Retry-After", "RateLimit", "RateLimit-Policy"],
}));
// Cookies are sent automatically, so reject writes from other browser origins.
app.use((req, res, next) => {
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      ((req.get("Origin") && !allowedOrigins.has(req.get("Origin"))) ||
       (req.get("Sec-Fetch-Site") === "cross-site" && !allowedOrigins.has(req.get("Origin"))))) {
    return res.status(403).json({ success: false, message: "مصدر الطلب غير مسموح." });
  }
  next();
});
app.use(express.json());

app.use("/api/messages", messageRoutes);
app.use("/api/auth", authRoutes);
app.use(errorHandler);

module.exports = app;
