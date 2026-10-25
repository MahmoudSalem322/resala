const fs = require("node:fs/promises");
const path = require("node:path");
const pool = require("../src/config/db");
const { Pool } = require("pg");

async function setupDatabase() {
  const adminPool = new Pool({ database: "postgres", connectionTimeoutMillis: 5000 });

  try {
    const database = process.env.PGDATABASE;
    if (!database || !process.env.PGPASSWORD) {
      throw new Error("Set PGDATABASE and PGPASSWORD in the backend .env file first.");
    }

    const existing = await adminPool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [database],
    );

    if (existing.rowCount === 0) {
      // SQL identifiers cannot use $1; quote and escape the database name.
      const identifier = '"' + database.replaceAll('"', '""') + '"';
      await adminPool.query(`CREATE DATABASE ${identifier}`);
      console.log("Database created:", database);
    }

    const schema = await fs.readFile(path.resolve(__dirname, "../database/schema.sql"), "utf8");
    await pool.query(schema);
    console.log("Database ready: messages and users tables created or already present.");
  } catch (error) {
    console.error("Database setup failed:", error.code || "CONFIGURATION_ERROR");
    console.error("Check PostgreSQL is running and the backend .env settings are correct.");
    process.exitCode = 1;
  } finally {
    await adminPool.end();
    await pool.end();
  }
}

setupDatabase();
