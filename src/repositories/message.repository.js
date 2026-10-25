const pool = require("../config/db");

async function createMessage({ name, userId, message }) {
  const result = await pool.query(
    `INSERT INTO public.messages (name, message, user_id)
     VALUES ($1, $2, $3)
     RETURNING id, name, message, user_id, created_at`,
    [name, message, userId],
  );

  return result.rows[0];
}

module.exports = { createMessage };
