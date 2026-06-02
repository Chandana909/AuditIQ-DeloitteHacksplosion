const { Client } = require('pg');

const DB_CONN = "postgresql://neondb_owner:npg_NafhUtWPF51V@ep-bitter-credit-a1ffz9vw.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

async function checkFlags() {
  const client = new Client({ connectionString: DB_CONN });
  await client.connect();

  try {
    const res = await client.query(`
      SELECT invoice_id, flags_detected
      FROM audit_results
      WHERE flag_count > 0
      LIMIT 2
    `);
    
    if (res.rowCount === 0) {
        console.log("No flags detected in any row! flag_count is 0 everywhere.");
    } else {
        console.log("Sample flags:");
        console.log(JSON.stringify(res.rows, null, 2));
    }
  } catch (err) {
    console.error("DB Error:", err);
  } finally {
    await client.end();
  }
}

checkFlags();
