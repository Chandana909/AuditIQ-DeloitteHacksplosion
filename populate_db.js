const { Client } = require('pg');

const connectionString = "postgresql://neondb_owner:npg_NafhUtWPF51V@ep-bitter-credit-a1ffz9vw.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

const mockData = Array.from({ length: 20 }, (_, i) => {
  const idStr = String(i + 1).padStart(3, '0');
  return {
    vendorid: `TESTVEND${idStr}`, // Using TESTVEND prefix
    vendorname: `Mock Vendor ${idStr}`,
    transactionid: `TXN-${9000 + i}`,
    date: '2026-04-10',
    invoiceno: `INV-${1010 + i}`,
    pono: `PO-${5540 + i}`,
    grnno: `GRN-${880 + i}`,
    qtyordered: 100,
    qtyreceived: 100,
    qtybilled: 100,
    pototalamount: 50000,
    invoicetotalamount: 50000,
    invoicegstin: '27AACCH3456F21Z',
    officialgstin: '27AACCH3456F21Z',
    blackliststatus: false,
    riskrating: 'Low',
    pastduplicatecount: 0,
    approvername: 'John Doe',
    approverlimit: 100000,
    historicalsummary: JSON.stringify([{ amount: 50000, date: '2026-04-05' }])
  };
});

async function run() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log("Connected to Neon DB. Preparing to insert mock data...");
    
    // Optional: Clean up older test records
    await client.query("DELETE FROM vendor_audits WHERE vendorid LIKE 'TESTVEND%';");
    
    for (const record of mockData) {
      const keys = Object.keys(record);
      const values = Object.values(record);
      
      const query = `
        INSERT INTO vendor_audits (${keys.join(', ')})
        VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')})
      `;
      await client.query(query, values);
    }
    console.log("Successfully inserted 20 mock records.");
  } catch (err) {
    console.error("Error inserting data:", err);
  } finally {
    await client.end();
  }
}
run();
