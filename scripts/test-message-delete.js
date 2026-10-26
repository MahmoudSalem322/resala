const assert = require("node:assert/strict");
const app = require("../src/app");
const pool = require("../src/config/db");
const { createTestAccessToken: createAccessToken } = require("./helpers/session");

async function main() {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const userIds = [];
  const messageIds = [];
  try {
    for (const name of ["Owner", "Other"]) {
      const result = await pool.query(
        "INSERT INTO public.users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
        [name, `delete-${name}-${Date.now()}@example.test`, "unused-test-hash"],
      );
      userIds.push(result.rows[0].id);
    }
    for (const owner of [userIds[0], userIds[0], userIds[1], null]) {
      const result = await pool.query(
        "INSERT INTO public.messages (name, message, user_id) VALUES ($1, $2, $3) RETURNING id",
        ["Delete test", "Temporary deletion fixture", owner],
      );
      messageIds.push(result.rows[0].id);
    }
    const url = `http://127.0.0.1:${server.address().port}/api/messages`;
    const token = await createAccessToken(userIds[0]);
    const otherToken = await createAccessToken(userIds[1]);
    const remove = (id, session = token, headers = {}) => fetch(`${url}/${id}`, {
      method: "DELETE", headers: { ...(session ? { Cookie: `access_token=${session}` } : {}), ...headers },
    });
    assert.equal((await remove(messageIds[0], null)).status, 401);
    assert.equal((await remove(messageIds[0], "invalid")).status, 401);
    for (const id of ["0", "-1", "1.2", "abc", "2147483648", "999999999999999999999"]) {
      assert.equal((await remove(id)).status, 400);
    }
    // The same response hides whether an ID is absent or belongs to someone else.
    assert.equal((await remove(messageIds[2])).status, 404);
    assert.equal((await remove(messageIds[0], otherToken)).status, 404);
    assert.equal((await remove(messageIds[3])).status, 404);
    assert.equal((await remove(messageIds[0], token, { Origin: "https://other.example" })).status, 403);
    assert.equal((await pool.query("SELECT id FROM public.messages WHERE id = ANY($1::int[])", [messageIds])).rowCount, 4);
    const success = await remove(messageIds[0]);
    assert.equal(success.status, 204);
    assert.equal(success.headers.get("cache-control"), "no-store");
    assert.equal(await success.text(), "");
    assert.equal((await remove(messageIds[0])).status, 404);
    const concurrent = await Promise.all([remove(messageIds[1]), remove(messageIds[1])]);
    assert.deepEqual(concurrent.map((response) => response.status).sort(), [204, 404]);
    const remaining = await pool.query("SELECT id FROM public.messages WHERE id = ANY($1::int[]) ORDER BY id", [messageIds]);
    assert.deepEqual(remaining.rows.map((row) => row.id), [messageIds[2], messageIds[3]]);
    console.log("Delete checks passed: authentication, ID validation, ownership, anonymous legacy records, cross-origin rejection, persistence, missing records and concurrent deletion.");
  } finally {
    try {
      if (messageIds.length) await pool.query("DELETE FROM public.messages WHERE id = ANY($1::int[])", [messageIds]);
      if (userIds.length) await pool.query("DELETE FROM public.users WHERE id = ANY($1::int[])", [userIds]);
    } finally {
      await new Promise((resolve) => server.close(resolve));
      await pool.end();
    }
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
