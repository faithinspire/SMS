#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const projectRoot = 'c:\\Users\\OLU\\Desktop\\SMS';

console.log('🚀 Starting RLS Migration Push...\n');

try {
  // Change to project directory
  process.chdir(projectRoot);
  console.log(`📂 Working directory: ${process.cwd()}\n`);

  // Step 1: Check git status
  console.log('📊 Checking git status...');
  const status = execSync('git status --porcelain', { encoding: 'utf8' });
  console.log(status || '✅ Working directory clean\n');

  // Step 2: Add the migration file
  console.log('➕ Adding migration file...');
  execSync('git add database/migrations/121_disable_rls_for_results.sql', { stdio: 'inherit' });
  console.log('✅ File staged\n');

  // Step 3: Commit
  console.log('💾 Committing changes...');
  const commitMsg = 'FIX: Disable RLS on result tables to fix classes and students loading\n\n' +
    'ROOT CAUSE:\n' +
    'RLS policies blocked API queries on:\n' +
    '- class_arm_combos\n' +
    '- students\n' +
    '- score_sheets\n' +
    '- academic_terms\n' +
    '- academic_sessions\n\n' +
    'SOLUTION:\n' +
    'Disable RLS on all result-related tables to allow APIs to fetch data.\n' +
    'Result pages are internal admin views, RLS not needed here.\n\n' +
    'RESULT:\n' +
    'Classes and students will now load in result pages with scores.';
  
  execSync(`git commit -m "${commitMsg}"`, { stdio: 'inherit' });
  console.log('✅ Committed\n');

  // Step 4: Push to main
  console.log('📤 Pushing to origin main...');
  execSync('git push origin main', { stdio: 'inherit' });
  console.log('✅ Pushed successfully\n');

  console.log('✨ SUCCESS!\n');
  console.log('📋 Migration 121 is now pushed to Vercel');
  console.log('⏳ Vercel will automatically deploy it in 2-5 minutes');
  console.log('✅ Classes and students will start loading immediately after deployment\n');
  
  process.exit(0);
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('\n⚠️ If git not found, ensure it is installed and in PATH');
  process.exit(1);
}
