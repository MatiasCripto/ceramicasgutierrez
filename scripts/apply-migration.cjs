// Quick migration script for 003_documents.sql
// Usage: node scripts/apply-migration.mjs

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('Missing env vars. Run from project root with .env.local loaded.')
  process.exit(1)
}

const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

async function run() {
  const sql = fs.readFileSync(
    path.join(__dirname, '..', 'infrastructure', 'supabase', 'migrations', '003_documents.sql'),
    'utf8'
  )

  // Try via direct PostgreSQL using the pg module
  try {
    const { Client } = require('pg')
    const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
    // Try common connection patterns
    const candidates = [
      process.env.DATABASE_URL,
      process.env.POSTGRES_URL,
      process.env.SUPABASE_DATABASE_URL,
    ].filter(Boolean)

    for (const connStr of candidates) {
      try {
        const client = new Client({ connectionString: connStr })
        await client.connect()
        await client.query(sql)
        await client.end()
        console.log('Migration applied successfully via direct connection!')
        process.exit(0)
      } catch (e) {
        console.log(`Tried connection, failed: ${e.message}`)
      }
    }

    console.log('\nCould not connect to database directly.')
    console.log('Please run the migration manually in Supabase Studio SQL editor:')
    console.log('1. Go to https://supabase.com/dashboard/project/' + projectRef + '/sql/new')
    console.log('2. Paste the contents of: infrastructure/supabase/migrations/003_documents.sql')
    console.log('3. Click "Run"\n')
    process.exit(1)
  } catch (e) {
    console.log('pg module not available. Trying REST API approach...\n')

    // Try Supabase Management API
    const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
    try {
      const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
      })

      if (res.ok) {
        console.log('Migration applied successfully via Management API!')
        process.exit(0)
      } else {
        const text = await res.text()
        console.log(`Management API failed: ${res.status} ${text}`)
      }
    } catch (e) {
      console.log(`Management API error: ${e.message}`)
    }

    console.log('\nPlease run the migration manually in Supabase Studio SQL editor:')
    console.log('1. Go to https://supabase.com/dashboard/project/' + projectRef + '/sql/new')
    console.log('2. Paste the contents of: infrastructure/supabase/migrations/003_documents.sql')
    console.log('3. Click "Run"\n')
    process.exit(1)
  }
}

run()
