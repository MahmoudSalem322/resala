const jwt = require("jsonwebtoken");
const config = require("../config/jwt");
const { randomBytes, createHash } = require("node:crypto");

function createAccessToken(userId, sessionId, expiresIn = config.expiresIn) {
  if (!sessionId) throw new Error("An access token must belong to a session.");
  return jwt.sign({ sid: sessionId }, config.secret, {
    algorithm: config.algorithm,
    subject: String(userId),
    expiresIn,
    issuer: config.issuer,
    audience: config.audience,
  });
}

function createRefreshToken() { return randomBytes(48).toString("base64url"); }
function hashRefreshToken(token) {
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{64}$/.test(token)) return null;
  return createHash("sha256").update(token).digest("hex");
}

module.exports = { createAccessToken, createRefreshToken, hashRefreshToken };
