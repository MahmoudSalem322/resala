const userRepository = require("../repositories/user.repository");
const { hashPassword, verifyPassword, DUMMY_PASSWORD_HASH } = require("../utils/password");
const { createAccessToken, createRefreshToken, hashRefreshToken } = require("../utils/token");
const jwtConfig = require("../config/jwt");
const jwt = require("jsonwebtoken");
const sessions = require("../repositories/session.repository");

function duplicateEmailError() {
  const error = new Error("Email already registered.");
  error.code = "EMAIL_ALREADY_EXISTS";
  error.status = 409;
  error.publicMessage = "البريد الإلكتروني مستخدم بالفعل.";
  return error;
}

async function register({ name, email, password }) {
  const existingUser = await userRepository.findByEmail(email);
  if (existingUser) {
    throw duplicateEmailError();
  }

  const passwordHash = await hashPassword(password);

  try {
    return await userRepository.createUser({ name, email, passwordHash });
  } catch (error) {
    // Two requests can pass the lookup together; the unique index is the final check.
    if (error.code === "23505" && error.constraint === "users_email_unique") {
      throw duplicateEmailError();
    }
    throw error;
  }
}

async function login({ email, password }, previousTokens = {}) {
  const user = await userRepository.findForAuthentication(email);
  const matches = await verifyPassword(password, user ? user.password_hash : DUMMY_PASSWORD_HASH);

  if (!user || !matches) {
    const error = new Error("Invalid login credentials.");
    error.code = "INVALID_CREDENTIALS";
    error.status = 401;
    error.publicMessage = "الإيميل أو كلمة المرور غير صحيحة.";
    throw error;
  }

  await revokeSession(previousTokens);
  const refreshToken = createRefreshToken();
  const session = await sessions.createSession(user.id, hashRefreshToken(refreshToken));
  return sessionResult(user, session, refreshToken);
}

function sessionResult(user, session, refreshToken) {
  const refreshExpiresIn = Math.floor((session.expires_at.getTime() - Date.now()) / 1000);
  if (refreshExpiresIn <= 0) throw expiredSession();
  const expiresIn = Math.min(jwtConfig.expiresIn, refreshExpiresIn);
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.created_at,
    },
    accessToken: createAccessToken(user.id, session.id, expiresIn),
    refreshToken,
    expiresIn,
    refreshExpiresIn,
  };
}

function expiredSession() {
  const error = new Error("Expired session");
  error.status = 401;
  error.publicMessage = "انتهت جلسة الدخول. سجّل دخولك من جديد.";
  return error;
}

async function refreshSession(token) {
  const hash = hashRefreshToken(token);
  if (!hash) throw expiredSession();
  const refreshToken = createRefreshToken();
  const { outcome, session } = await sessions.rotateRefreshToken(hash, hashRefreshToken(refreshToken));
  if (outcome === "concurrent") {
    const error = new Error("Concurrent refresh");
    error.status = 409;
    error.publicMessage = "جاري تجديد جلسة الدخول. حاول مرة ثانية.";
    throw error;
  }
  if (outcome !== "rotated") throw expiredSession();
  const user = await userRepository.findById(session.user_id);
  if (!user) throw expiredSession();
  return sessionResult(user, session, refreshToken);
}

async function revokeSession({ refreshToken, accessToken } = {}) {
  await sessions.revokeByRefreshHash(hashRefreshToken(refreshToken));
  let payload;
  try {
    payload = jwt.verify(accessToken || "", jwtConfig.secret, {
      algorithms: [jwtConfig.algorithm], issuer: jwtConfig.issuer, audience: jwtConfig.audience, ignoreExpiration: true,
    });
  } catch { return; }
  if (typeof payload.sid === "string" && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(payload.sid)) {
    await sessions.revokeById(payload.sid);
  }
}

module.exports = { register, login, refreshSession, revokeSession };
