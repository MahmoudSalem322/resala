function validateRegister(req, res, next) {
  const body = req.body;

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({
      success: false,
      message: "بيانات التسجيل لازم تكون JSON Object.",
    });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = body.password;
  const errors = {};

  if (!name) {
    errors.name = "اكتب اسمك الكامل.";
  } else if (name.length > 100) {
    errors.name = "الاسم لازم يكون 100 حرف أو أقل.";
  }

  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "اكتب بريد إلكتروني صحيح بطول 254 حرف أو أقل.";
  }

  if (typeof password !== "string" || password.length < 8 || !password.trim()) {
    errors.password = "كلمة المرور لازم تكون 8 أحرف على الأقل، ومش فراغات فقط.";
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: Object.values(errors)[0],
      errors,
    });
  }

  // Pass only validated fields. Keep the password exactly as the user typed it.
  req.body = { name, email, password };
  next();
}

module.exports = validateRegister;
