const { Client } = require('pg');

const DB_CONN = "postgresql://neondb_owner:npg_NafhUtWPF51V@ep-bitter-credit-a1ffz9vw.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

async function checkDB() {
  const client = new Client({ connectionString: DB_CONN });
  await client.connect();

  try {
    // 1. Check v_rule_violation_feed
    const viewRes = await client.query(`SELECT * FROM v_rule_violation_feed LIMIT 5`);
    console.log("v_rule_violation_feed rows:", viewRes.rowCount);
    if (viewRes.rowCount > 0) {
      console.log(viewRes.rows);
    }

    // Let's get the definition of v_rule_violation_feed to see why it's empty
    const defRes = await client.query(`
      SELECT pg_get_viewdef('v_rule_violation_feed', true) AS view_def
    `);
    console.log("\nView Definition:");
    console.log(defRes.rows[0].view_def);

  } catch (err) {
    console.error("DB Error:", err);
  } finally {
    await client.end();
  }
}

checkDB();
