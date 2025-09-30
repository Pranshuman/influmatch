// db.js - Resilient PostgreSQL connection with retry + backoff
import pg from "pg";

const MAX_RETRIES = 8;           // ~4-5 minutes worst-case
const BASE_DELAY_MS = 1000;      // exponential backoff
const CONNECTION_TIMEOUT_MS = 10000;

export async function createDbPool() {
  const { DATABASE_URL } = process.env;
  if (!DATABASE_URL) throw new Error("Missing DATABASE_URL");

  console.log(`[DB] Attempting to connect to database...`);
  console.log(`[DB] Connection string: ${DATABASE_URL.substring(0, 20)}...`);

  // IMPORTANT for Supabase: always require TLS
  // Ensure your DATABASE_URL ends with `?sslmode=require` OR pass `ssl` below.
  const pool = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: { require: true, rejectUnauthorized: false },
    // conservative pool to avoid "too many connections"
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
    keepAlive: true,
  });

  // First attempt + retry loop
  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    try {
      console.log(`[DB] Connection attempt ${attempt + 1}/${MAX_RETRIES}`);
      const client = await pool.connect();
      client.release();
      console.log(`[DB] ✅ Connected successfully on attempt ${attempt + 1}`);
      return pool; // success
    } catch (e) {
      attempt += 1;
      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      const maxDelay = Math.min(delay, 15000);
      
      console.warn(`[DB] ❌ Connect attempt ${attempt} failed: ${e.message}`);
      console.warn(`[DB] Error code: ${e.code}, Error detail: ${e.detail || 'N/A'}`);
      console.warn(`[DB] Retrying in ${maxDelay}ms...`);
      
      if (attempt >= MAX_RETRIES) {
        console.error(`[DB] 🚨 All ${MAX_RETRIES} connection attempts failed`);
        throw new Error(`DB connect retries exhausted. Last error: ${e.message}`);
      }
      
      await new Promise(r => setTimeout(r, maxDelay));
    }
  }

  // This should never be reached due to the throw above, but just in case
  throw new Error("DB connect retries exhausted");
}

// Helper function to safely execute queries
export async function safeQuery(pool, query, params = []) {
  if (!pool) {
    throw new Error("Database pool not available");
  }
  
  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return result;
  } finally {
    client.release();
  }
}

// Helper function to safely execute transactions
export async function safeTransaction(pool, callback) {
  if (!pool) {
    throw new Error("Database pool not available");
  }
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
