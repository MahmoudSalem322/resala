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

module.exports = { createMessage };
