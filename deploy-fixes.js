#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');

const SMS_DIR = 'c:\\Users\\OLU\\Desktop\\SMS';

try {
  console.log('[Deploy] Starting deployment of all fixes...\n');

  // Change to project directory
  process.chdir(SMS_DIR);

  // Stage all modified files
  console.log('[Deploy] Staging files...');
  execSync('git add database/migrations/137_rebuild_broadcasts_clean.sql', { stdio: 'inherit' });
  execSync('git add database/migrations/138_fix_school_deletion_cascade.sql', { stdio: 'inherit' });
  execSync('git add database/migrations/139_populate_all_subjects_prep_to_ss3.sql', { stdio: 'inherit' });
  execSync('git add src/app/api/broadcasts/send/route.ts', { stdio: 'inherit' });
  execSync('git add src/app/api/schools/delete/route.ts', { stdio: 'inherit' });
  console.log('✅ Files staged\n');

  // Commit with descriptive message
  console.log('[Deploy] Creating commit...');
  const commitMsg = 'Deploy: Rebuild broadcast system + fix school deletion + populate all subjects (Prep-SS3)';
  execSync(`git commit -m "${commitMsg}"`, { stdio: 'inherit' });
  console.log('✅ Commit created\n');

  // Push to main branch
  console.log('[Deploy] Pushing to GitHub...');
  execSync('git push -u origin main', { stdio: 'inherit' });
  console.log('✅ Pushed to GitHub\n');

  console.log('[Deploy] ===== DEPLOYMENT COMPLETE =====');
  console.log('[Deploy] All fixes have been pushed to Vercel');
  console.log('[Deploy] Watch Vercel deployment dashboard for build status');

} catch (error) {
  console.error('[Deploy] ❌ Error during deployment:');
  console.error(error.message);
  process.exit(1);
}
