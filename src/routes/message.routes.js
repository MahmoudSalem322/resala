const express = require("express");
const messageController = require("../controllers/message.controller");
const requireAuth = require("../middleware/require-auth");

const router = express.Router();

router.post("/", requireAuth, messageController.createMessage);

module.exports = router;
