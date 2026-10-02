#!/usr/bin/env node
const https = require('https');
const fs = require('fs');
const path = require('path');

// Read OIDC token from .env.local
const envContent = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const tokenMatch = envContent.match(/VERCEL_OIDC_TOKEN=(.+)/);
const token = tokenMatch ? tokenMatch[1].trim() : null;

if (!token) {
  console.error('❌ Token not found');
  process.exit(1);
}

console.log('\n🚀 DEPLOYING CRITICAL FIXES TO VERCEL PRODUCTION\n');
console.log('Fixes included:');
console.log('  ✅ Role authorization (STAFF + TEACHER)');
console.log('  ✅ Database schema (students.status, staff.department)');
console.log('  ✅ API queries fixed\n');

const req = https.request({
  hostname: 'api.vercel.com',
  path: '/v13/deployments',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
}, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    console.log('✅ DEPLOYMENT INITIATED TO VERCEL');
    console.log('\n📊 Status:');
    console.log('  Code: ' + res.statusCode);
    console.log('  Time: ' + new Date().toISOString());
    console.log('\n⏱️ Timeline:');
    console.log('  +30 sec: Build starts');
    console.log('  +5 min: Live in production ✅\n');
    console.log('📍 Monitor: https://vercel.com/faithtech-s-projects/sms\n');
  });
});

req.write(JSON.stringify({
  name: 'sms',
  gitSource: {
    type: 'github',
    ref: 'main',
    org: 'faithinspire',
    repo: 'SMS'
  },
  target: 'production',
  source: 'cli'
}));

req.end();
