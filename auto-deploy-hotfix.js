#!/usr/bin/env node

/**
 * Auto-deploy production hotfixes to Vercel
 * Commits and pushes the staff profile and class-combos fixes
 */

const { exec } = require('child_process')
const path = require('path')
const fs = require('fs')

const projectDir = 'c:\\Users\\OLU\\Desktop\\SMS'

function runCommand(cmd, description) {
  return new Promise((resolve, reject) => {
    console.log(`\n📍 ${description}...`)
    console.log(`   Command: ${cmd}`)
    
    exec(cmd, { cwd: projectDir, shell: 'powershell.exe' }, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ ERROR: ${error.message}`)
        if (stderr) console.error(`   ${stderr}`)
        reject(error)
        return
      }
      
      if (stdout) {
        const lines = stdout.trim().split('\n').slice(0, 5)
        lines.forEach(line => console.log(`   ${line}`))
        if (stdout.trim().split('\n').length > 5) {
          console.log(`   ... (${stdout.trim().split('\n').length - 5} more lines)`)
        }
      }
      
      console.log(`✅ Done`)
      resolve(stdout)
    })
  })
}

async function deploy() {
  console.log('\n╔════════════════════════════════════════════════════════════╗')
  console.log('║        PRODUCTION HOTFIX DEPLOYMENT TO VERCEL              ║')
  console.log('║        Staff Profile 404 + Class-Combos 500 Fix            ║')
  console.log('╚════════════════════════════════════════════════════════════╝\n')

  try {
    // Check git status
    await runCommand('git status', 'Checking Git status')

    // Stage the fixed files
    await runCommand(
      'git add "src\\app\\api\\school-admin\\staff\\[id]\\profile\\route.ts" "src\\app\\api\\teaching\\class-combos\\route.ts"',
      'Staging API route fixes'
    )

    // Commit
    await runCommand(
      `git commit -m "Production hotfix: Fix staff profile 404 and class-combos 500 errors

- Staff profile API: Handle both staff.id and user.id lookups (fixes 404 when staff record doesn't exist)
- Class-combos API: Remove invalid orderBy syntax, implement client-side sorting (fixes 500 error)
- Both fixes are backward compatible and maintain API contracts"`,
      'Committing changes'
    )

    // Push to main
    await runCommand(
      'git push origin main',
      'Pushing to GitHub main (triggers Vercel deployment)'
    )

    console.log('\n╔════════════════════════════════════════════════════════════╗')
    console.log('║            ✅ DEPLOYMENT INITIATED SUCCESSFULLY             ║')
    console.log('╚════════════════════════════════════════════════════════════╝\n')

    console.log('📊 Deployment Details:')
    console.log('   • Vercel auto-detects push to main')
    console.log('   • Build starts automatically')
    console.log('   • Estimated deploy time: 7-10 minutes')
    console.log('\n🔗 Monitor deployment at:')
    console.log('   https://vercel.com/faithtech-s-projects/sms/deployments')
    console.log('\n📋 Next steps:')
    console.log('   1. Verify Vercel deployment completes')
    console.log('   2. Test staff profile API: GET /api/school-admin/staff/{id}/profile')
    console.log('   3. Test class-combos API: GET /api/teaching/class-combos')
    console.log('   4. Verify staff profile modal loads without 404')
    console.log('   5. Verify staff registration Step 5 loads classes without 500')
    console.log('\n✨ Production hotfix ready!\n')

  } catch (error) {
    console.error('\n❌ DEPLOYMENT FAILED')
    console.error(error.message)
    process.exit(1)
  }
}

deploy()
