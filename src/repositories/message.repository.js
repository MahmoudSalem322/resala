const pool = require("../config/db");

async function createMessage({ name, message }) {
  const result = await pool.query(
    `INSERT INTO messages (name, message)
     VALUES ($1, $2)
     RETURNING id, name, message, created_at`,
    [name, message],
  );

  return result.rows[0];
}

module.exports = { createMessage };
