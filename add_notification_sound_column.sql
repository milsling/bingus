-- Add notification_sound column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_sound TEXT NOT NULL DEFAULT 'chime';

-- Add message_sound column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS message_sound TEXT NOT NULL DEFAULT 'ding';

-- Verify the columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('notification_sound', 'message_sound');
