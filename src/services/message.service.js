const messageRepository = require("../repositories/message.repository");

function validateMessage(message) {
  if (typeof message !== "string" || !message.trim() || message.trim().length > 5000) {
    const error = new Error("Invalid message");
    error.status = 400;
    error.publicMessage = "اكتب رسالة بين حرف واحد و5000 حرف.";
    throw error;
  }
  return message.trim();
}

async function createMessage({ name, userId, message }) {
  return messageRepository.createMessage({ name, userId, message: validateMessage(message) });
}

async function listMessages(userId) {
  return messageRepository.listMessages(userId);
}

function parseMessageId(id) {
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) > 2147483647) {
    const error = new Error("Invalid message ID");
    error.status = 400;
    error.publicMessage = "رقم الرسالة غير صالح.";
    throw error;
  }
  return Number(id);
}

async function deleteMessage({ id, userId }) {
  const deleted = await messageRepository.deleteMessage({ id: parseMessageId(id), userId });
  if (!deleted) {
    const error = new Error("Message not found");
    error.status = 404;
    error.publicMessage = "الرسالة غير موجودة.";
    throw error;
  }
}

async function updateMessage({ id, userId, message }) {
  const messageId = parseMessageId(id);
  const data = await messageRepository.updateMessage({ id: messageId, userId, message: validateMessage(message) });
  if (!data) {
    const error = new Error("Message not found");
    error.status = 404;
    error.publicMessage = "الرسالة غير موجودة.";
    throw error;
  }
  return data;
}

module.exports = { createMessage, listMessages, deleteMessage, updateMessage };
