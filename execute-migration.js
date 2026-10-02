#!/usr/bin/env node
/**
 * Execute Supabase migration via REST API
 * This script runs the critical production fixes
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && key.trim() && !key.trim().startsWith('#')) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Executing Supabase migrations...');
console.log(`Supabase URL: ${SUPABASE_URL}`);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Please add SUPABASE_SERVICE_ROLE_KEY to .env.local');
  process.exit(1);
}

// Read migration SQL
const migrationSql = fs.readFileSync(path.join(__dirname, 'RUN_THIS_IN_SUPABASE_NOW.sql'), 'utf-8');

// Split SQL into individual statements
const statements = migrationSql
  .split(';')
  .map(s => s.trim())
  .filter(s => s && !s.startsWith('--') && s !== '')
  .map(s => s + ';');

console.log(`📝 Found ${statements.length} SQL statements to execute`);

// Execute migrations
async function executeMigrations() {
  try {
    // Use postgres.js or execute via HTTP
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({
        query: migrationSql
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }

    console.log('✅ Migrations executed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error executing migrations:', error.message);
    process.exit(1);
  }
}

executeMigrations();
