-- Add campaignDeadline column to existing listings table
-- This migration adds the campaignDeadline column to the listings table

-- Add the campaignDeadline column
ALTER TABLE listings ADD COLUMN IF NOT EXISTS "campaignDeadline" TEXT;

-- Add a comment to document the column
COMMENT ON COLUMN listings."campaignDeadline" IS 'Campaign deadline timestamp (end of day) for when deliverables are due';

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'listings' 
AND column_name = 'campaignDeadline';
