// supabaseClient.js - HTTP-based Supabase client (no TCP/SSL issues)
import { createClient } from "@supabase/supabase-js";

// Get Supabase configuration from environment variables
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
  // Format: postgresql://postgres:password@db.project.supabase.co:5432/postgres
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
    serviceRoleKey: password // This is a fallback - ideally use the actual service role key
  };
}

let supabase = null;

export function getSupabaseClient() {
  if (!supabase) {
    try {
      const { supabaseUrl, serviceRoleKey } = getSupabaseConfig();
      
      console.log(`[Supabase] Initializing client for: ${supabaseUrl}`);
      
      supabase = createClient(
        supabaseUrl,
        serviceRoleKey, // This should be the actual service role key
        { 
          auth: { persistSession: false }, 
          db: { schema: "public" } 
        }
      );
      
      console.log("[Supabase] ✅ Client initialized successfully");
    } catch (error) {
      console.error("[Supabase] ❌ Failed to initialize client:", error.message);
      throw error;
    }
  }
  
  return supabase;
}

// Helper function to safely execute queries using Supabase HTTP API
export async function safeSupabaseQuery(table, operation, data = null, filters = {}) {
  const client = getSupabaseClient();
  
  try {
    let result;
    
    switch (operation) {
      case 'select':
        if (Object.keys(filters).length > 0) {
          let query = client.from(table).select('*');
          Object.entries(filters).forEach(([key, value]) => {
            query = query.eq(key, value);
          });
          result = await query;
        } else {
          result = await client.from(table).select('*');
        }
        break;
        
      case 'insert':
        result = await client.from(table).insert(data).select();
        break;
        
      case 'update':
        let updateQuery = client.from(table).update(data);
        Object.entries(filters).forEach(([key, value]) => {
          updateQuery = updateQuery.eq(key, value);
        });
        result = await updateQuery;
        break;
        
      case 'delete':
        let deleteQuery = client.from(table).delete();
        Object.entries(filters).forEach(([key, value]) => {
          deleteQuery = deleteQuery.eq(key, value);
        });
        result = await deleteQuery;
        break;
        
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
    
    if (result.error) {
      console.error(`[Supabase] Query error:`, result.error);
      throw new Error(result.error.message);
    }
    
    console.log(`[Supabase] Query result:`, result);
    return result.data || [];
  } catch (error) {
    console.error(`[Supabase] Query error (${operation} on ${table}):`, error.message);
    throw error;
  }
}

// Initialize tables using Supabase HTTP API
export async function initializeSupabaseTables() {
  const client = getSupabaseClient();
  
  try {
    console.log("[Supabase] Initializing tables...");
    
    // Note: Table creation via HTTP API is limited
    // We'll assume tables exist or create them via SQL editor
    console.log("[Supabase] ✅ Tables initialization completed (assuming tables exist)");
    
    return true;
  } catch (error) {
    console.error("[Supabase] ❌ Error initializing tables:", error.message);
    throw error;
  }
}
