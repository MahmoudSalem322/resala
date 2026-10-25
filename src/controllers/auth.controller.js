const authService = require("../services/auth.service");
const { setAuthCookie, clearAuthCookie } = require("../utils/auth-cookie");

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
  const result = await authService.login({ email, password });

  res.set("Cache-Control", "no-store");
  setAuthCookie(res, result.accessToken);
  res.status(200).json({
    success: true,
    message: "تم تسجيل الدخول بنجاح.",
    data: { user: result.user, expiresIn: result.expiresIn },
  });
}

function logout(req, res) {
  clearAuthCookie(res);
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

module.exports = { register, login, logout, me };
