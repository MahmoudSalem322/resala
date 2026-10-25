const config = require("../config/jwt");

const cookieName = "access_token";
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/api",
};

function setAuthCookie(res, token) {
  res.cookie(cookieName, token, { ...cookieOptions, maxAge: config.expiresIn * 1000 });
}

function clearAuthCookie(res) {
  res.clearCookie(cookieName, cookieOptions);
}

function readAuthCookie(req) {
  const cookies = (req.get("Cookie") || "").split(";");
  const cookie = cookies.map((value) => value.trim()).find((value) => value.startsWith(`${cookieName}=`));
  return cookie ? decodeURIComponent(cookie.slice(cookieName.length + 1)) : null;
}

module.exports = { setAuthCookie, clearAuthCookie, readAuthCookie };
