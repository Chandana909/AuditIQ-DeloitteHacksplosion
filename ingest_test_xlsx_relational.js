const fs = require('fs');
const { Client } = require('pg');
const xlsx = require('xlsx');

const connectionString = "postgresql://neondb_owner:npg_NafhUtWPF51V@ep-bitter-credit-a1ffz9vw.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

// Read and sanitize Excel
function processExcel() {
    const workbook = xlsx.readFile('test.xlsx');
    
    // 1. INVOICES
    const rawInvoices = xlsx.utils.sheet_to_json(workbook.Sheets['Invoices']);
    const invoices = rawInvoices.slice(0, 50).map((r, i) => {
        let amount = parseFloat(r.invoice_amount) || 50000;
        let gstin = r.gstin || '27AAAAA1006A1Z1';

        // Anomaly: Round Number
        if (i === 1) { amount = 100000; }
        
        // Anomaly: Invalid GSTIN
        if (i === 5) { gstin = '99AAAAA1006A1Z1'; }

        // Anomaly: Weekend
        let d = new Date('2026-04-10'); // Friday
        if (i === 8) { d = new Date('2026-04-11'); } // Saturday

        // Anomaly: Duplicate Invoice Number
        let inv_no = r.invoice_number;
        if (i === 12) { inv_no = 'INV-NO-100001'; } // Duplicate of first row

        return {
            invoice_id: r.invoice_id || `INV${1000+i}`,
            date: d.toISOString().split('T')[0],
            vendor_id: r.vendor_id || `VEND100${i}`,
            invoice_number: inv_no || `INV-NO-100${i}`,
            po_id: r.po_id || `PO${1000+i}`,
            grn_id: r.grn_id || `GRN${1000+i}`,
            invoice_amount: amount,
            gstin: gstin
        };
    });

    // 2. PURCHASE ORDERS
    const poMap = {};
    const rawPOs = xlsx.utils.sheet_to_json(workbook.Sheets['PurchaseOrders']);
    rawPOs.slice(0, 50).forEach((r, i) => {
        // Fix misaligned columns from the source excel file
        let poAmt = parseFloat(r.po_date) || 50000; 
        let invoice = invoices.find(inv => inv.po_id === r.po_id);
        
        // If matched with invoice, sync the amount for the happy path
        if (invoice) { poAmt = invoice.invoice_amount; }

        // Anomaly: 3-way match failure (PO < Invoice)
        if (i === 3 && invoices[3]) {
            poAmt = invoices[3].invoice_amount - 15000;
        }

        poMap[r.po_id] = {
            po_id: r.po_id,
            vendor_id: invoices[i] ? invoices[i].vendor_id : r.vendor_id,
            po_date: '2026-04-01',
            po_amount: poAmt,
            status: 'Approved'
        };
    });
    // Ensure all invoices have POs
    invoices.forEach((inv, i) => {
        if (!poMap[inv.po_id]) {
            poMap[inv.po_id] = {
                po_id: inv.po_id,
                vendor_id: inv.vendor_id,
                po_date: '2026-04-01',
                po_amount: inv.invoice_amount,
                status: 'Approved'
            };
        }
    });

    // 3. GOODS RECEIPTS
    const grnMap = {};
    const rawGRNs = xlsx.utils.sheet_to_json(workbook.Sheets['GoodsReceipts']);
    rawGRNs.slice(0, 50).forEach((r, i) => {
        let recAmt = parseFloat(r.receipt_date) || 50000;
        let invoice = invoices.find(inv => inv.po_id === r.po_id);
    });
    // Just map perfectly from invoices and add anomalies
    invoices.forEach((inv, i) => {
        let recAmt = inv.invoice_amount;
        
        // Anomaly: Short receipt
        if (i === 4) {
            recAmt = inv.invoice_amount - 500;
        }

        grnMap[inv.po_id] = {
            grn_id: inv.grn_id,
            po_id: inv.po_id,
            receipt_date: '2026-04-05',
            received_amount: recAmt
        };
    });

    // 4. VENDOR MASTER
    const vendorsMap = {};
    invoices.forEach((inv, i) => {
        let blacklist = false;
        // Anomaly: Blacklisted Vendor
        if (i === 7) { blacklist = true; }

        vendorsMap[inv.vendor_id] = {
            vendor_id: inv.vendor_id,
            vendor_name: `Corp G${i}`,
            official_gstin: inv.gstin,
            registered_address: '123 Fake St',
            risk_rating: blacklist ? 'High' : 'Low',
            blacklist_status: blacklist
        };
    });

    // 5. APPROVAL LOGS
    const approvalMap = {};
    invoices.forEach((inv, i) => {
        let limit = 1000000;
        // Anomaly: Limit Violation
        if (i === 6) {
            limit = inv.invoice_amount - 1000; // Limit lower than invoice
        }

        approvalMap[inv.invoice_id] = {
            log_id: `LOG-${5000+i}`,
            transaction_id: inv.invoice_id,
            approver_name: `Manager_${i}`,
            approver_role: 'Reviewer',
            timestamp: new Date().toISOString(),
            action_taken: 'Approve',
            amount_limit: limit
        };
    });

    return {
        invoices: invoices,
        purchase_orders: Object.values(poMap),
        goods_receipts: Object.values(grnMap),
        vendor_master: Object.values(vendorsMap),
        approval_logs: Object.values(approvalMap)
    };
}


async function recreateTables(client) {
    console.log("Dropping existing tables...");
    await client.query(`DROP TABLE IF EXISTS vendor_audits CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS audit_results CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS approval_logs CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS vendor_master CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS goods_receipts CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS purchase_orders CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS invoices CASCADE;`);

    console.log("Creating relational tables...");
    
    await client.query(`
        CREATE TABLE vendor_master (
            vendor_id VARCHAR(50) PRIMARY KEY,
            vendor_name VARCHAR(100),
            official_gstin VARCHAR(50),
            registered_address TEXT,
            risk_rating VARCHAR(20),
            blacklist_status BOOLEAN
        );
    `);

    await client.query(`
        CREATE TABLE purchase_orders (
            po_id VARCHAR(50) PRIMARY KEY,
            vendor_id VARCHAR(50),
            po_date DATE,
            po_amount NUMERIC,
            status VARCHAR(50)
        );
    `);

    await client.query(`
        CREATE TABLE goods_receipts (
            grn_id VARCHAR(50) PRIMARY KEY,
            po_id VARCHAR(50),
            receipt_date DATE,
            received_amount NUMERIC
        );
    `);

    await client.query(`
        CREATE TABLE invoices (
            invoice_id VARCHAR(50) PRIMARY KEY,
            date DATE,
            vendor_id VARCHAR(50),
            invoice_number VARCHAR(50),
            po_id VARCHAR(50),
            grn_id VARCHAR(50),
            invoice_amount NUMERIC,
            gstin VARCHAR(50)
        );
    `);

    await client.query(`
        CREATE TABLE approval_logs (
            log_id VARCHAR(50) PRIMARY KEY,
            transaction_id VARCHAR(50),
            approver_name VARCHAR(100),
            approver_role VARCHAR(50),
            timestamp TIMESTAMP,
            action_taken VARCHAR(50),
            amount_limit NUMERIC
        );
    `);

    await client.query(`
        CREATE TABLE audit_results (
            invoice_id VARCHAR(50) PRIMARY KEY,
            risk_rating VARCHAR(20),
            flags_detected JSONB,
            explanation TEXT,
            recommended_action TEXT,
            citation TEXT
        );
    `);
}

async function insertData(client, table, dataArray) {
    if (dataArray.length === 0) return;
    const keys = Object.keys(dataArray[0]);
    for (const record of dataArray) {
        const values = keys.map(k => record[k]);
        const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(', ');
        const query = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
        await client.query(query, values);
    }
}

async function run() {
  let client;
  try {
      const data = processExcel();
      client = new Client({ connectionString });
      await client.connect();
      
      await recreateTables(client);
      
      console.log("Inserting Vendor Master...");
      await insertData(client, 'vendor_master', data.vendor_master);
      console.log("Inserting Purchase Orders...");
      await insertData(client, 'purchase_orders', data.purchase_orders);
      console.log("Inserting Goods Receipts...");
      await insertData(client, 'goods_receipts', data.goods_receipts);
      console.log("Inserting Invoices...");
      await insertData(client, 'invoices', data.invoices);
      console.log("Inserting Approval Logs...");
      await insertData(client, 'approval_logs', data.approval_logs);
      
      // Initialize empty audit records
      const initialAudits = data.invoices.map(inv => ({
          invoice_id: inv.invoice_id,
          risk_rating: 'Pending',
          flags_detected: JSON.stringify([]),
          explanation: null,
          recommended_action: null,
          citation: null
      }));
      console.log("Initializing Audit Results...");
      await insertData(client, 'audit_results', initialAudits);

      console.log("Ingestion completed successfully for 6-table normalized schema!");
  } catch(err) {
      console.error("Failed:", err);
  } finally {
      if (client) await client.end();
  }
}

run();
