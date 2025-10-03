#!/usr/bin/env node

/**
 * Clear Database Script for Influmatch
 * This script will delete all campaigns (listings), proposals, deliverables, and messages
 * Users will be preserved
 * 
 * Usage: node clear-database.js
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Get Supabase configuration (same as server)
function getSupabaseConfig() {
  // Try to get from dedicated environment variables first
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      supabaseUrl: process.env.SUPABASE_URL,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
    };
  }

  // Fallback: extract from DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("Either SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY or DATABASE_URL environment variable is required");
  }

  // Parse the DATABASE_URL to extract Supabase URL and password
  const urlMatch = databaseUrl.match(/postgresql:\/\/postgres:([^@]+)@([^:]+):\d+\/postgres/);
  
  if (!urlMatch) {
    throw new Error("Invalid DATABASE_URL format. Expected: postgresql://postgres:password@db.project.supabase.co:5432/postgres");
  }

  const password = urlMatch[1];
  const host = urlMatch[2];
  
  // Convert database host to Supabase URL
  const supabaseUrl = `https://${host.replace('db.', '').replace('.supabase.co', '')}.supabase.co`;
  
  return {
    supabaseUrl,
    serviceRoleKey: password
  };
}

let supabase = null;

try {
  const { supabaseUrl, serviceRoleKey } = getSupabaseConfig();
  console.log(`[Supabase] Connecting to: ${supabaseUrl}`);
  
  supabase = createClient(supabaseUrl, serviceRoleKey);
} catch (error) {
  console.error('❌ Failed to initialize Supabase client:', error.message);
  process.exit(1);
}

async function clearDatabase() {
  console.log('🗑️  Starting database cleanup...')
  
  try {
    // Get counts before deletion
    console.log('\n📊 Current data counts:')
    
    const { data: deliverablesCount } = await supabase
      .from('deliverables')
      .select('id', { count: 'exact', head: true })
    
    const { data: messagesCount } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
    
    const { data: proposalsCount } = await supabase
      .from('proposals')
      .select('id', { count: 'exact', head: true })
    
    const { data: listingsCount } = await supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
    
    const { data: usersCount } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
    
    console.log(`   Deliverables: ${deliverablesCount?.length || 0}`)
    console.log(`   Messages: ${messagesCount?.length || 0}`)
    console.log(`   Proposals: ${proposalsCount?.length || 0}`)
    console.log(`   Listings: ${listingsCount?.length || 0}`)
    console.log(`   Users: ${usersCount?.length || 0}`)
    
    // Confirm deletion
    console.log('\n⚠️  WARNING: This will permanently delete all campaigns, proposals, deliverables, and messages!')
    console.log('   Users will be preserved.')
    
    // In a real scenario, you might want to add a confirmation prompt here
    // For now, we'll proceed with the deletion
    
    console.log('\n🗑️  Deleting data in order...')
    
    // 1. Delete deliverables
    console.log('   1. Deleting deliverables...')
    const { error: deliverablesError } = await supabase
      .from('deliverables')
      .delete()
      .neq('id', 0) // Delete all records
    
    if (deliverablesError) {
      throw new Error(`Failed to delete deliverables: ${deliverablesError.message}`)
    }
    console.log('   ✅ Deliverables deleted')
    
    // 2. Delete messages
    console.log('   2. Deleting messages...')
    const { error: messagesError } = await supabase
      .from('messages')
      .delete()
      .neq('id', 0) // Delete all records
    
    if (messagesError) {
      throw new Error(`Failed to delete messages: ${messagesError.message}`)
    }
    console.log('   ✅ Messages deleted')
    
    // 3. Delete proposals
    console.log('   3. Deleting proposals...')
    const { error: proposalsError } = await supabase
      .from('proposals')
      .delete()
      .neq('id', 0) // Delete all records
    
    if (proposalsError) {
      throw new Error(`Failed to delete proposals: ${proposalsError.message}`)
    }
    console.log('   ✅ Proposals deleted')
    
    // 4. Delete listings
    console.log('   4. Deleting listings/campaigns...')
    const { error: listingsError } = await supabase
      .from('listings')
      .delete()
      .neq('id', 0) // Delete all records
    
    if (listingsError) {
      throw new Error(`Failed to delete listings: ${listingsError.message}`)
    }
    console.log('   ✅ Listings deleted')
    
    // Verify deletion
    console.log('\n📊 Final data counts:')
    
    const { data: finalDeliverables } = await supabase
      .from('deliverables')
      .select('id', { count: 'exact', head: true })
    
    const { data: finalMessages } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
    
    const { data: finalProposals } = await supabase
      .from('proposals')
      .select('id', { count: 'exact', head: true })
    
    const { data: finalListings } = await supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
    
    const { data: finalUsers } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
    
    console.log(`   Deliverables: ${finalDeliverables?.length || 0}`)
    console.log(`   Messages: ${finalMessages?.length || 0}`)
    console.log(`   Proposals: ${finalProposals?.length || 0}`)
    console.log(`   Listings: ${finalListings?.length || 0}`)
    console.log(`   Users: ${finalUsers?.length || 0}`)
    
    console.log('\n✅ Database cleared successfully!')
    console.log('   All campaigns, proposals, deliverables, and messages have been deleted.')
    console.log('   Users have been preserved.')
    
  } catch (error) {
    console.error('\n❌ Error clearing database:', error.message)
    process.exit(1)
  }
}

// Run the script
clearDatabase()
