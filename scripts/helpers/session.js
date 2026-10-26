const sessions = require("../../src/repositories/session.repository");
const { createAccessToken, createRefreshToken, hashRefreshToken } = require("../../src/utils/token");

async function createTestAccessToken(userId) {
  const refresh = createRefreshToken();
  const session = await sessions.createSession(userId, hashRefreshToken(refresh));
  return createAccessToken(userId, session.id);
}

module.exports = { createTestAccessToken };
