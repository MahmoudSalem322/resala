const messageService = require("../services/message.service");

async function createMessage(req, res) {
  const message = req.body?.message;
  const data = await messageService.createMessage({ name: req.user.name, userId: req.user.id, message });

  res.status(201).json({
    success: true,
    message: "تم حفظ رسالتك بنجاح",
    data,
  });
}

module.exports = { createMessage };
