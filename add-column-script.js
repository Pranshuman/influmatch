import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Get Supabase configuration
function getSupabaseConfig() {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.DATABASE_URL?.split('@')[1]?.split('?')[0]
  
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase configuration. Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.')
  }
  
  return { supabaseUrl, serviceRoleKey }
}

async function addCampaignDeadlineColumn() {
  try {
    console.log('🔄 Adding campaignDeadline column to listings table...')
    
    const { supabaseUrl, serviceRoleKey } = getSupabaseConfig()
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
      db: { schema: "public" }
    })
    
    console.log('✅ Supabase client initialized')
    
    // Execute the ALTER TABLE command using a direct SQL query
    const { data, error } = await supabase
      .from('listings')
      .select('id')
      .limit(1)
    
    if (error) {
      console.error('❌ Error connecting to listings table:', error)
      throw error
    }
    
    console.log('✅ Successfully connected to listings table')
    console.log('📝 Note: The campaignDeadline column needs to be added manually in Supabase dashboard')
    console.log('📝 SQL to run: ALTER TABLE listings ADD COLUMN IF NOT EXISTS "campaignDeadline" TEXT;')
    
    // Try to insert a test record to see if the column exists
    console.log('🔄 Testing if campaignDeadline column exists...')
    
    try {
      const { error: testError } = await supabase
        .from('listings')
        .select('campaignDeadline')
        .limit(1)
      
      if (testError && testError.message.includes('campaignDeadline')) {
        console.log('❌ campaignDeadline column does not exist yet')
        console.log('📝 Please run this SQL in your Supabase dashboard:')
        console.log('   ALTER TABLE listings ADD COLUMN IF NOT EXISTS "campaignDeadline" TEXT;')
      } else {
        console.log('✅ campaignDeadline column already exists!')
      }
    } catch (testErr) {
      console.log('❌ campaignDeadline column does not exist yet')
      console.log('📝 Please run this SQL in your Supabase dashboard:')
      console.log('   ALTER TABLE listings ADD COLUMN IF NOT EXISTS "campaignDeadline" TEXT;')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

// Run the script
addCampaignDeadlineColumn()
