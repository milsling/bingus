import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function createSessionsTable() {
  try {
    console.log('Creating sessions table...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "public"."sessions" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL
      );
    `);
    
    console.log('Adding primary key...');
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'session_pkey'
        ) THEN
          ALTER TABLE "public"."sessions" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid");
        END IF;
      END
      $$;
    `);
    
    console.log('Creating index...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "public"."sessions" ("expire");
    `);
    
    console.log('Disabling RLS...');
    await pool.query(`
      ALTER TABLE "public"."sessions" DISABLE ROW LEVEL SECURITY;
    `);
    
    console.log('✅ Sessions table created successfully!');
  } catch (error) {
    console.error('Error creating sessions table:', error);
  } finally {
    await pool.end();
  }
}

createSessionsTable();
