function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  console.error("Request failed:", error.code || "INTERNAL_ERROR");

  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600
    ? error.status
    : 500;

  res.status(status).json({
    success: false,
    message: typeof error.publicMessage === "string"
      ? error.publicMessage
      : status >= 500
        ? "صار خطأ بالسيرفر، جرّب مرة ثانية."
        : "تعذّر معالجة بيانات الطلب.",
  });
}

module.exports = errorHandler;
