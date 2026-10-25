const pool = require("../src/config/db");

async function checkDatabase() {
  try {
    if (!process.env.PGPASSWORD) {
      throw new Error("Set PGPASSWORD in the backend .env file before checking the connection.");
    }

    const result = await pool.query("SELECT current_database() AS database, NOW() AS time");
    console.log("Database connected:", result.rows[0]);
  } catch (error) {
    // Avoid logging connection settings or passwords.
    if (!process.env.PGPASSWORD) {
      console.error(error.message);
    } else {
      console.error("Database connection failed:", error.code || "CONNECTION_ERROR");
      console.error("Check PostgreSQL is running and the database and .env settings are correct.");
    }
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

checkDatabase();
