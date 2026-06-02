import pkg from 'pg';
const { Client } = pkg;

const connectionString = "postgresql://neondb_owner:npg_NafhUtWPF51V@ep-bitter-credit-a1ffz9vw.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

const client = new Client({
  connectionString,
});

async function testConnection() {
  console.log('=== AuditIQ Neon Connection Test ===');
  try {
    await client.connect();
    console.log('✅ Connected to Neon successfully!');
    
    const res = await client.query('SELECT current_user, current_database(), version()');
    console.log(`   User: ${res.rows[0].current_user}`);
    console.log(`   DB:   ${res.rows[0].current_database}`);
    
    // Check existing tables to see if we're overwriting anything important
    const tables = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    console.log(`   Existing tables: ${tables.rows.length > 0 ? tables.rows.map(r => r.table_name).join(', ') : '(none)'}`);
    
    await client.end();
  } catch (err) {
    console.log('❌ Connection failed:', err.message);
  }
}

testConnection();
