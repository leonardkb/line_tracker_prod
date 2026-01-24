require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.PG_HOST,
  port: Number(process.env.PG_PORT),
  database: process.env.PG_DB,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  ssl: false,

  // optional but good practice
  max: 10,                 // max connections in pool
  idleTimeoutMillis: 30000 // idle before reuse
});

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log("✅ Connected to PostgreSQL successfully");

    const res = await client.query("SELECT now()");
    console.log("🕒 Server time:", res.rows[0]);

    // IMPORTANT:
    // This does NOT close the DB connection
    // It returns it to the pool
    client.release();

    console.log("♻️ Connection returned to pool (not closed)");
  } catch (err) {
    console.error("❌ Database connection failed");
    console.error(err.message);
  }
}

// Run once at startup
testConnection();

// Keep process alive (simulate backend server)
setInterval(() => {
  console.log("🟢 Server running, DB pool alive");
}, 30000);
