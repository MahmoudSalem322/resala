const jwt = require("jsonwebtoken");
const config = require("../config/jwt");

function createAccessToken(userId) {
  return jwt.sign({}, config.secret, {
    algorithm: config.algorithm,
    subject: String(userId),
    expiresIn: config.expiresIn,
    issuer: config.issuer,
    audience: config.audience,
  });
}

module.exports = { createAccessToken };
