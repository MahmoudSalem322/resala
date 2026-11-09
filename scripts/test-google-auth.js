const assert = require("node:assert/strict");
const { createHash, randomUUID } = require("node:crypto");
const app = require("../src/app");
const pool = require("../src/config/db");
const { OAuth2Client } = require("google-auth-library");
const { hashPassword } = require("../src/utils/password");

const digest = (value) => createHash("sha256").update(value).digest("hex");
function jar(response) {
  return response.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
}

async function main() {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/auth`;
  const prefix = `google-test-${randomUUID()}`;
  const states = [];
  const originalGetToken = OAuth2Client.prototype.getToken;
  const originalVerify = OAuth2Client.prototype.verifyIdToken;
  let identity;
  let expectedAttempt;
  let exchanges = 0;
  let providerFailure = false;
  const request = (path, cookie = "", options = {}) => fetch(base + path, {
    redirect: "manual", headers: { Cookie: cookie, ...options.headers }, ...options,
  });
  async function start(previousCookie = "") {
    const response = await request("/google", previousCookie);
    assert.equal(response.status, 302, "Google login start must redirect");
    assert.equal(response.headers.get("cache-control"), "no-store");
    const url = new URL(response.headers.get("location"));
    assert.equal(url.origin, "https://accounts.google.com");
    assert.equal(url.searchParams.get("redirect_uri"), process.env.GOOGLE_REDIRECT_URI);
    assert.deepEqual(url.searchParams.get("scope").split(" ").sort(), ["email", "openid", "profile"]);
    assert.equal(url.searchParams.get("code_challenge_method"), "S256");
    assert.ok(url.searchParams.get("nonce"));
    assert.ok(!url.searchParams.has("client_secret"));
    const cookie = jar(response);
    assert.match(response.headers.getSetCookie().join(";"), /HttpOnly/);
    assert.match(response.headers.getSetCookie().join(";"), /SameSite=Lax/);
    assert.match(response.headers.getSetCookie().join(";"), /Path=\/api\/auth\/google/);
    const state = url.searchParams.get("state"); states.push(digest(state));
    return { state, cookie, nonce: url.searchParams.get("nonce"), challenge: url.searchParams.get("code_challenge") };
  }
  async function callback(attempt, extra = "code=test-code", cookie = attempt.cookie) {
    expectedAttempt = attempt;
    return request(`/google/callback?state=${attempt.state}&${extra}`, cookie);
  }
  function failed(response, code) {
    assert.equal(response.status, 302);
    const url = new URL(response.headers.get("location"));
    assert.equal(url.origin, process.env.FRONTEND_URL || "http://localhost:3001");
    assert.equal(url.pathname, "/login");
    assert.equal(url.searchParams.get("error"), code);
    assert.ok(!response.headers.getSetCookie().some((value) => /^access_token=[^;]/.test(value)));
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
  OAuth2Client.prototype.getToken = async function(options) {
    exchanges++;
    assert.equal(options.code, "test-code");
    assert.equal(createHash("sha256").update(options.codeVerifier).digest("base64url"), expectedAttempt.challenge);
    assert.equal(options.redirect_uri, process.env.GOOGLE_REDIRECT_URI);
    if (providerFailure) throw new Error("Provider failure must not be exposed");
    return { tokens: { id_token: "test-id-token" } };
  };
  OAuth2Client.prototype.verifyIdToken = async function(options) {
    assert.equal(options.audience, process.env.GOOGLE_CLIENT_ID);
    assert.equal(options.idToken, "test-id-token");
    return { getPayload: () => ({
      iss: "https://accounts.google.com", aud: process.env.GOOGLE_CLIENT_ID,
      sub: prefix, email: `${prefix}@example.test`, name: "Google test",
      email_verified: true, nonce: expectedAttempt.nonce, ...identity,
    }) };
  };
  try {
    const attempt = await start();
    const count = exchanges;
    failed(await callback(attempt, "code=test-code", ""), "google_invalid_request");
    assert.equal(exchanges, count, "Missing browser cookie must not exchange code");
    const wrongBrowser = await start();
    failed(await callback(attempt, "code=test-code", wrongBrowser.cookie), "google_invalid_request");
    failed(await request("/google/callback?code=test-code", attempt.cookie), "google_invalid_request");
    failed(await callback({ ...attempt, state: "invalid" }), "google_invalid_request");
    const response = await callback(attempt);
    assert.equal(response.status, 302);
    assert.equal(response.headers.get("location"), (process.env.FRONTEND_URL || "http://localhost:3001") + "/");
    const user = (await pool.query("SELECT * FROM users WHERE email=$1", [`${prefix}@example.test`])).rows[0];
    assert.ok(user); assert.equal(user.password_hash, null);
    assert.equal((await pool.query("SELECT provider_subject FROM oauth_accounts WHERE user_id=$1", [user.id])).rows[0].provider_subject, prefix);
    let sessionCookies = jar(response);
    assert.match(sessionCookies, /access_token=/); assert.match(sessionCookies, /refresh_token=/);
    assert.equal((await request("/me", sessionCookies)).status, 200);
    const afterSuccess = exchanges;
    failed(await callback(attempt), "google_invalid_request");
    assert.equal(exchanges, afterSuccess, "A callback cannot be replayed");
    // A real cross-site callback carries only the Lax attempt cookie, not Strict session cookies.
    const previousCookies = sessionCookies;
    const again = await callback(await start(previousCookies));
    assert.equal(again.headers.get("location"), response.headers.get("location"));
    assert.equal((await request("/me", previousCookies)).status, 401, "Replaced browser session must be revoked");
    assert.equal((await request("/refresh", previousCookies, { method: "POST" })).status, 401);
    sessionCookies = jar(again);
    assert.equal((await request("/me", sessionCookies)).status, 200);
    assert.equal((await pool.query("SELECT count(*)::int AS count FROM users WHERE email=$1", [user.email])).rows[0].count, 1);
    const parallelAttempts = await Promise.all([start(), start(sessionCookies)]);
    // The Google stub below needs distinct PKCE expectations, so race the repository separately.
    const accounts = require("../src/repositories/oauth.repository");
    const concurrentIdentity = { subject: prefix + "-parallel", email: `${prefix}-parallel@example.test`, name: "Parallel" };
    const concurrentUsers = await Promise.all([accounts.findOrCreateGoogleUser(concurrentIdentity), accounts.findOrCreateGoogleUser(concurrentIdentity)]);
    assert.equal(concurrentUsers[0].id, concurrentUsers[1].id);
    const expired = parallelAttempts[0];
    await pool.query("UPDATE oauth_login_attempts SET expires_at=NOW()-interval '1 second' WHERE state_hash=$1", [digest(expired.state)]);
    failed(await callback(expired), "google_invalid_request");
    failed(await callback(parallelAttempts[1], "error=access_denied"), "google_cancelled");
    assert.equal((await request("/me", sessionCookies)).status, 200, "Cancelling Google login preserves the existing session");
    for (const invalid of [{ email_verified: false }, { nonce: "wrong" }, { sub: "" }, { email: "not-an-email" }]) {
      identity = invalid;
      failed(await callback(await start()), "google_failed");
    }
    identity = { sub: prefix + "-conflict", email: user.email };
    failed(await callback(await start()), "google_account_exists");
    assert.equal((await pool.query("SELECT count(*)::int AS count FROM oauth_accounts WHERE provider_subject=$1", [identity.sub])).rows[0].count, 0);
    identity = undefined; providerFailure = true;
    failed(await callback(await start()), "google_failed"); providerFailure = false;
    // Google-only accounts must fail password login normally, rather than producing a server error.
    const passwordResponse = await request("/login", "", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: user.email, password: "AnyPassword123!" }) });
    assert.equal(passwordResponse.status, 401);
    const refreshed = await request("/refresh", sessionCookies, { method: "POST" });
    assert.equal(refreshed.status, 200);
    const currentCookies = jar(refreshed);
    assert.equal((await request("/logout", currentCookies, { method: "POST" })).status, 200);
    assert.equal((await request("/me", currentCookies)).status, 401);
    // An existing password account must not be taken over by matching its email.
    const local = await pool.query("INSERT INTO users(name,email,password_hash) VALUES($1,$2,$3) RETURNING id", ["Local", `${prefix}-local@example.test`, await hashPassword("LocalPassword123!")]);
    identity = { sub: prefix + "-local", email: `${prefix}-local@example.test` };
    failed(await callback(await start()), "google_account_exists");
    assert.equal((await pool.query("SELECT count(*)::int AS count FROM oauth_accounts WHERE user_id=$1", [local.rows[0].id])).rows[0].count, 0);
    const clientId = process.env.GOOGLE_CLIENT_ID;
    try { delete process.env.GOOGLE_CLIENT_ID; assert.equal((await request("/google")).status, 503); }
    finally { process.env.GOOGLE_CLIENT_ID = clientId; }
    console.log("Google checks passed: PKCE/nonce, browser binding, expiry, replay rejection, cancellation, invalid identities, concurrent creation, email conflict, password rejection, session refresh/logout, disabled configuration.");
  } finally {
    OAuth2Client.prototype.getToken = originalGetToken;
    OAuth2Client.prototype.verifyIdToken = originalVerify;
    try {
      await pool.query("DELETE FROM users WHERE email LIKE $1", [`${prefix}%@example.test`]);
      if ((await pool.query("SELECT to_regclass('public.oauth_login_attempts') AS table_name")).rows[0].table_name) {
        await pool.query("DELETE FROM oauth_login_attempts WHERE state_hash=ANY($1::text[])", [states]);
      }
    } finally { await new Promise((resolve) => server.close(resolve)); await pool.end(); }
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
