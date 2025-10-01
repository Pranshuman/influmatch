-- Supabase Database Schema for Influmatch
-- Run this in Supabase SQL Editor

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    "userType" TEXT NOT NULL CHECK ("userType" IN ('brand', 'influencer')),
    bio TEXT,
    website TEXT,
    "socialMedia" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Create listings table
CREATE TABLE IF NOT EXISTS listings (
    id BIGSERIAL PRIMARY KEY,
    "brandId" BIGINT NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT,
    budget BIGINT,
    deadline TEXT,
    requirements TEXT,
    deliverables TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Create proposals table
CREATE TABLE IF NOT EXISTS proposals (
    id BIGSERIAL PRIMARY KEY,
    "listingId" BIGINT NOT NULL REFERENCES listings(id),
    "influencerId" BIGINT NOT NULL REFERENCES users(id),
    message TEXT NOT NULL,
    "proposedBudget" BIGINT,
    timeline TEXT,
    status TEXT DEFAULT 'under_review' CHECK (status IN ('under_review', 'accepted', 'rejected', 'withdrawn')),
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id BIGSERIAL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "senderId" BIGINT NOT NULL REFERENCES users(id),
    "recipientId" BIGINT NOT NULL REFERENCES users(id),
    "proposalId" BIGINT REFERENCES proposals(id),
    content TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_listings_brand_id ON listings("brandId");
CREATE INDEX IF NOT EXISTS idx_proposals_listing_id ON proposals("listingId");
CREATE INDEX IF NOT EXISTS idx_proposals_influencer_id ON proposals("influencerId");
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages("conversationId");
CREATE INDEX IF NOT EXISTS idx_messages_proposal_id ON messages("proposalId");

-- Enable Row Level Security (RLS) for better security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
