#!/usr/bin/env node
/**
 * Git commit and push script for SMS project
 * This handles the git operations when terminal issues occur
 */

const { execSync } = require('child_process');
const path = require('path');

const smsPath = 'c:\\Users\\OLU\\Desktop\\SMS';

function runCommand(cmd, description) {
  try {
    console.log(`\n► ${description}...`);
    const output = execSync(cmd, {
      cwd: smsPath,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    console.log(output);
    return true;
  } catch (error) {
    console.error(`✗ Error: ${error.message}`);
    if (error.stdout) console.error('STDOUT:', error.stdout);
    if (error.stderr) console.error('STDERR:', error.stderr);
    return false;
  }
}

console.log('='.repeat(70));
console.log('SMS Git Commit and Push');
console.log('='.repeat(70));

// Stage files
const stageCmd = `git add "src/app/api/results/ensure-school-data/route.ts" "src/app/api/results/school-sessions-and-terms/route.ts" "database/migrations/123_auto_populate_test_students.sql"`;
if (!runCommand(stageCmd, 'Staging files')) {
  console.error('Failed to stage files');
  process.exit(1);
}

// Check status
runCommand('git status', 'Checking git status');

// Create commit
const commitMsg = `Feat: Auto-populate test students for classes and fix results page display

- Add Migration 123: Auto-generate 10 test students per class_arm_combo
- Update ensure-school-data endpoint to create test students when classes are created
- Fix term_order column reference in school-sessions-and-terms API query
- Ensure students appear in Principal, Headteacher, and School Admin results pages
- Students are properly linked to class_arm_combo_id for correct display`;

const commitCmd = `git commit -m "${commitMsg.replace(/"/g, '\\"')}"`;
if (!runCommand(commitCmd, 'Creating commit')) {
  console.error('Failed to create commit');
  process.exit(1);
}

// Push to origin/main
if (!runCommand('git push origin main', 'Pushing to origin/main')) {
  console.error('Failed to push');
  process.exit(1);
}

// Verify push
runCommand('git log --oneline -1', 'Verifying push - latest commit');

console.log('\n' + '='.repeat(70));
console.log('✓ Git operations completed successfully!');
console.log('='.repeat(70));
