#!/usr/bin/env node
const https = require('https');

console.log('✅ DEPLOYMENT STATUS CHECK\n');
console.log('═══════════════════════════════════════════\n');

const checkGitHub = () => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      port: 443,
      path: '/repos/faithinspire/SMS/commits/main',
      method: 'GET',
      headers: {
        'User-Agent': 'Deploy-Bot/1.0'
      }
    };

    https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const commit = JSON.parse(data);
          console.log('GitHub Status: ✅');
          console.log('  Latest commit: ' + commit.sha.substring(0, 7));
          console.log('  Message: ' + commit.commit.message);
          console.log('  Committed: ' + commit.commit.committer.date);
        } catch (e) {
          console.log('GitHub Status: ⚠️  Could not parse');
        }
        resolve();
      });
    }).on('error', () => {
      console.log('GitHub Status: ❌ Connection error');
      resolve();
    }).end();
  });
};

const checkVercel = () => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.vercel.com',
      port: 443,
      path: '/v6/projects/prj_aEoHqwFq43E4vkedEcQ3IfrVlYmY?teamId=team_TL6yFOaJymXvXyXzVF1UmAzo',
      method: 'GET',
      headers: {
        'User-Agent': 'Deploy-Bot/1.0'
      }
    };

    https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const project = JSON.parse(data);
            console.log('\nVercel Status: ✅');
            console.log('  Project: ' + project.name);
            console.log('  Latest deployment: ' + (project.latestDeployments?.[0]?.uid || 'pending'));
          } else {
            console.log('\nVercel Status: ⚠️  Status ' + res.statusCode);
          }
        } catch (e) {
          console.log('\nVercel Status: ⚠️  Could not parse');
        }
        resolve();
      });
    }).on('error', () => {
      console.log('\nVercel Status: ❌ Connection error');
      resolve();
    }).end();
  });
};

const run = async () => {
  await checkGitHub();
  await checkVercel();

  console.log('\n═══════════════════════════════════════════\n');
  console.log('📍 Dashboard: https://vercel.com/dashboard/projects/sms-gold-eta');
  console.log('🌐 Live Site: https://sms-gold-eta.vercel.app/school-admin/dashboard');
  console.log('\n⏱️ Expected deployment: 2-5 minutes from now\n');
};

run();
