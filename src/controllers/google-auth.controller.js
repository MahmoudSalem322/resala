const { randomBytes } = require("node:crypto");
const provider = require("../services/google-provider");
const repository = require("../repositories/oauth.repository");
const auth = require("../services/auth.service");
const { googleConfig } = require("../config/google");
const { readCookie, readAuthCookie, readRefreshCookie, setSessionCookies } = require("../utils/auth-cookie");

const cookieName = "google_oauth_browser";
const cookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/auth/google" });
const random = () => randomBytes(32).toString("base64url");

async function start(req, res) {
  res.set("Cache-Control", "no-store");
  googleConfig();
  const attempt = { state: random(), browser: random(), codeVerifier: random(), nonce: random() };
  attempt.previousSessionId = await auth.sessionToReplace({ accessToken: readAuthCookie(req), refreshToken: readRefreshCookie(req) });
  const url = provider.authorizationUrl(attempt);
  await repository.saveAttempt(attempt);
  res.cookie(cookieName, attempt.browser, { ...cookieOptions(), maxAge: 5 * 60 * 1000 });
  res.redirect(url);
}

async function callback(req, res) {
  res.set("Cache-Control", "no-store");
  res.set("Referrer-Policy", "no-referrer");
  const config = googleConfig();
  res.clearCookie(cookieName, cookieOptions());
  const failure = (code) => res.redirect(`${config.frontend}/login?error=${code}`);
  try {
    const attempt = await repository.consumeAttempt(req.query.state, readCookie(req, cookieName));
    if (!attempt) return failure("google_invalid_request");
    if (req.query.error === "access_denied") return failure("google_cancelled");
    if (req.query.error || typeof req.query.code !== "string" || !req.query.code || req.query.code.length > 4096) {
      return failure("google_invalid_request");
    }
    const identity = await provider.exchangeCode({ code: req.query.code, codeVerifier: attempt.code_verifier, nonce: attempt.nonce });
    const user = await repository.findOrCreateGoogleUser(identity);
    const session = await auth.createUserSession(user, {}, attempt.previous_session_id);
    setSessionCookies(res, session);
    res.redirect(`${config.frontend}/`);
  } catch (error) {
    if (error.code === "GOOGLE_ACCOUNT_EXISTS") return failure("google_account_exists");
    // Never log Google responses, codes, tokens or secrets.
    console.error("Google login failed.");
    return failure("google_failed");
  }
}

module.exports = { start, callback };
