#!/usr/bin/env node
const https = require('https');
const fs = require('fs');

// Read OIDC token from .env.local
const envLocal = fs.readFileSync('.env.local', 'utf8');
const tokenMatch = envLocal.match(/VERCEL_OIDC_TOKEN=(.+)/);
const token = tokenMatch ? tokenMatch[1].trim() : null;

if (!token) {
  console.error('❌ VERCEL_OIDC_TOKEN not found');
  process.exit(1);
}

console.log('🚀 Deploying to Vercel...\n');

const options = {
  hostname: 'api.vercel.com',
  port: 443,
  path: '/v13/deployments?forceNew=1',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
};

const payload = {
  name: 'sms-gold-eta',
  gitSource: {
    type: 'github',
    org: 'faithinspire',
    repo: 'SMS',
    ref: 'main'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      if (res.statusCode === 200 || res.statusCode === 201) {
        console.log('✅ Deployment triggered successfully!\n');
        console.log('📊 Deployment Details:');
        console.log(`   ID: ${result.id}`);
        console.log(`   URL: https://sms-gold-eta.vercel.app`);
        console.log('\n🔗 Monitor at: https://vercel.com/dashboard/projects/sms-gold-eta\n');
      } else {
        console.log(`Response (${res.statusCode}):`, result);
      }
    } catch (e) {
      console.log('Response:', data);
    }
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});

req.write(JSON.stringify(payload));
req.end();
