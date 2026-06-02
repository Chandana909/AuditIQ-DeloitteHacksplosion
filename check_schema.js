const { Client } = require('pg');
const connectionString = 'postgresql://neondb_owner:npg_NafhUtWPF51V@ep-bitter-credit-a1ffz9vw.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function checkSchema() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        const targets = ['invoices', 'purchase_orders', 'goods_receipts', 'vendor_master', 'v_three_way_match'];
        for (const target of targets) {
            console.log(`\n=== Schema for: ${target} ===`);
            const res = await client.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = $1 
                ORDER BY ordinal_position;
            `, [target]);
            res.rows.forEach(row => {
                console.log(`- ${row.column_name} (${row.data_type})`);
            });
        }
    } finally {
        await client.end();
    }
}

checkSchema();
