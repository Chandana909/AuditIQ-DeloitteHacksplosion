import pkg from 'pg';
import fs from 'fs';
import path from 'path';
const { Client } = pkg;

const connectionString = "postgresql://neondb_owner:npg_NafhUtWPF51V@ep-bitter-credit-a1ffz9vw.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
const schemaPath = path.join(process.cwd(), 'schema.txt');

const client = new Client({
  connectionString,
});

async function applySchema() {
  console.log('=== Applying AuditIQ v3.0 Schema to Neon ===');
  try {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await client.connect();
    console.log('✅ Connected to Neon.');

    console.log('⏳ Executing schema script... (This drops old tables and recreates them)');
    await client.query(schemaSql);
    
    console.log('✅ Schema v3.0 applied successfully!');
    
    const tables = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    console.log(`\n📊 Current Tables: ${tables.rows.map(r => r.table_name).join(', ')}`);
    
    const views = await client.query(
      "SELECT table_name FROM information_schema.views WHERE table_schema = 'public' ORDER BY table_name"
    );
    console.log(`📈 Current Views: ${views.rows.map(r => r.table_name).join(', ')}`);

    await client.end();
  } catch (err) {
    console.log('❌ Error applying schema:', err.message);
    if (err.position) {
      console.log('   Error at position:', err.position);
    }
  }
}

applySchema();
