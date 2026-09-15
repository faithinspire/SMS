#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const cwd = 'c:\\Users\\OLU\\Desktop\\SMS';

console.log('🚀 Auto-Deploy Starting...\n');

try {
  console.log('Step 1: Checking git status...');
  const status = execSync('git status --porcelain', { cwd, encoding: 'utf-8' });
  console.log('Status:\n' + status);

  console.log('\nStep 2: Adding all changes...');
  execSync('git add -A', { cwd, stdio: 'inherit' });

  console.log('\nStep 3: Committing...');
  try {
    execSync('git commit -m "FORCE FIX: Teacher registration and student results - nested field queries removed"', { cwd, stdio: 'inherit' });
  } catch (e) {
    console.log('Commit may have nothing to commit (that\'s ok)');
  }

  console.log('\nStep 4: Force pushing to GitHub...');
  execSync('git push origin main --force', { cwd, stdio: 'inherit' });

  console.log('\n✅ All changes pushed to GitHub!');
  console.log('Vercel should auto-deploy within 2-5 minutes');
  console.log('Check: https://vercel.com/dashboard/sms');

} catch (error) {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
}
