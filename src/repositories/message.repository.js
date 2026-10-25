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

async function listMessages(userId) {
  const result = await pool.query(
    `SELECT id, message, created_at
     FROM public.messages
     WHERE user_id = $1
     ORDER BY created_at DESC, id DESC`,
    [userId],
  );
  return result.rows;
}

module.exports = { createMessage, listMessages };
