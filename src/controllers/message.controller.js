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

async function listMessages(req, res) {
  const data = await messageService.listMessages(req.user.id);
  res.json({ success: true, data });
}

async function deleteMessage(req, res) {
  await messageService.deleteMessage({ id: req.params.id, userId: req.user.id });
  res.status(204).end();
}

module.exports = { createMessage, listMessages, deleteMessage };
