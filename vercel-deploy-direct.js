#!/usr/bin/env node
const https = require('https');
const fs = require('fs');
const path = require('path');

// Read Vercel token from .env.local
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const tokenMatch = envContent.match(/VERCEL_OIDC_TOKEN="([^"]+)"/);

if (!tokenMatch) {
  console.error('❌ VERCEL_OIDC_TOKEN not found in .env.local');
  process.exit(1);
}

const token = tokenMatch[1];
const projectId = 'sms';
const teamId = 'team_TL6yFOaJymXvXyXzVF1UmAzo';

console.log('🚀 Deploying to Vercel...');
console.log(`   Project: ${projectId}`);
console.log(`   Team: ${teamId}`);
console.log('');

const options = {
  hostname: 'api.vercel.com',
  port: 443,
  path: `/v13/deployments?teamId=${teamId}`,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
};

const payload = {
  name: projectId,
  gitSource: {
    type: 'github',
    ref: 'main',
    repo: 'faithinspire/SMS'
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 201 || res.statusCode === 200) {
      const response = JSON.parse(data);
      console.log('✅ Deployment triggered successfully!');
      console.log('');
      console.log('📊 Deployment Details:');
      console.log(`   ID: ${response.id || 'pending'}`);
      console.log(`   URL: https://sms-gold-eta.vercel.app`);
      console.log('');
      console.log('⏱️ Build Timeline:');
      console.log('   NOW:       Deployment queued');
      console.log('   +1-2 min:  Build starts');
      console.log('   +3-5 min:  Build completes');
      console.log('   +5 min:    🎉 LIVE');
      console.log('');
      console.log('📍 Monitor at: https://vercel.com/dashboard/projects/sms-gold-eta');
    } else {
      console.error(`❌ Deployment failed with status ${res.statusCode}`);
      console.error('Response:', data);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error);
  process.exit(1);
});

req.write(JSON.stringify(payload));
req.end();
