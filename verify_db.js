const { Client } = require('pg');

const DB_CONN = "postgresql://neondb_owner:npg_NafhUtWPF51V@ep-bitter-credit-a1ffz9vw.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

async function verifyDB() {
  const client = new Client({ connectionString: DB_CONN });
  await client.connect();

  console.log("--- DB Verification Report ---");

  try {
    // 1. Check overall status counts
    const statusRes = await client.query(`
      SELECT workflow_status, requires_hitl, risk_rating, COUNT(*) as count 
      FROM audit_results 
      GROUP BY workflow_status, requires_hitl, risk_rating
      ORDER BY count DESC
    `);
    console.log("\nSummary counts:");
    statusRes.rows.forEach(r => console.log(`  ${r.count}x | Status: ${r.workflow_status} | HITL: ${r.requires_hitl} | Risk: ${r.risk_rating}`));

    // 2. Check flags and classes for a few specific ones
    const sampleRes = await client.query(`
      SELECT invoice_id, risk_rating, workflow_status, transaction_class, flag_count, data_masking_applied, updated_at
      FROM audit_results
      ORDER BY invoice_id
    `);
    
    console.log("\nSample rows details:");
    sampleRes.rows.forEach(r => {
      console.log(`  ${r.invoice_id} -> ${r.workflow_status.padEnd(14)} | Risk: ${String(r.risk_rating).padEnd(8)} | Class: ${r.transaction_class} | FlagCount: ${r.flag_count} | Masked: ${r.data_masking_applied}`);
    });

  } catch (err) {
    console.error("DB Error:", err);
  } finally {
    await client.end();
  }
}

verifyDB();
