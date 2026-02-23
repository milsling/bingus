-- Create custom_backgrounds table
CREATE TABLE IF NOT EXISTS "custom_backgrounds" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "image_url" text NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_by" varchar NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_custom_backgrounds_active" ON "custom_backgrounds" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_custom_backgrounds_sort_order" ON "custom_backgrounds" ("sort_order");
CREATE INDEX IF NOT EXISTS "idx_custom_backgrounds_created_at" ON "custom_backgrounds" ("created_at" DESC);
