-- Create sessions table for connect-pg-simple
CREATE TABLE IF NOT EXISTS "public"."sessions" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
)
WITH (OIDS=FALSE);

ALTER TABLE "public"."sessions" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "public"."sessions" ("expire");

-- Disable RLS for sessions table
ALTER TABLE "public"."sessions" DISABLE ROW LEVEL SECURITY;
