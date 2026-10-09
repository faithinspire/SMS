#!/usr/bin/env node

const { execSync } = require('child_process')
const path = require('path')

const projectDir = 'c:\\Users\\OLU\\Desktop\\SMS'

console.log('\n' + '='.repeat(70))
console.log('       DEPLOYING STAFF REGISTRATION REBUILD TO VERCEL')
console.log('='.repeat(70) + '\n')

try {
  // Step 1: Stage files
  console.log('📍 [1/5] Staging files...')
  const filesToStage = [
    'src/app/api/teaching/canonical-subjects/route.ts',
    'src/components/admin/ProfessionalStaffRegistrationModal.tsx',
    'src/app/api/teaching/class-combos/route.ts',
    'src/app/api/school-admin/staff/register/route.ts',
    'src/app/school-admin/staff/page.tsx'
  ]

  for (const file of filesToStage) {
    try {
      execSync(`git add "${file}"`, { cwd: projectDir, stdio: 'pipe' })
      console.log(`   ✓ ${file}`)
    } catch (e) {
      console.log(`   ⚠ ${file} (may not exist or already staged)`)
    }
  }

  // Step 2: Check status
  console.log('\n📍 [2/5] Checking git status...')
  const status = execSync('git status --short', { cwd: projectDir, encoding: 'utf-8' })
  console.log(status || '   No changes to stage')

  // Step 3: Commit
  console.log('\n📍 [3/5] Creating commit...')
  const commitMessage = `Professional rebuild of Staff Registration module

- Fixed class-combos API 500 error (invalid Supabase orderBy syntax)
- Created canonical-subjects API for real subject loading
- Rebuilt staff registration modal with professional multi-step UI
- Implemented separate teacher and non-teaching registration flows
- Improved registration backend using Supabase admin API
- Integrated with existing dashboards and authentication
- Teacher class and subject assignments now properly persisted
- All staff roles route to appropriate dashboards
- No breaking changes to existing functionality`

  try {
    execSync(`git commit -m "${commitMessage}"`, { cwd: projectDir, stdio: 'pipe' })
    console.log('   ✓ Commit created successfully')
  } catch (e) {
    console.log('   ⚠ Commit skipped (may be no changes to commit)')
  }

  // Step 4: Push to GitHub
  console.log('\n📍 [4/5] Pushing to GitHub main...')
  execSync('git push origin main', { cwd: projectDir, stdio: 'inherit' })
  console.log('   ✓ Push successful')

  // Step 5: Success message
  console.log('\n' + '='.repeat(70))
  console.log('                 ✅ DEPLOYMENT INITIATED')
  console.log('='.repeat(70) + '\n')

  console.log('📊 Vercel will automatically deploy when push completes.\n')

  console.log('🔗 Monitor at: https://vercel.com/dashboard\n')

  console.log('⏱️  Expected deployment time: 7-10 minutes\n')

  console.log('📋 Next steps:')
  console.log('   1. Go to https://vercel.com/dashboard')
  console.log('   2. Find the SMS project and monitor build status')
  console.log('   3. Wait for status to show "Ready"')
  console.log('   4. Test production endpoints:\n')

  console.log('   curl "https://sms-gold-eta.vercel.app/api/teaching/class-combos?schoolId=9f9bda71-dc25-488f-8283-02eb5a931681&section=SECONDARY"')
  console.log('   curl "https://sms-gold-eta.vercel.app/api/teaching/canonical-subjects?schoolId=9f9bda71-dc25-488f-8283-02eb5a931681"\n')

  console.log('   5. Test staff registration modal in production')
  console.log('   6. Verify teacher can be registered and dashboard loads\n')

  console.log('📝 Documentation:')
  console.log('   - STAFF_REGISTRATION_REBUILD_COMPLETE.md')
  console.log('   - IMPLEMENTATION_SUMMARY_AND_TESTING_GUIDE.md')
  console.log('   - FILES_CHANGED_AND_VERIFICATION.md\n')

  console.log('=' .repeat(70) + '\n')
} catch (error) {
  console.error('\n❌ ERROR:', error.message)
  console.log('\nDeployment failed. Check the error above.\n')
  process.exit(1)
}
