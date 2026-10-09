#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

console.log('🔗 Connecting to Supabase...');
const supabase = createClient(supabaseUrl, serviceKey);

async function runMigration() {
  try {
    // Read migration file
    const migrationPath = path.join(__dirname, 'database/migrations/171_populate_score_sheets_test_data.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Running migration 171: Populate score_sheets...');
    
    // Execute the SQL directly through Supabase
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }

    console.log('✅ Migration 171 executed successfully!');
    console.log('📊 Test score data has been populated');
    console.log(JSON.stringify(data, null, 2));
    
  } catch (err) {
    console.error('❌ Error running migration:', err.message);
    process.exit(1);
  }
}

runMigration();
