-- Add PRO Card related columns to users table
-- proStartDate: Tracks when user first became a PRO member
-- showProCard: Whether to display the PRO card on their profile

ALTER TABLE users ADD COLUMN IF NOT EXISTS pro_start_date TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS show_pro_card BOOLEAN NOT NULL DEFAULT TRUE;

-- For existing PRO members, set their pro_start_date to their membership_expires_at minus 1 month
-- (approximate their start date since we don't have historical data)
UPDATE users 
SET pro_start_date = membership_expires_at - INTERVAL '1 month'
WHERE membership_tier IN ('donor', 'donor_plus') 
  AND membership_expires_at IS NOT NULL 
  AND pro_start_date IS NULL;

-- For PRO members without expiration date (lifetime or manual), set to current date
UPDATE users 
SET pro_start_date = NOW()
WHERE membership_tier IN ('donor', 'donor_plus') 
  AND pro_start_date IS NULL;
