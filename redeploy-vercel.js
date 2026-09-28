#!/usr/bin/env node
const https = require('https');

// Vercel Redeploy - Using GitHub integration to trigger redeploy
console.log('🚀 Triggering Vercel Redeploy from Latest GitHub Commit\n');

const teamId = 'team_TL6yFOaJymXvXyXzVF1UmAzo';
const projectName = 'sms';

// Try method 1: Redeploy latest from GitHub
const options = {
  hostname: 'api.vercel.com',
  port: 443,
  path: `/v1/integrations/git/namespaces/github/projects/${projectName}/latest-deployment?teamId=${teamId}`,
  method: 'GET',
  headers: {
    'User-Agent': 'Deploy-Bot/1.0'
  }
};

https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    
    if (res.statusCode >= 200 && res.statusCode < 400) {
      console.log('✅ Redeploy triggered!\n');
      console.log('Response:', data.substring(0, 200));
    } else {
      console.log('❌ Failed to trigger redeploy\n');
      console.log('Response:', data);
    }
    
    console.log('\n📍 Check Vercel: https://vercel.com/dashboard/projects/sms-gold-eta');
    console.log('🌐 Live: https://sms-gold-eta.vercel.app/school-admin/dashboard\n');
  });
}).on('error', (e) => {
  console.error('❌ Error:', e.message);
});
