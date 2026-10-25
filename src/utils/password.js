const { randomBytes, scrypt, timingSafeEqual } = require("node:crypto");
const { promisify } = require("node:util");

const scryptAsync = promisify(scrypt);
const options = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
// A dummy hash keeps the expensive password check even when no account exists.
const DUMMY_PASSWORD_HASH = `scrypt$${options.N}$${options.r}$${options.p}$${"0".repeat(32)}$${"0".repeat(128)}`;

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await scryptAsync(password, salt, 64, options);

  // Store the algorithm, parameters and salt alongside the derived key.
  return `scrypt$${options.N}$${options.r}$${options.p}$${salt}$${key.toString("hex")}`;
}

async function verifyPassword(password, storedHash) {
  const parts = typeof storedHash === "string" ? storedHash.split("$") : [];
  const [algorithm, n, r, p, salt, hash] = parts;
  if (
    parts.length !== 6 || algorithm !== "scrypt" ||
    n !== String(options.N) || r !== String(options.r) || p !== String(options.p) ||
    !/^[a-f0-9]{32}$/.test(salt) || !/^[a-f0-9]{128}$/.test(hash)
  ) {
    const error = new Error("Invalid stored password hash format.");
    error.code = "INVALID_PASSWORD_HASH";
    throw error;
  }

  const key = await scryptAsync(password, salt, 64, options);
  return timingSafeEqual(key, Buffer.from(hash, "hex"));
}

module.exports = { hashPassword, verifyPassword, DUMMY_PASSWORD_HASH };
