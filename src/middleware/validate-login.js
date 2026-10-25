function validateLogin(req, res, next) {
  const body = req.body;

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({
      success: false,
      message: "بيانات الدخول لازم تكون JSON Object.",
    });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = body.password;
  const errors = {};

  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "اكتب بريد إلكتروني صحيح بطول 254 حرف أو أقل.";
  }

  if (typeof password !== "string" || !password.trim()) {
    errors.password = "اكتب كلمة المرور.";
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: Object.values(errors)[0],
      errors,
    });
  }

  // Password correctness is checked against the stored hash in the service later.
  req.body = { email, password };
  next();
}

module.exports = validateLogin;
