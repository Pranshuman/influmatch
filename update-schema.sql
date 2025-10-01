-- Update Supabase Database Schema for Chat System
-- Run this in Supabase SQL Editor to add proposalId field to messages table

-- Add proposalId column to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS "proposalId" BIGINT REFERENCES proposals(id);

-- Add index for proposal-specific message queries
CREATE INDEX IF NOT EXISTS idx_messages_proposal_id ON messages("proposalId");

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'messages' 
ORDER BY ordinal_position;
