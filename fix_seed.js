const { Client } = require('pg');

const DB_CONN = "postgresql://neondb_owner:npg_NafhUtWPF51V@ep-bitter-credit-a1ffz9vw.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

async function fixSeedData() {
  const client = new Client({ connectionString: DB_CONN });
  try {
    await client.connect();
    
    // Fix INV-018 to point to VEN-009 (the blacklisted vendor)
    const res1 = await client.query(`UPDATE invoices SET vendor_id = 'VEN-009' WHERE invoice_id = 'INV-018'`);
    console.log(`Updated INV-018: ${res1.rowCount} row(s) affected`);

    // Let's also check if any other invoices need fixing (INV-016 is shell risk, VEN-007)
    // INV-016 was VEN-007 which is correct (shell_risk 82, shared_director Rakesh Verma).
    
    console.log("Seed data fixed successfully.");
  } catch (err) {
    console.error("Error fixing data:", err);
  } finally {
    await client.end();
  }
}

fixSeedData();
