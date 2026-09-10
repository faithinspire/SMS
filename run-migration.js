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
    const migrationPath = path.join(__dirname, 'database', 'migrations', '022_populate_test_data_for_registration.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Running migration 022...');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }

    console.log('✅ Migration 022 executed successfully!');
    console.log('📊 Test data has been populated:');
    console.log('   - Classes: Class 1-6');
    console.log('   - Arms: A, B');
    console.log('   - Subjects: Mathematics, English, Science, Social Studies, PE, Arts, CS, History, Literature');
    console.log('   - Class-Arm Combinations: All combinations created');
    
  } catch (err) {
    console.error('❌ Error running migration:', err.message);
    process.exit(1);
  }
}

runMigration();
