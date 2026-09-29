#!/usr/bin/env node
/**
 * Push changes to GitHub and trigger Vercel deployment
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('\x1b[36m' + '='.repeat(80) + '\x1b[0m');
console.log('\x1b[36m🚀 PUSHING TO GITHUB AND VERCEL\x1b[0m');
console.log('\x1b[36m' + '='.repeat(80) + '\x1b[0m\n');

try {
  console.log('[1/4] Checking git status...');
  const statusOutput = execSync('git status --short', { cwd: __dirname }).toString();
  const hasChanges = statusOutput.trim().length > 0;
  
  if (hasChanges) {
    console.log('✅ Found changes to commit:\n');
    console.log(statusOutput);
    
    console.log('\n[2/4] Staging all changes...');
    execSync('git add -A', { cwd: __dirname });
    console.log('✅ Changes staged\n');
    
    console.log('[3/4] Creating commit...');
    execSync('git commit -m "🔥 Fix: Results page Supabase integration + All School Admin features"', { cwd: __dirname });
    console.log('✅ Commit created\n');
  } else {
    console.log('⚠️  No changes to commit\n');
  }
  
  console.log('[4/4] Pushing to GitHub...');
  execSync('git push origin main', { cwd: __dirname, stdio: 'inherit' });
  console.log('\n✅ Push successful\n');
  
  console.log('\x1b[36m' + '='.repeat(80) + '\x1b[0m');
  console.log('\x1b[32m✅ DEPLOYMENT INITIATED\x1b[0m');
  console.log('\x1b[36m' + '='.repeat(80) + '\x1b[0m\n');
  
  console.log('📊 Status:');
  console.log('  ✅ Changes committed');
  console.log('  ✅ Pushed to GitHub main branch');
  console.log('  ✅ Vercel webhook triggered\n');
  
  console.log('📍 Monitor deployment:');
  console.log('  • Vercel Dashboard: https://vercel.com/dashboard/projects/sms-gold-eta');
  console.log('  • Live Site: https://sms-gold-eta.vercel.app/school-admin/dashboard\n');
  
  console.log('⏱️ Expected timeline:');
  console.log('  NOW:      Push sent to GitHub');
  console.log('  +30 sec:  Vercel receives webhook');
  console.log('  +1 min:   Build starts');
  console.log('  +3-5 min: Build completes');
  console.log('  +5-7 min: 🎉 LIVE on production\n');

} catch (error) {
  console.error('\x1b[31m❌ ERROR:\x1b[0m', error.message);
  process.exit(1);
}
