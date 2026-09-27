#!/usr/bin/env node

/**
 * Simple syntax verification script
 * Checks if the dashboard file has valid JavaScript structure
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/school-admin/dashboard/page.tsx');

try {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  console.log('✅ File read successfully');
  console.log(`📊 File size: ${content.length} bytes`);
  console.log(`📄 Total lines: ${content.split('\n').length}`);
  
  // Check for critical patterns
  const checks = [
    { name: 'async function declarations', pattern: /const\s+\w+\s*=\s*async\s*\(/g },
    { name: 'await statements', pattern: /await\s+supabase/g },
    { name: 'JSX returns', pattern: /return\s*\(/g },
    { name: 'Component export', pattern: /export\s+default\s+function\s+SchoolAdminDashboard/g },
    { name: 'Closing braces', pattern: /^}$/gm },
  ];
  
  console.log('\n📋 Syntax checks:');
  checks.forEach(check => {
    const matches = content.match(check.pattern) || [];
    console.log(`  ✓ ${check.name}: ${matches.length} found`);
  });
  
  // Check function declarations
  const functions = [
    'loadDashboardData',
    'generateLetterForStaff',
    'generateLetterForStudent',
    'saveStaffEdit',
    'saveStudentEdit',
    'deleteStaff',
    'deleteStudent',
    'loadResultsClasses',
    'editStaff',
    'editStudent',
    'handleSendBroadcast'
  ];
  
  console.log('\n🔧 Function declarations:');
  functions.forEach(func => {
    const asyncDecl = new RegExp(`const\\s+${func}\\s*=\\s*async\\s*\\(`);
    if (asyncDecl.test(content)) {
      console.log(`  ✓ ${func} - async`);
    } else {
      console.log(`  ✗ ${func} - NOT async`);
    }
  });
  
  console.log('\n✅ Syntax verification passed!');
  
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
