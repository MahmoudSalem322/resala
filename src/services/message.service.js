const messageRepository = require("../repositories/message.repository");

async function createMessage({ name, userId, message }) {
  if (typeof message !== "string" || !message.trim() || message.trim().length > 5000) {
    const error = new Error("Invalid message");
    error.status = 400;
    error.publicMessage = "اكتب رسالة بين حرف واحد و5000 حرف.";
    throw error;
  }
  return messageRepository.createMessage({ name, userId, message: message.trim() });
}

async function listMessages(userId) {
  return messageRepository.listMessages(userId);
}

async function deleteMessage({ id, userId }) {
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) > 2147483647) {
    const error = new Error("Invalid message ID");
    error.status = 400;
    error.publicMessage = "رقم الرسالة غير صالح.";
    throw error;
  }
  const deleted = await messageRepository.deleteMessage({ id: Number(id), userId });
  if (!deleted) {
    const error = new Error("Message not found");
    error.status = 404;
    error.publicMessage = "الرسالة غير موجودة.";
    throw error;
  }
}

module.exports = { createMessage, listMessages, deleteMessage };
