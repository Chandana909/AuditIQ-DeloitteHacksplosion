const { Client } = require('pg');
const connectionString = 'postgresql://neondb_owner:npg_NafhUtWPF51V@ep-bitter-credit-a1ffz9vw.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function findScenarios() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        
        console.log("--- SCANNING FOR SCENARIOS ---");

        // 1. Blacklisted / High Risk
        const riskRes = await client.query(`
            SELECT i.invoice_id, v.vendor_name, v.risk_rating, v.blacklist_status 
            FROM invoices i 
            JOIN vendor_master v ON i.vendor_id = v.vendor_id 
            WHERE v.blacklist_status = true OR v.risk_rating IN ('High', 'Critical')
            LIMIT 3;
        `);
        console.log("\n[CRITICAL/HIGH RISK VENDORS]");
        console.table(riskRes.rows);

        // 2. Amount Mismatch (Invoice vs PO)
        const poMismatchRes = await client.query(`
            SELECT i.invoice_id, i.invoice_amount, po.po_amount 
            FROM invoices i 
            JOIN purchase_orders po ON i.po_id = po.po_id 
            WHERE i.invoice_amount != po.po_amount
            LIMIT 3;
        `);
        console.log("\n[INVOICE VS PO MISMATCH]");
        console.table(poMismatchRes.rows);

        // 3. Amount Mismatch (Invoice vs GRN)
        const grnMismatchRes = await client.query(`
            SELECT i.invoice_id, i.invoice_amount, grn.received_amount 
            FROM invoices i 
            JOIN goods_receipts grn ON i.grn_id = grn.grn_id 
            WHERE i.invoice_amount != grn.received_amount
            LIMIT 3;
        `);
        console.log("\n[INVOICE VS GRN MISMATCH]");
        console.table(grnMismatchRes.rows);

        // 4. Duplicate Check (Same vendor, same amount, different ID as a heuristic)
        const dupRes = await client.query(`
            SELECT i1.invoice_id as id1, i2.invoice_id as id2, i1.invoice_amount, i1.vendor_id
            FROM invoices i1
            JOIN invoices i2 ON i1.invoice_amount = i2.invoice_amount 
             AND i1.vendor_id = i2.vendor_id 
             AND i1.invoice_id < i2.invoice_id
            LIMIT 3;
        `);
        console.log("\n[POTENTIAL DUPLICATES]");
        console.table(dupRes.rows);

    } finally {
        await client.end();
    }
}

findScenarios();
