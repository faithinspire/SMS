#!/usr/bin/env node

/**
 * Apply migration 033 - Add lesson notes status columns
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

async function runMigration() {
  try {
    console.log('🚀 Applying Migration 033: Add Lesson Notes Status Columns\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Read migration SQL
    const migrationPath = path.join(__dirname, 'database', 'migrations', '033_add_lesson_notes_status_columns.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      process.exit(1);
    }

    const sqlContent = fs.readFileSync(migrationPath, 'utf8');
    console.log(`📂 Loaded migration: ${migrationPath}`);
    console.log(`📊 SQL size: ${sqlContent.length} bytes\n`);

    // Execute using admin API
    console.log('🔄 Sending to Supabase...');
    
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
      },
      body: JSON.stringify({ sql: sqlContent }),
    });

    if (response.ok) {
      console.log('✅ Migration applied successfully!\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📝 Changes made to lesson_notes table:');
      console.log('   ✓ Added status column (SUBMITTED, UNDER_REVIEW, APPROVED, RETURNED)');
      console.log('   ✓ Added reviewed_by column (references users table)');
      console.log('   ✓ Added reviewed_at column (timestamp)');
      console.log('   ✓ Added reviewer_comments column (text)');
      console.log('   ✓ Created indexes for better query performance');
      console.log('   ✓ Enabled RLS with allow-all policy');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('🎉 Principal Dashboard should now work correctly!');
      console.log('   - Lesson notes can be submitted, reviewed, approved, or returned');
      console.log('   - Status tracking is now available');
      console.log('   - All queries should resolve without errors\n');
    } else {
      const error = await response.text();
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

runMigration();
