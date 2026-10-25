require("./env");

const secret = process.env.JWT_SECRET;
if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
  throw new Error("Set a strong JWT_SECRET of at least 32 bytes in the backend .env file.");
}

module.exports = {
  secret,
  algorithm: "HS256",
  expiresIn: 15 * 60,
  issuer: "fullstack-practice",
  audience: "fullstack-practice-web",
};
