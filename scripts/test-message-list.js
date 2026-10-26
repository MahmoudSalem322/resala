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
    assert.deepEqual(await empty.json(), { success: true, data: [], pagination: { page: 1, limit: 12, total: 0, totalPages: 1 } });
    const ids = [];
    for (const [ownerId, message, date] of [
      [userIds[0], "Older needle", "2026-01-01T00:00:00Z"],
      [userIds[0], "Newer", "2026-01-02T00:00:00Z"],
      [userIds[0], "Same date, higher ID 100%_\\end", "2026-01-02T00:00:00Z"],
      [userIds[1], "Other user's private needle", "2026-01-03T00:00:00Z"],
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
    const additional = [];
    for (let index = 1; index <= 22; index++) {
      const row = await pool.query("INSERT INTO public.messages (name, message, user_id, created_at) VALUES ($1, $2, $3, $4) RETURNING id",
        ["List test", `Extra ${index}`, userIds[0], `2026-02-${String(index).padStart(2, "0")}T00:00:00Z`]);
      additional.push(row.rows[0].id);
    }
    const expected = [...additional].reverse().concat([ids[2], ids[1], ids[0]]);
    const seen = [];
    for (let page = 1; page <= 3; page++) {
      const response = await get(ownerToken, `?page=${page}&limit=12&sort=newest`);
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.deepEqual(body.pagination, { page, limit: 12, total: 25, totalPages: 3 });
      assert.equal(body.data.length, page === 3 ? 1 : 12);
      seen.push(...body.data.map((item) => item.id));
    }
    assert.deepEqual(seen, expected);
    assert.equal(new Set(seen).size, 25);
    const oldest = await (await get(ownerToken, "?sort=oldest&limit=2")).json();
    assert.deepEqual(oldest.data.map((item) => item.id), [ids[0], ids[1]]);
    // Search must find an item outside the first page and never include another account's hit.
    const search = await (await get(ownerToken, "?q=NEEDLE")).json();
    assert.deepEqual(search.data.map((item) => item.id), [ids[0]]);
    assert.equal(search.pagination.total, 1);
    for (const q of ["%", "_", "\\"]) {
      const match = await (await get(ownerToken, `?q=${encodeURIComponent(q)}`)).json();
      assert.deepEqual(match.data.map((item) => item.id), [ids[2]]);
    }
    const none = await (await get(ownerToken, "?q=does-not-exist&page=10")).json();
    assert.deepEqual(none.data, []);
    assert.deepEqual(none.pagination, { page: 1, limit: 12, total: 0, totalPages: 1 });
    for (const query of ["page=0", "page=-1", "page=1.5", "page=1000001", "limit=0", "limit=51", "sort=invalid", "page=1&page=2", "q=a&q=b", `q=${"x".repeat(201)}`]) {
      assert.equal((await get(ownerToken, `?${query}`)).status, 400, query);
    }
    const beyond = await (await get(ownerToken, "?page=999")).json();
    assert.equal(beyond.pagination.page, 3);
    await pool.query("DELETE FROM public.messages WHERE id = $1", [ids[0]]);
    const afterDelete = await (await get(ownerToken, "?page=3")).json();
    assert.deepEqual(afterDelete.pagination, { page: 2, limit: 12, total: 24, totalPages: 2 });
    assert.equal(afterDelete.data.length, 12);
    console.log("List checks passed: authentication, isolated search, literal wildcards, validation, both sort orders, stable pagination, empty results and last-page deletion.");
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
