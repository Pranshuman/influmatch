#!/usr/bin/env node
// SQLite Browser for Influmatch Database
// Interactive command-line tool to browse and query the SQLite database

import { spawn } from 'child_process'
import readline from 'readline'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbPath = path.join(__dirname, 'influmatch.db')

console.log('🗄️  Influmatch SQLite Database Browser')
console.log('=====================================')
console.log(`📊 Database: ${dbPath}`)
console.log('')

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'sqlite> '
})

// Helper function to run SQLite commands
function runSQLiteCommand(command) {
  return new Promise((resolve, reject) => {
    const sqlite = spawn('sqlite3', [dbPath, command])
    
    let output = ''
    let error = ''
    
    sqlite.stdout.on('data', (data) => {
      output += data.toString()
    })
    
    sqlite.stderr.on('data', (data) => {
      error += data.toString()
    })
    
    sqlite.on('close', (code) => {
      if (code === 0) {
        resolve(output)
      } else {
        reject(new Error(error || `SQLite command failed with code ${code}`))
      }
    })
  })
}

// Show available commands
function showHelp() {
  console.log('📋 Available Commands:')
  console.log('  .tables          - Show all tables')
  console.log('  .schema          - Show database schema')
  console.log('  .schema <table>  - Show schema for specific table')
  console.log('  SELECT * FROM users LIMIT 5;')
  console.log('  SELECT * FROM listings LIMIT 5;')
  console.log('  SELECT * FROM proposals LIMIT 5;')
  console.log('  SELECT * FROM messages LIMIT 5;')
  console.log('  .help            - Show this help')
  console.log('  .quit or .exit   - Exit browser')
  console.log('')
}

// Show initial database info
async function showDatabaseInfo() {
  try {
    console.log('📊 Database Information:')
    console.log('========================')
    
    // Show tables
    const tables = await runSQLiteCommand('.tables')
    console.log('📋 Tables:', tables.trim())
    
    // Show table counts
    const tableNames = tables.trim().split(/\s+/).filter(t => t)
    console.log('')
    console.log('📈 Record Counts:')
    
    for (const table of tableNames) {
      try {
        const count = await runSQLiteCommand(`SELECT COUNT(*) FROM ${table}`)
        console.log(`   ${table}: ${count.trim()} records`)
      } catch (err) {
        console.log(`   ${table}: Error getting count`)
      }
    }
    
    console.log('')
  } catch (error) {
    console.error('❌ Error getting database info:', error.message)
  }
}

// Main command processor
async function processCommand(input) {
  const command = input.trim()
  
  if (!command) return
  
  // Handle special commands
  if (command === '.help' || command === 'help') {
    showHelp()
    return
  }
  
  if (command === '.quit' || command === '.exit' || command === 'quit' || command === 'exit') {
    console.log('👋 Goodbye!')
    rl.close()
    return
  }
  
  if (command === '.info') {
    await showDatabaseInfo()
    return
  }
  
  // Execute SQLite command
  try {
    const result = await runSQLiteCommand(command)
    if (result.trim()) {
      console.log(result)
    } else {
      console.log('✅ Command executed successfully')
    }
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

// Start the browser
async function startBrowser() {
  await showDatabaseInfo()
  showHelp()
  
  rl.prompt()
  
  rl.on('line', async (input) => {
    await processCommand(input)
    rl.prompt()
  })
  
  rl.on('close', () => {
    console.log('')
    process.exit(0)
  })
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n👋 Goodbye!')
  rl.close()
})

// Start the browser
startBrowser().catch(console.error)
