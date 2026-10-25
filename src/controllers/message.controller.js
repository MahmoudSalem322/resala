const messageService = require("../services/message.service");

async function createMessage(req, res) {
  const { name, message } = req.body;
  const data = await messageService.createMessage({ name, message });

  res.status(201).json({
    success: true,
    message: "تم حفظ رسالتك بنجاح",
    data,
  });
}

module.exports = { createMessage };
