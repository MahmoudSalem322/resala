require("./env");

function frontendOrigin() {
  const value = process.env.FRONTEND_URL || (process.env.NODE_ENV !== "production" ? "http://localhost:3001" : "");
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password ||
      url.pathname !== "/" || url.search || url.hash ||
      (process.env.NODE_ENV === "production" && url.protocol !== "https:")) {
    throw new Error("Invalid FRONTEND_URL origin");
  }
  return url.origin;
}

function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  try {
    if (!clientId || !clientSecret || !redirectUri) throw new Error("Missing Google configuration");
    const url = new URL(redirectUri);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password ||
        url.pathname !== "/api/auth/google/callback" || url.search || url.hash ||
        (process.env.NODE_ENV === "production" && url.protocol !== "https:")) throw new Error("Invalid callback");
    return { clientId, clientSecret, redirectUri, frontend: frontendOrigin() };
  } catch {
    const error = new Error("Google login is not configured");
    error.code = "GOOGLE_NOT_CONFIGURED";
    error.status = 503;
    error.publicMessage = "تسجيل الدخول بجوجل غير متاح حاليًا.";
    throw error;
  }
}

module.exports = { googleConfig, frontendOrigin };
