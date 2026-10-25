const authService = require("../services/auth.service");

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
  res.status(200).json({
    success: true,
    message: "تم تسجيل الدخول بنجاح.",
    data: result,
  });
}

module.exports = { register, login };
