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

async function deleteMessage({ id, userId }) {
  const result = await pool.query(
    "DELETE FROM public.messages WHERE id = $1 AND user_id = $2 RETURNING id",
    [id, userId],
  );
  return result.rowCount > 0;
}

async function updateMessage({ id, userId, message }) {
  const result = await pool.query(
    `UPDATE public.messages SET message = $1
     WHERE id = $2 AND user_id = $3
     RETURNING id, message, created_at`,
    [message, id, userId],
  );
  return result.rows[0] || null;
}

module.exports = { createMessage, listMessages, deleteMessage, updateMessage };
