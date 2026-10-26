const authService = require("../services/auth.service");
const { setSessionCookies, clearSessionCookies, readAuthCookie, readRefreshCookie } = require("../utils/auth-cookie");

function requestTokens(req) { return { accessToken: readAuthCookie(req), refreshToken: readRefreshCookie(req) }; }

async function register(req, res) {
  const { name, email, password } = req.body;
  const user = await authService.register({ name, email, password });

  res.status(201).json({
    success: true,
    message: "تم إنشاء حسابك بنجاح.",
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.created_at,
    },
  });
}

async function login(req, res) {
  const { email, password } = req.body;
  const result = await authService.login({ email, password }, requestTokens(req));

  res.set("Cache-Control", "no-store");
  setSessionCookies(res, result);
  res.status(200).json({
    success: true,
    message: "تم تسجيل الدخول بنجاح.",
    data: { user: result.user, expiresIn: result.expiresIn },
  });
}

async function logout(req, res) {
  await authService.revokeSession(requestTokens(req));
  clearSessionCookies(res);
  res.set("Cache-Control", "no-store");
  res.json({ success: true, message: "تم تسجيل الخروج." });
}

function me(req, res) {
  const expiresIn = req.authExpiresAt - Math.floor(Date.now() / 1000);
  if (expiresIn <= 0) {
    return res.status(401).json({ success: false, message: "انتهت جلسة الدخول." });
  }
  res.json({ success: true, data: { user: req.user, expiresIn } });
}

async function refresh(req, res) {
  res.set("Cache-Control", "no-store");
  try {
    const result = await authService.refreshSession(readRefreshCookie(req));
    setSessionCookies(res, result);
    res.json({ success: true, data: { user: result.user, expiresIn: result.expiresIn } });
  } catch (error) {
    if (error.status === 401) clearSessionCookies(res);
    throw error;
  }
}

module.exports = { register, login, logout, me, refresh };
