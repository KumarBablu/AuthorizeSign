const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function runMigration() {
  const sqlPath = path.resolve(__dirname, '../supabase/migrations/20261028000000_init_authsign.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Connecting to Supabase PostgreSQL at aws-0-eu-west-1.pooler.supabase.com:6543...');

  const client = new Client({
    host: 'aws-0-eu-west-1.pooler.supabase.com',
    port: 6543,
    user: 'postgres.bfnsbctygqpufgyxivnu',
    password: 'Authsign@28259547',
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Connected successfully!');

    console.log('Executing AuthSign schema migration...');
    await client.query(sql);

    console.log('✅ Migration applied successfully!');

    // Verify tables
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('Public tables created:');
    console.log(res.rows.map((r) => ` - ${r.table_name}`).join('\n'));
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
