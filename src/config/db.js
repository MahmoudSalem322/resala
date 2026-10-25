require("./env");
const { Pool } = require("pg");

// pg reads the PG* connection settings from process.env.
// One shared pool will be used by the repositories later.
const pool = new Pool({
  connectionTimeoutMillis: 5000,
});

pool.on("error", (error) => {
  console.error("Unexpected database connection error:", error.code || "UNKNOWN");
});

module.exports = pool;
