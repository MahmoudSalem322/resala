const cookieName = "access_token";
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/api",
};

function clearAuthCookie(res) {
  res.clearCookie(cookieName, cookieOptions);
}

function readAuthCookie(req) {
  return readCookie(req, cookieName);
}

function readCookie(req, name) {
  const cookies = (req.get("Cookie") || "").split(";");
  const cookie = cookies.map((value) => value.trim()).find((value) => value.startsWith(`${name}=`));
  try { return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : null; } catch { return null; }
}

function setSessionCookies(res, result) {
  res.cookie(cookieName, result.accessToken, { ...cookieOptions, maxAge: result.expiresIn * 1000 });
  res.cookie("refresh_token", result.refreshToken, { ...cookieOptions, path: "/api/auth", maxAge: result.refreshExpiresIn * 1000 });
}
function clearSessionCookies(res) {
  clearAuthCookie(res);
  res.clearCookie("refresh_token", { ...cookieOptions, path: "/api/auth" });
}
function readRefreshCookie(req) { return readCookie(req, "refresh_token"); }

module.exports = { readAuthCookie, setSessionCookies, clearSessionCookies, readRefreshCookie };
