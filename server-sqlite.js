// server-sqlite.js
// Influmatch: Influencer Marketplace Platform with SQLite

console.log("[bootstrap] server-sqlite.js starting… PID", process.pid);

// Catch-all error handlers
process.on('uncaughtException', (err) => {
  console.error("[FATAL] uncaughtException:", err && err.stack || err);
});
process.on('unhandledRejection', (reason, p) => {
  console.error("[FATAL] unhandledRejection at:", p, "reason:", reason);
});

// Catch silent exits
const realExit = process.exit;
process.exit = (code) => {
  console.error(`[FATAL] process.exit(${code}) called. Stack:\n`, new Error().stack);
  realExit(code);
};

// Routes:
//   GET /                             -> marketplace homepage
//   GET /health                       -> health check
//   POST /auth/register               -> user registration (brand/influencer)
//   POST /auth/login                  -> user login
//   GET /api/listings                 -> get all campaign listings
//   POST /api/listings                -> create new campaign listing
//   GET /api/listings/:id             -> get specific listing
//   GET /api/listings/:id/proposals   -> get proposals for listing
//   POST /api/listings/:id/proposals  -> submit proposal for listing
//   GET /api/proposals/my-proposals   -> get influencer's proposals
//   PUT /api/proposals/:id/status     -> update proposal status (brand)
//   PUT /api/proposals/:id            -> update proposal (influencer)
//   GET /api/users/:id                -> get user profile
//   PUT /api/users/:id                -> update user profile
//   POST /api/messages                -> send message
//   GET /api/messages/:conversationId -> get conversation

// import 'dotenv/config' // Removed for simplicity
import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { connectToDatabase, getDatabase, dbHelpers } from './database-mock.js'

const app = express()
app.use(express.json())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}))

// JWT Secret (in production, use a secure random string)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

// Database instance (will be initialized after connection)
let db = null

// ---- Helper Functions ----
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Access token required' })
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' })
    }
    req.user = user
    next()
  })
}

// ---- API Routes ----
app.get('/', (_req, res) => {
  res.json({
    message: 'Influmatch API - Influencer Marketplace Platform',
    version: '1.0.0',
    database: 'SQLite',
    endpoints: {
      auth: ['POST /auth/register', 'POST /auth/login'],
      listings: ['GET /api/listings', 'POST /api/listings', 'GET /api/listings/:id'],
      users: ['GET /api/users/:id', 'PUT /api/users/:id'],
      proposals: ['GET /api/listings/:id/proposals', 'POST /api/listings/:id/proposals'],
      messages: ['POST /api/messages', 'GET /api/messages/:conversationId']
    }
  })
})

// ---- Health Check ----
app.get('/health', (_req, res) => res.json({ 
  ok: true, 
  timestamp: new Date().toISOString(),
  database: db ? 'connected' : 'disconnected'
}))

// ---- Authentication Routes ----
app.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password, userType, bio, website, socialMedia } = req.body

    // Validate required fields
    if (!email || !password || !userType || !name) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Check if user already exists
    const existingUser = await dbHelpers.getUserByEmail(email)
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const userId = await dbHelpers.createUser({
      name,
      email,
      password: hashedPassword,
      userType,
      bio: bio || '',
      website: website || '',
      socialMedia: socialMedia || {}
    })

    // Get the created user
    const user = await dbHelpers.getUserById(userId)

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, userType: user.userType },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = user
    res.status(201).json({
      message: 'User created successfully',
      user: userWithoutPassword,
      token
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body

    // Find user by email
    const user = await dbHelpers.getUserByEmail(email)
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, userType: user.userType },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = user
    res.json({
      message: 'Login successful',
      user: userWithoutPassword,
      token
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ---- Listings Routes ----
app.get('/api/listings', async (req, res) => {
  try {
    const listings = await dbHelpers.getAllListings()
    
    // Get proposals count for each listing
    const listingsWithProposals = await Promise.all(
      listings.map(async (listing) => {
        const proposals = await dbHelpers.getProposalsForListing(listing.id)
        return {
          ...listing,
          brand: {
            id: listing.brandId,
            name: listing.brandName,
            bio: listing.brandBio,
            website: listing.brandWebsite
          },
          proposals: proposals.map(proposal => ({
            ...proposal,
            influencer: {
              id: proposal.influencerId,
              name: proposal.influencerName,
              bio: proposal.influencerBio
            }
          }))
        }
      })
    )

    res.json({ listings: listingsWithProposals })
  } catch (error) {
    console.error('Error fetching listings:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.post('/api/listings', authenticateToken, async (req, res) => {
  try {
    const { title, description, category, budget, deadline, requirements, deliverables } = req.body

    // Validate required fields
    if (!title || !description || !category || !budget || !deadline) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Validate budget
    const budgetNum = parseInt(budget)
    if (isNaN(budgetNum) || budgetNum <= 0) {
      return res.status(400).json({ error: 'Budget must be a positive number' })
    }

    // Validate deadline
    const deadlineDate = new Date(deadline)
    if (isNaN(deadlineDate.getTime())) {
      return res.status(400).json({ error: 'Invalid deadline format' })
    }

    // Check if deadline is in the past
    if (deadlineDate <= new Date()) {
      return res.status(400).json({ error: 'Deadline must be in the future' })
    }

    // Create listing
    const listingId = await dbHelpers.createListing({
      title,
      description,
      category,
      budget: budgetNum,
      deadline: deadlineDate,
      requirements: requirements || '',
      deliverables: deliverables || '',
      brandId: parseInt(req.user.userId)
    })

    // Get the created listing
    const listing = await dbHelpers.getListingById(listingId)

    res.status(201).json({
      message: 'Listing created successfully',
      listing: {
        ...listing,
        brand: {
          id: listing.brandId,
          name: listing.brandName,
          bio: listing.brandBio,
          website: listing.brandWebsite
        },
        proposals: []
      }
    })
  } catch (error) {
    console.error('Error creating listing:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.get('/api/listings/:id', async (req, res) => {
  try {
    const listing = await dbHelpers.getListingById(req.params.id)
    
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' })
    }

    // Get proposals for this listing
    const proposals = await dbHelpers.getProposalsForListing(listing.id)

    const listingWithDetails = {
      ...listing,
      brand: {
        id: listing.brandId,
        name: listing.brandName,
        bio: listing.brandBio,
        website: listing.brandWebsite
      },
      proposals: proposals.map(proposal => ({
        ...proposal,
        influencer: {
          id: proposal.influencerId,
          name: proposal.influencerName,
          bio: proposal.influencerBio
        }
      }))
    }

    res.json({ listing: listingWithDetails })
  } catch (error) {
    console.error('Error fetching listing:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ---- Proposals Routes ----
// GET proposals for a specific listing
app.get('/api/listings/:id/proposals', authenticateToken, async (req, res) => {
  try {
    const listingId = parseInt(req.params.id)
    
    if (isNaN(listingId)) {
      return res.status(400).json({ error: 'Invalid listing ID' })
    }

    // Get the listing to verify it exists
    const listing = await dbHelpers.getListingById(listingId)
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' })
    }

    // Check if user is the brand owner or an influencer who submitted a proposal
    const isBrandOwner = req.user.userType === 'brand' && req.user.userId === listing.brandId
    const isInfluencer = req.user.userType === 'influencer'
    
    if (!isBrandOwner && !isInfluencer) {
      return res.status(403).json({ error: 'Access denied' })
    }

    // Get proposals for this listing
    const proposals = await dbHelpers.getProposalsForListing(listingId)
    
    // If user is an influencer, only show their own proposals
    let filteredProposals = proposals
    if (isInfluencer && !isBrandOwner) {
      filteredProposals = proposals.filter(proposal => proposal.influencerId === req.user.userId)
    }

    res.json({
      proposals: filteredProposals.map(proposal => ({
        ...proposal,
        influencer: {
          id: proposal.influencerId,
          name: proposal.influencerName,
          bio: proposal.influencerBio,
          website: proposal.influencerWebsite
        }
      }))
    })
  } catch (error) {
    console.error('Error fetching proposals:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.post('/api/listings/:id/proposals', authenticateToken, async (req, res) => {
  try {
    const { message, proposedBudget, timeline } = req.body

    // Validate required fields
    if (!message || !proposedBudget || !timeline) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Check if listing exists
    const listing = await dbHelpers.getListingById(req.params.id)
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' })
    }

    // Create proposal
    const proposalId = await dbHelpers.createProposal({
      listingId: parseInt(req.params.id),
      influencerId: parseInt(req.user.userId),
      message,
      proposedBudget: parseInt(proposedBudget),
      timeline
    })

    // Get the created proposal with full details
    const proposal = await dbHelpers.getProposalById(proposalId)

    res.status(201).json({
      message: 'Proposal submitted successfully',
      proposal: {
        ...proposal,
        influencer: {
          id: proposal.influencerId,
          name: proposal.influencerName,
          bio: proposal.influencerBio,
          website: proposal.influencerWebsite
        }
      }
    })
  } catch (error) {
    console.error('Error submitting proposal:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET proposals by influencer (My Proposals page)
app.get('/api/proposals/my-proposals', authenticateToken, async (req, res) => {
  try {
    // Only influencers can access this endpoint
    if (req.user.userType !== 'influencer') {
      return res.status(403).json({ error: 'Access denied. Only influencers can view their proposals.' })
    }

    const proposals = await dbHelpers.getProposalsByInfluencer(req.user.userId)

    res.json({
      proposals: proposals.map(proposal => ({
        ...proposal,
        brand: {
          id: proposal.brandId,
          name: proposal.brandName,
          bio: proposal.brandBio,
          website: proposal.brandWebsite
        }
      }))
    })
  } catch (error) {
    console.error('Error fetching user proposals:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT update proposal status (for brands)
app.put('/api/proposals/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body
    const proposalId = parseInt(req.params.id)

    // Validate status
    const validStatuses = ['under_review', 'accepted', 'rejected', 'withdrawn']
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status. Must be one of: under_review, accepted, rejected, withdrawn' 
      })
    }

    // Get the proposal to check ownership
    const proposal = await dbHelpers.getProposalById(proposalId)
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' })
    }

    // Check if user is the brand owner of the listing
    if (req.user.userType !== 'brand' || req.user.userId !== proposal.brandId) {
      return res.status(403).json({ error: 'Access denied. Only the brand owner can update proposal status.' })
    }

    // Update proposal status
    const success = await dbHelpers.updateProposalStatus(proposalId, status)
    if (!success) {
      return res.status(500).json({ error: 'Failed to update proposal status' })
    }

    // Get updated proposal
    const updatedProposal = await dbHelpers.getProposalById(proposalId)

    res.json({
      message: 'Proposal status updated successfully',
      proposal: {
        ...updatedProposal,
        influencer: {
          id: updatedProposal.influencerId,
          name: updatedProposal.influencerName,
          bio: updatedProposal.influencerBio,
          website: updatedProposal.influencerWebsite
        }
      }
    })
  } catch (error) {
    console.error('Error updating proposal status:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT update proposal (for editing by influencer)
app.put('/api/proposals/:id', authenticateToken, async (req, res) => {
  try {
    const { message, proposedBudget, timeline } = req.body
    const proposalId = parseInt(req.params.id)

    // Validate required fields
    if (!message || !proposedBudget || !timeline) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Get the proposal to check ownership
    const proposal = await dbHelpers.getProposalById(proposalId)
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' })
    }

    // Check if user is the influencer who created the proposal
    if (req.user.userType !== 'influencer' || req.user.userId !== proposal.influencerId) {
      return res.status(403).json({ error: 'Access denied. Only the proposal creator can edit it.' })
    }

    // Check if proposal can be edited (only if status is under_review)
    if (proposal.status !== 'under_review') {
      return res.status(400).json({ 
        error: 'Proposal cannot be edited. Only proposals with "under_review" status can be modified.' 
      })
    }

    // Update proposal
    const success = await dbHelpers.updateProposal(proposalId, {
      message,
      proposedBudget: parseInt(proposedBudget),
      timeline
    })

    if (!success) {
      return res.status(500).json({ error: 'Failed to update proposal' })
    }

    // Get updated proposal
    const updatedProposal = await dbHelpers.getProposalById(proposalId)

    res.json({
      message: 'Proposal updated successfully',
      proposal: {
        ...updatedProposal,
        influencer: {
          id: updatedProposal.influencerId,
          name: updatedProposal.influencerName,
          bio: updatedProposal.influencerBio,
          website: updatedProposal.influencerWebsite
        }
      }
    })
  } catch (error) {
    console.error('Error updating proposal:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ---- User Routes ----
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await dbHelpers.getUserById(req.params.id)
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Return user data (without password)
    const { password, ...userWithoutPassword } = user
    res.json({ user: userWithoutPassword })
  } catch (error) {
    console.error('Error fetching user:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.put('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const { name, bio, website, socialMedia } = req.body

    // Check if user exists and is the same user
    const user = await dbHelpers.getUserById(req.params.id)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    if (user.id !== parseInt(req.user.userId)) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    // Update user
    const updateData = []
    const values = []

    if (name) {
      updateData.push('name = ?')
      values.push(name)
    }
    if (bio !== undefined) {
      updateData.push('bio = ?')
      values.push(bio)
    }
    if (website !== undefined) {
      updateData.push('website = ?')
      values.push(website)
    }
    if (socialMedia) {
      updateData.push('socialMedia = ?')
      values.push(JSON.stringify(socialMedia))
    }

    if (updateData.length > 0) {
      updateData.push('updatedAt = CURRENT_TIMESTAMP')
      values.push(req.params.id)

      await db.run(
        `UPDATE users SET ${updateData.join(', ')} WHERE id = ?`,
        values
      )
    }

    res.json({ message: 'User updated successfully' })
  } catch (error) {
    console.error('Error updating user:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ---- Messages Routes ----
app.post('/api/messages', authenticateToken, async (req, res) => {
  try {
    const { conversationId, content, recipientId } = req.body

    // Validate required fields
    if (!content || !recipientId) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Create message
    const messageId = await dbHelpers.createMessage({
      conversationId: conversationId || `${req.user.userId}-${recipientId}`,
      senderId: parseInt(req.user.userId),
      recipientId: parseInt(recipientId),
      content
    })

    // Get the created message
    const message = await db.get('SELECT * FROM messages WHERE id = ?', [messageId])

    res.status(201).json({
      message: 'Message sent successfully',
      message
    })
  } catch (error) {
    console.error('Error sending message:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.get('/api/messages/:conversationId', authenticateToken, async (req, res) => {
  try {
    const messages = await dbHelpers.getMessagesForConversation(req.params.conversationId)

    res.json({ messages })
  } catch (error) {
    console.error('Error fetching messages:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ---- Boot Server ----
async function startServer() {
  try {
    console.log('🔄 Starting Influmatch API Server with SQLite...')
    console.log('📋 Environment check:')
    console.log(`   - NODE_ENV: ${process.env.NODE_ENV || 'development'}`)
    console.log(`   - PORT: ${process.env.PORT || '5050'}`)
    console.log(`   - JWT_SECRET: ${process.env.JWT_SECRET ? 'Set' : 'Using default'}`)

    // Connect to SQLite database
    await connectToDatabase()
    db = getDatabase()

    const PORT = process.env.PORT || 5050

    app.listen(PORT, () => {
      console.log(`🚀 Influmatch API Server running on http://localhost:${PORT}`)
      console.log(`📊 Marketplace Platform Ready with SQLite!`)
      console.log(`🔗 Available endpoints:`)
      console.log(`   - POST /auth/register (register user)`)
      console.log(`   - POST /auth/login (login user)`)
      console.log(`   - GET /api/listings (browse campaigns)`)
      console.log(`   - POST /api/listings (create campaign)`)
      console.log(`   - GET /api/users/:id (view profile)`)
      console.log(`✅ Server started successfully at ${new Date().toISOString()}`)
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

// Error handling
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

// Start the server
startServer()
