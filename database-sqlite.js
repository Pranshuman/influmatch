// database-sqlite.js
// SQLite database setup for Influmatch

import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let db = null

// Connect to SQLite database
export async function connectToDatabase() {
  if (db) {
    return db
  }

  try {
    console.log('🔄 Connecting to SQLite database...')
    
    // Open database file (creates if doesn't exist)
    db = await open({
      filename: path.join(__dirname, 'influmatch.db'),
      driver: sqlite3.Database
    })
    
    console.log('✅ Connected to SQLite database successfully!')
    console.log('📊 Database file: influmatch.db')
    
    // Create tables
    await createTables()
    
    return db
  } catch (error) {
    console.error('❌ SQLite connection error:', error)
    throw error
  }
}

// Create database tables
async function createTables() {
  try {
    console.log('📋 Creating database tables...')
    
    // Users table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        userType TEXT NOT NULL CHECK (userType IN ('brand', 'influencer')),
        bio TEXT DEFAULT '',
        website TEXT DEFAULT '',
        socialMedia TEXT DEFAULT '{}',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Listings table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS listings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        budget INTEGER NOT NULL,
        deadline DATETIME NOT NULL,
        requirements TEXT DEFAULT '',
        deliverables TEXT DEFAULT '',
        brandId INTEGER NOT NULL,
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'completed')),
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (brandId) REFERENCES users (id)
      )
    `)
    
    // Proposals table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS proposals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        listingId INTEGER NOT NULL,
        influencerId INTEGER NOT NULL,
        message TEXT NOT NULL,
        proposedBudget INTEGER NOT NULL,
        timeline TEXT NOT NULL,
        status TEXT DEFAULT 'under_review' CHECK (status IN ('under_review', 'accepted', 'rejected', 'withdrawn')),
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (listingId) REFERENCES listings (id),
        FOREIGN KEY (influencerId) REFERENCES users (id)
      )
    `)
    
    // Messages table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversationId TEXT NOT NULL,
        senderId INTEGER NOT NULL,
        recipientId INTEGER NOT NULL,
        content TEXT NOT NULL,
        read BOOLEAN DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (senderId) REFERENCES users (id),
        FOREIGN KEY (recipientId) REFERENCES users (id)
      )
    `)
    
    // Create indexes for better performance
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
      CREATE INDEX IF NOT EXISTS idx_users_userType ON users (userType);
      CREATE INDEX IF NOT EXISTS idx_listings_brandId ON listings (brandId);
      CREATE INDEX IF NOT EXISTS idx_listings_category ON listings (category);
      CREATE INDEX IF NOT EXISTS idx_listings_createdAt ON listings (createdAt);
      CREATE INDEX IF NOT EXISTS idx_proposals_listingId ON proposals (listingId);
      CREATE INDEX IF NOT EXISTS idx_proposals_influencerId ON proposals (influencerId);
      CREATE INDEX IF NOT EXISTS idx_messages_conversationId ON messages (conversationId);
      CREATE INDEX IF NOT EXISTS idx_messages_createdAt ON messages (createdAt);
    `)
    
    // Migrate existing proposals table if needed
    await migrateProposalsTable()
    
    console.log('✅ Database tables created successfully!')
  } catch (error) {
    console.error('❌ Error creating tables:', error)
    throw error
  }
}

// Migrate proposals table to add new status options
async function migrateProposalsTable() {
  try {
    // Check if proposals table exists and has the old constraint
    const tableInfo = await db.all("PRAGMA table_info(proposals)")
    if (tableInfo.length > 0) {
      console.log('✅ Proposals table already exists with updated schema')
    }
  } catch (error) {
    console.log('ℹ️ Proposals table will be created with new schema')
  }
}

// Get database instance
export function getDatabase() {
  if (!db) {
    throw new Error('Database not connected. Call connectToDatabase() first.')
  }
  return db
}

// Close database connection
export async function closeDatabase() {
  if (db) {
    await db.close()
    db = null
    console.log('🔌 SQLite database connection closed')
  }
}

// Database helper functions
export const dbHelpers = {
  // Create user
  createUser: async (userData) => {
    const result = await db.run(`
      INSERT INTO users (name, email, password, userType, bio, website, socialMedia)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      userData.name,
      userData.email,
      userData.password,
      userData.userType,
      userData.bio || '',
      userData.website || '',
      JSON.stringify(userData.socialMedia || {})
    ])
    return result.lastID
  },
  
  // Create listing
  createListing: async (listingData) => {
    const result = await db.run(`
      INSERT INTO listings (title, description, category, budget, deadline, requirements, deliverables, brandId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      listingData.title,
      listingData.description,
      listingData.category,
      listingData.budget,
      listingData.deadline,
      listingData.requirements || '',
      listingData.deliverables || '',
      listingData.brandId
    ])
    return result.lastID
  },
  
  // Create proposal
  createProposal: async (proposalData) => {
    const result = await db.run(`
      INSERT INTO proposals (listingId, influencerId, message, proposedBudget, timeline)
      VALUES (?, ?, ?, ?, ?)
    `, [
      proposalData.listingId,
      proposalData.influencerId,
      proposalData.message,
      proposalData.proposedBudget,
      proposalData.timeline
    ])
    return result.lastID
  },
  
  // Create message
  createMessage: async (messageData) => {
    const result = await db.run(`
      INSERT INTO messages (conversationId, senderId, recipientId, content)
      VALUES (?, ?, ?, ?)
    `, [
      messageData.conversationId,
      messageData.senderId,
      messageData.recipientId,
      messageData.content
    ])
    return result.lastID
  },
  
  // Get user by email
  getUserByEmail: async (email) => {
    return await db.get('SELECT * FROM users WHERE email = ?', [email])
  },
  
  // Get user by ID
  getUserById: async (id) => {
    return await db.get('SELECT * FROM users WHERE id = ?', [id])
  },
  
  // Get all listings with brand info
  getAllListings: async () => {
    return await db.all(`
      SELECT l.*, u.name as brandName, u.bio as brandBio, u.website as brandWebsite
      FROM listings l
      JOIN users u ON l.brandId = u.id
      ORDER BY l.createdAt DESC
    `)
  },
  
  // Get listing by ID with brand info
  getListingById: async (id) => {
    return await db.get(`
      SELECT l.*, u.name as brandName, u.bio as brandBio, u.website as brandWebsite
      FROM listings l
      JOIN users u ON l.brandId = u.id
      WHERE l.id = ?
    `, [id])
  },
  
  // Get proposals for a listing
  getProposalsForListing: async (listingId) => {
    return await db.all(`
      SELECT p.*, u.name as influencerName, u.bio as influencerBio
      FROM proposals p
      JOIN users u ON p.influencerId = u.id
      WHERE p.listingId = ?
      ORDER BY p.createdAt DESC
    `, [listingId])
  },
  
  // Get messages for a conversation
  getMessagesForConversation: async (conversationId) => {
    return await db.all(`
      SELECT m.*, u.name as senderName
      FROM messages m
      JOIN users u ON m.senderId = u.id
      WHERE m.conversationId = ?
      ORDER BY m.createdAt ASC
    `, [conversationId])
  },

  // Get proposals by influencer ID (for "My Proposals" page)
  getProposalsByInfluencer: async (influencerId) => {
    return await db.all(`
      SELECT p.*, l.title as listingTitle, l.description as listingDescription, 
             l.budget as listingBudget, l.deadline as listingDeadline,
             u.name as brandName, u.bio as brandBio, u.website as brandWebsite
      FROM proposals p
      JOIN listings l ON p.listingId = l.id
      JOIN users u ON l.brandId = u.id
      WHERE p.influencerId = ?
      ORDER BY p.createdAt DESC
    `, [influencerId])
  },

  // Get proposal by ID
  getProposalById: async (proposalId) => {
    return await db.get(`
      SELECT p.*, l.title as listingTitle, l.brandId,
             u.name as influencerName, u.bio as influencerBio, u.website as influencerWebsite
      FROM proposals p
      JOIN listings l ON p.listingId = l.id
      JOIN users u ON p.influencerId = u.id
      WHERE p.id = ?
    `, [proposalId])
  },

  // Update proposal status
  updateProposalStatus: async (proposalId, status) => {
    const result = await db.run(`
      UPDATE proposals 
      SET status = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [status, proposalId])
    return result.changes > 0
  },

  // Update proposal (for editing)
  updateProposal: async (proposalId, proposalData) => {
    const result = await db.run(`
      UPDATE proposals 
      SET message = ?, proposedBudget = ?, timeline = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      proposalData.message,
      proposalData.proposedBudget,
      proposalData.timeline,
      proposalId
    ])
    return result.changes > 0
  }
}

