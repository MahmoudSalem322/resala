const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const pool = require("../src/config/db");
const config = require("../src/config/jwt");
const { createAccessToken } = require("../src/utils/token");

async function main() {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const userIds = [];
  try {
    for (const name of ["Owner", "Other"]) {
      const user = await pool.query(
        "INSERT INTO public.users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
        [name, `list-${name}-${Date.now()}@example.test`, "unused-test-hash"],
      );
      userIds.push(user.rows[0].id);
    }
    const url = `http://127.0.0.1:${server.address().port}/api/messages`;
    const get = (token, query = "") => fetch(url + query, {
      headers: token ? { Cookie: `access_token=${token}` } : {},
    });
    const ownerToken = createAccessToken(userIds[0]);
    const otherToken = createAccessToken(userIds[1]);
    const anonymous = await get();
    assert.equal(anonymous.status, 401);
    assert.equal(anonymous.headers.get("cache-control"), "no-store");
    assert.equal((await get("invalid")).status, 401);
    const expired = jwt.sign({}, config.secret, { algorithm: config.algorithm, subject: String(userIds[0]),
      expiresIn: -1, issuer: config.issuer, audience: config.audience });
    assert.equal((await get(expired)).status, 401);
    const empty = await get(ownerToken);
    assert.equal(empty.status, 200);
    assert.deepEqual(await empty.json(), { success: true, data: [] });
    const ids = [];
    for (const [ownerId, message, date] of [
      [userIds[0], "Older", "2026-01-01T00:00:00Z"],
      [userIds[0], "Newer", "2026-01-02T00:00:00Z"],
      [userIds[0], "Same date, higher ID", "2026-01-02T00:00:00Z"],
      [userIds[1], "Other user's private message", "2026-01-03T00:00:00Z"],
    ]) {
      const result = await pool.query(
        "INSERT INTO public.messages (name, message, user_id, created_at) VALUES ($1, $2, $3, $4) RETURNING id",
        ["List test", message, ownerId, date],
      );
      ids.push(result.rows[0].id);
    }
    // A client-supplied account ID must not change whose messages are returned.
    const response = await get(ownerToken, `?user_id=${userIds[1]}`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const body = await response.json();
    assert.equal(body.success, true);
    assert.deepEqual(body.data.map((item) => item.id), [ids[2], ids[1], ids[0]]);
    for (const item of body.data) {
      assert.deepEqual(Object.keys(item).sort(), ["created_at", "id", "message"]);
      assert.ok(Number.isFinite(Date.parse(item.created_at)));
    }
    const other = await get(otherToken);
    assert.deepEqual((await other.json()).data.map((item) => item.id), [ids[3]]);
    console.log("Message list checks passed: auth, expired token, empty list, account isolation, ignored user_id, ordering, response shape, no-store.");
  } finally {
    try {
      if (userIds.length) {
        await pool.query("DELETE FROM public.messages WHERE user_id = ANY($1::int[])", [userIds]);
        await pool.query("DELETE FROM public.users WHERE id = ANY($1::int[])", [userIds]);
      }
    } finally {
      await new Promise((resolve) => server.close(resolve));
      await pool.end();
    }
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
