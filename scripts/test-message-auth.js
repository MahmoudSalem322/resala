const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const pool = require("../src/config/db");
const config = require("../src/config/jwt");
const { createTestAccessToken: createAccessToken } = require("./helpers/session");
const { hashPassword } = require("../src/utils/password");

async function main() {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  let userId;
  try {
    const email = `message-auth-${Date.now()}@example.test`;
    const password = "CookieTest123!";
    const user = await pool.query(
      "INSERT INTO public.users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
      ["Auth test", email, await hashPassword(password)],
    );
    userId = user.rows[0].id;
    const url = `http://127.0.0.1:${server.address().port}/api/messages`;
    const send = async (token, body = { message: " Test message ", user_id: userId + 1, name: "Impersonated" }) => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Cookie: `access_token=${token}` } : {}) },
        body: JSON.stringify(body),
      });
      return { status: response.status, body: await response.json() };
    };
    assert.equal((await send()).status, 401);
    assert.equal((await send("invalid")).status, 401);
    assert.equal((await send("%malformed")).status, 401);
    const token = await createAccessToken(userId);
    const sign = (options) => jwt.sign({ sid: jwt.decode(token).sid }, config.secret, {
      algorithm: config.algorithm, subject: String(userId), expiresIn: 60,
      issuer: config.issuer, audience: config.audience, ...options,
    });
    assert.equal((await send(sign({ expiresIn: -1 }))).status, 401);
    assert.equal((await send(sign({ audience: "wrong" }))).status, 401);
    assert.equal((await send(token, { message: " " })).status, 400);
    assert.equal((await send(token, { message: "x".repeat(5001) })).status, 400);
    const created = await send(token);
    assert.equal(created.status, 201);
    assert.equal(created.body.data.user_id, userId);
    assert.equal(created.body.data.name, "Auth test");
    assert.equal(created.body.data.message, "Test message");
    const saved = await pool.query("SELECT user_id FROM public.messages WHERE id = $1", [created.body.data.id]);
    assert.equal(saved.rows[0].user_id, userId);
    const baseUrl = `http://127.0.0.1:${server.address().port}/api/auth`;
    const currentUser = (token) => fetch(`${baseUrl}/me`, {
      headers: token ? { Cookie: `access_token=${token}` } : {},
    });
    const anonymous = await currentUser();
    assert.equal(anonymous.status, 401);
    assert.equal(anonymous.headers.get("cache-control"), "no-store");
    assert.equal((await currentUser("invalid")).status, 401);
    assert.equal((await currentUser(sign({ expiresIn: -1 }))).status, 401);
    const login = await fetch(`${baseUrl}/login`, {
      method: "POST", headers: { "Content-Type": "application/json", Origin: "http://localhost:3001" },
      body: JSON.stringify({ email, password }),
    });
    assert.equal(login.status, 200);
    assert.equal(login.headers.get("access-control-allow-credentials"), "true");
    assert.equal(login.headers.get("access-control-allow-origin"), "http://localhost:3001");
    const cookie = login.headers.get("set-cookie");
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=Strict/i);
    assert.match(cookie, /Max-Age=900/);
    assert.match(cookie, /Path=\/api/);
    const loginBody = await login.json();
    assert.equal(Object.hasOwn(loginBody.data, "accessToken"), false);
    assert.equal(loginBody.data.user.id, userId);
    const cookieToken = cookie.split(";")[0].slice("access_token=".length);
    const restored = await currentUser(cookieToken);
    assert.equal(restored.status, 200);
    assert.equal(restored.headers.get("cache-control"), "no-store");
    assert.equal(restored.headers.get("set-cookie"), null);
    const restoredBody = await restored.json();
    assert.equal(restoredBody.data.user.id, userId);
    assert.equal(restoredBody.data.user.email, email);
    assert.equal(typeof restoredBody.data.user.created_at, "string");
    assert.equal(Object.hasOwn(restoredBody.data.user, "password_hash"), false);
    assert.equal(Object.hasOwn(restoredBody.data, "accessToken"), false);
    assert.ok(restoredBody.data.expiresIn > 0 && restoredBody.data.expiresIn <= 900);
    const shortSession = await currentUser(sign({ expiresIn: 30 }));
    assert.ok((await shortSession.json()).data.expiresIn <= 30);
    assert.equal((await send(cookieToken)).status, 201);
    const blocked = await fetch(url, {
      method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie.split(";")[0], Origin: "https://other.example" },
      body: JSON.stringify({ message: "blocked" }),
    });
    assert.equal(blocked.status, 403);
    const logout = await fetch(`${baseUrl}/logout`, { method: "POST", headers: { Cookie: cookie.split(";")[0] } });
    assert.equal(logout.status, 200);
    assert.match(logout.headers.get("set-cookie"), /access_token=;/);
    assert.match(logout.headers.get("set-cookie"), /Expires=Thu, 01 Jan 1970/);
    assert.equal((await currentUser(cookieToken)).status, 401);
    assert.equal((await send()).status, 401);
    assert.equal((await currentUser()).status, 401);
    await pool.query("DELETE FROM public.messages WHERE user_id = $1", [userId]);
    await pool.query("DELETE FROM public.users WHERE id = $1", [userId]);
    assert.equal((await send(token)).status, 401);
    assert.equal((await currentUser(token)).status, 401);
    console.log("Checks passed: cookie login/logout and flags, CORS, cross-origin rejection, missing/invalid/expired token, validation, ownership, deleted user.");
  } finally {
    if (userId) {
      await pool.query("DELETE FROM public.messages WHERE user_id = $1", [userId]);
      await pool.query("DELETE FROM public.users WHERE id = $1", [userId]);
    }
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
