#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = __dirname;
const envPath = path.join(projectRoot, '.env.local');

// Load environment variables
const envContent = fs.readFileSync(envPath, 'utf-8');
const envLines = envContent.split('\n');
const env = process.env;

envLines.forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      env[key.trim()] = valueParts.join('=').trim();
    }
  }
});

console.log('🚀 Starting deployment process...\n');

try {
  // Step 1: Add all changes
  console.log('📦 Step 1: Adding all changes to git...');
  execSync('git add -A', { cwd: projectRoot, stdio: 'inherit' });
  console.log('✅ Changes added\n');

  // Step 2: Commit changes
  console.log('📝 Step 2: Creating commit...');
  execSync('git commit -m "Deploy: Staff registration 4 slides, letter generation fix, Results page"', {
    cwd: projectRoot,
    stdio: 'inherit'
  });
  console.log('✅ Commit created\n');

  // Step 3: Push to main
  console.log('🌐 Step 3: Pushing to GitHub main branch...');
  execSync('git push -u origin main', { cwd: projectRoot, stdio: 'inherit' });
  console.log('✅ Pushed to GitHub\n');

  // Step 4: Trigger Vercel deployment
  console.log('🚀 Step 4: Triggering Vercel production deployment...');
  
  if (env.VERCEL_OIDC_TOKEN) {
    console.log('Using OIDC token for deployment...');
    execSync('vercel deploy --prod', {
      cwd: projectRoot,
      stdio: 'inherit',
      env: {
        ...env,
        VERCEL_OIDC_TOKEN: env.VERCEL_OIDC_TOKEN
      }
    });
  } else {
    console.log('No OIDC token found, attempting standard deployment...');
    execSync('vercel deploy --prod', { cwd: projectRoot, stdio: 'inherit' });
  }

  console.log('\n✅ Deployment complete!');
  console.log('\n📊 Summary:');
  console.log('✓ All changes committed to main branch');
  console.log('✓ Fixes deployed to Vercel production');
  console.log('\n🔍 Verify at: https://sms-sigma-ruby.vercel.app');

} catch (error) {
  console.error('\n❌ Deployment failed:', error.message);
  process.exit(1);
}
