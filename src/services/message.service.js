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

async function listMessages(userId, query = {}) {
  function integer(value, fallback, maximum) {
    if (value === undefined) return fallback;
    if (typeof value !== "string" || !/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) > maximum) return null;
    return Number(value);
  }
  const page = integer(query.page, 1, 1000000);
  const limit = integer(query.limit, 12, 50);
  const sort = query.sort === undefined ? "newest" : query.sort;
  const search = query.q === undefined ? "" : query.q;
  if (page === null || limit === null || !["newest", "oldest"].includes(sort) || typeof search !== "string" || search.trim().length > 200) {
    const error = new Error("Invalid message list parameters");
    error.status = 400;
    error.publicMessage = "تحقق من رقم الصفحة وحد العرض والترتيب. البحث بحد أقصى 200 حرف.";
    throw error;
  }
  return messageRepository.listMessages({ userId, page, limit, sort, search: search.trim() });
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
