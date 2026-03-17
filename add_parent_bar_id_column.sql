-- Add parent_bar_id column to bars table for reply feature
-- This allows bars to be replies to other bars

ALTER TABLE bars ADD COLUMN parent_bar_id VARCHAR REFERENCES bars(id) ON DELETE SET NULL;

-- Create index for efficient querying of replies for a given bar
CREATE INDEX idx_bars_parent_bar_id ON bars(parent_bar_id);
