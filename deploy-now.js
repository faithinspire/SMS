#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');

const projectDir = 'c:\\Users\\OLU\\Desktop\\SMS';
process.chdir(projectDir);

console.log('🚀 DEPLOYMENT PIPELINE - PRODUCTION HOTFIX');
console.log('='.repeat(60));

try {
  console.log('\n📝 Step 1: Staging code fixes...');
  execSync('git add src/app/api/school/staff/route.ts', { stdio: 'inherit' });
  execSync('git add src/app/api/school/students/route.ts', { stdio: 'inherit' });
  execSync('git add src/services/teacher-data.service.ts', { stdio: 'inherit' });
  execSync('git add database/migrations/163_add_missing_staff_student_columns.sql', { stdio: 'inherit' });
  
  console.log('\n✅ Files staged');

  console.log('\n📝 Step 2: Creating commit...');
  execSync('git commit -m "🔥 PRODUCTION HOTFIX: Fix 6 critical issues - staff salary/bank columns, students status, SERVICE_ROLE_KEY, teacher-student linking"', { stdio: 'inherit' });
  
  console.log('\n✅ Commit created');

  console.log('\n🚀 Step 3: Pushing to GitHub (triggers Vercel auto-deploy)...');
  execSync('git push origin main', { stdio: 'inherit' });
  
  console.log('\n✅ Code pushed to GitHub');
  console.log('\n' + '='.repeat(60));
  console.log('✅ DEPLOYMENT COMPLETE');
  console.log('='.repeat(60));
  console.log('\n📊 WHAT JUST HAPPENED:');
  console.log('  ✓ 4 files with critical fixes staged');
  console.log('  ✓ Commit created with descriptive message');
  console.log('  ✓ Pushed to main branch');
  console.log('  ✓ Vercel auto-deploy triggered');
  console.log('\n🔗 Check deployment at: https://vercel.com/faithinspire/sms');
  console.log('\n🔴 NEXT STEPS:');
  console.log('  1. Execute Supabase migrations NOW');
  console.log('     Copy RUN_THIS_IN_SUPABASE_NOW.sql to Supabase SQL Editor');
  console.log('  2. Verify: Letter generation, edit modals, teacher-student linking');
  
  process.exit(0);
} catch (error) {
  console.error('\n❌ DEPLOYMENT FAILED');
  console.error(error.message);
  process.exit(1);
}
