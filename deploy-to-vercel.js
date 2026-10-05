#!/usr/bin/env node
/**
 * Deploy Three Critical Fixes to Vercel via Git
 * 
 * Fixes:
 * 1. Staff Edit Modal - Rebuilt complete profile editor
 * 2. Results Session - Shows actual sessions not "ACTIVE"
 * 3. Staff/Student Navigation - Fixed school context resolution
 */

const { execSync } = require('child_process');
const path = require('path');

const projectRoot = 'c:\\Users\\OLU\\Desktop\\SMS';

console.log('\n' + '='.repeat(80));
console.log('🚀 DEPLOYING 3 CRITICAL FIXES TO VERCEL');
console.log('='.repeat(80) + '\n');

const filesToDeploy = [
  'src/app/school-admin/staff/page.tsx',
  'src/app/school-admin/students/page.tsx',
  'src/app/school-admin/results/page.tsx',
];

const commitMessage = `Fix: Resolve three critical issues - Staff Edit Modal, Results Session display, Staff/Student data fetching

FIXES:
- Fix #1: Rebuild Staff Edit Modal with complete profile editor (8 sections)
- Fix #2: Fix Results Session dropdown showing actual sessions not 'ACTIVE'
- Fix #3: Fix Staff/Student pages not fetching school records

DETAILS:
Fix #1: Staff Edit Modal Complete Profile Editor
  * 8 complete sections: Personal, Contact, Employment, Academic, Class Assignment, Subject Assignment, Salary, Account
  * Modal loads lookup data (sessions, classes, subjects) from database
  * Modal loads complete staff record before opening
  * All changes persist to database on save
  * File: src/app/school-admin/staff/page.tsx

Fix #2: Results Session Page Shows Actual Sessions
  * Enhanced loadSessions() with strict validation
  * Sessions display as '2026/2027' instead of 'ACTIVE'
  * Clear error messages when no sessions found
  * Proper session_year extraction and display
  * File: src/app/school-admin/results/page.tsx

Fix #3: Staff/Student Pages Now Fetch School Records
  * Replaced .single() with .maybeSingle() in user profile queries
  * Safe school_id resolution prevents PGRST116 errors
  * Staff page fetches and displays all school staff
  * Students page fetches and displays all school students
  * Files: src/app/school-admin/staff/page.tsx, src/app/school-admin/students/page.tsx

IMPACT:
- Teachers/staff can edit complete profile including subjects and classes
- Results pages show correct session years
- Staff and student records load from database reliably
- No PGRST116 errors
- No silent failures with empty data

VERIFICATION:
- All fixes tested locally
- No breaking changes
- API contracts unchanged
- Database unchanged
- Ready for production`;

try {
  process.chdir(projectRoot);
  
  console.log('[1/4] Staging files...');
  for (const file of filesToDeploy) {
    console.log(`      Adding: ${file}`);
    execSync(`git add "${file}"`, { encoding: 'utf-8' });
  }
  console.log('✅ Files staged\n');

  console.log('[2/4] Checking git status...');
  const status = execSync('git status --short', { encoding: 'utf-8' });
  console.log(status);
  console.log('✅ Ready to commit\n');

  console.log('[3/4] Creating commit...');
  execSync(`git commit -m "${commitMessage}"`, { encoding: 'utf-8' });
  console.log('✅ Commit created\n');

  console.log('[4/4] Pushing to GitHub...');
  const pushOutput = execSync('git push origin main', { encoding: 'utf-8', stdio: 'pipe' });
  console.log(pushOutput);
  console.log('✅ Push successful\n');

  console.log('='.repeat(80));
  console.log('✅ DEPLOYMENT TO VERCEL INITIATED');
  console.log('='.repeat(80) + '\n');

  console.log('📊 Deployment Timeline:');
  console.log('   NOW:      Push to GitHub');
  console.log('   +10 sec:  Vercel receives webhook');
  console.log('   +30 sec:  Build starts');
  console.log('   +3-5 min: Build completes');
  console.log('   +5-7 min: LIVE ON PRODUCTION\n');

  console.log('🌐 URLs:');
  console.log('   Live:      https://sms-gold-eta.vercel.app');
  console.log('   Dashboard: https://sms-gold-eta.vercel.app/school-admin/dashboard');
  console.log('   Vercel:    https://vercel.com/dashboard/projects/sms-gold-eta\n');

  console.log('🎉 All three critical fixes are now deploying to production!\n');

  process.exit(0);

} catch (error) {
  console.error('\n❌ ERROR:', error.message);
  if (error.stdout) console.error('Output:', error.stdout.toString());
  if (error.stderr) console.error('Error:', error.stderr.toString());
  process.exit(1);
}
