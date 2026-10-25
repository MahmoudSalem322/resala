const express = require("express");
const cors = require("cors");
const messageRoutes = require("./routes/message.routes");
const authRoutes = require("./routes/auth.routes");
const errorHandler = require("./middleware/error-handler");

const app = express();

app.use(cors({
  origin: "http://localhost:3001",
}));
app.use(express.json());

app.use("/api/messages", messageRoutes);
app.use("/api/auth", authRoutes);
app.use(errorHandler);

module.exports = app;
