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
    
    // Allow the specific Vercel domains
    if (origin === 'https://frontend-sage-theta.vercel.app') {
      return callback(null, true);
    }
    
    // Allow the current frontend domain
    if (origin === 'https://frontend-4fhtc80xy-prash123s-projects.vercel.app') {
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
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 9
    const offset = (page - 1) * limit
    
    console.log('[LISTINGS] Fetching listings - page:', page, 'limit:', limit)
    
    if (!supabaseClient) {
      return res.status(503).json({ error: 'Database unavailable' })
    }

    const listings = await safeSupabaseQuery('listings', 'select', null, {})
    console.log('[LISTINGS] Found listings:', listings?.length || 0)

    // Sort by created date (newest first) and apply pagination
    const sortedListings = (listings || []).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    const paginatedListings = sortedListings.slice(offset, offset + limit)
    const total = listings?.length || 0
    const totalPages = Math.ceil(total / limit)

    // Get brand details for each listing
    const listingsWithBrands = await Promise.all(
      paginatedListings.map(async (listing) => {
        const brand = await safeSupabaseQuery('users', 'select', null, { id: listing.brandId })
        return {
          ...listing,
          brandName: brand[0]?.name || 'Unknown Brand',
          brandBio: brand[0]?.bio,
          brandWebsite: brand[0]?.website
        }
      })
    )

    res.json({ 
      listings: listingsWithBrands,
      total,
      page,
      totalPages,
      limit
    })
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

    const { title, description, category, budget, deadline, campaignDeadline, requirements, deliverables } = req.body

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

    // Add campaignDeadline only if it's provided (temporary workaround)
    if (campaignDeadline !== undefined) {
      newListing.campaignDeadline = campaignDeadline
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

// GET user's proposals with pagination
app.get('/api/proposals/my-proposals', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 9
    const offset = (page - 1) * limit
    
    console.log('[MY_PROPOSALS] Fetching proposals for user:', req.user.userId, 'page:', page)
    
    if (!supabaseClient) {
      return res.status(503).json({ error: 'Database unavailable' })
    }

    if (req.user.userType !== 'influencer') {
      return res.status(403).json({ error: 'Only influencers can view their proposals' })
    }

    const proposals = await safeSupabaseQuery('proposals', 'select', null, { influencerId: req.user.userId })
    
    // Sort by created date (newest first) and apply pagination
    const sortedProposals = (proposals || []).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    const paginatedProposals = sortedProposals.slice(offset, offset + limit)
    const total = proposals?.length || 0
    const totalPages = Math.ceil(total / limit)
    
    // Get listing and brand details for each proposal
    const proposalsWithDetails = await Promise.all(
      paginatedProposals.map(async (proposal) => {
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

    res.json({ 
      proposals: proposalsWithDetails,
      total,
      page,
      totalPages,
      limit
    })
  } catch (error) {
    console.error('[MY_PROPOSALS] Error:', error)
    res.status(500).json({ error: 'Failed to fetch proposals' })
  }
})

// GET brand's accepted proposals
app.get('/api/proposals/brand-accepted', authenticateToken, async (req, res) => {
  try {
    console.log('[BRAND_ACCEPTED_PROPOSALS] Fetching accepted proposals for brand:', req.user.userId)
    
    if (!supabaseClient) {
      return res.status(503).json({ error: 'Database unavailable' })
    }

    if (req.user.userType !== 'brand') {
      return res.status(403).json({ error: 'Only brands can view their accepted proposals' })
    }

    // Get all listings for this brand
    const listings = await safeSupabaseQuery('listings', 'select', null, { brandId: req.user.userId })
    
    if (!listings || listings.length === 0) {
      return res.json({ proposals: [] })
    }

    // Get accepted proposals for these listings
    const listingIds = listings.map(l => l.id)
    let proposals = []
    
    // Since safeSupabaseQuery doesn't support 'in' operator, we'll query each listing individually
    for (const listingId of listingIds) {
      const listingProposals = await safeSupabaseQuery('proposals', 'select', null, { 
        listingId: listingId,
        status: 'accepted'
      })
      proposals = proposals.concat(listingProposals || [])
    }
    
    // Get influencer details for each proposal
    const proposalsWithDetails = await Promise.all(
      (proposals || []).map(async (proposal) => {
        const influencer = await safeSupabaseQuery('users', 'select', null, { id: proposal.influencerId })
        const listing = listings.find(l => l.id === proposal.listingId)
        
        return {
          ...proposal,
          influencer: influencer?.[0] || null,
          listingTitle: listing?.title,
          listingDescription: listing?.description,
          listingBudget: listing?.budget
        }
      })
    )

    console.log('[BRAND_ACCEPTED_PROPOSALS] Found accepted proposals:', proposalsWithDetails.length)
    res.json({ proposals: proposalsWithDetails })
  } catch (error) {
    console.error('[BRAND_ACCEPTED_PROPOSALS] Error:', error)
    res.status(500).json({ error: 'Failed to fetch accepted proposals' })
  }
})

// GET campaign deliverable counts for brand
app.get('/api/campaigns/deliverable-counts', authenticateToken, async (req, res) => {
  try {
    console.log('[CAMPAIGN_DELIVERABLE_COUNTS] Fetching deliverable counts for brand:', req.user.userId)
    
    if (!supabaseClient) {
      return res.status(503).json({ error: 'Database unavailable' })
    }

    if (req.user.userType !== 'brand') {
      return res.status(403).json({ error: 'Only brands can view deliverable counts' })
    }

    // Get all listings for this brand
    const listings = await safeSupabaseQuery('listings', 'select', null, { brandId: req.user.userId })
    
    if (!listings || listings.length === 0) {
      return res.json({ counts: [] })
    }

    // Get deliverable counts for each campaign
    const counts = await Promise.all(
      listings.map(async (listing) => {
        // Get accepted proposals for this listing
        const acceptedProposals = await safeSupabaseQuery('proposals', 'select', null, { 
          listingId: listing.id,
          status: 'accepted'
        })
        
        // Get deliverables for these proposals
        let totalDeliverables = 0
        for (const proposal of acceptedProposals || []) {
          const deliverables = await safeSupabaseQuery('deliverables', 'select', null, { 
            proposalId: proposal.id
          })
          totalDeliverables += (deliverables || []).length
        }
        
        // Calculate unattended proposals (accepted proposals without deliverables)
        const unattendedCount = (acceptedProposals || []).length - totalDeliverables
        
        return {
          campaignId: listing.id,
          totalAcceptedProposals: (acceptedProposals || []).length,
          totalDeliverables: totalDeliverables,
          unattendedProposals: Math.max(0, unattendedCount)
        }
      })
    )

    console.log('[CAMPAIGN_DELIVERABLE_COUNTS] Found counts for', counts.length, 'campaigns')
    res.json({ counts })
  } catch (error) {
    console.error('[CAMPAIGN_DELIVERABLE_COUNTS] Error:', error)
    res.status(500).json({ error: 'Failed to fetch deliverable counts' })
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
        influencer: influencer && influencer.length > 0 ? influencer[0] : null
      }
    })
  } catch (error) {
    console.error('[UPDATE_PROPOSAL_STATUS] Error:', error)
    console.error('[UPDATE_PROPOSAL_STATUS] Error details:', {
      message: error.message,
      stack: error.stack,
      proposalId: req.params.id,
      status: req.body.status,
      userId: req.user?.userId,
      userType: req.user?.userType
    })
    res.status(500).json({ error: 'Failed to update proposal status' })
  }
})

// PUT update proposal (for editing by influencer)
app.put('/api/proposals/:id', authenticateToken, async (req, res) => {
  try {
    console.log('[UPDATE_PROPOSAL] Updating proposal:', req.params.id)
    
    if (!supabaseClient) {
      return res.status(503).json({ error: 'Database unavailable' })
    }

    if (req.user.userType !== 'influencer') {
      return res.status(403).json({ error: 'Only influencers can edit proposals' })
    }

    const { message, proposedBudget, timeline } = req.body
    const proposalId = parseInt(req.params.id)

    // Validate required fields
    if (!message || !proposedBudget) {
      return res.status(400).json({ error: 'Missing required fields: message and proposedBudget are required' })
    }

    if (isNaN(proposalId)) {
      return res.status(400).json({ error: 'Invalid proposal ID' })
    }

    // Get the proposal to check ownership and status
    const proposals = await safeSupabaseQuery('proposals', 'select', null, { id: proposalId })
    if (!proposals || proposals.length === 0) {
      return res.status(404).json({ error: 'Proposal not found' })
    }

    const proposal = proposals[0]
    
    // Check if user is the influencer who created the proposal
    if (req.user.userId !== proposal.influencerId) {
      return res.status(403).json({ error: 'Access denied. Only the proposal creator can edit it.' })
    }

    // Check if proposal can be edited (only if status is under_review)
    if (proposal.status !== 'under_review') {
      return res.status(400).json({ 
        error: 'Proposal cannot be edited. Only proposals with "under_review" status can be modified.' 
      })
    }

    // Update proposal
    const updateData = {
      message,
      proposedBudget: parseInt(proposedBudget),
      updatedAt: new Date().toISOString()
    }
    
    // Add timeline if provided
    if (timeline) {
      updateData.timeline = timeline
    }

    const updatedProposals = await safeSupabaseQuery('proposals', 'update', updateData, { id: proposalId })
    
    if (!updatedProposals || updatedProposals.length === 0) {
      return res.status(500).json({ error: 'Failed to update proposal' })
    }

    const updatedProposal = updatedProposals[0]
    
    // Get influencer details
    const influencer = await safeSupabaseQuery('users', 'select', null, { id: updatedProposal.influencerId })
    
    res.json({
      message: 'Proposal updated successfully',
      proposal: {
        ...updatedProposal,
        influencer: influencer && influencer.length > 0 ? influencer[0] : null
      }
    })
  } catch (error) {
    console.error('[UPDATE_PROPOSAL] Error:', error)
    console.error('[UPDATE_PROPOSAL] Error details:', {
      message: error.message,
      stack: error.stack,
      proposalId: req.params.id,
      userId: req.user?.userId,
      userType: req.user?.userType
    })
    res.status(500).json({ error: 'Failed to update proposal' })
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

    const { receiverId, content, proposalId, conversationId } = req.body

    if (!content) {
      return res.status(400).json({ error: 'Message content is required' })
    }

    let finalConversationId = conversationId
    let finalReceiverId = receiverId

    // Handle proposal-specific messages
    if (proposalId) {
      const proposalIdInt = parseInt(proposalId)
      if (isNaN(proposalIdInt)) {
        return res.status(400).json({ error: 'Invalid proposal ID' })
      }

      // Get the proposal to verify access
      const proposals = await safeSupabaseQuery('proposals', 'select', null, { id: proposalIdInt })
      if (!proposals || proposals.length === 0) {
        return res.status(404).json({ error: 'Proposal not found' })
      }

      const proposal = proposals[0]
      
      // Get the listing
      const listings = await safeSupabaseQuery('listings', 'select', null, { id: proposal.listingId })
      if (!listings || listings.length === 0) {
        return res.status(404).json({ error: 'Listing not found' })
      }

      const listing = listings[0]
      
      // Check if user has permission to send messages in this proposal chat
      const isBrandOwner = req.user.userType === 'brand' && req.user.userId === listing.brandId
      const isInfluencer = req.user.userType === 'influencer' && req.user.userId === proposal.influencerId
      
      if (!isBrandOwner && !isInfluencer) {
        return res.status(403).json({ error: 'Access denied' })
      }

      // Check if proposal is accepted
      if (proposal.status !== 'accepted') {
        return res.status(400).json({ error: 'Messages can only be sent for accepted proposals' })
      }

      // Set conversation ID and receiver ID for proposal chat
      finalConversationId = `proposal-${proposalIdInt}`
      finalReceiverId = req.user.userType === 'brand' ? proposal.influencerId : listing.brandId
    } else {
      // Handle regular user-to-user messages
      if (!receiverId) {
        return res.status(400).json({ error: 'Receiver ID is required for regular messages' })
      }

      const receiverIdInt = parseInt(receiverId)
      if (isNaN(receiverIdInt)) {
        return res.status(400).json({ error: 'Invalid receiver ID' })
      }

      // Generate conversation ID (smaller user ID first)
      finalConversationId = req.user.userId < receiverIdInt 
        ? `${req.user.userId}-${receiverIdInt}` 
        : `${receiverIdInt}-${req.user.userId}`
      finalReceiverId = receiverIdInt
    }

    const newMessage = {
      conversationId: finalConversationId,
      senderId: req.user.userId,
      recipientId: finalReceiverId,
      proposalId: proposalId ? parseInt(proposalId) : null,
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

// POST start chat for accepted proposal
app.post('/api/proposals/:id/start-chat', authenticateToken, async (req, res) => {
  try {
    console.log('[START_PROPOSAL_CHAT] Starting chat for proposal:', req.params.id)
    
    if (!supabaseClient) {
      return res.status(503).json({ error: 'Database unavailable' })
    }

    // Allow both brands and influencers to start chats
    if (req.user.userType !== 'brand' && req.user.userType !== 'influencer') {
      return res.status(403).json({ error: 'Only brands and influencers can start proposal chats' })
    }

    const proposalId = parseInt(req.params.id)
    if (isNaN(proposalId)) {
      return res.status(400).json({ error: 'Invalid proposal ID' })
    }

    // Get the proposal to verify it exists and is accepted
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
    
    // Check if user has permission to start chat for this proposal
    const isBrandOwner = req.user.userType === 'brand' && req.user.userId === listing.brandId
    const isInfluencerOwner = req.user.userType === 'influencer' && req.user.userId === proposal.influencerId
    
    if (!isBrandOwner && !isInfluencerOwner) {
      return res.status(403).json({ error: 'You can only start chats for your own proposals' })
    }

    // Check if proposal is accepted
    if (proposal.status !== 'accepted') {
      return res.status(400).json({ error: 'Chat can only be started for accepted proposals' })
    }

    // Generate conversation ID for this proposal
    const conversationId = `proposal-${proposalId}`

    // Check if chat already exists
    const existingMessages = await safeSupabaseQuery('messages', 'select', null, { conversationId })
    
    res.json({
      message: 'Chat ready for proposal',
      conversationId,
      proposal: {
        ...proposal,
        listing: listing
      },
      hasExistingMessages: existingMessages && existingMessages.length > 0
    })
  } catch (error) {
    console.error('[START_PROPOSAL_CHAT] Error:', error)
    res.status(500).json({ error: 'Failed to start proposal chat' })
  }
})

// GET proposal chat messages
app.get('/api/proposals/:id/chat', authenticateToken, async (req, res) => {
  try {
    console.log('[GET_PROPOSAL_CHAT] Fetching chat for proposal:', req.params.id)
    
    if (!supabaseClient) {
      return res.status(503).json({ error: 'Database unavailable' })
    }

    const proposalId = parseInt(req.params.id)
    if (isNaN(proposalId)) {
      return res.status(400).json({ error: 'Invalid proposal ID' })
    }

    // Get the proposal
    const proposals = await safeSupabaseQuery('proposals', 'select', null, { id: proposalId })
    if (!proposals || proposals.length === 0) {
      return res.status(404).json({ error: 'Proposal not found' })
    }

    const proposal = proposals[0]
    
    // Get the listing
    const listings = await safeSupabaseQuery('listings', 'select', null, { id: proposal.listingId })
    if (!listings || listings.length === 0) {
      return res.status(404).json({ error: 'Listing not found' })
    }

    const listing = listings[0]
    
    // Check if user has permission to view this chat
    const isBrandOwner = req.user.userType === 'brand' && req.user.userId === listing.brandId
    const isInfluencer = req.user.userType === 'influencer' && req.user.userId === proposal.influencerId
    
    if (!isBrandOwner && !isInfluencer) {
      return res.status(403).json({ error: 'Access denied' })
    }

    // Check if proposal is accepted
    if (proposal.status !== 'accepted') {
      return res.status(400).json({ error: 'Chat is only available for accepted proposals' })
    }

    // Get messages for this proposal
    const conversationId = `proposal-${proposalId}`
    const messages = await safeSupabaseQuery('messages', 'select', null, { conversationId })
    
    // Get sender details for each message
    const messagesWithUsers = await Promise.all(
      (messages || []).map(async (message) => {
        const sender = await safeSupabaseQuery('users', 'select', null, { id: message.senderId })
        
        return {
          ...message,
          sender: sender[0] || null
        }
      })
    )

    // Get influencer and brand details
    const influencer = await safeSupabaseQuery('users', 'select', null, { id: proposal.influencerId })
    const brand = await safeSupabaseQuery('users', 'select', null, { id: listing.brandId })

    res.json({
      proposal: {
        ...proposal,
        influencer: influencer[0] || null
      },
      listing: {
        ...listing,
        brand: brand[0] || null
      },
      messages: messagesWithUsers,
      conversationId
    })
  } catch (error) {
    console.error('[GET_PROPOSAL_CHAT] Error:', error)
    res.status(500).json({ error: 'Failed to fetch proposal chat' })
  }
})

// ---- Validation Utilities ----
const validateDeliverableData = (data) => {
  const errors = []
  
  // Required fields validation
  if (!data.proposalId || isNaN(parseInt(data.proposalId))) {
    errors.push('Valid proposalId is required')
  }
  if (!data.title || data.title.trim().length === 0) {
    errors.push('Title is required')
  }
  if (!data.type || !['image', 'video', 'post', 'story', 'reel', 'other'].includes(data.type)) {
    errors.push('Valid type is required (image, video, post, story, reel, other)')
  }
  
  // Length validation
  if (data.title && data.title.length > 200) {
    errors.push('Title must be less than 200 characters')
  }
  if (data.description && data.description.length > 1000) {
    errors.push('Description must be less than 1000 characters')
  }
  if (data.submissionNotes && data.submissionNotes.length > 1000) {
    errors.push('Submission notes must be less than 1000 characters')
  }
  if (data.reviewNotes && data.reviewNotes.length > 1000) {
    errors.push('Review notes must be less than 1000 characters')
  }
  
  // Date validation
  if (data.dueDate) {
    const dueDate = new Date(data.dueDate)
    if (isNaN(dueDate.getTime())) {
      errors.push('Invalid due date format')
    } else if (dueDate < new Date()) {
      errors.push('Due date cannot be in the past')
    }
  }
  
  // File URL validation
  if (data.fileUrl && data.fileUrl.length > 500) {
    errors.push('File URL is too long')
  }
  
  return errors
}

const validateStatusTransition = (currentStatus, newStatus) => {
  const validTransitions = {
    'pending': ['submitted'],
    'submitted': ['under_review', 'revision_requested'],
    'under_review': ['approved', 'rejected', 'revision_requested'],
    'approved': [], // Final state
    'rejected': [], // Final state
    'revision_requested': ['submitted', 'rejected']
  }
  
  return validTransitions[currentStatus]?.includes(newStatus) || false
}

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input
  // Remove potential XSS attempts
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
}

// ---- Admin Routes ----
// Temporary endpoint to add campaignDeadline column
app.post('/api/admin/add-campaign-deadline-column', authenticateToken, async (req, res) => {
  try {
    console.log('[ADD_COLUMN] Adding campaignDeadline column to listings table...')
    
    if (!supabaseClient) {
      return res.status(503).json({ error: 'Database unavailable' })
    }

    // Check if user is admin (you can modify this check as needed)
    if (req.user.userType !== 'brand') {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    // Try to add the column using a direct SQL query
    const { data, error } = await supabaseClient
      .from('listings')
      .select('id')
      .limit(1)

    if (error) {
      console.error('[ADD_COLUMN] Error:', error)
      return res.status(500).json({ 
        error: 'Failed to add column', 
        details: error.message,
        sql: 'ALTER TABLE listings ADD COLUMN IF NOT EXISTS "campaignDeadline" TEXT;'
      })
    }

    console.log('[ADD_COLUMN] Column addition attempted')
    
    res.json({ 
      success: true, 
      message: 'Column addition attempted. If it failed, please run this SQL manually:',
      sql: 'ALTER TABLE listings ADD COLUMN IF NOT EXISTS "campaignDeadline" TEXT;'
    })

  } catch (error) {
    console.error('[ADD_COLUMN] Error:', error)
    res.status(500).json({ 
      error: 'Failed to add column', 
      details: error.message,
      sql: 'ALTER TABLE listings ADD COLUMN IF NOT EXISTS "campaignDeadline" TEXT;'
    })
  }
})

// WARNING: This endpoint clears all data except users - use with extreme caution!
app.post('/api/admin/clear-database', authenticateToken, async (req, res) => {
  try {
    // Only allow admin users (you can modify this check as needed)
    // For now, we'll allow any authenticated user, but you should restrict this
    console.log('[CLEAR_DATABASE] Request from user:', req.user.userId, req.user.userType)
    
    if (!supabaseClient) {
      return res.status(503).json({ error: 'Database unavailable' })
    }

    // Get counts before deletion
    const deliverablesCount = await safeSupabaseQuery('deliverables', 'select', null, {})
    const messagesCount = await safeSupabaseQuery('messages', 'select', null, {})
    const proposalsCount = await safeSupabaseQuery('proposals', 'select', null, {})
    const listingsCount = await safeSupabaseQuery('listings', 'select', null, {})
    const usersCount = await safeSupabaseQuery('users', 'select', null, {})

    console.log('[CLEAR_DATABASE] Before deletion:')
    console.log(`  Deliverables: ${deliverablesCount?.length || 0}`)
    console.log(`  Messages: ${messagesCount?.length || 0}`)
    console.log(`  Proposals: ${proposalsCount?.length || 0}`)
    console.log(`  Listings: ${listingsCount?.length || 0}`)
    console.log(`  Users: ${usersCount?.length || 0}`)

    // Delete in order due to foreign key constraints
    console.log('[CLEAR_DATABASE] Deleting deliverables...')
    const { error: deliverablesError } = await supabaseClient
      .from('deliverables')
      .delete()
      .neq('id', 0) // Delete all records (id is never 0)
    
    if (deliverablesError) {
      throw new Error(`Failed to delete deliverables: ${deliverablesError.message}`)
    }
    
    console.log('[CLEAR_DATABASE] Deleting messages...')
    const { error: messagesError } = await supabaseClient
      .from('messages')
      .delete()
      .neq('id', 0) // Delete all records (id is never 0)
    
    if (messagesError) {
      throw new Error(`Failed to delete messages: ${messagesError.message}`)
    }
    
    console.log('[CLEAR_DATABASE] Deleting proposals...')
    const { error: proposalsError } = await supabaseClient
      .from('proposals')
      .delete()
      .neq('id', 0) // Delete all records (id is never 0)
    
    if (proposalsError) {
      throw new Error(`Failed to delete proposals: ${proposalsError.message}`)
    }
    
    console.log('[CLEAR_DATABASE] Deleting listings...')
    const { error: listingsError } = await supabaseClient
      .from('listings')
      .delete()
      .neq('id', 0) // Delete all records (id is never 0)
    
    if (listingsError) {
      throw new Error(`Failed to delete listings: ${listingsError.message}`)
    }

    // Verify deletion
    const finalDeliverables = await safeSupabaseQuery('deliverables', 'select', null, {})
    const finalMessages = await safeSupabaseQuery('messages', 'select', null, {})
    const finalProposals = await safeSupabaseQuery('proposals', 'select', null, {})
    const finalListings = await safeSupabaseQuery('listings', 'select', null, {})
    const finalUsers = await safeSupabaseQuery('users', 'select', null, {})

    console.log('[CLEAR_DATABASE] After deletion:')
    console.log(`  Deliverables: ${finalDeliverables?.length || 0}`)
    console.log(`  Messages: ${finalMessages?.length || 0}`)
    console.log(`  Proposals: ${finalProposals?.length || 0}`)
    console.log(`  Listings: ${finalListings?.length || 0}`)
    console.log(`  Users: ${finalUsers?.length || 0}`)

    res.json({
      message: 'Database cleared successfully!',
      before: {
        deliverables: deliverablesCount?.length || 0,
        messages: messagesCount?.length || 0,
        proposals: proposalsCount?.length || 0,
        listings: listingsCount?.length || 0,
        users: usersCount?.length || 0
      },
      after: {
        deliverables: finalDeliverables?.length || 0,
        messages: finalMessages?.length || 0,
        proposals: finalProposals?.length || 0,
        listings: finalListings?.length || 0,
        users: finalUsers?.length || 0
      }
    })
  } catch (error) {
    console.error('[CLEAR_DATABASE] Error:', error)
    res.status(500).json({ error: 'Failed to clear database' })
  }
})

// ---- Deliverables Routes ----
// GET deliverables for a specific proposal
app.get('/api/deliverables/proposal/:proposalId', authenticateToken, async (req, res) => {
  try {
    const proposalId = parseInt(req.params.proposalId)
    
    // Enhanced input validation
    if (isNaN(proposalId) || proposalId <= 0) {
      return res.status(400).json({ error: 'Invalid proposal ID' })
    }

    if (!supabaseClient) {
      return res.status(503).json({ error: 'Database unavailable' })
    }

    // Get the proposal to verify access
    const proposals = await safeSupabaseQuery('proposals', 'select', null, { id: proposalId })
    if (!proposals || proposals.length === 0) {
      return res.status(404).json({ error: 'Proposal not found' })
    }

    const proposal = proposals[0]

    // Validate proposal status
    if (proposal.status === 'withdrawn') {
      return res.status(410).json({ error: 'Proposal has been withdrawn' })
    }

    // Get the listing to check brand ownership
    const listings = await safeSupabaseQuery('listings', 'select', null, { id: proposal.listingId })
    if (!listings || listings.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' })
    }

    const listing = listings[0]

    // Check if user has access to this proposal
    const isBrandOwner = req.user.userType === 'brand' && req.user.userId === listing.brandId
    const isInfluencer = req.user.userType === 'influencer' && req.user.userId === proposal.influencerId
    
    if (!isBrandOwner && !isInfluencer) {
      return res.status(403).json({ error: 'Access denied. You can only view deliverables for your own proposals or campaigns.' })
    }

    // Get deliverables for this proposal with error handling
    const deliverables = await safeSupabaseQuery('deliverables', 'select', null, { proposalId })
    if (!deliverables) {
      return res.status(500).json({ error: 'Failed to fetch deliverables from database' })
    }

    // Sanitize deliverable data
    const sanitizedDeliverables = deliverables.map(deliverable => ({
      ...deliverable,
      title: sanitizeInput(deliverable.title),
      description: sanitizeInput(deliverable.description),
      submissionNotes: sanitizeInput(deliverable.submissionNotes),
      reviewNotes: sanitizeInput(deliverable.reviewNotes)
    }))

    res.json({ deliverables: sanitizedDeliverables })
  } catch (error) {
    console.error('[GET_DELIVERABLES] Error:', error)
    res.status(500).json({ error: 'Failed to fetch deliverables' })
  }
})

// POST create new deliverable (brand only)
app.post('/api/deliverables', authenticateToken, async (req, res) => {
  try {
    // Sanitize input data
    const sanitizedData = {
      proposalId: req.body.proposalId,
      title: sanitizeInput(req.body.title),
      description: sanitizeInput(req.body.description),
      type: req.body.type,
      dueDate: req.body.dueDate
    }

    // Comprehensive validation
    const validationErrors = validateDeliverableData(sanitizedData)
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validationErrors 
      })
    }

    if (!supabaseClient) {
      return res.status(503).json({ error: 'Database unavailable' })
    }

    // Get the proposal to verify access
    const proposals = await safeSupabaseQuery('proposals', 'select', null, { id: sanitizedData.proposalId })
    if (!proposals || proposals.length === 0) {
      return res.status(404).json({ error: 'Proposal not found' })
    }

    const proposal = proposals[0]

    // Validate proposal status
    if (proposal.status === 'withdrawn') {
      return res.status(410).json({ error: 'Cannot create deliverables for withdrawn proposals' })
    }

    if (proposal.status !== 'accepted') {
      return res.status(400).json({ error: 'Can only create deliverables for accepted proposals' })
    }

    // Get the listing to check brand ownership
    const listings = await safeSupabaseQuery('listings', 'select', null, { id: proposal.listingId })
    if (!listings || listings.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' })
    }

    const listing = listings[0]

    // Check if user is the brand owner
    if (req.user.userType !== 'brand' || req.user.userId !== listing.brandId) {
      return res.status(403).json({ error: 'Access denied. Only the brand owner can create deliverables.' })
    }

    // Check for duplicate deliverables (same title for same proposal)
    const existingDeliverables = await safeSupabaseQuery('deliverables', 'select', null, { 
      proposalId: sanitizedData.proposalId 
    })
    if (existingDeliverables && existingDeliverables.some(d => d.title === sanitizedData.title)) {
      return res.status(409).json({ error: 'A deliverable with this title already exists for this proposal' })
    }

    // Create deliverable with validated data
    const deliverableData = {
      proposalId: parseInt(sanitizedData.proposalId),
      title: sanitizedData.title,
      description: sanitizedData.description || null,
      type: sanitizedData.type,
      dueDate: sanitizedData.dueDate ? new Date(sanitizedData.dueDate).toISOString() : null
    }

    const deliverables = await safeSupabaseQuery('deliverables', 'insert', deliverableData)
    const deliverable = deliverables[0]

    res.status(201).json({
      message: 'Deliverable created successfully',
      deliverable
    })
  } catch (error) {
    console.error('[CREATE_DELIVERABLE] Error:', error)
    res.status(500).json({ error: 'Failed to create deliverable' })
  }
})

// PUT update deliverable (brand only)
app.put('/api/deliverables/:id', authenticateToken, async (req, res) => {
  try {
    const { title, description, type, dueDate } = req.body
    const deliverableId = parseInt(req.params.id)

    // Validate required fields
    if (!title || !type) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Validate type
    const validTypes = ['image', 'video', 'post', 'story', 'reel', 'other']
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid deliverable type' })
    }

    // Get the deliverable to verify access
    const deliverables = await safeSupabaseQuery('deliverables', 'select', null, { id: deliverableId })
    if (!deliverables || deliverables.length === 0) {
      return res.status(404).json({ error: 'Deliverable not found' })
    }

    const deliverable = deliverables[0]

    // Get the proposal and listing to check brand ownership
    const proposals = await safeSupabaseQuery('proposals', 'select', null, { id: deliverable.proposalId })
    if (!proposals || proposals.length === 0) {
      return res.status(404).json({ error: 'Proposal not found' })
    }

    const proposal = proposals[0]
    const listings = await safeSupabaseQuery('listings', 'select', null, { id: proposal.listingId })
    if (!listings || listings.length === 0) {
      return res.status(404).json({ error: 'Listing not found' })
    }

    const listing = listings[0]

    // Check if user is the brand owner
    if (req.user.userType !== 'brand' || req.user.userId !== listing.brandId) {
      return res.status(403).json({ error: 'Access denied. Only the brand owner can update deliverables.' })
    }

    // Check if deliverable can be updated (only if not submitted)
    if (deliverable.status !== 'pending') {
      return res.status(400).json({ error: 'Can only update pending deliverables' })
    }

    // Update deliverable
    const updateData = {
      title,
      description: description || null,
      type,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      updatedAt: new Date().toISOString()
    }

    const updatedDeliverables = await safeSupabaseQuery('deliverables', 'update', updateData, { id: deliverableId })
    const updatedDeliverable = updatedDeliverables[0]

    res.json({
      message: 'Deliverable updated successfully',
      deliverable: updatedDeliverable
    })
  } catch (error) {
    console.error('[UPDATE_DELIVERABLE] Error:', error)
    res.status(500).json({ error: 'Failed to update deliverable' })
  }
})

// DELETE deliverable (brand only)
app.delete('/api/deliverables/:id', authenticateToken, async (req, res) => {
  try {
    const deliverableId = parseInt(req.params.id)

    // Get the deliverable to verify access
    const deliverables = await safeSupabaseQuery('deliverables', 'select', null, { id: deliverableId })
    if (!deliverables || deliverables.length === 0) {
      return res.status(404).json({ error: 'Deliverable not found' })
    }

    const deliverable = deliverables[0]

    // Get the proposal and listing to check brand ownership
    const proposals = await safeSupabaseQuery('proposals', 'select', null, { id: deliverable.proposalId })
    if (!proposals || proposals.length === 0) {
      return res.status(404).json({ error: 'Proposal not found' })
    }

    const proposal = proposals[0]
    const listings = await safeSupabaseQuery('listings', 'select', null, { id: proposal.listingId })
    if (!listings || listings.length === 0) {
      return res.status(404).json({ error: 'Listing not found' })
    }

    const listing = listings[0]

    // Check if user is the brand owner
    if (req.user.userType !== 'brand' || req.user.userId !== listing.brandId) {
      return res.status(403).json({ error: 'Access denied. Only the brand owner can delete deliverables.' })
    }

    // Check if deliverable can be deleted (only if not submitted)
    if (deliverable.status !== 'pending') {
      return res.status(400).json({ error: 'Can only delete pending deliverables' })
    }

    // Delete deliverable
    await safeSupabaseQuery('deliverables', 'delete', null, { id: deliverableId })

    res.json({ message: 'Deliverable deleted successfully' })
  } catch (error) {
    console.error('[DELETE_DELIVERABLE] Error:', error)
    res.status(500).json({ error: 'Failed to delete deliverable' })
  }
})

// POST submit deliverable (influencer only)
app.post('/api/deliverables/:id/submit', authenticateToken, async (req, res) => {
  try {
    const deliverableId = parseInt(req.params.id)
    
    // Enhanced input validation
    if (isNaN(deliverableId) || deliverableId <= 0) {
      return res.status(400).json({ error: 'Invalid deliverable ID' })
    }

    // Sanitize input data
    const sanitizedData = {
      fileUrl: req.body.fileUrl,
      submissionNotes: sanitizeInput(req.body.submissionNotes)
    }

    // Validate required fields
    if (!sanitizedData.fileUrl || sanitizedData.fileUrl.trim().length === 0) {
      return res.status(400).json({ error: 'File URL is required' })
    }

    // Validate file URL format and length
    if (sanitizedData.fileUrl.length > 500) {
      return res.status(400).json({ error: 'File URL is too long' })
    }

    // Basic URL validation
    try {
      new URL(sanitizedData.fileUrl)
    } catch {
      return res.status(400).json({ error: 'Invalid file URL format' })
    }

    if (!supabaseClient) {
      return res.status(503).json({ error: 'Database unavailable' })
    }

    // Get the deliverable to verify access
    const deliverables = await safeSupabaseQuery('deliverables', 'select', null, { id: deliverableId })
    if (!deliverables || deliverables.length === 0) {
      return res.status(404).json({ error: 'Deliverable not found' })
    }

    const deliverable = deliverables[0]

    // Get the proposal to check influencer access
    const proposals = await safeSupabaseQuery('proposals', 'select', null, { id: deliverable.proposalId })
    if (!proposals || proposals.length === 0) {
      return res.status(404).json({ error: 'Proposal not found' })
    }

    const proposal = proposals[0]

    // Validate proposal status
    if (proposal.status === 'withdrawn') {
      return res.status(410).json({ error: 'Cannot submit deliverables for withdrawn proposals' })
    }

    if (proposal.status !== 'accepted') {
      return res.status(400).json({ error: 'Can only submit deliverables for accepted proposals' })
    }

    // Check if user is the influencer
    if (req.user.userType !== 'influencer' || req.user.userId !== proposal.influencerId) {
      return res.status(403).json({ error: 'Access denied. Only the assigned influencer can submit deliverables.' })
    }

    // Check if deliverable can be submitted
    if (deliverable.status !== 'pending' && deliverable.status !== 'revision_requested') {
      return res.status(400).json({ 
        error: 'Can only submit pending or revision-requested deliverables',
        currentStatus: deliverable.status
      })
    }

    // Check if deliverable is past due date
    if (deliverable.dueDate && new Date(deliverable.dueDate) < new Date()) {
      return res.status(400).json({ 
        error: 'Deliverable is past due date',
        dueDate: deliverable.dueDate
      })
    }

    // Submit deliverable with validated data
    const updateData = {
      fileUrl: sanitizedData.fileUrl.trim(),
      submissionNotes: sanitizedData.submissionNotes || null,
      status: 'submitted',
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const updatedDeliverables = await safeSupabaseQuery('deliverables', 'update', updateData, { id: deliverableId })
    if (!updatedDeliverables || updatedDeliverables.length === 0) {
      return res.status(500).json({ error: 'Failed to update deliverable in database' })
    }

    const updatedDeliverable = updatedDeliverables[0]

    res.json({
      message: 'Deliverable submitted successfully',
      deliverable: updatedDeliverable
    })
  } catch (error) {
    console.error('[SUBMIT_DELIVERABLE] Error:', error)
    res.status(500).json({ error: 'Failed to submit deliverable' })
  }
})

// PUT review deliverable (brand only)
app.put('/api/deliverables/:id/review', authenticateToken, async (req, res) => {
  try {
    const deliverableId = parseInt(req.params.id)
    
    // Enhanced input validation
    if (isNaN(deliverableId) || deliverableId <= 0) {
      return res.status(400).json({ error: 'Invalid deliverable ID' })
    }

    // Sanitize input data
    const sanitizedData = {
      status: req.body.status,
      reviewNotes: sanitizeInput(req.body.reviewNotes)
    }

    // Validate required fields
    if (!sanitizedData.status) {
      return res.status(400).json({ error: 'Status is required' })
    }

    // Validate status
    const validStatuses = ['approved', 'rejected', 'revision_requested']
    if (!validStatuses.includes(sanitizedData.status)) {
      return res.status(400).json({ 
        error: 'Invalid status. Must be one of: approved, rejected, revision_requested',
        validStatuses
      })
    }

    if (!supabaseClient) {
      return res.status(503).json({ error: 'Database unavailable' })
    }

    // Get the deliverable to verify access
    const deliverables = await safeSupabaseQuery('deliverables', 'select', null, { id: deliverableId })
    if (!deliverables || deliverables.length === 0) {
      return res.status(404).json({ error: 'Deliverable not found' })
    }

    const deliverable = deliverables[0]

    // Validate status transition
    if (!validateStatusTransition(deliverable.status, sanitizedData.status)) {
      return res.status(400).json({ 
        error: 'Invalid status transition',
        currentStatus: deliverable.status,
        requestedStatus: sanitizedData.status
      })
    }

    // Get the proposal and listing to check brand ownership
    const proposals = await safeSupabaseQuery('proposals', 'select', null, { id: deliverable.proposalId })
    if (!proposals || proposals.length === 0) {
      return res.status(404).json({ error: 'Proposal not found' })
    }

    const proposal = proposals[0]
    
    // Validate proposal status
    if (proposal.status === 'withdrawn') {
      return res.status(410).json({ error: 'Cannot review deliverables for withdrawn proposals' })
    }

    const listings = await safeSupabaseQuery('listings', 'select', null, { id: proposal.listingId })
    if (!listings || listings.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' })
    }

    const listing = listings[0]

    // Check if user is the brand owner
    if (req.user.userType !== 'brand' || req.user.userId !== listing.brandId) {
      return res.status(403).json({ error: 'Access denied. Only the brand owner can review deliverables.' })
    }

    // Check if deliverable can be reviewed
    if (deliverable.status !== 'submitted' && deliverable.status !== 'under_review') {
      return res.status(400).json({ 
        error: 'Can only review submitted or under-review deliverables',
        currentStatus: deliverable.status
      })
    }

    // Require review notes for rejection or revision requests
    if ((sanitizedData.status === 'rejected' || sanitizedData.status === 'revision_requested') && 
        (!sanitizedData.reviewNotes || sanitizedData.reviewNotes.trim().length === 0)) {
      return res.status(400).json({ 
        error: 'Review notes are required for rejection or revision requests' 
      })
    }

    // Review deliverable with validated data
    const updateData = {
      status: sanitizedData.status,
      reviewNotes: sanitizedData.reviewNotes || null,
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const updatedDeliverables = await safeSupabaseQuery('deliverables', 'update', updateData, { id: deliverableId })
    if (!updatedDeliverables || updatedDeliverables.length === 0) {
      return res.status(500).json({ error: 'Failed to update deliverable in database' })
    }

    const updatedDeliverable = updatedDeliverables[0]

    res.json({
      message: 'Deliverable reviewed successfully',
      deliverable: updatedDeliverable
    })
  } catch (error) {
    console.error('[REVIEW_DELIVERABLE] Error:', error)
    res.status(500).json({ error: 'Failed to review deliverable' })
  }
})

// GET influencer's deliverables
app.get('/api/deliverables/my-deliverables', authenticateToken, async (req, res) => {
  try {
    // Only influencers can access this endpoint
    if (req.user.userType !== 'influencer') {
      return res.status(403).json({ error: 'Access denied. Only influencers can view their deliverables.' })
    }

    // Get all proposals by this influencer
    const proposals = await safeSupabaseQuery('proposals', 'select', null, { influencerId: req.user.userId })
    
    if (!proposals || proposals.length === 0) {
      return res.json({ deliverables: [] })
    }

    // Get deliverables for all proposals
    const deliverables = []
    for (const proposal of proposals) {
      const proposalDeliverables = await safeSupabaseQuery('deliverables', 'select', null, { proposalId: proposal.id })
      if (proposalDeliverables && proposalDeliverables.length > 0) {
        // Add proposal and listing info to each deliverable
        const listing = await safeSupabaseQuery('listings', 'select', null, { id: proposal.listingId })
        const brand = await safeSupabaseQuery('users', 'select', null, { id: listing[0]?.brandId })
        
        for (const deliverable of proposalDeliverables) {
          deliverables.push({
            ...deliverable,
            listingTitle: listing[0]?.title,
            brandName: brand[0]?.name
          })
        }
      }
    }

    res.json({ deliverables })
  } catch (error) {
    console.error('[GET_MY_DELIVERABLES] Error:', error)
    res.status(500).json({ error: 'Failed to fetch influencer deliverables' })
  }
})

// GET brand's deliverables to review
app.get('/api/deliverables/brand-deliverables', authenticateToken, async (req, res) => {
  try {
    // Only brands can access this endpoint
    if (req.user.userType !== 'brand') {
      return res.status(403).json({ error: 'Access denied. Only brands can view deliverables to review.' })
    }

    // Get all listings by this brand
    const listings = await safeSupabaseQuery('listings', 'select', null, { brandId: req.user.userId })
    
    if (!listings || listings.length === 0) {
      return res.json({ deliverables: [] })
    }

    // Get deliverables for all proposals of these listings
    const deliverables = []
    for (const listing of listings) {
      const proposals = await safeSupabaseQuery('proposals', 'select', null, { listingId: listing.id })
      
      for (const proposal of proposals) {
        const proposalDeliverables = await safeSupabaseQuery('deliverables', 'select', null, { proposalId: proposal.id })
        if (proposalDeliverables && proposalDeliverables.length > 0) {
          // Add proposal and influencer info to each deliverable
          const influencer = await safeSupabaseQuery('users', 'select', null, { id: proposal.influencerId })
          
          for (const deliverable of proposalDeliverables) {
            deliverables.push({
              ...deliverable,
              listingTitle: listing.title,
              influencerName: influencer[0]?.name
            })
          }
        }
      }
    }

    res.json({ deliverables })
  } catch (error) {
    console.error('[GET_BRAND_DELIVERABLES] Error:', error)
    res.status(500).json({ error: 'Failed to fetch brand deliverables' })
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
      console.log(`   - GET /api/proposals/brand-accepted (get brand's accepted proposals)`)
      console.log(`   - GET /api/campaigns/deliverable-counts (get deliverable counts for campaigns)`)
      console.log(`   - PUT /api/proposals/:id/status (update proposal status)`)
      console.log(`   - GET /api/users/:id (get user profile)`)
      console.log(`   - POST /api/messages (send message)`)
      console.log(`   - GET /api/deliverables/proposal/:id (get deliverables for proposal)`)
      console.log(`   - POST /api/deliverables (create deliverable)`)
      console.log(`   - PUT /api/deliverables/:id (update deliverable)`)
      console.log(`   - DELETE /api/deliverables/:id (delete deliverable)`)
      console.log(`   - POST /api/deliverables/:id/submit (submit deliverable)`)
      console.log(`   - PUT /api/deliverables/:id/review (review deliverable)`)
      console.log(`   - GET /api/deliverables/my-deliverables (get influencer deliverables)`)
      console.log(`   - GET /api/deliverables/brand-deliverables (get brand deliverables)`)
      console.log(`   - POST /api/admin/add-campaign-deadline-column (add campaignDeadline column - ADMIN ONLY)`)
      console.log(`   - POST /api/admin/clear-database (clear all data except users - ADMIN ONLY)`)
      console.log(`   - GET /healthz (health check)`)
      console.log(`✅ Server started successfully at ${new Date().toISOString()}`)
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

startServer()
