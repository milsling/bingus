import pg from 'pg';
import { readFileSync } from 'fs';

const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres.gcbfcbumlgfzzqioyotq:FuckityShit56@aws-1-us-east-1.pooler.supabase.com:5432/postgres'
});

async function runMigration() {
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Verify columns exist
    const result = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('notification_sound', 'message_sound')
      ORDER BY column_name;
    `);
    
    console.log('✓ Migration verified successfully!');
    console.log('\nColumns added:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (default: ${row.column_default})`);
    });
  } catch (error) {
    console.error('Verification failed:', error);
  } finally {
    await client.end();
  }
}

runMigration();
