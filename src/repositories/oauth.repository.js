const pool = require("../config/db");
const { createHash } = require("node:crypto");
const digest = (value) => createHash("sha256").update(value).digest("hex");

async function saveAttempt({ state, browser, codeVerifier, nonce, previousSessionId }) {
  await pool.query("DELETE FROM public.oauth_login_attempts WHERE expires_at <= NOW()");
  await pool.query(`INSERT INTO public.oauth_login_attempts
    (state_hash,browser_hash,code_verifier,nonce,expires_at,previous_session_id)
    VALUES($1,$2,$3,$4,NOW()+interval '5 minutes', (SELECT id FROM auth_sessions WHERE id=$5))`,
  [digest(state), digest(browser), codeVerifier, nonce, previousSessionId]);
}

async function consumeAttempt(state, browser) {
  if (typeof state !== "string" || typeof browser !== "string" ||
      !/^[A-Za-z0-9_-]{43}$/.test(state) || !/^[A-Za-z0-9_-]{43}$/.test(browser)) return null;
  // DELETE RETURNING makes callbacks single-use even across concurrent server processes.
  const result = await pool.query(`DELETE FROM public.oauth_login_attempts
    WHERE state_hash=$1 AND browser_hash=$2 AND expires_at>NOW() RETURNING code_verifier,nonce,previous_session_id`,
  [digest(state), digest(browser)]);
  return result.rows[0] || null;
}

function accountExists() {
  const error = new Error("Explicit account linking is required");
  error.code = "GOOGLE_ACCOUNT_EXISTS";
  return error;
}

async function findOrCreateGoogleUser({ subject, email, name }) {
  const connection = await pool.connect();
  try {
    await connection.query("BEGIN");
    // Serialize first logins for this Google identity; the unique constraints remain authoritative.
    await connection.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`google:${subject}`]);
    const linked = await connection.query(`SELECT u.id,u.name,u.email,u.created_at FROM public.oauth_accounts a
      JOIN public.users u ON u.id=a.user_id WHERE a.provider='google' AND a.provider_subject=$1`, [subject]);
    if (linked.rows[0]) {
      await connection.query("COMMIT");
      return linked.rows[0];
    }
    const existing = await connection.query("SELECT id FROM public.users WHERE LOWER(email)=LOWER($1)", [email]);
    if (existing.rowCount) throw accountExists();
    const result = await connection.query(`INSERT INTO public.users(name,email,password_hash) VALUES($1,$2,NULL)
      RETURNING id,name,email,created_at`, [name, email]);
    await connection.query("INSERT INTO public.oauth_accounts(provider,provider_subject,user_id) VALUES('google',$1,$2)", [subject, result.rows[0].id]);
    await connection.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await connection.query("ROLLBACK");
    if (error.code === "23505" && error.constraint === "users_email_unique") throw accountExists();
    throw error;
  } finally { connection.release(); }
}

module.exports = { saveAttempt, consumeAttempt, findOrCreateGoogleUser };
