const jwt = require("jsonwebtoken");
const config = require("../config/jwt");
const pool = require("../config/db");
const { readAuthCookie } = require("../utils/auth-cookie");

async function requireAuth(req, res, next) {
  let userId;
  let expiresAt;
  let sessionId;
  try {
    const token = readAuthCookie(req);
    if (!token) throw new Error("Missing token");
    const payload = jwt.verify(token, config.secret, {
      algorithms: [config.algorithm], issuer: config.issuer, audience: config.audience,
    });
    userId = Number(payload.sub);
    expiresAt = payload.exp;
    sessionId = payload.sid;
    if (!Number.isSafeInteger(userId) || userId <= 0 || !Number.isFinite(payload.exp) ||
        typeof sessionId !== "string" || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(sessionId)) {
      throw new Error("Invalid token claims");
    }
  } catch {
    return res.status(401).json({ success: false, message: "سجّل دخولك من جديد لإرسال الرسالة." });
  }
  const result = await pool.query(
    `SELECT u.id,u.name,u.email,u.created_at FROM public.users u
     JOIN auth_sessions s ON s.user_id=u.id
     WHERE u.id=$1 AND s.id=$2 AND s.revoked_at IS NULL AND s.expires_at>NOW()`, [userId, sessionId]);
  if (!result.rows[0]) {
    return res.status(401).json({ success: false, message: "سجّل دخولك من جديد لإرسال الرسالة." });
  }
  req.user = result.rows[0];
  req.authExpiresAt = expiresAt;
  next();
}

module.exports = requireAuth;
