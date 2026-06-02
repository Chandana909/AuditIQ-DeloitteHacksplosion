const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://neondb_owner:npg_NafhUtWPF51V@ep-bitter-credit-a1ffz9vw.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const filePath = path.join(__dirname, 'data_opus_4.7.txt');

async function seedData() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log('Connected to Neon database.');

        const sql = fs.readFileSync(filePath, 'utf8');

        // Start transaction
        await client.query('BEGIN');

        console.log('Cleaning existing data...');
        await client.query('TRUNCATE audit_results, goods_receipts, purchase_orders, invoices, vendor_master, company_policies CASCADE');

        console.log('Inserting seed data...');
        await client.query(sql);

        await client.query('COMMIT');
        console.log('Seeding complete! 10 Vendors, 20 Invoices, 20 POs, 20 GRNs, 20 Audit Results, and 2 Policies inserted.');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error during seeding:', err);
    } finally {
        await client.end();
    }
}

seedData();
