const pool = require("../config/db");

async function findByEmail(email) {
  const result = await pool.query(
    "SELECT id, email FROM public.users WHERE LOWER(email) = LOWER($1)",
    [email],
  );

  return result.rows[0] || null;
}

async function createUser({ name, email, passwordHash }) {
  const result = await pool.query(
    `INSERT INTO public.users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, created_at`,
    [name, email, passwordHash],
  );

  return result.rows[0];
}

async function findForAuthentication(email) {
  const result = await pool.query(
    `SELECT id, name, email, password_hash, created_at
     FROM public.users WHERE LOWER(email) = LOWER($1)`,
    [email],
  );

  return result.rows[0] || null;
}

module.exports = { findByEmail, createUser, findForAuthentication };
