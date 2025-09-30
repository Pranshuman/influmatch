// server-supabase.js
// Influmatch: Influencer Marketplace Platform with Supabase HTTP API

console.log("[bootstrap] server-supabase.js starting… PID", process.pid);

// Catch-all error handlers
process.on('uncaughtException', (err) => {
  console.error("[FATAL] uncaughtException:", err && err.stack || err);
});
process.on('unhandledRejection', (reason, p) => {
  console.error("[FATAL] unhandledRejection at:", p, "reason:", reason);
});

import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getSupabaseClient, safeSupabaseQuery, initializeSupabaseTables } from './supabaseClient.js'

const app = express()
app.use(express.json())
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost for development
    if (origin.includes('localhost')) return callback(null, true);
    
    // Allow all Vercel domains
    if (origin.includes('vercel.app')) return callback(null, true);
    
    // Allow custom domain if set
    if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
      return callback(null, true);
    }
    
    // Allow the specific Vercel domain
    if (origin === 'https://frontend-sage-theta.vercel.app') {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}))

// Health endpoint (used by Railway)
app.get("/healthz", (_req, res) => {
  res.status(200).json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    database: "supabase-http",
    supabaseClient: supabaseClient ? "connected" : "disconnected"
  });
});

// Debug endpoint to check Supabase connection
app.get("/debug/supabase", async (_req, res) => {
  try {
    if (!supabaseClient) {
      return res.status(503).json({ 
        error: "Supabase client not initialized",
        environment: {
          DATABASE_URL: process.env.DATABASE_URL ? "Set" : "Not set",
          SUPABASE_URL: process.env.SUPABASE_URL ? "Set" : "Not set",
          SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "Set" : "Not set"
        }
      });
    }

    // Test a simple query
    const result = await safeSupabaseQuery('users', 'select', null, {});
    
    res.json({
      status: "connected",
      supabaseClient: "initialized",
      testQuery: "successful",
      userCount: result ? result.length : 0,
      environment: {
        DATABASE_URL: process.env.DATABASE_URL ? "Set" : "Not set",
        SUPABASE_URL: process.env.SUPABASE_URL ? "Set" : "Not set",
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "Set" : "Not set"
      }
    });
  } catch (error) {
    res.status(500).json({
      error: "Supabase connection test failed",
      message: error.message,
      stack: error.stack
    });
  }
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

// Initialize Supabase client
let supabaseClient = null;

(async () => {
  try {
    console.log("[Supabase] 🔄 Initializing Supabase client...");
    console.log("[Supabase] Environment check:");
    console.log("  - DATABASE_URL:", process.env.DATABASE_URL ? "Set" : "Not set");
    console.log("  - SUPABASE_URL:", process.env.SUPABASE_URL ? "Set" : "Not set");
    console.log("  - SUPABASE_SERVICE_ROLE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "Set" : "Not set");
    
    supabaseClient = getSupabaseClient();
    console.log("[Supabase] ✅ Client initialized successfully");
    
    // Initialize tables if needed
    await initializeSupabaseTables();
    console.log("[Supabase] ✅ Tables initialized");
  } catch (err) {
    console.error("[Supabase] ❌ Failed to initialize client. Server will still run.");
    console.error("[Supabase] Error details:", err.message);
    console.error("[Supabase] Error stack:", err.stack);
  }
})();

// ---- Authentication Routes ----
app.post('/auth/register', async (req, res) => {
  try {
    console.log('[REGISTER] Starting registration process...');
    
    // Check if Supabase client is available
    if (!supabaseClient) {
      console.error('[REGISTER] ❌ Supabase client not available');
      return res.status(503).json({ error: 'Database unavailable, please retry shortly.' });
    }

    const { name, email, password, userType, bio, website, socialMedia } = req.body
    console.log('[REGISTER] User data:', { name, email, userType });

    // Validate required fields
    if (!email || !password || !userType || !name) {
      console.error('[REGISTER] ❌ Missing required fields');
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Check if user already exists
    console.log('[REGISTER] Checking if user exists...');
    const existingUsers = await safeSupabaseQuery('users', 'select', null, { email });
    console.log('[REGISTER] Existing users found:', existingUsers?.length || 0);
    
    if (existingUsers && existingUsers.length > 0) {
      console.log('[REGISTER] ❌ User already exists');
      return res.status(400).json({ error: 'User already exists' })
    }

    // Hash password
    console.log('[REGISTER] Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const newUser = {
      name,
      email,
      password_hash: hashedPassword,
      userType,
      bio: bio || null,
      website: website || null,
      socialMedia: socialMedia || null
    };

    console.log('[REGISTER] Creating user in database...');
    const createdUsers = await safeSupabaseQuery('users', 'insert', [newUser]);
    console.log('[REGISTER] User created:', createdUsers);
    
    if (!createdUsers || !Array.isArray(createdUsers) || createdUsers.length === 0) {
      console.error('[REGISTER] ❌ No user returned from database');
      console.error('[REGISTER] Created users:', createdUsers);
      return res.status(500).json({ error: 'Failed to create user' });
    }
    
    const user = createdUsers[0];

    // Generate JWT token
    console.log('[REGISTER] Generating JWT token...');
    const token = jwt.sign(
      { userId: user.id, email: user.email, userType: user.userType },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    console.log('[REGISTER] ✅ Registration successful');
    // Return user data (without password)
    res.json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        bio: user.bio,
        website: user.website,
        socialMedia: user.socialMedia
      }
    })

  } catch (error) {
    console.error('[REGISTER] ❌ Registration error:', error);
    console.error('[REGISTER] Error stack:', error.stack);
    res.status(500).json({ error: 'Registration failed' })
  }
})

app.post('/auth/login', async (req, res) => {
  try {
    // Check if Supabase client is available
    if (!supabaseClient) {
      return res.status(503).json({ error: 'Database unavailable, please retry shortly.' });
    }

    const { email, password } = req.body

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    // Find user by email
    const users = await safeSupabaseQuery('users', 'select', null, { email });
    
    if (!users || users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const user = users[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash)
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
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        bio: user.bio,
        website: user.website,
        socialMedia: user.socialMedia
      }
    })

  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Login failed' })
  }
})

// ---- Health Check ----
app.get('/health', (_req, res) => res.json({ 
  ok: true, 
  timestamp: new Date().toISOString(),
  database: "supabase-http"
}))

// ---- API Info ----
app.get('/', (_req, res) => res.json({
  name: 'Influmatch API',
  version: '1.0.1',
  description: 'Influencer Marketplace Platform',
  endpoints: {
    auth: ['POST /auth/register', 'POST /auth/login'],
    listings: ['GET /api/listings', 'POST /api/listings', 'GET /api/listings/:id'],
    proposals: ['GET /api/listings/:id/proposals', 'POST /api/listings/:id/proposals', 'GET /api/proposals/my-proposals', 'PUT /api/proposals/:id/status', 'PUT /api/proposals/:id'],
    users: ['GET /api/users/:id', 'PUT /api/users/:id'],
    messages: ['POST /api/messages', 'GET /api/messages/:conversationId'],
    health: ['GET /health', 'GET /healthz']
  }
}))

// ---- Authentication Middleware ----
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

// ---- Listings Routes ----
// GET all listings
app.get('/api/listings', async (req, res) => {
  try {
    console.log('[LISTINGS] Fetching all listings...')
    
    if (!supabaseClient) {
      return res.status(503).json({ error: 'Database unavailable' })
    }

    const listings = await safeSupabaseQuery('listings', 'select', null, {})
    console.log('[LISTINGS] Found listings:', listings?.length || 0)

    // Get brand details for each listing
    const listingsWithBrands = await Promise.all(
      listings.map(async (listing) => {
        const brand = await safeSupabaseQuery('users', 'select', null, { id: listing.brandId })
        return {
          ...listing,
          brandName: brand[0]?.name || 'Unknown Brand',
          brandBio: brand[0]?.bio,
          brandWebsite: brand[0]?.website
        }
      })
    )

    res.json({ listings: listingsWithBrands })
  } catch (error) {
    console.error('[LISTINGS] Error:', error)
    res.status(500).json({ error: 'Failed to fetch listings' })
  }
})

// POST create new listing
app.post('/api/listings', authenticateToken, async (req, res) => {
  try {
    console.log('[CREATE_LISTING] Creating new listing...')
    
    if (!supabaseClient) {
      return res.status(503).json({ error: 'Database unavailable' })
    }

    if (req.user.userType !== 'brand') {
      return res.status(403).json({ error: 'Only brands can create listings' })
    }

    const { title, description, category, budget, deadline, requirements, deliverables } = req.body

    if (!title || !description || !category || !budget) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const newListing = {
      brandId: req.user.userId,
      title,
      description,
      category,
      budget: parseInt(budget),
      deadline: deadline || null,
      requirements: requirements || null,
      deliverables: deliverables || null
    }

    const createdListings = await safeSupabaseQuery('listings', 'insert', [newListing])
    
    if (!createdListings || createdListings.length === 0) {
      return res.status(500).json({ error: 'Failed to create listing' })
    }

    const listing = createdListings[0]
    
    // Get brand details
    const brand = await safeSupabaseQuery('users', 'select', null, { id: listing.brandId })
    
    res.status(201).json({
      listing: {
        ...listing,
        brandName: brand[0]?.name || 'Unknown Brand',
        brandBio: brand[0]?.bio,
        brandWebsite: brand[0]?.website
      }
    })
  } catch (error) {
    console.error('[CREATE_LISTING] Error:', error)
    res.status(500).json({ error: 'Failed to create listing' })
  }
})

// GET specific listing
app.get('/api/listings/:id', async (req, res) => {
  try {
    console.log('[LISTING_DETAILS] Fetching listing:', req.params.id)
    
    if (!supabaseClient) {
      return res.status(503).json({ error: 'Database unavailable' })
    }

    const listingId = parseInt(req.params.id)
    if (isNaN(listingId)) {
      return res.status(400).json({ error: 'Invalid listing ID' })
    }

    const listings = await safeSupabaseQuery('listings', 'select', null, { id: listingId })
    
    if (!listings || listings.length === 0) {
      return res.status(404).json({ error: 'Listing not found' })
    }

    const listing = listings[0]
    
    // Get brand details
    const brand = await safeSupabaseQuery('users', 'select', null, { id: listing.brandId })
    
    // Get proposals for this listing
    const proposals = await safeSupabaseQuery('proposals', 'select', null, { listingId })
    
    const listingWithDetails = {
      ...listing,
      brand: brand[0] || null,
      proposals: proposals || []
    }

    res.json({ listing: listingWithDetails })
  } catch (error) {
    console.error('[LISTING_DETAILS] Error:', error)
    res.status(500).json({ error: 'Failed to fetch listing' })
  }
})

// ---- Proposals Routes ----
// GET proposals for a specific listing
app.get('/api/listings/:id/proposals', authenticateToken, async (req, res) => {
  try {
    console.log('[LISTING_PROPOSALS] Fetching proposals for listing:', req.params.id)
    
    if (!supabaseClient) {
      return res.status(503).json({ error: 'Database unavailable' })
    }

    const listingId = parseInt(req.params.id)
    if (isNaN(listingId)) {
      return res.status(400).json({ error: 'Invalid listing ID' })
    }

    // Get the listing to verify it exists
    const listings = await safeSupabaseQuery('listings', 'select', null, { id: listingId })
    if (!listings || listings.length === 0) {
      return res.status(404).json({ error: 'Listing not found' })
    }

    const listing = listings[0]
    
    // Check if user is the brand owner or an influencer
    const isBrandOwner = req.user.userType === 'brand' && req.user.userId === listing.brandId
    const isInfluencer = req.user.userType === 'influencer'
    
    if (!isBrandOwner && !isInfluencer) {
      return res.status(403).json({ error: 'Access denied' })
    }

    // Get proposals for this listing
    const proposals = await safeSupabaseQuery('proposals', 'select', null, { listingId })
    
    // If user is an influencer, only show their own proposals
    let filteredProposals = proposals || []
    if (isInfluencer && !isBrandOwner) {
      filteredProposals = proposals.filter(proposal => proposal.influencerId === req.user.userId)
    }

    // Get influencer details for each proposal
    const proposalsWithInfluencers = await Promise.all(
      filteredProposals.map(async (proposal) => {
        const influencer = await safeSupabaseQuery('users', 'select', null, { id: proposal.influencerId })
        return {
          ...proposal,
          influencer: influencer[0] || null
        }
      })
    )

    res.json({ proposals: proposalsWithInfluencers })
  } catch (error) {
    console.error('[LISTING_PROPOSALS] Error:', error)
    res.status(500).json({ error: 'Failed to fetch proposals' })
  }
})

// POST submit proposal
app.post('/api/listings/:id/proposals', authenticateToken, async (req, res) => {
  try {
    console.log('[SUBMIT_PROPOSAL] Submitting proposal for listing:', req.params.id)
    
    if (!supabaseClient) {
      return res.status(503).json({ error: 'Database unavailable' })
    }

    if (req.user.userType !== 'influencer') {
      return res.status(403).json({ error: 'Only influencers can submit proposals' })
    }

    const { message, proposedBudget } = req.body

    if (!message || !proposedBudget) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const listingId = parseInt(req.params.id)
    if (isNaN(listingId)) {
      return res.status(400).json({ error: 'Invalid listing ID' })
    }

    // Check if listing exists
    const listings = await safeSupabaseQuery('listings', 'select', null, { id: listingId })
    if (!listings || listings.length === 0) {
      return res.status(404).json({ error: 'Listing not found' })
    }

    // Check if user already submitted a proposal for this listing
    const existingProposals = await safeSupabaseQuery('proposals', 'select', null, { 
      listingId, 
      influencerId: req.user.userId 
    })
    
    if (existingProposals && existingProposals.length > 0) {
      return res.status(400).json({ error: 'You have already submitted a proposal for this listing' })
    }

    const newProposal = {
      listingId,
      influencerId: req.user.userId,
      message,
      proposedBudget: parseInt(proposedBudget),
      status: 'under_review'
    }

    const createdProposals = await safeSupabaseQuery('proposals', 'insert', [newProposal])
    
    if (!createdProposals || createdProposals.length === 0) {
      return res.status(500).json({ error: 'Failed to submit proposal' })
    }

    const proposal = createdProposals[0]
    
    // Get influencer details
    const influencer = await safeSupabaseQuery('users', 'select', null, { id: proposal.influencerId })
    
    res.status(201).json({
      proposal: {
        ...proposal,
        influencer: influencer[0] || null
      }
    })
  } catch (error) {
    console.error('[SUBMIT_PROPOSAL] Error:', error)
    res.status(500).json({ error: 'Failed to submit proposal' })
  }
})

// GET user's proposals
app.get('/api/proposals/my-proposals', authenticateToken, async (req, res) => {
  try {
    console.log('[MY_PROPOSALS] Fetching proposals for user:', req.user.userId)
    
    if (!supabaseClient) {
      return res.status(503).json({ error: 'Database unavailable' })
    }

    if (req.user.userType !== 'influencer') {
      return res.status(403).json({ error: 'Only influencers can view their proposals' })
    }

    const proposals = await safeSupabaseQuery('proposals', 'select', null, { influencerId: req.user.userId })
    
    // Get listing and brand details for each proposal
    const proposalsWithDetails = await Promise.all(
      (proposals || []).map(async (proposal) => {
        const listing = await safeSupabaseQuery('listings', 'select', null, { id: proposal.listingId })
        const brand = listing[0] ? await safeSupabaseQuery('users', 'select', null, { id: listing[0].brandId }) : null
        
        return {
          ...proposal,
          listingTitle: listing[0]?.title,
          listingDescription: listing[0]?.description,
          listingBudget: listing[0]?.budget,
          brand: brand?.[0] || null
        }
      })
    )

    res.json({ proposals: proposalsWithDetails })
  } catch (error) {
    console.error('[MY_PROPOSALS] Error:', error)
    res.status(500).json({ error: 'Failed to fetch proposals' })
  }
})

// PUT update proposal status
app.put('/api/proposals/:id/status', authenticateToken, async (req, res) => {
  try {
    console.log('[UPDATE_PROPOSAL_STATUS] Updating proposal status:', req.params.id)
    
    if (!supabaseClient) {
      return res.status(503).json({ error: 'Database unavailable' })
    }

    if (req.user.userType !== 'brand') {
      return res.status(403).json({ error: 'Only brands can update proposal status' })
    }

    const { status } = req.body
    const proposalId = parseInt(req.params.id)

    if (!status || !['under_review', 'accepted', 'rejected', 'withdrawn'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' })
    }

    if (isNaN(proposalId)) {
      return res.status(400).json({ error: 'Invalid proposal ID' })
    }

    // Get the proposal to verify it exists and user has permission
    const proposals = await safeSupabaseQuery('proposals', 'select', null, { id: proposalId })
    if (!proposals || proposals.length === 0) {
      return res.status(404).json({ error: 'Proposal not found' })
    }

    const proposal = proposals[0]
    
    // Get the listing to check if user is the brand owner
    const listings = await safeSupabaseQuery('listings', 'select', null, { id: proposal.listingId })
    if (!listings || listings.length === 0) {
      return res.status(404).json({ error: 'Listing not found' })
    }

    const listing = listings[0]
    if (listing.brandId !== req.user.userId) {
      return res.status(403).json({ error: 'You can only update proposals for your own listings' })
    }

    // Update the proposal status
    const updatedProposals = await safeSupabaseQuery('proposals', 'update', { status }, { id: proposalId })
    
    if (!updatedProposals || updatedProposals.length === 0) {
      return res.status(500).json({ error: 'Failed to update proposal status' })
    }

    const updatedProposal = updatedProposals[0]
    
    // Get influencer details
    const influencer = await safeSupabaseQuery('users', 'select', null, { id: updatedProposal.influencerId })
    
    res.json({
      message: 'Proposal status updated successfully',
      proposal: {
        ...updatedProposal,
        influencer: influencer[0] || null
      }
    })
  } catch (error) {
    console.error('[UPDATE_PROPOSAL_STATUS] Error:', error)
    res.status(500).json({ error: 'Failed to update proposal status' })
  }
})

// ---- Users Routes ----
// GET user profile
app.get('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    console.log('[USER_PROFILE] Fetching user profile:', req.params.id)
    
    if (!supabaseClient) {
      return res.status(503).json({ error: 'Database unavailable' })
    }

    const userId = parseInt(req.params.id)
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' })
    }

    const users = await safeSupabaseQuery('users', 'select', null, { id: userId })
    
    if (!users || users.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const user = users[0]
    
    // Remove password hash from response
    const { password_hash, ...userWithoutPassword } = user

    res.json({ user: userWithoutPassword })
  } catch (error) {
    console.error('[USER_PROFILE] Error:', error)
    res.status(500).json({ error: 'Failed to fetch user profile' })
  }
})

// PUT update user profile
app.put('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    console.log('[UPDATE_USER] Updating user profile:', req.params.id)
    
    if (!supabaseClient) {
      return res.status(503).json({ error: 'Database unavailable' })
    }

    const userId = parseInt(req.params.id)
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' })
    }

    // Check if user is updating their own profile
    if (req.user.userId !== userId) {
      return res.status(403).json({ error: 'You can only update your own profile' })
    }

    const { name, bio, website, socialMedia } = req.body

    const updateData = {}
    if (name) updateData.name = name
    if (bio !== undefined) updateData.bio = bio
    if (website !== undefined) updateData.website = website
    if (socialMedia !== undefined) updateData.socialMedia = socialMedia

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    const updatedUsers = await safeSupabaseQuery('users', 'update', updateData, { id: userId })
    
    if (!updatedUsers || updatedUsers.length === 0) {
      return res.status(500).json({ error: 'Failed to update user profile' })
    }

    const user = updatedUsers[0]
    
    // Remove password hash from response
    const { password_hash, ...userWithoutPassword } = user

    res.json({ user: userWithoutPassword })
  } catch (error) {
    console.error('[UPDATE_USER] Error:', error)
    res.status(500).json({ error: 'Failed to update user profile' })
  }
})

// ---- Messages Routes ----
// POST send message
app.post('/api/messages', authenticateToken, async (req, res) => {
  try {
    console.log('[SEND_MESSAGE] Sending message...')
    
    if (!supabaseClient) {
      return res.status(503).json({ error: 'Database unavailable' })
    }

    const { receiverId, content } = req.body

    if (!receiverId || !content) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const receiverIdInt = parseInt(receiverId)
    if (isNaN(receiverIdInt)) {
      return res.status(400).json({ error: 'Invalid receiver ID' })
    }

    // Generate conversation ID (smaller user ID first)
    const conversationId = req.user.userId < receiverIdInt 
      ? `${req.user.userId}-${receiverIdInt}` 
      : `${receiverIdInt}-${req.user.userId}`

    const newMessage = {
      conversationId,
      senderId: req.user.userId,
      recipientId: receiverIdInt,
      content
    }

    const createdMessages = await safeSupabaseQuery('messages', 'insert', [newMessage])
    
    if (!createdMessages || createdMessages.length === 0) {
      return res.status(500).json({ error: 'Failed to send message' })
    }

    const message = createdMessages[0]
    
    // Get sender and receiver details
    const sender = await safeSupabaseQuery('users', 'select', null, { id: message.senderId })
    const receiver = await safeSupabaseQuery('users', 'select', null, { id: message.recipientId })
    
    res.status(201).json({
      message: {
        ...message,
        sender: sender[0] || null,
        receiver: receiver[0] || null
      }
    })
  } catch (error) {
    console.error('[SEND_MESSAGE] Error:', error)
    res.status(500).json({ error: 'Failed to send message' })
  }
})

// GET conversation messages
app.get('/api/messages/:conversationId', authenticateToken, async (req, res) => {
  try {
    console.log('[GET_MESSAGES] Fetching messages for conversation:', req.params.conversationId)
    
    if (!supabaseClient) {
      return res.status(503).json({ error: 'Database unavailable' })
    }

    const { conversationId } = req.params

    // Get messages for this conversation
    const messages = await safeSupabaseQuery('messages', 'select', null, { conversationId })
    
    // Get sender and receiver details for each message
    const messagesWithUsers = await Promise.all(
      (messages || []).map(async (message) => {
        const sender = await safeSupabaseQuery('users', 'select', null, { id: message.senderId })
        const receiver = await safeSupabaseQuery('users', 'select', null, { id: message.recipientId })
        
        return {
          ...message,
          sender: sender[0] || null,
          receiver: receiver[0] || null
        }
      })
    )

    res.json({ messages: messagesWithUsers })
  } catch (error) {
    console.error('[GET_MESSAGES] Error:', error)
    res.status(500).json({ error: 'Failed to fetch messages' })
  }
})

// ---- Error Handling ----
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

// ---- Start Server ----
async function startServer() {
  try {
    console.log('🔄 Starting Influmatch API Server with Supabase HTTP...')
    console.log('📋 Environment check:')
    console.log(`   - NODE_ENV: ${process.env.NODE_ENV || 'development'}`)
    console.log(`   - PORT: ${process.env.PORT || '5050'}`)
    console.log(`   - JWT_SECRET: ${process.env.JWT_SECRET ? 'Set' : 'Using default'}`)

    const PORT = process.env.PORT || 5050

    app.listen(PORT, () => {
      console.log(`🚀 Influmatch API Server running on http://localhost:${PORT}`)
      console.log(`📊 Marketplace Platform Ready with Supabase HTTP!`)
      console.log(`🔗 Available endpoints:`)
      console.log(`   - POST /auth/register (register user)`)
      console.log(`   - POST /auth/login (login user)`)
      console.log(`   - GET /api/listings (get all campaigns)`)
      console.log(`   - POST /api/listings (create campaign)`)
      console.log(`   - GET /api/listings/:id (get campaign details)`)
      console.log(`   - POST /api/listings/:id/proposals (submit proposal)`)
      console.log(`   - GET /api/proposals/my-proposals (get user proposals)`)
      console.log(`   - PUT /api/proposals/:id/status (update proposal status)`)
      console.log(`   - GET /api/users/:id (get user profile)`)
      console.log(`   - POST /api/messages (send message)`)
      console.log(`   - GET /healthz (health check)`)
      console.log(`✅ Server started successfully at ${new Date().toISOString()}`)
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

startServer()
