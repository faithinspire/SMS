const { execSync } = require('child_process');
const path = require('path');

const repo = 'c:\\Users\\OLU\\Desktop\\SMS';

try {
  console.log('Adding files...');
  execSync('git add -A', { cwd: repo, stdio: 'inherit' });
  
  console.log('Committing...');
  execSync('git commit -m "fix: mark dynamic API routes to prevent Next.js static rendering errors"', { cwd: repo, stdio: 'inherit' });
  
  console.log('Pushing to main...');
  execSync('git push origin main', { cwd: repo, stdio: 'inherit' });
  
  console.log('✅ Deploy triggered! Check https://vercel.com/dashboard/projects/sms');
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
