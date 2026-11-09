const { OAuth2Client } = require("google-auth-library");
const { googleConfig } = require("../config/google");
const { createHash } = require("node:crypto");

function client(config) {
  return new OAuth2Client({
    clientId: config.clientId, clientSecret: config.clientSecret, redirectUri: config.redirectUri,
    transporterOptions: { timeout: 10000 },
  });
}

function authorizationUrl({ state, nonce, codeVerifier }) {
  const config = googleConfig();
  return client(config).generateAuthUrl({
    scope: ["openid", "email", "profile"], state, nonce,
    code_challenge: createHash("sha256").update(codeVerifier).digest("base64url"),
    code_challenge_method: "S256", access_type: "online", prompt: "select_account",
  });
}

async function exchangeCode({ code, codeVerifier, nonce }) {
  const config = googleConfig();
  const oauth = client(config);
  const { tokens } = await oauth.getToken({ code, codeVerifier, redirect_uri: config.redirectUri });
  if (!tokens.id_token) throw new Error("Missing Google identity token");
  // The library verifies signature, Google issuer, expiry and the client audience.
  const ticket = await oauth.verifyIdToken({ idToken: tokens.id_token, audience: config.clientId });
  const identity = ticket.getPayload();
  if (!identity || identity.nonce !== nonce || identity.email_verified !== true ||
      typeof identity.sub !== "string" || !identity.sub || identity.sub.length > 255 ||
      typeof identity.email !== "string" || identity.email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity.email)) {
    throw new Error("Invalid Google identity");
  }
  const name = typeof identity.name === "string" ? identity.name.trim() : "";
  return { subject: identity.sub, email: identity.email.toLowerCase(), name: (name || identity.email.split("@")[0]).slice(0, 100) };
}

module.exports = { authorizationUrl, exchangeCode };
