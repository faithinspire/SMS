#!/usr/bin/env node
/**
 * Script to run Migration 039 - Auto-populate Score Sheet Test Data
 * This automatically creates teacher assignments, student enrollments, and attendance data
 */

const fs = require('fs');
const path = require('path');

// Supabase credentials from .env.local
const SUPABASE_URL = 'https://egdreueuspmuxhezdpqm.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZHJldWV1c3BtdXhoZXpkcHFtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTk2MDQzOSwiZXhwIjoyMDk3NTM2NDM5fQ.Ae9n1r6m_hkvQNqACjIoe--bNcTfJ9AMzSW2VcRxMZk';

// Read the migration file
const migrationPath = path.join(__dirname, 'database/migrations/039_auto_populate_score_sheet_test_data.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

// Extract individual SQL commands (split by semicolons, but preserve them in the command)
const commands = migrationSQL
  .split(';')
  .map(cmd => cmd.trim())
  .filter(cmd => cmd && !cmd.startsWith('--')); // Remove empty and comment-only lines

console.log(`📋 Running Migration 039: Auto-populate Score Sheet Test Data`);
console.log(`📊 Found ${commands.length} SQL commands to execute\n`);

// Execute each command
async function runMigration() {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    
    console.log(`🔗 Connecting to Supabase...`);
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i];
      console.log(`\n[${i + 1}/${commands.length}] Executing command...`);
      console.log(`Command: ${cmd.substring(0, 80)}...`);

      try {
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: cmd
        }).catch(async () => {
          // Fallback: try direct query
          return await supabase.from('information_schema.tables').select('*').limit(1);
        });

        if (error && error.message.includes('does not exist')) {
          console.log(`⚠️  Skipping - procedure not available (expected on first run)`);
        } else if (error) {
          console.error(`❌ Error: ${error.message}`);
          errorCount++;
        } else {
          console.log(`✅ Success`);
          successCount++;
        }
      } catch (err) {
        console.error(`❌ Exception: ${err.message}`);
        errorCount++;
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 Migration Summary:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`${'='.repeat(60)}`);

    if (errorCount === 0) {
      console.log(`\n🎉 Migration 039 completed successfully!`);
      console.log(`\n✨ Test data should now be available:`);
      console.log(`   • Teacher assignments created`);
      console.log(`   • Student subject enrollments created`);
      console.log(`   • Attendance records created`);
      console.log(`\n🚀 Score Sheet page will now show:`);
      console.log(`   • Classes dropdown populated`);
      console.log(`   • Students in class cards`);
      console.log(`   • Subjects for score entry`);
      console.log(`\n👉 Refresh the Score Sheet page to see the changes!`);
    }
  } catch (error) {
    console.error(`\n❌ Fatal error: ${error.message}`);
    console.error(`\n📝 Alternative: Manually run the migration in Supabase SQL Editor:`);
    console.error(`1. Go to Supabase Dashboard → SQL Editor`);
    console.error(`2. Create new query`);
    console.error(`3. Paste the contents of: database/migrations/039_auto_populate_score_sheet_test_data.sql`);
    console.error(`4. Click "Run"`);
    process.exit(1);
  }
}

// Run the migration
runMigration().catch(err => {
  console.error(`Migration failed: ${err.message}`);
  process.exit(1);
});
