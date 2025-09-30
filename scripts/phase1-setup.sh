#!/bin/bash

# Phase 1: Pre-Production Setup Script
# This script prepares the infrastructure for production deployment

set -e  # Exit on any error

echo "🚀 Starting Phase 1: Pre-Production Setup"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    log_info "Checking dependencies..."
    
    # Check for Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    # Check for npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    # Check for git
    if ! command -v git &> /dev/null; then
        log_error "git is not installed. Please install git first."
        exit 1
    fi
    
    log_success "All dependencies are installed"
}

# Create production environment file
setup_environment() {
    log_info "Setting up production environment variables..."
    
    if [ ! -f .env.production ]; then
        cat > .env.production << EOF
# Production Environment Variables
NODE_ENV=production
PORT=5050

# Database Configuration (Update with your PostgreSQL URL)
DATABASE_URL=postgresql://username:password@localhost:5432/influmatch_prod

# JWT Configuration (Generate secure secret)
JWT_SECRET=your-super-secure-jwt-secret-here-change-this

# CORS Configuration
CORS_ORIGIN=https://influmatch.com,https://www.influmatch.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Email Configuration (Optional)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Security
BCRYPT_ROUNDS=12
SESSION_SECRET=your-session-secret-here

# Monitoring
SENTRY_DSN=your-sentry-dsn-here
EOF
        log_success "Created .env.production file"
        log_warning "Please update the environment variables with your actual values"
    else
        log_info ".env.production already exists"
    fi
}

# Create database migration script
create_migration_script() {
    log_info "Creating database migration script..."
    
    cat > scripts/migrate-to-postgres.js << 'EOF'
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const fs = require('fs');

// Configuration
const sqliteDbPath = './influmatch.db';
const postgresConfig = {
    user: process.env.POSTGRES_USER || 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    database: process.env.POSTGRES_DB || 'influmatch_prod',
    password: process.env.POSTGRES_PASSWORD || 'password',
    port: process.env.POSTGRES_PORT || 5432,
};

async function migrateData() {
    console.log('🔄 Starting database migration from SQLite to PostgreSQL...');
    
    // Connect to SQLite
    const sqliteDb = new sqlite3.Database(sqliteDbPath);
    const pgPool = new Pool(postgresConfig);
    
    try {
        // Test PostgreSQL connection
        await pgPool.query('SELECT NOW()');
        console.log('✅ Connected to PostgreSQL');
        
        // Get all users from SQLite
        const users = await new Promise((resolve, reject) => {
            sqliteDb.all('SELECT * FROM users', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log(`📊 Found ${users.length} users to migrate`);
        
        // Migrate users
        for (const user of users) {
            await pgPool.query(`
                INSERT INTO users (id, name, email, password_hash, userType, bio, website, socialMedia, createdAt, updatedAt)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT (id) DO NOTHING
            `, [
                user.id, user.name, user.email, user.password_hash,
                user.userType, user.bio, user.website, user.socialMedia,
                user.createdAt, user.updatedAt
            ]);
        }
        
        // Get all listings from SQLite
        const listings = await new Promise((resolve, reject) => {
            sqliteDb.all('SELECT * FROM listings', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log(`📊 Found ${listings.length} listings to migrate`);
        
        // Migrate listings
        for (const listing of listings) {
            await pgPool.query(`
                INSERT INTO listings (id, title, description, category, budget, deadline, requirements, deliverables, brandId, status, createdAt, updatedAt)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                ON CONFLICT (id) DO NOTHING
            `, [
                listing.id, listing.title, listing.description, listing.category,
                listing.budget, listing.deadline, listing.requirements, listing.deliverables,
                listing.brandId, listing.status, listing.createdAt, listing.updatedAt
            ]);
        }
        
        // Get all proposals from SQLite
        const proposals = await new Promise((resolve, reject) => {
            sqliteDb.all('SELECT * FROM proposals', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log(`📊 Found ${proposals.length} proposals to migrate`);
        
        // Migrate proposals
        for (const proposal of proposals) {
            await pgPool.query(`
                INSERT INTO proposals (id, listingId, influencerId, message, proposedBudget, timeline, status, createdAt, updatedAt)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (id) DO NOTHING
            `, [
                proposal.id, proposal.listingId, proposal.influencerId, proposal.message,
                proposal.proposedBudget, proposal.timeline, proposal.status,
                proposal.createdAt, proposal.updatedAt
            ]);
        }
        
        console.log('✅ Database migration completed successfully!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        sqliteDb.close();
        await pgPool.end();
    }
}

// Run migration
migrateData().catch(console.error);
EOF
    
    log_success "Created database migration script"
}

# Create PostgreSQL schema
create_postgres_schema() {
    log_info "Creating PostgreSQL schema..."
    
    cat > scripts/postgres-schema.sql << 'EOF'
-- PostgreSQL Schema for Influmatch
-- This script creates all necessary tables for production

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    userType VARCHAR(50) NOT NULL CHECK (userType IN ('brand', 'influencer')),
    bio TEXT,
    website VARCHAR(255),
    socialMedia JSONB,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Listings table
CREATE TABLE IF NOT EXISTS listings (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    budget DECIMAL(10,2) NOT NULL,
    deadline TIMESTAMP,
    requirements TEXT,
    deliverables TEXT,
    brandId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Proposals table
CREATE TABLE IF NOT EXISTS proposals (
    id SERIAL PRIMARY KEY,
    listingId INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    influencerId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    proposedBudget DECIMAL(10,2),
    timeline VARCHAR(255),
    status VARCHAR(50) DEFAULT 'under_review' CHECK (status IN ('under_review', 'accepted', 'rejected', 'withdrawn')),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(listingId, influencerId)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    senderId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiverId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    conversationId VARCHAR(255) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_userType ON users(userType);
CREATE INDEX IF NOT EXISTS idx_listings_brandId ON listings(brandId);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_proposals_listingId ON proposals(listingId);
CREATE INDEX IF NOT EXISTS idx_proposals_influencerId ON proposals(influencerId);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_messages_senderId ON messages(senderId);
CREATE INDEX IF NOT EXISTS idx_messages_receiverId ON messages(receiverId);
CREATE INDEX IF NOT EXISTS idx_messages_conversationId ON messages(conversationId);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updatedAt = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON listings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON proposals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EOF
    
    log_success "Created PostgreSQL schema"
}

# Create deployment configuration
create_deployment_config() {
    log_info "Creating deployment configuration..."
    
    # Vercel configuration for frontend
    cat > frontend/vercel.json << 'EOF'
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "env": {
    "NEXT_PUBLIC_API_URL": "@api_url"
  }
}
EOF
    
    # Railway configuration for backend
    cat > railway.json << 'EOF'
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
EOF
    
    log_success "Created deployment configuration files"
}

# Main execution
main() {
    echo "Starting Phase 1 setup..."
    
    check_dependencies
    setup_environment
    create_migration_script
    create_postgres_schema
    create_deployment_config
    
    echo ""
    echo "✅ Phase 1 setup completed!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Update .env.production with your actual values"
    echo "2. Set up PostgreSQL database"
    echo "3. Run database migration: node scripts/migrate-to-postgres.js"
    echo "4. Test the migration"
    echo "5. Proceed to Phase 2: Staging Deployment"
    echo ""
    echo "🔗 Useful commands:"
    echo "  - Test database: npm run test:database"
    echo "  - Run migration: node scripts/migrate-to-postgres.js"
    echo "  - Start production: npm run start:production"
}

# Run main function
main "$@"


