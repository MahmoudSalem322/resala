const { createHash } = require("node:crypto");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

const MINUTE = 60 * 1000;

// Each limiter owns its MemoryStore. Counts are local to this server process.
// Window overrides are only for the bounded test harness, never request inputs.
function createRateLimiters({ loginWindowMs = 15 * MINUTE, registerWindowMs = 60 * MINUTE, messageWindowMs = MINUTE } = {}) {
  const common = {
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler(req, res) {
      const retryAfter = Math.max(1, Math.ceil((req.rateLimit.resetTime.getTime() - Date.now()) / 1000));
      res.set("Cache-Control", "no-store");
      res.set("Retry-After", String(retryAfter));
      res.status(429).json({
        success: false,
        code: "RATE_LIMITED",
        message: `طلبات كثيرة. استنى ${retryAfter} ثانية وحاول مرة ثانية.`,
        retryAfter,
      });
    },
  };

  return {
    loginIp: rateLimit({ ...common, identifier: "login-ip", windowMs: loginWindowMs, limit: 20, skipSuccessfulRequests: true }),
    loginAccount: rateLimit({
      ...common, identifier: "login-account-ip", windowMs: loginWindowMs, limit: 5, skipSuccessfulRequests: true,
      keyGenerator(req) {
        const email = req.body.email.trim().toLowerCase();
        const account = createHash("sha256").update(email).digest("hex");
        return `${ipKeyGenerator(req.ip)}:${account}`;
      },
    }),
    register: rateLimit({ ...common, identifier: "register-ip", windowMs: registerWindowMs, limit: 5 }),
    message: rateLimit({ ...common, identifier: "message-account", windowMs: messageWindowMs, limit: 10,
      keyGenerator: (req) => String(req.user.id),
    }),
  };
}

module.exports = { createRateLimiters };
