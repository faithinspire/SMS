#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const projectRoot = path.normalize('c:\\Users\\OLU\\Desktop\\SMS');

console.log('🚀 Pushing Migration 121 to Vercel...\n');

// Create git push process
const push = spawn('git', ['push', 'origin', 'main'], {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: true
});

push.on('close', (code) => {
  console.log('\n');
  if (code === 0) {
    console.log('✅ SUCCESS! Migration 121 pushed to Vercel');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('  1. Vercel detects new commit (30-60 seconds)');
    console.log('  2. Vercel rebuilds and deploys (1-2 minutes)');
    console.log('  3. Migration 121 runs automatically');
    console.log('  4. RLS disabled on result tables');
    console.log('  5. Classes and students load with scores');
    console.log('');
    console.log('⏱️  Total time: 5-10 minutes');
    process.exit(0);
  } else {
    console.log(`❌ Push failed with exit code ${code}`);
    process.exit(1);
  }
});

push.on('error', (err) => {
  console.error('❌ Error spawning process:', err);
  process.exit(1);
});
