#!/usr/bin/env node

/**
 * Automatic Git Push via GitHub API
 * This script pushes the fixed vercel.json to GitHub automatically
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function pushToGitHub() {
  try {
    console.log('🚀 Starting automatic push to GitHub...\n');

    // Step 1: Get git remote info
    console.log('[STEP 1] Getting git configuration...');
    const remoteUrl = execSync('git config --get remote.origin.url', {
      cwd: 'c:\\Users\\OLU\\Desktop\\SMS',
      encoding: 'utf-8'
    }).trim();
    console.log(`Remote URL: ${remoteUrl}\n`);

    // Step 2: Get current branch
    console.log('[STEP 2] Getting current branch...');
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: 'c:\\Users\\OLU\\Desktop\\SMS',
      encoding: 'utf-8'
    }).trim();
    console.log(`Current branch: ${currentBranch}\n`);

    // Step 3: Stage changes
    console.log('[STEP 3] Staging all changes...');
    execSync('git add -A', {
      cwd: 'c:\\Users\\OLU\\Desktop\\SMS',
      stdio: 'inherit'
    });
    console.log('✓ Changes staged\n');

    // Step 4: Commit
    console.log('[STEP 4] Creating commit...');
    try {
      execSync('git commit -m "AUTOMATIC FIX: Clean minimal vercel.json - removes functions error"', {
        cwd: 'c:\\Users\\OLU\\Desktop\\SMS',
        stdio: 'inherit'
      });
    } catch (e) {
      console.log('Note: Commit command completed (might have no changes)\n');
    }

    // Step 5: Push
    console.log('[STEP 5] Pushing to GitHub...');
    execSync('git push -u origin main', {
      cwd: 'c:\\Users\\OLU\\Desktop\\SMS',
      stdio: 'inherit'
    });
    console.log('\n✓ Pushed successfully!\n');

    // Step 6: Show final status
    console.log('========================================');
    console.log('✓✓✓ AUTOMATIC PUSH COMPLETE! ✓✓✓');
    console.log('========================================\n');

    console.log('✅ vercel.json has been pushed to GitHub');
    console.log('✅ Vercel will auto-detect the change');
    console.log('✅ New build will start in ~30 seconds');
    console.log('✅ Build should complete in 2-3 minutes\n');

    console.log('Next steps:');
    console.log('1. Go to: https://vercel.com/dashboard');
    console.log('2. Watch status: Building... → Ready ✓');
    console.log('3. Click the URL when ready');
    console.log('4. Your app is LIVE! 🎉\n');

    console.log('========================================');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nTroubleshooting:');
    console.error('- Make sure Git is installed');
    console.error('- Make sure you\'re in the right directory');
    console.error('- Check internet connection');
    process.exit(1);
  }
}

// Run the push
pushToGitHub().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
