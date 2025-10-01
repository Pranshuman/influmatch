#!/bin/bash
# Simple SQLite Browser Script for Influmatch Database

echo "🗄️  Influmatch SQLite Database Browser"
echo "====================================="
echo "📊 Database: influmatch.db"
echo ""

# Check if database exists
if [ ! -f "influmatch.db" ]; then
    echo "❌ Database file 'influmatch.db' not found!"
    echo "   Make sure you're in the project directory."
    exit 1
fi

echo "📋 Quick Database Overview:"
echo "=========================="

# Show tables
echo "📋 Tables:"
sqlite3 influmatch.db ".tables"

echo ""
echo "📈 Record Counts:"
sqlite3 influmatch.db "
SELECT 'users: ' || COUNT(*) FROM users
UNION ALL
SELECT 'listings: ' || COUNT(*) FROM listings
UNION ALL
SELECT 'proposals: ' || COUNT(*) FROM proposals
UNION ALL
SELECT 'messages: ' || COUNT(*) FROM messages;
"

echo ""
echo "🔍 Sample Data:"
echo "==============="

echo ""
echo "👥 Users (first 3):"
sqlite3 influmatch.db "SELECT id, name, email, userType, createdAt FROM users LIMIT 3;"

echo ""
echo "📝 Listings (first 3):"
sqlite3 influmatch.db "SELECT id, title, category, budget, status, createdAt FROM listings LIMIT 3;"

echo ""
echo "💬 Proposals (first 3):"
sqlite3 influmatch.db "SELECT id, listingId, influencerId, status, createdAt FROM proposals LIMIT 3;"

echo ""
echo "📨 Messages (first 3):"
sqlite3 influmatch.db "SELECT id, conversationId, senderId, recipientId, createdAt FROM messages LIMIT 3;"

echo ""
echo "🚀 Starting Interactive SQLite Browser..."
echo "   Type '.help' for commands, '.quit' to exit"
echo ""

# Start interactive sqlite3 session
sqlite3 influmatch.db





