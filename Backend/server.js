require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.PG_HOST,
  port: Number(process.env.PG_PORT),
  database: process.env.PG_DB,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  ssl: false,
  max: 10,
  idleTimeoutMillis: 30000
});

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log("✅ Connected to PostgreSQL successfully");
    const res = await client.query("SELECT now()");
    console.log("🕒 Server time:", res.rows[0]);
    client.release();
    console.log("♻️ Connection returned to pool (not closed)");
  } catch (err) {
    console.error("❌ Database connection failed");
    console.error(err.message);
  }
}

// ✅ Save line inputs and shift slots together
app.post("/api/save-production", async (req, res) => {
  try {
    const { line, date, style, operators, workingHours, sam, efficiency, target, targetPerHour, slots } = req.body;

    // Validate required fields
    if (!line || !date || !style || !operators || !workingHours || !sam) {
      return res.status(400).json({ 
        success: false, 
        error: "Missing required fields" 
      });
    }

    // Insert into line_runs table with correct field names
    const lineRunQuery = `
      INSERT INTO line_runs (
        line_no, 
        run_date, 
        style, 
        operators_count, 
        working_hours, 
        sam_minutes, 
        efficiency, 
        target_pcs,
        target_per_hour,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING id;
    `;

    const lineRunResult = await pool.query(lineRunQuery, [
      line,                              // line_no
      date,                              // run_date
      style,                             // style
      parseInt(operators) || 0,          // operators_count
      parseFloat(workingHours),          // working_hours
      parseFloat(sam),                   // sam_minutes
      parseFloat(efficiency) || 0.7,     // efficiency
      parseFloat(target) || 0,           // target_pcs
      parseFloat(targetPerHour) || 0     // target_per_hour
    ]);

    const runId = lineRunResult.rows[0].id;
    console.log(`✅ Line run saved with ID: ${runId}`);

    // Insert shift slots into shift_slots table with correct field names
    if (slots && slots.length > 0) {
      const slotQuery = `
        INSERT INTO shift_slots (
          run_id,
          slot_order,
          slot_label,
          slot_start,
          slot_end,
          planned_hours
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `;

      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        await pool.query(slotQuery, [
          runId,                         // run_id
          i + 1,                         // slot_order (1-based index)
          slot.label,                    // slot_label (e.g., "09:00")
          slot.startTime || null,        // slot_start (optional)
          slot.endTime || null,          // slot_end (optional)
          parseFloat(slot.hours) || 0    // planned_hours
        ]);
      }
      console.log(`✅ ${slots.length} shift slots saved for line run ${runId}`);
    }

    res.json({ 
      success: true, 
      message: "Production data saved successfully",
      runId 
    });
  } catch (err) {
    console.error("❌ Error saving production data:", err.message);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

testConnection();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

setInterval(() => {
  console.log("🟢 Server running, DB pool alive");
}, 30000);