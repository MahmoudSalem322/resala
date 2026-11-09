const assert = require("node:assert/strict");
const { generateKeyPairSync, sign } = require("node:crypto");
const { OAuth2Client } = require("google-auth-library");
const provider = require("../src/services/google-provider");
const { googleConfig } = require("../src/config/google");

async function main() {
  const config = googleConfig();
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const otherKey = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey;
  const now = Math.floor(Date.now() / 1000);
  const baseClaims = { iss: "https://accounts.google.com", aud: config.clientId, sub: "google-subject",
    email: "google@example.test", email_verified: true, nonce: "expected-nonce", iat: now, exp: now + 600 };
  function token(claims, key = privateKey) {
    const encoded = [Buffer.from(JSON.stringify({ alg: "RS256", kid: "test-key" })).toString("base64url"),
      Buffer.from(JSON.stringify({ ...baseClaims, ...claims })).toString("base64url")].join(".");
    return `${encoded}.${sign("RSA-SHA256", Buffer.from(encoded), key).toString("base64url")}`;
  }
  let idToken = token({});
  const getToken = OAuth2Client.prototype.getToken;
  const certificates = OAuth2Client.prototype.getFederatedSignonCertsAsync;
  // Replace only Google's two HTTP calls. The real library verifies each signed JWT.
  OAuth2Client.prototype.getToken = async () => ({ tokens: { id_token: idToken } });
  OAuth2Client.prototype.getFederatedSignonCertsAsync = async () => ({ certs: { "test-key": publicKey.export({ type: "spki", format: "pem" }) } });
  const exchange = () => provider.exchangeCode({ code: "test", codeVerifier: "test", nonce: "expected-nonce" });
  try {
    assert.equal((await exchange()).subject, "google-subject");
    for (const claims of [{ aud: "another-client" }, { iss: "https://attacker.example" },
      { iat: now - 3600, exp: now - 600 }, { nonce: "wrong" }, { email_verified: false }]) {
      idToken = token(claims);
      await assert.rejects(exchange);
    }
    idToken = token({}, otherKey);
    await assert.rejects(exchange);
    idToken = "invalid-token";
    await assert.rejects(exchange);
    console.log("Google token verification passed: real signature verification, audience, issuer, expiry, nonce, verified email and malformed token rejection.");
  } finally {
    OAuth2Client.prototype.getToken = getToken;
    OAuth2Client.prototype.getFederatedSignonCertsAsync = certificates;
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
