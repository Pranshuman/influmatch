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
    console.log('🔄 Starting migration: Add campaignDeadline column to listings table...')
    
    const { supabaseUrl, serviceRoleKey } = getSupabaseConfig()
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
      db: { schema: "public" }
    })
    
    console.log('✅ Supabase client initialized')
    
    // Add the campaignDeadline column
    console.log('🔄 Adding campaignDeadline column...')
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE listings ADD COLUMN IF NOT EXISTS "campaignDeadline" TEXT;'
    })
    
    if (alterError) {
      console.error('❌ Error adding column:', alterError)
      throw alterError
    }
    
    console.log('✅ campaignDeadline column added successfully')
    
    // Verify the column exists
    console.log('🔄 Verifying column exists...')
    const { data: columns, error: verifyError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'listings')
      .eq('column_name', 'campaignDeadline')
    
    if (verifyError) {
      console.error('❌ Error verifying column:', verifyError)
      throw verifyError
    }
    
    if (columns && columns.length > 0) {
      console.log('✅ Column verification successful:')
      console.log('   Column:', columns[0].column_name)
      console.log('   Type:', columns[0].data_type)
      console.log('   Nullable:', columns[0].is_nullable)
    } else {
      console.log('⚠️  Column not found in verification query')
    }
    
    console.log('🎉 Migration completed successfully!')
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  }
}

// Run the migration
addCampaignDeadlineColumn()
