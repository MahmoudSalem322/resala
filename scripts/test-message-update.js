const assert = require("node:assert/strict");
const app = require("../src/app");
const pool = require("../src/config/db");
const { createTestAccessToken: createAccessToken } = require("./helpers/session");

async function main() {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const userIds = [];
  const records = [];
  try {
    for (const name of ["Owner", "Other"]) {
      const result = await pool.query(
        "INSERT INTO public.users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
        [name, `update-${name}-${Date.now()}@example.test`, "unused-test-hash"],
      );
      userIds.push(result.rows[0].id);
    }
    for (const owner of [userIds[0], userIds[1], null]) {
      const result = await pool.query(
        "INSERT INTO public.messages (name, message, user_id) VALUES ($1, $2, $3) RETURNING *",
        ["Original sender", "Original text", owner],
      );
      records.push(result.rows[0]);
    }
    const url = `http://127.0.0.1:${server.address().port}/api/messages`;
    const token = await createAccessToken(userIds[0]);
    const otherToken = await createAccessToken(userIds[1]);
    const update = (id, body = { message: "Updated text" }, session = token, headers = {}) => fetch(`${url}/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json", ...(session ? { Cookie: `access_token=${session}` } : {}), ...headers },
      body: JSON.stringify(body),
    });
    assert.equal((await update(records[0].id, undefined, null)).status, 401);
    assert.equal((await update(records[0].id, undefined, "invalid")).status, 401);
    for (const id of ["0", "-1", "1.5", "abc", "2147483648"]) assert.equal((await update(id)).status, 400);
    for (const body of [{}, { message: " " }, { message: 123 }, { message: null }, { message: "x".repeat(5001) }]) {
      assert.equal((await update(records[0].id, body)).status, 400);
    }
    assert.equal((await update(records[1].id)).status, 404);
    assert.equal((await update(records[0].id, undefined, otherToken)).status, 404);
    assert.equal((await update(records[2].id)).status, 404);
    assert.equal((await update(records[0].id, undefined, token, { Origin: "https://other.example" })).status, 403);
    const before = await pool.query("SELECT message FROM public.messages WHERE id = $1", [records[0].id]);
    assert.equal(before.rows[0].message, "Original text");
    const success = await update(records[0].id, {
      message: "  Updated 'quoted' text  ", user_id: userIds[1], name: "Spoofed", created_at: "2000-01-01T00:00:00Z",
    });
    assert.equal(success.status, 200);
    assert.equal(success.headers.get("cache-control"), "no-store");
    const body = await success.json();
    assert.equal(body.success, true);
    assert.deepEqual(Object.keys(body.data).sort(), ["created_at", "id", "message"]);
    assert.equal(body.data.id, records[0].id);
    assert.equal(body.data.message, "Updated 'quoted' text");
    assert.equal(body.data.created_at, records[0].created_at.toISOString());
    const saved = (await pool.query("SELECT * FROM public.messages WHERE id = $1", [records[0].id])).rows[0];
    assert.equal(saved.message, body.data.message);
    assert.equal(saved.user_id, userIds[0]);
    assert.equal(saved.name, "Original sender");
    assert.equal((await update(records[0].id, { message: "x".repeat(5000) })).status, 200);
    const other = (await pool.query("SELECT message FROM public.messages WHERE id = $1", [records[1].id])).rows[0];
    assert.equal(other.message, "Original text");
    await pool.query("DELETE FROM public.messages WHERE id = $1", [records[0].id]);
    assert.equal((await update(records[0].id)).status, 404);
    console.log("Update checks passed: authentication, ownership, legacy records, ID/text limits, trimming, unchanged ownership/date/name, persistence, deleted record and cross-origin rejection.");
  } finally {
    try {
      if (records.length) await pool.query("DELETE FROM public.messages WHERE id = ANY($1::int[])", [records.map((record) => record.id)]);
      if (userIds.length) await pool.query("DELETE FROM public.users WHERE id = ANY($1::int[])", [userIds]);
    } finally {
      await new Promise((resolve) => server.close(resolve));
      await pool.end();
    }
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
