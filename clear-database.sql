-- Clear Database Script for Influmatch
-- This script will delete all campaigns (listings), proposals, deliverables, and messages
-- Users will be preserved

-- WARNING: This will permanently delete all data except users!
-- Make sure you have a backup if needed

-- Delete in order due to foreign key constraints:

-- 1. Delete all deliverables (they reference proposals)
DELETE FROM deliverables;

-- 2. Delete all messages (they reference proposals)
DELETE FROM messages;

-- 3. Delete all proposals (they reference listings)
DELETE FROM proposals;

-- 4. Delete all listings/campaigns (they reference users)
DELETE FROM listings;

-- Reset auto-increment counters (optional, but good practice)
-- Note: Supabase uses BIGSERIAL which auto-resets, but this is explicit
ALTER SEQUENCE deliverables_id_seq RESTART WITH 1;
ALTER SEQUENCE messages_id_seq RESTART WITH 1;
ALTER SEQUENCE proposals_id_seq RESTART WITH 1;
ALTER SEQUENCE listings_id_seq RESTART WITH 1;

-- Verify the deletion
SELECT 'deliverables' as table_name, COUNT(*) as remaining_count FROM deliverables
UNION ALL
SELECT 'messages', COUNT(*) FROM messages
UNION ALL
SELECT 'proposals', COUNT(*) FROM proposals
UNION ALL
SELECT 'listings', COUNT(*) FROM listings
UNION ALL
SELECT 'users', COUNT(*) FROM users;

-- Show success message
SELECT 'Database cleared successfully! All campaigns, proposals, deliverables, and messages have been deleted. Users are preserved.' as status;
