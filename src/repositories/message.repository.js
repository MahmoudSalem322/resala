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

async function listMessages({ userId, page, limit, sort, search }) {
  // Direction is selected from fixed SQL literals, never inserted from the request.
  const direction = sort === "oldest" ? "ASC" : "DESC";
  const pattern = search ? `%${search.replace(/[\\%_]/g, "\\$&")}%` : "";
  // Count, page clamping, and rows share one statement/snapshot, even during writes.
  const result = await pool.query(
    `WITH filtered AS (
       SELECT id, message, created_at FROM public.messages
       WHERE user_id = $1 AND ($2 = '' OR message ILIKE $2)
     ), totals AS (
       SELECT COUNT(*)::int AS total FROM filtered
     ), paging AS (
       SELECT total, GREATEST(1, CEIL(total::numeric / $3)::int) AS total_pages,
         LEAST($4::int, GREATEST(1, CEIL(total::numeric / $3)::int)) AS page
       FROM totals
     )
     SELECT total, total_pages, page, COALESCE((
       SELECT json_agg(records ORDER BY records.created_at ${direction}, records.id ${direction}) FROM (
         SELECT id, message, created_at FROM filtered
         ORDER BY created_at ${direction}, id ${direction}
         LIMIT $3 OFFSET ((paging.page - 1)::bigint * $3)
       ) records
     ), '[]'::json) AS messages FROM paging`,
    [userId, pattern, limit, page],
  );
  const row = result.rows[0];
  return { data: row.messages, pagination: { page: row.page, limit, total: row.total, totalPages: row.total_pages } };
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
