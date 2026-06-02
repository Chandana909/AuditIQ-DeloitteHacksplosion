import pg from 'pg';
const { Client } = pg;

const host = 'genw-innovation-nonprod-aurora-cluster.cluster-ct4kk4qgm9lt.ap-south-1.rds.amazonaws.com';
const port = 5432;
const database = 'Workspace42_data';
const password = 'hacksplosionws42';

const usernames = ['workspaceuser42', 'Workspaceuser42'];

async function testConnection(user, useSSL) {
  const client = new Client({
    host, port, database, user, password,
    ssl: useSSL ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 20000, // Increased to 20s
  });

  try {
    console.log(`\n🔄 Testing username: "${user}" | SSL: ${useSSL ? 'ON' : 'OFF'}...`);
    await client.connect();
    const res = await client.query('SELECT current_user, current_database(), version()');
    console.log(`✅ SUCCESS with "${user}" (SSL: ${useSSL ? 'ON' : 'OFF'})`);
    console.log(`   User: ${res.rows[0].current_user}`);
    console.log(`   DB:   ${res.rows[0].current_database}`);
    
    const tables = await client.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
    );
    console.log(`   Existing tables: ${tables.rows.length > 0 ? tables.rows.map(r => r.table_name).join(', ') : '(none)'}`);
    
    await client.end();
    return true;
  } catch (err) {
    console.log(`❌ FAILED: ${err.message}`);
    try { await client.end(); } catch (_) {}
    return false;
  }
}

(async () => {
  console.log('=== AuditIQ Aurora Connection Test (Allow Mode) ===');
  
  for (const user of usernames) {
    // 1. Try Non-SSL first (Matching "Allow" behavior)
    if (await testConnection(user, false)) return;
    // 2. Try SSL second
    if (await testConnection(user, true)) return;
  }

  console.log('\n💀 Still failing. This is almost certainly a Network/VPC/Firewall issue.');
  console.log('Ensure you are on the Deloitte VPN or your IP is whitelisted in AWS Security Groups.');
})();
