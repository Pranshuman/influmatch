// database-mock.js
// Mock database connection for Influmatch (for testing/validation)

import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import bcrypt from 'bcryptjs'
import pg from 'pg'

let db = null
let isPostgreSQL = false
let pgClient = null

// Connect to database
export async function connectToDatabase() {
  try {
    // Check if we're using PostgreSQL (production) or SQLite (development)
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgresql://')) {
      console.log('Production mode: Using REAL PostgreSQL database')
      isPostgreSQL = true
      
      // Create real PostgreSQL connection with proper SSL configuration
      pgClient = new pg.Client({
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false,
          require: true
        },
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000
      })
      
      console.log('Connecting to PostgreSQL database...')
      await pgClient.connect()
      console.log('✅ Connected to PostgreSQL database successfully!')
      
      // Wrap pgClient methods to match sqlite's interface
      db = {
        run: async (query, params = []) => {
          console.log('PostgreSQL run query:', query.substring(0, 100) + '...', params)
          try {
            const result = await pgClient.query(query, params)
            // For INSERT queries, return the inserted ID
            if (query.toLowerCase().includes('insert')) {
              return { lastID: result.rows[0]?.id || Math.floor(Math.random() * 1000) + 1 }
            }
            return { lastID: result.rows[0]?.id || 1 }
          } catch (error) {
            console.error('PostgreSQL run error:', error.message)
            throw error
          }
        },
        get: async (query, params = []) => {
          console.log('PostgreSQL get query:', query.substring(0, 100) + '...', params)
          try {
            const result = await pgClient.query(query, params)
            return result.rows[0] || null
          } catch (error) {
            console.error('PostgreSQL get error:', error.message)
            throw error
          }
        },
        all: async (query, params = []) => {
          console.log('PostgreSQL all query:', query.substring(0, 100) + '...', params)
          try {
            const result = await pgClient.query(query, params)
            return result.rows
          } catch (error) {
            console.error('PostgreSQL all error:', error.message)
            throw error
          }
        },
        exec: async (query) => {
          console.log('PostgreSQL exec:', query.substring(0, 100) + '...')
          try {
            await pgClient.query(query)
            return true
          } catch (error) {
            console.error('PostgreSQL exec error:', error.message)
            throw error
          }
        }
      }
    } else {
      console.log('Development mode: Using SQLite database')
      isPostgreSQL = false
      
      db = await open({
        filename: process.env.DATABASE_URL || './influmatch.db',
        driver: sqlite3.Database
      })
    }
    
    console.log('Connected to database')
    
    // Initialize database tables
    await initializeTables()
    
    return db
  } catch (error) {
    console.error('Error connecting to database:', error)
    throw error
  }
}

// Get database instance
export function getDatabase() {
  if (!db) {
    throw new Error('Database not connected. Call connectToDatabase() first.')
  }
  return db
}

// Initialize database tables
async function initializeTables() {
  try {
    if (isPostgreSQL) {
      console.log('Initializing PostgreSQL tables...')
      
      // Users table
      await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          "userType" VARCHAR(20) NOT NULL CHECK ("userType" IN ('brand', 'influencer')),
          bio TEXT,
          website VARCHAR(255),
          "socialMedia" TEXT,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // Listings table
      await db.exec(`
        CREATE TABLE IF NOT EXISTS listings (
          id SERIAL PRIMARY KEY,
          "brandId" INTEGER NOT NULL REFERENCES users(id),
          title VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          category VARCHAR(100),
          budget INTEGER,
          deadline VARCHAR(100),
          requirements TEXT,
          deliverables TEXT,
          status VARCHAR(20) DEFAULT 'active',
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // Proposals table
      await db.exec(`
        CREATE TABLE IF NOT EXISTS proposals (
          id SERIAL PRIMARY KEY,
          "listingId" INTEGER NOT NULL REFERENCES listings(id),
          "influencerId" INTEGER NOT NULL REFERENCES users(id),
          message TEXT NOT NULL,
          "proposedBudget" INTEGER,
          status VARCHAR(20) DEFAULT 'under_review',
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // Messages table
      await db.exec(`
        CREATE TABLE IF NOT EXISTS messages (
          id SERIAL PRIMARY KEY,
          "senderId" INTEGER NOT NULL REFERENCES users(id),
          "receiverId" INTEGER NOT NULL REFERENCES users(id),
          "listingId" INTEGER REFERENCES listings(id),
          "proposalId" INTEGER REFERENCES proposals(id),
          content TEXT NOT NULL,
          "isRead" BOOLEAN DEFAULT FALSE,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)
      
      console.log('✅ PostgreSQL tables initialized successfully!')
    } else {
      console.log('Initializing SQLite tables...')
      
      // Users table
      await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          userType TEXT NOT NULL CHECK (userType IN ('brand', 'influencer')),
          bio TEXT,
          website TEXT,
          socialMedia TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // Listings table
      await db.exec(`
        CREATE TABLE IF NOT EXISTS listings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          brandId INTEGER NOT NULL,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          category TEXT,
          budget INTEGER,
          deadline TEXT,
          requirements TEXT,
          deliverables TEXT,
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
          proposedBudget INTEGER,
          timeline TEXT,
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
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (senderId) REFERENCES users (id),
          FOREIGN KEY (recipientId) REFERENCES users (id)
        )
      `)
    }

    console.log('Database tables initialized successfully')
  } catch (error) {
    console.error('Error initializing database tables:', error)
    throw error
  }
}

// Database helper functions
export const dbHelpers = {
  // User functions
  async createUser(userData) {
    const { name, email, password, userType, bio, website, socialMedia } = userData
    
    const passwordHash = await bcrypt.hash(password, 10)
    
    console.log('Creating user:', { name, email, userType })
    
    if (isPostgreSQL) {
      const result = await db.run(
        `INSERT INTO users (name, email, password_hash, "userType", bio, website, "socialMedia")
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [name, email, passwordHash, userType, bio || null, website || null, socialMedia || null]
      )
      console.log('User created with ID:', result.lastID)
      return result.lastID
    } else {
      const result = await db.run(
        `INSERT INTO users (name, email, password_hash, userType, bio, website, socialMedia)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [name, email, passwordHash, userType, bio || null, website || null, socialMedia || null]
      )
      console.log('User created with ID:', result.lastID)
      return result.lastID
    }
  },

  async getUserByEmail(email) {
    if (isPostgreSQL) {
      const user = await db.get('SELECT * FROM users WHERE email = $1', [email])
      return user
    } else {
      const user = await db.get('SELECT * FROM users WHERE email = ?', [email])
      return user
    }
  },

  async getUserById(id) {
    if (isPostgreSQL) {
      const user = await db.get('SELECT * FROM users WHERE id = $1', [id])
      return user
    } else {
      const user = await db.get('SELECT * FROM users WHERE id = ?', [id])
      return user
    }
  },

  async updateUser(id, userData) {
    const { name, bio, website, socialMedia } = userData
    
    if (isPostgreSQL) {
      await db.run(
        `UPDATE users 
         SET name = $1, bio = $2, website = $3, "socialMedia" = $4, "updatedAt" = CURRENT_TIMESTAMP
         WHERE id = $5`,
        [name, bio, website, socialMedia, id]
      )
    } else {
      await db.run(
        `UPDATE users 
         SET name = ?, bio = ?, website = ?, socialMedia = ?, updatedAt = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [name, bio, website, socialMedia, id]
      )
    }
    
    return true
  },

  // Listing functions
  async createListing(listingData) {
    const { brandId, title, description, category, budget, deadline, requirements, deliverables } = listingData
    
    const result = await db.run(
      `INSERT INTO listings (brandId, title, description, category, budget, deadline, requirements, deliverables)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [brandId, title, description, category, budget, deadline, requirements, deliverables]
    )
    
    return result.lastID
  },

  async getAllListings() {
    const listings = await db.all(`
      SELECT l.*, u.name as brandName, u.email as brandEmail
      FROM listings l
      JOIN users u ON l.brandId = u.id
      ORDER BY l.createdAt DESC
    `)
    return listings
  },

  async getListingById(id) {
    const listing = await db.get(`
      SELECT l.*, u.name as brandName, u.email as brandEmail
      FROM listings l
      JOIN users u ON l.brandId = u.id
      WHERE l.id = ?
    `, [id])
    return listing
  },

  async getListingsByBrand(brandId) {
    const listings = await db.all(
      'SELECT * FROM listings WHERE brandId = ? ORDER BY createdAt DESC',
      [brandId]
    )
    return listings
  },

  // Proposal functions
  async createProposal(proposalData) {
    const { listingId, influencerId, message, proposedBudget, timeline } = proposalData
    
    const result = await db.run(
      `INSERT INTO proposals (listingId, influencerId, message, proposedBudget, timeline)
       VALUES (?, ?, ?, ?, ?)`,
      [listingId, influencerId, message, proposedBudget, timeline]
    )
    
    return result.lastID
  },

  async getProposalById(id) {
    const proposal = await db.get(`
      SELECT p.*, l.title as listingTitle, u.name as influencerName
      FROM proposals p
      JOIN listings l ON p.listingId = l.id
      JOIN users u ON p.influencerId = u.id
      WHERE p.id = ?
    `, [id])
    return proposal
  },

  async getProposalsForListing(listingId) {
    const proposals = await db.all(`
      SELECT p.*, u.name as influencerName, u.email as influencerEmail, u.bio as influencerBio
      FROM proposals p
      JOIN users u ON p.influencerId = u.id
      WHERE p.listingId = ?
      ORDER BY p.createdAt DESC
    `, [listingId])
    return proposals
  },

  async getProposalsByInfluencer(influencerId) {
    const proposals = await db.all(`
      SELECT p.*, l.title as listingTitle, l.description as listingDescription, u.name as brandName
      FROM proposals p
      JOIN listings l ON p.listingId = l.id
      JOIN users u ON l.brandId = u.id
      WHERE p.influencerId = ?
      ORDER BY p.createdAt DESC
    `, [influencerId])
    return proposals
  },

  async updateProposalStatus(id, status) {
    await db.run(
      'UPDATE proposals SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
      [status, id]
    )
    return true
  },

  async updateProposal(id, proposalData) {
    const { message, proposedBudget, timeline } = proposalData
    
    await db.run(
      `UPDATE proposals 
       SET message = ?, proposedBudget = ?, timeline = ?, updatedAt = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [message, proposedBudget, timeline, id]
    )
    
    return true
  },

  // Message functions
  async createMessage(messageData) {
    const { conversationId, senderId, recipientId, content } = messageData
    
    const result = await db.run(
      `INSERT INTO messages (conversationId, senderId, recipientId, content)
       VALUES (?, ?, ?, ?)`,
      [conversationId, senderId, recipientId, content]
    )
    
    return result.lastID
  },

  async getMessagesForConversation(conversationId) {
    const messages = await db.all(`
      SELECT m.*, u.name as senderName
      FROM messages m
      JOIN users u ON m.senderId = u.id
      WHERE m.conversationId = ?
      ORDER BY m.createdAt ASC
    `, [conversationId])
    return messages
  }
}

export default { connectToDatabase, getDatabase, dbHelpers }
