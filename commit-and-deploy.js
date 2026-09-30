#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

const projectRoot = __dirname;

console.log('🔧 Committing fix to students page...');

try {
  // Stage the file
  execSync('git add src/app/school-admin/students/page.tsx', { 
    cwd: projectRoot, 
    stdio: 'inherit' 
  });
  
  // Commit
  execSync('git commit -m "Fix: Move fetchStudents to module scope to fix ReferenceError"', { 
    cwd: projectRoot, 
    stdio: 'inherit' 
  });
  
  console.log('✅ Committed successfully!');
  console.log('\n📤 Pushing to GitHub...');
  
  // Push to main
  execSync('git push origin main', { 
    cwd: projectRoot, 
    stdio: 'inherit' 
  });
  
  console.log('✅ Pushed successfully!');
  console.log('\n🚀 Vercel will auto-deploy in a few moments...');
  console.log('Monitor your deployment at: https://vercel.com/dashboard');
  
} catch (error) {
  console.error('❌ Error during deployment:', error.message);
  process.exit(1);
}
