const { randomUUID } = require("node:crypto");
const pool = require("../config/db");
const config = require("../config/jwt");

async function createSession(userId, tokenHash) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      "INSERT INTO auth_sessions (id,user_id,expires_at) VALUES ($1,$2,NOW() + $3 * interval '1 second') RETURNING id,expires_at",
      [randomUUID(), userId, config.sessionExpiresIn],
    );
    await client.query("INSERT INTO refresh_tokens (token_hash,session_id) VALUES ($1,$2)", [tokenHash, result.rows[0].id]);
    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

async function rotateRefreshToken(oldHash, newHash) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const found = await client.query(
      `SELECT s.id,s.user_id,s.expires_at,s.revoked_at,t.used_at,
        (s.expires_at > clock_timestamp()) AS valid,
        (t.used_at > clock_timestamp() - interval '5 seconds') AS recently_used
       FROM refresh_tokens t JOIN auth_sessions s ON s.id=t.session_id
       WHERE t.token_hash=$1 FOR UPDATE OF s,t`, [oldHash],
    );
    const session = found.rows[0];
    let outcome = "expired";
    if (session && !session.revoked_at && session.valid) {
      if (session.used_at) {
        if (session.recently_used) outcome = "concurrent";
        else await client.query("UPDATE auth_sessions SET revoked_at=NOW() WHERE id=$1", [session.id]);
      } else {
        await client.query("UPDATE refresh_tokens SET used_at=NOW() WHERE token_hash=$1", [oldHash]);
        await client.query("INSERT INTO refresh_tokens (token_hash,session_id) VALUES ($1,$2)", [newHash, session.id]);
        outcome = "rotated";
      }
    }
    await client.query("COMMIT");
    return { outcome, session };
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

async function revokeByRefreshHash(hash) {
  if (!hash) return;
  await pool.query("UPDATE auth_sessions SET revoked_at=COALESCE(revoked_at,NOW()) WHERE id IN (SELECT session_id FROM refresh_tokens WHERE token_hash=$1)", [hash]);
}

async function revokeById(id) {
  if (id) await pool.query("UPDATE auth_sessions SET revoked_at=COALESCE(revoked_at,NOW()) WHERE id=$1", [id]);
}

module.exports = { createSession, rotateRefreshToken, revokeByRefreshHash, revokeById };
