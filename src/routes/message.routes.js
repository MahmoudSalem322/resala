const express = require("express");
const messageController = require("../controllers/message.controller");
const requireAuth = require("../middleware/require-auth");
const limits = require("../config/rate-limits");

const router = express.Router();

router.post("/", requireAuth, limits.message, messageController.createMessage);
router.get("/", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
}, requireAuth, messageController.listMessages);

router.delete("/:id", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
}, requireAuth, limits.deleteMessage, messageController.deleteMessage);

router.patch("/:id", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
}, requireAuth, limits.updateMessage, messageController.updateMessage);

module.exports = router;
