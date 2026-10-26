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
  const { data, pagination } = await messageService.listMessages(req.user.id, req.query);
  res.json({ success: true, data, pagination });
}

async function deleteMessage(req, res) {
  await messageService.deleteMessage({ id: req.params.id, userId: req.user.id });
  res.status(204).end();
}

async function updateMessage(req, res) {
  const data = await messageService.updateMessage({ id: req.params.id, userId: req.user.id, message: req.body?.message });
  res.json({ success: true, message: "تم تعديل الرسالة.", data });
}

module.exports = { createMessage, listMessages, deleteMessage, updateMessage };
