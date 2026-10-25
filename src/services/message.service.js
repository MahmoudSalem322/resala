const messageRepository = require("../repositories/message.repository");

async function createMessage({ name, message }) {
  return messageRepository.createMessage({ name, message });
}

module.exports = { createMessage };
