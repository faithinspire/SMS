#!/usr/bin/env node
/**
 * Quick Deploy to Vercel
 * Commits and pushes changes, Vercel auto-deploys on push
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = __dirname;

console.log('\n' + '='.repeat(80));
console.log('🚀 VERCEL DEPLOYMENT - School Admin Registration System');
console.log('='.repeat(80) + '\n');

try {
  // Check git status
  console.log('[1/5] Checking git status...');
  const gitStatus = execSync('git status --porcelain', { cwd: projectRoot }).toString();
  
  if (!gitStatus.trim()) {
    console.log('⚠️  No changes detected. Make sure you have new/modified files.');
    console.log('✅ Repository is clean - ready to verify deployment\n');
  } else {
    console.log(`✅ Found ${gitStatus.split('\n').filter(l => l).length} changes\n`);
    
    // Stage all changes
    console.log('[2/5] Staging changes...');
    execSync('git add -A', { cwd: projectRoot, stdio: 'pipe' });
    console.log('✅ Changes staged\n');
    
    // Commit
    console.log('[3/5] Creating commit...');
    const timestamp = new Date().toISOString().split('T')[0];
    execSync(
      `git commit -m "feat: add school admin staff/student registration with multi-step modals - ${timestamp}"`,
      { cwd: projectRoot, stdio: 'pipe' }
    );
    console.log('✅ Commit created\n');
  }
  
  // Push to origin main
  console.log('[4/5] Pushing to GitHub (origin/main)...');
  execSync('git push origin main', { cwd: projectRoot, stdio: 'pipe' });
  console.log('✅ Pushed to GitHub\n');
  
  // Show status
  console.log('[5/5] Deployment initiated...');
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ DEPLOYMENT PIPELINE ACTIVATED');
  console.log('='.repeat(80) + '\n');
  
  console.log('📊 What happens next:');
  console.log('  1. GitHub receives your push');
  console.log('  2. Vercel detects the push automatically');
  console.log('  3. Build starts (~2 minutes)');
  console.log('  4. Tests run (if configured)');
  console.log('  5. Deploy to production (~3-5 minutes)\n');
  
  console.log('🔍 Monitor deployment at:');
  console.log('  → https://vercel.com/dashboard/projects/sms-gold-eta\n');
  
  console.log('🌐 Live application will be at:');
  console.log('  → https://sms-gold-eta.vercel.app\n');
  
  console.log('✨ Features deployed:');
  console.log('  ✓ Multi-step staff registration modal');
  console.log('  ✓ Staff profile view modal');
  console.log('  ✓ Student registration dropdown APIs');
  console.log('  ✓ Real database data integration');
  console.log('  ✓ Multi-school isolation\n');
  
  console.log('⏱️ Expected timeline:');
  console.log('  NOW     - Push received by GitHub');
  console.log('  +1 min  - Vercel receives webhook');
  console.log('  +3 min  - Build starts');
  console.log('  +5 min  - Build completes');
  console.log('  +7 min  - ✅ LIVE\n');
  
  console.log('📝 To verify the deployment:');
  console.log('  1. Check Vercel dashboard (link above)');
  console.log('  2. Wait 7-10 minutes for completion');
  console.log('  3. Visit: https://sms-gold-eta.vercel.app');
  console.log('  4. Test staff registration page');
  console.log('  5. Test student registration dropdowns\n');
  
  process.exit(0);
  
} catch (error) {
  console.error('\n❌ ERROR:', error.message);
  console.error('\nPossible solutions:');
  console.error('  • Ensure git credentials are saved (git config --list)');
  console.error('  • Verify SSH key is added to GitHub');
  console.error('  • Check internet connection');
  console.error('  • Try: git push origin main (manually)\n');
  process.exit(1);
}
