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
    database: "supabase-http"
  });
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
    
    if (!createdUsers || createdUsers.length === 0) {
      console.error('[REGISTER] ❌ No user returned from database');
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
  version: '1.0.0',
  description: 'Influencer Marketplace Platform',
  endpoints: {
    auth: ['POST /auth/register', 'POST /auth/login'],
    health: ['GET /health', 'GET /healthz']
  }
}))

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
      console.log(`   - GET /healthz (health check)`)
      console.log(`✅ Server started successfully at ${new Date().toISOString()}`)
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

startServer()
