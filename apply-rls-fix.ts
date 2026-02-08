import pg from 'pg';
import { readFileSync } from 'fs';
import path from 'path';

const { Client } = pg;

// Load .env file manually
function loadEnv() {
  try {
    const envPath = path.join(process.cwd(), '.env');
    const envFile = readFileSync(envPath, 'utf-8');
    const lines = envFile.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=').replace(/^["']|["']$/g, '');
      
      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    }
    console.log('✅ Environment variables loaded from .env\n');
  } catch (error) {
    console.warn('⚠️  Could not load .env file, using existing environment variables\n');
  }
}

async function runRLSMigration() {
  // Load environment variables
  loadEnv();

  const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ No database connection URL found. Set SUPABASE_DATABASE_URL or DATABASE_URL in .env');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Read the migration SQL file
    const migrationPath = path.join(process.cwd(), 'fix_rls_policies.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    console.log('\n📋 Applying RLS policies migration...\n');

    // Parse SQL file: remove comments and split by semicolon
    const lines = sql.split('\n');
    let currentStatement = '';
    const statements: string[] = [];
    
    for (const line of lines) {
      // Remove comments (both full line and inline)
      const cleaned = line.split('--')[0].trim();
      
      if (!cleaned) continue;
      
      currentStatement += ' ' + cleaned;
      
      if (cleaned.endsWith(';')) {
        statements.push(currentStatement.trim());
        currentStatement = '';
      }
    }

    // Add any remaining statement
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }

    let successCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      if (!statement || statement.startsWith('--')) continue;

      try {
        await client.query(statement);
        const statementPreview = statement.substring(0, 60).replace(/\n/g, ' ');
        console.log(`✓ ${statementPreview}...`);
        successCount++;
      } catch (error) {
        // Some policies might exist, that's ok
        if (error instanceof Error && error.message.includes('already exists')) {
          console.log(`⚠ Policy already exists (skipped)`);
        } else {
          console.error(`✗ Error: ${error instanceof Error ? error.message : String(error)}`);
          errorCount++;
        }
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Migration complete!`);
    console.log(`   Successful: ${successCount}`);
    if (errorCount > 0) {
      console.log(`   ⚠ Errors (may be ok if policies existed): ${errorCount}`);
    }
    console.log(`${'='.repeat(60)}`);

    // Verify RLS is enabled and policies exist
    const verifyResult = await client.query(`
      SELECT 
        tablename,
        CASE WHEN rowsecurity THEN 'Enabled' ELSE 'Disabled' END as rls_status,
        (SELECT COUNT(*) FROM pg_policies WHERE pg_policies.tablename = pg_tables.tablename) as policy_count
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename IN (
        'achievement_badge_images',
        'ai_review_requests', 
        'ai_settings',
        'bar_sequence',
        'debug_logs',
        'flagged_phrases',
        'maintenance_status',
        'password_reset_codes',
        'protected_bars',
        'sessions',
        'site_settings',
        'verification_codes'
      )
      ORDER BY tablename;
    `);

    console.log('\n📊 Verification Results:');
    console.log('Table Name | RLS Status | Policy Count');
    console.log('-'.repeat(60));
    verifyResult.rows.forEach(row => {
      const status = row.rls_status === 'Enabled' ? '✅' : '❌';
      const policyInfo = row.policy_count > 0 ? `${row.policy_count} policies` : 'No policies';
      console.log(`${status} ${row.tablename.padEnd(30)} | ${row.rls_status.padEnd(10)} | ${policyInfo}`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runRLSMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
