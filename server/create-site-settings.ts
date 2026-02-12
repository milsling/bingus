import { db } from "./db";
import { sql } from "drizzle-orm";

async function createSiteSettings() {
  console.log("Creating site_settings table...");
  
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS site_settings (
      id VARCHAR PRIMARY KEY DEFAULT 'default',
      message_of_the_day TEXT,
      motd_enabled BOOLEAN NOT NULL DEFAULT false,
      motd_style TEXT NOT NULL DEFAULT 'info',
      home_hero_headline TEXT,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_by VARCHAR REFERENCES users(id)
    )
  `);
  
  await db.execute(sql`
    INSERT INTO site_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING
  `);
  
  console.log("✅ site_settings table created!");
}

createSiteSettings()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed:", err);
    process.exit(1);
  });
