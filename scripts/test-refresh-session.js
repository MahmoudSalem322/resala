const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const pool = require("../src/config/db");
const config = require("../src/config/jwt");
const { hashPassword } = require("../src/utils/password");
const { hashRefreshToken } = require("../src/utils/token");

function cookies(response) {
  return Object.fromEntries(response.headers.getSetCookie().map((value) => {
    const first = value.split(";")[0]; const split = first.indexOf("=");
    return [first.slice(0, split), first.slice(split + 1)];
  }));
}
function header(jar) { return Object.entries(jar).map(([name, value]) => `${name}=${value}`).join("; "); }

async function main() {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  let userId;
  try {
    const email = `refresh-${Date.now()}@example.test`;
    const password = "RefreshTest123!";
    const user = await pool.query("INSERT INTO public.users (name,email,password_hash) VALUES ($1,$2,$3) RETURNING id",
      ["Refresh test", email, await hashPassword(password)]);
    userId = user.rows[0].id;
    const base = `http://127.0.0.1:${server.address().port}/api/auth`;
    const request = (path, jar = {}, body, origin) => fetch(base + path, {
      method: path === "/me" ? "GET" : "POST",
      headers: { Cookie: header(jar), ...(body ? { "Content-Type": "application/json" } : {}), ...(origin ? { Origin: origin } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const login = async () => {
      const response = await request("/login", {}, { email, password });
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.equal(Object.hasOwn(body.data, "accessToken"), false);
      assert.equal(Object.hasOwn(body.data, "refreshToken"), false);
      const set = response.headers.getSetCookie();
      assert.ok(set.every((cookie) => /HttpOnly/.test(cookie) && /SameSite=Strict/.test(cookie)));
      assert.match(set.find((cookie) => cookie.startsWith("refresh_token=")), /Path=\/api\/auth/);
      return cookies(response);
    };
    let first = await login();
    const original = { ...first };
    const sid = jwt.decode(first.access_token).sid;
    const initial = (await pool.query("SELECT * FROM auth_sessions WHERE id=$1", [sid])).rows[0];
    assert.ok(initial.expires_at.getTime() - Date.now() > 6.9 * 86400000);
    const stored = (await pool.query("SELECT token_hash FROM refresh_tokens WHERE session_id=$1", [sid])).rows[0];
    assert.equal(stored.token_hash, hashRefreshToken(first.refresh_token));
    assert.notEqual(stored.token_hash, first.refresh_token);
    first.access_token = jwt.sign({ sid }, config.secret, { subject: String(userId), expiresIn: -1,
      algorithm: config.algorithm, issuer: config.issuer, audience: config.audience });
    assert.equal((await request("/me", first)).status, 401);
    assert.equal((await request("/refresh", first, undefined, "https://other.example")).status, 403);
    const refreshed = await request("/refresh", first);
    assert.equal(refreshed.status, 200);
    assert.equal(refreshed.headers.get("cache-control"), "no-store");
    first = cookies(refreshed);
    assert.notEqual(first.refresh_token, original.refresh_token);
    assert.equal(jwt.decode(first.access_token).sid, sid);
    assert.equal((await request("/me", first)).status, 200);
    assert.equal((await pool.query("SELECT expires_at FROM auth_sessions WHERE id=$1", [sid])).rows[0].expires_at.toISOString(), initial.expires_at.toISOString());
    const concurrentOld = await request("/refresh", original);
    assert.equal(concurrentOld.status, 409);
    assert.equal(concurrentOld.headers.getSetCookie().length, 0);
    assert.equal((await request("/me", first)).status, 200);
    const otherDevice = await login();
    await pool.query("UPDATE refresh_tokens SET used_at=NOW()-interval '10 seconds' WHERE token_hash=$1", [hashRefreshToken(original.refresh_token)]);
    assert.equal((await request("/refresh", original)).status, 401);
    assert.equal((await request("/me", first)).status, 401);
    assert.equal((await request("/refresh", first)).status, 401);
    assert.equal((await request("/me", otherDevice)).status, 200);
    const parallel = await Promise.all([request("/refresh", otherDevice), request("/refresh", otherDevice)]);
    assert.deepEqual(parallel.map((response) => response.status).sort(), [200, 409]);
    const current = cookies(parallel.find((response) => response.status === 200));
    assert.equal((await request("/me", current)).status, 200);
    const out = await request("/logout", current);
    assert.equal(out.status, 200);
    assert.ok(out.headers.getSetCookie().some((cookie) => cookie.startsWith("refresh_token=;")));
    assert.ok(out.headers.getSetCookie().some((cookie) => cookie.startsWith("access_token=;")));
    assert.equal((await request("/me", current)).status, 401);
    assert.equal((await request("/refresh", current)).status, 401);
    assert.equal((await request("/logout")).status, 200);
    const nearEnd = await login();
    const nearSid = jwt.decode(nearEnd.access_token).sid;
    await pool.query("UPDATE auth_sessions SET expires_at=NOW()+interval '60 seconds' WHERE id=$1", [nearSid]);
    const nearResponse = await request("/refresh", nearEnd);
    assert.equal(nearResponse.status, 200);
    assert.ok((await nearResponse.json()).data.expiresIn <= 60);
    const nearCookies = cookies(nearResponse);
    await pool.query("UPDATE auth_sessions SET expires_at=NOW()-interval '1 second' WHERE id=$1", [nearSid]);
    assert.equal((await request("/me", nearCookies)).status, 401);
    assert.equal((await request("/refresh", nearCookies)).status, 401);
    assert.equal((await request("/refresh", { refresh_token: "invalid" })).status, 401);
    console.log("Refresh checks passed: hashed storage, cookie flags, renewal, rotation, concurrent grace, replay revocation, isolated devices, server logout, absolute expiry and CSRF rejection.");
  } finally {
    try { if (userId) await pool.query("DELETE FROM public.users WHERE id=$1", [userId]); }
    finally { await new Promise((resolve) => server.close(resolve)); await pool.end(); }
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
