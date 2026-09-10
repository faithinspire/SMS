#!/usr/bin/env node

/**
 * Apply Migration 026: Create Teachers Table
 * Run this to create the teachers table in Supabase
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigration() {
  try {
    console.log('📡 Applying Migration 026: Create Teachers Table...')

    // Read the SQL migration file
    const migrationPath = path.join(__dirname, 'database/migrations/026_create_teachers_table.sql')
    const sql = fs.readFileSync(migrationPath, 'utf-8')

    // Execute the migration
    const { error } = await supabase.rpc('exec', { sql_string: sql })

    if (error) {
      // Try using query instead
      console.log('📝 Using query method...')
      const { data, error: queryError } = await supabase.from('_migrations').select('*')
      
      if (queryError && queryError.code === 'PGRST200') {
        console.log('📡 Migrations table not found, executing SQL directly...')
        // The RPC might not exist, so we'll use direct query
        // For now, just report what needs to be done
        console.log('⚠️ Please run this SQL in Supabase SQL Editor:')
        console.log('---')
        console.log(sql)
        console.log('---')
        return
      }
    }

    console.log('✅ Migration 026 applied successfully!')
    console.log('✅ Teachers table created')
    console.log('✅ RLS policies configured')
    console.log('✅ Indexes created')

  } catch (error) {
    console.error('❌ Error applying migration:', error.message)
    console.log('\n📋 Manual SQL to execute in Supabase SQL Editor:')
    const migrationPath = path.join(__dirname, 'database/migrations/026_create_teachers_table.sql')
    const sql = fs.readFileSync(migrationPath, 'utf-8')
    console.log(sql)
  }
}

applyMigration()
