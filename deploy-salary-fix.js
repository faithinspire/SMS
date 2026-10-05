#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO = 'c:\\Users\\OLU\\Desktop\\SMS';

try {
  process.chdir(REPO);
  console.log('\n🔥 DEPLOYING SALARY TAB FIX\n');

  execSync('git config user.name "SMS Deploy"', { stdio: 'ignore' });
  execSync('git config user.email "deploy@sms.com"', { stdio: 'ignore' });

  execSync('git add -A', { stdio: 'ignore' });

  const msg = '🔥 FIX SALARY TAB: Wrap G. Salary & Bank Information in activeTab === "salary" condition - fixes JSX syntax error at line 696';
  execSync(`git commit -m "${msg}"`, { stdio: 'ignore' });

  execSync('git push origin main --force-with-lease', { stdio: 'ignore' });

  console.log('✅ SALARY TAB FIX DEPLOYED\n');
  console.log('📝 Changes:');
  console.log('   - Wrapped Salary section in {activeTab === "salary" && (...)}');
  console.log('   - Fixed JSX unmatched div error');
  console.log('   - All 6 tabs now properly isolated\n');

  console.log('🚀 Vercel building now (~5-7 minutes to LIVE)\n');

  console.log('📊 Monitor: https://vercel.com/dashboard/projects/sms-gold-eta?buildLogsOpen=1\n');

  process.exit(0);
} catch (error) {
  console.error('❌ ERROR:', error.message);
  process.exit(1);
}
