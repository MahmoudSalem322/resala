const jwt = require("jsonwebtoken");
const config = require("../config/jwt");
const pool = require("../config/db");
const { readAuthCookie } = require("../utils/auth-cookie");

async function requireAuth(req, res, next) {
  let userId;
  let expiresAt;
  try {
    const token = readAuthCookie(req);
    if (!token) throw new Error("Missing token");
    const payload = jwt.verify(token, config.secret, {
      algorithms: [config.algorithm], issuer: config.issuer, audience: config.audience,
    });
    userId = Number(payload.sub);
    expiresAt = payload.exp;
    if (!Number.isSafeInteger(userId) || userId <= 0 || !Number.isFinite(payload.exp)) {
      throw new Error("Invalid token claims");
    }
  } catch {
    return res.status(401).json({ success: false, message: "سجّل دخولك من جديد لإرسال الرسالة." });
  }
  const result = await pool.query("SELECT id, name, email, created_at FROM public.users WHERE id = $1", [userId]);
  if (!result.rows[0]) {
    return res.status(401).json({ success: false, message: "سجّل دخولك من جديد لإرسال الرسالة." });
  }
  req.user = result.rows[0];
  req.authExpiresAt = expiresAt;
  next();
}

module.exports = requireAuth;
