const fs = require('fs');
const { Client } = require('pg');
const xlsx = require('xlsx');

const connectionString = "postgresql://neondb_owner:npg_NafhUtWPF51V@ep-bitter-credit-a1ffz9vw.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

// Helper to generate random int
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Read Excel File
function processExcel() {
    const workbook = xlsx.readFile('test.xlsx');
    const sheetName = workbook.SheetNames[0];
    const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: false });
    
    // We will just process the first 30 rows to ensure snappy demo speeds
    const sampleData = rawData.slice(0, 30);
    
    return sampleData.map((row, i) => {
        const idStr = String(i + 1).padStart(3, '0');
        
        let invoiceAmt = parseFloat(row.invoice_amount) || getRandomInt(10000, 200000);
        let poAmt = invoiceAmt;
        let limit = 200000;
        let date = row.date || '2026-04-10'; // A Friday
        let invoiceno = row.invoice_number || `INV-${1010 + i}`;
        let gstin = row.gstin || '27AACCH3456F21Z';
        
        // Edge Case Injection Strategy
        
        // 1. Three-way match issue (PO amount != Invoice amount)
        if (i === 2) { poAmt = invoiceAmt - 5000; } 
        
        // 2. Limit Enforcement (Invoice amount > Approval Limit)
        if (i === 5) { limit = invoiceAmt - 10000; }
        
        // 3. Weekend anomaly
        if (i === 8) { date = '2026-04-11'; } // April 11, 2026 is a Saturday
        
        // 4. Quantity Mismatch
        let qtyreceived = 100;
        let qtybilled = 100;
        if (i === 11) { qtyreceived = 80; qtybilled = 100; } // Short receipt
        
        // 5. Invalid GSTIN
        if (i === 15) { gstin = '99AACCH3456F21Z'; } // Invalid state code 99 
        
        // 6. Duplicate Invoice
        if (i === 18) { invoiceno = `INV-1015`; } // Duplicate of i=5
        
        return {
            transactionid: row.invoice_id || `TXN-${9000 + i}`,
            vendorid: row.vendor_id || `TESTVEND${idStr}`,
            vendorname: `Vendor ${idStr}`,
            date: date,
            invoiceno: invoiceno,
            pono: row.po_id || `PO-${5540 + i}`,
            grnno: row.grn_id || `GRN-${880 + i}`,
            qtyordered: 100,
            qtyreceived: qtyreceived,
            qtybilled: qtybilled,
            pototalamount: poAmt,
            invoicetotalamount: invoiceAmt,
            invoicegstin: gstin,
            officialgstin: '27AACCH3456F21Z',
            blackliststatus: (i === 20), // One blacklisted vendor
            pastduplicatecount: (i === 18) ? 1 : 0,
            approvername: 'Jane Auditor',
            approverlimit: limit,
            historicalsummary: JSON.stringify([{ amount: invoiceAmt, date: '2025-01-01' }]),
            
            // Empty columns mapped for the AI output
            riskrating: 'Pending',
            flags_detected: JSON.stringify([]),
            explanation: null,
            recommended_action: null,
            citation: null
        };
    });
}

async function recreateTableAndSeed(client, validData) {
    console.log("Dropping and recreating vendor_audits table with complete AI schema...");
    
    await client.query(`DROP TABLE IF EXISTS vendor_audits CASCADE;`);
    await client.query(`
        CREATE TABLE vendor_audits (
            transactionid VARCHAR(50) PRIMARY KEY,
            vendorid VARCHAR(50),
            vendorname VARCHAR(100),
            date DATE,
            invoiceno VARCHAR(50),
            pono VARCHAR(50),
            grnno VARCHAR(50),
            qtyordered INT,
            qtyreceived INT,
            qtybilled INT,
            pototalamount NUMERIC,
            invoicetotalamount NUMERIC,
            invoicegstin VARCHAR(50),
            officialgstin VARCHAR(50),
            blackliststatus BOOLEAN,
            pastduplicatecount INT,
            approvername VARCHAR(100),
            approverlimit NUMERIC,
            historicalsummary JSONB,
            
            riskrating VARCHAR(20),
            flags_detected JSONB,
            explanation TEXT,
            recommended_action TEXT,
            citation TEXT
        );
    `);
    
    console.log("Table created successfully. Inserting rows...");
    
    for (const record of validData) {
      const keys = Object.keys(record);
      const values = Object.values(record);
      
      const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(', ');
      const query = `INSERT INTO vendor_audits (${keys.join(', ')}) VALUES (${placeholders})`;
      
      await client.query(query, values);
    }
    
    console.log(`Successfully ingested ${validData.length} records including edge cases.`);
}

async function run() {
  let client;
  try {
      const finalData = processExcel();
      client = new Client({ connectionString });
      await client.connect();
      await recreateTableAndSeed(client, finalData);
      
  } catch(err) {
      console.error("Failed:", err);
  } finally {
      if (client) await client.end();
  }
}

run();
