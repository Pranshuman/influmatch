#!/usr/bin/env node
// Web-based SQLite Browser for Influmatch Database
// Simple HTML interface to browse and query the SQLite database

import express from 'express'
import { connectToDatabase, getDatabase } from './database-sqlite.js'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3001

// Middleware
app.use(express.json())
app.use(express.static('public'))

let db = null

// Connect to database
async function initDatabase() {
  try {
    await connectToDatabase()
    db = getDatabase()
    console.log('✅ Connected to SQLite database')
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    process.exit(1)
  }
}

// Routes
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Influmatch SQLite Browser</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5; 
            color: #333;
        }
        .container { 
            max-width: 1200px; 
            margin: 0 auto; 
            padding: 20px; 
        }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; 
            padding: 30px; 
            border-radius: 10px; 
            margin-bottom: 30px;
            text-align: center;
        }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header p { opacity: 0.9; font-size: 1.1em; }
        .stats { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 20px; 
            margin-bottom: 30px; 
        }
        .stat-card { 
            background: white; 
            padding: 20px; 
            border-radius: 10px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
        }
        .stat-number { 
            font-size: 2em; 
            font-weight: bold; 
            color: #667eea; 
            margin-bottom: 5px; 
        }
        .stat-label { 
            color: #666; 
            text-transform: uppercase; 
            font-size: 0.9em; 
            letter-spacing: 1px; 
        }
        .query-section { 
            background: white; 
            padding: 30px; 
            border-radius: 10px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }
        .query-section h2 { 
            margin-bottom: 20px; 
            color: #333; 
            border-bottom: 2px solid #667eea; 
            padding-bottom: 10px; 
        }
        .query-input { 
            width: 100%; 
            height: 100px; 
            padding: 15px; 
            border: 2px solid #e0e0e0; 
            border-radius: 8px; 
            font-family: 'Monaco', 'Menlo', monospace; 
            font-size: 14px;
            resize: vertical;
            margin-bottom: 15px;
        }
        .query-input:focus { 
            outline: none; 
            border-color: #667eea; 
        }
        .btn { 
            background: #667eea; 
            color: white; 
            border: none; 
            padding: 12px 24px; 
            border-radius: 6px; 
            cursor: pointer; 
            font-size: 16px;
            transition: background 0.3s;
        }
        .btn:hover { 
            background: #5a6fd8; 
        }
        .results { 
            background: white; 
            padding: 20px; 
            border-radius: 10px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-top: 20px;
        }
        .results h3 { 
            margin-bottom: 15px; 
            color: #333; 
        }
        .table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 10px; 
        }
        .table th, .table td { 
            padding: 12px; 
            text-align: left; 
            border-bottom: 1px solid #e0e0e0; 
        }
        .table th { 
            background: #f8f9fa; 
            font-weight: 600; 
            color: #333; 
        }
        .table tr:hover { 
            background: #f8f9fa; 
        }
        .error { 
            background: #fee; 
            color: #c33; 
            padding: 15px; 
            border-radius: 6px; 
            border-left: 4px solid #c33; 
        }
        .loading { 
            text-align: center; 
            padding: 20px; 
            color: #666; 
        }
        .quick-queries { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
            gap: 15px; 
            margin-bottom: 20px; 
        }
        .quick-query { 
            background: #f8f9fa; 
            padding: 15px; 
            border-radius: 6px; 
            cursor: pointer; 
            border: 1px solid #e0e0e0;
            transition: all 0.3s;
        }
        .quick-query:hover { 
            background: #e9ecef; 
            border-color: #667eea; 
        }
        .quick-query h4 { 
            margin-bottom: 8px; 
            color: #333; 
        }
        .quick-query p { 
            color: #666; 
            font-size: 0.9em; 
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🗄️ Influmatch SQLite Browser</h1>
            <p>Browse and query your database with ease</p>
        </div>
        
        <div class="stats" id="stats">
            <div class="stat-card">
                <div class="stat-number" id="users-count">-</div>
                <div class="stat-label">Users</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="listings-count">-</div>
                <div class="stat-label">Listings</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="proposals-count">-</div>
                <div class="stat-label">Proposals</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="messages-count">-</div>
                <div class="stat-label">Messages</div>
            </div>
        </div>
        
        <div class="query-section">
            <h2>🔍 Database Query</h2>
            
            <div class="quick-queries">
                <div class="quick-query" onclick="setQuery('SELECT * FROM users LIMIT 10;')">
                    <h4>👥 All Users</h4>
                    <p>View all registered users</p>
                </div>
                <div class="quick-query" onclick="setQuery('SELECT * FROM listings LIMIT 10;')">
                    <h4>📝 All Listings</h4>
                    <p>View all campaign listings</p>
                </div>
                <div class="quick-query" onclick="setQuery('SELECT * FROM proposals LIMIT 10;')">
                    <h4>💬 All Proposals</h4>
                    <p>View all submitted proposals</p>
                </div>
                <div class="quick-query" onclick="setQuery('SELECT * FROM messages LIMIT 10;')">
                    <h4>📨 All Messages</h4>
                    <p>View all messages</p>
                </div>
                <div class="quick-query" onclick="setQuery('SELECT l.title, l.budget, u.name as brand_name FROM listings l JOIN users u ON l.brandId = u.id;')">
                    <h4>🏢 Listings with Brands</h4>
                    <p>Listings with brand information</p>
                </div>
                <div class="quick-query" onclick="setQuery('SELECT u.name, u.userType, COUNT(l.id) as listing_count FROM users u LEFT JOIN listings l ON u.id = l.brandId GROUP BY u.id;')">
                    <h4>📊 User Statistics</h4>
                    <p>Users with their listing counts</p>
                </div>
            </div>
            
            <textarea class="query-input" id="queryInput" placeholder="Enter your SQL query here...&#10;Example: SELECT * FROM users WHERE userType = 'brand';"></textarea>
            <button class="btn" onclick="executeQuery()">Execute Query</button>
        </div>
        
        <div class="results" id="results" style="display: none;">
            <h3>📊 Query Results</h3>
            <div id="resultsContent"></div>
        </div>
    </div>

    <script>
        // Load initial stats
        loadStats();
        
        function setQuery(query) {
            document.getElementById('queryInput').value = query;
        }
        
        async function loadStats() {
            try {
                const response = await fetch('/api/stats');
                const stats = await response.json();
                
                document.getElementById('users-count').textContent = stats.users;
                document.getElementById('listings-count').textContent = stats.listings;
                document.getElementById('proposals-count').textContent = stats.proposals;
                document.getElementById('messages-count').textContent = stats.messages;
            } catch (error) {
                console.error('Error loading stats:', error);
            }
        }
        
        async function executeQuery() {
            const query = document.getElementById('queryInput').value.trim();
            if (!query) {
                alert('Please enter a query');
                return;
            }
            
            const resultsDiv = document.getElementById('results');
            const contentDiv = document.getElementById('resultsContent');
            
            resultsDiv.style.display = 'block';
            contentDiv.innerHTML = '<div class="loading">Executing query...</div>';
            
            try {
                const response = await fetch('/api/query', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ query })
                });
                
                const result = await response.json();
                
                if (result.error) {
                    contentDiv.innerHTML = '<div class="error">Error: ' + result.error + '</div>';
                } else {
                    if (result.data && result.data.length > 0) {
                        const table = createTable(result.data);
                        contentDiv.innerHTML = '<p><strong>Query executed successfully!</strong> Found ' + result.data.length + ' rows.</p>' + table;
                    } else {
                        contentDiv.innerHTML = '<p>Query executed successfully! No results found.</p>';
                    }
                }
            } catch (error) {
                contentDiv.innerHTML = '<div class="error">Error: ' + error.message + '</div>';
            }
        }
        
        function createTable(data) {
            if (!data || data.length === 0) return '';
            
            const headers = Object.keys(data[0]);
            let table = '<table class="table"><thead><tr>';
            
            headers.forEach(header => {
                table += '<th>' + header + '</th>';
            });
            table += '</tr></thead><tbody>';
            
            data.forEach(row => {
                table += '<tr>';
                headers.forEach(header => {
                    const value = row[header];
                    table += '<td>' + (value !== null && value !== undefined ? value : '') + '</td>';
                });
                table += '</tr>';
            });
            
            table += '</tbody></table>';
            return table;
        }
        
        // Allow Enter key to execute query
        document.getElementById('queryInput').addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.key === 'Enter') {
                executeQuery();
            }
        });
    </script>
</body>
</html>
  `)
})

// API Routes
app.get('/api/stats', async (req, res) => {
  try {
    const users = await db.get('SELECT COUNT(*) as count FROM users')
    const listings = await db.get('SELECT COUNT(*) as count FROM listings')
    const proposals = await db.get('SELECT COUNT(*) as count FROM proposals')
    const messages = await db.get('SELECT COUNT(*) as count FROM messages')
    
    res.json({
      users: users.count,
      listings: listings.count,
      proposals: proposals.count,
      messages: messages.count
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/query', async (req, res) => {
  try {
    const { query } = req.body
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' })
    }
    
    // Security: Only allow SELECT queries
    if (!query.trim().toUpperCase().startsWith('SELECT')) {
      return res.status(400).json({ error: 'Only SELECT queries are allowed' })
    }
    
    const data = await db.all(query)
    res.json({ data })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Start server
async function startServer() {
  await initDatabase()
  
  app.listen(PORT, () => {
    console.log('🌐 SQLite Web Browser started!')
    console.log(`📱 Open your browser and go to: http://localhost:${PORT}`)
    console.log('🗄️  Browse your Influmatch database with a beautiful web interface!')
  })
}

startServer().catch(console.error)
