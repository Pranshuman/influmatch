# 🗄️ SQLite Browser Tools for Influmatch

This directory contains several tools to help you browse and interact with your SQLite database.

## 📊 Available Tools

### 1. **Web Browser** (Recommended)
A beautiful web-based interface for browsing your database.

```bash
npm run browse:web
```
Then open: http://localhost:3001

**Features:**
- 📈 Real-time statistics dashboard
- 🔍 Interactive SQL query interface
- 📋 Quick query buttons for common operations
- 🎨 Beautiful, responsive design
- 🔒 Safe (only SELECT queries allowed)

### 2. **Command Line Browser**
A simple shell script that shows database overview and starts interactive SQLite.

```bash
npm run browse:cli
```

**Features:**
- 📊 Quick database overview
- 📈 Record counts for all tables
- 🔍 Sample data preview
- 💻 Interactive SQLite command line

### 3. **Node.js Browser**
An advanced Node.js-based command line browser with more features.

```bash
npm run browse:node
```

**Features:**
- 📋 Interactive command interface
- 🔍 Built-in help system
- 📊 Database information display
- 💻 Advanced SQLite command support

## 🚀 Quick Start

1. **For Web Interface (Easiest):**
   ```bash
   npm run browse:web
   ```
   Open http://localhost:3001 in your browser

2. **For Command Line:**
   ```bash
   npm run browse:cli
   ```

## 📋 Common SQL Queries

Here are some useful queries you can run:

### View All Users
```sql
SELECT * FROM users;
```

### View All Listings with Brand Info
```sql
SELECT l.*, u.name as brand_name 
FROM listings l 
JOIN users u ON l.brandId = u.id;
```

### View Proposals with Influencer Info
```sql
SELECT p.*, u.name as influencer_name 
FROM proposals p 
JOIN users u ON p.influencerId = u.id;
```

### User Statistics
```sql
SELECT 
  userType,
  COUNT(*) as count,
  AVG(CASE WHEN userType = 'brand' THEN 
    (SELECT COUNT(*) FROM listings WHERE brandId = users.id) 
  END) as avg_listings
FROM users 
GROUP BY userType;
```

### Recent Activity
```sql
SELECT 'user' as type, name, createdAt FROM users 
UNION ALL
SELECT 'listing' as type, title, createdAt FROM listings
ORDER BY createdAt DESC 
LIMIT 10;
```

## 🛠️ Database Schema

Your database contains these tables:

- **users**: User accounts (brands and influencers)
- **listings**: Campaign listings created by brands
- **proposals**: Proposals submitted by influencers
- **messages**: Messages between users

## 🔧 Troubleshooting

### Database Not Found
Make sure you're in the project directory and the `influmatch.db` file exists.

### Permission Issues
Make sure the browser scripts are executable:
```bash
chmod +x browse-db.sh
chmod +x sqlite-browser.js
chmod +x sqlite-web-browser.js
```

### Port Already in Use
If port 3001 is busy, you can modify the port in `sqlite-web-browser.js`:
```javascript
const PORT = 3002  // Change to any available port
```

## 📚 SQLite Commands Reference

### Basic Commands
- `.tables` - Show all tables
- `.schema` - Show database schema
- `.schema table_name` - Show schema for specific table
- `.help` - Show help
- `.quit` - Exit

### Useful Queries
- `SELECT COUNT(*) FROM table_name;` - Count records
- `SELECT * FROM table_name LIMIT 10;` - Show first 10 records
- `SELECT * FROM table_name ORDER BY column_name DESC;` - Sort by column

## 🎯 Tips

1. **Use the Web Browser** for the best experience
2. **Start with quick queries** to explore your data
3. **Use LIMIT** to avoid overwhelming results
4. **JOIN tables** to get related data
5. **Check the schema** if you're unsure about column names

Happy browsing! 🚀


