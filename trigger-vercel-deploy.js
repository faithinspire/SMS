#!/usr/bin/env node
/**
 * Trigger Vercel deployment via OIDC token
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Get token from .env.local
const envLocal = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const tokenMatch = envLocal.match(/VERCEL_OIDC_TOKEN=(.+)/);
const token = tokenMatch ? tokenMatch[1].trim() : null;

if (!token) {
  console.error('ERROR: VERCEL_OIDC_TOKEN not found in .env.local');
  process.exit(1);
}

console.log('🚀 Triggering Vercel deployment...\n');

const options = {
  hostname: 'api.vercel.com',
  port: 443,
  path: '/v13/deployments',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
};

const body = JSON.stringify({
  name: 'sms-gold-eta',
  gitSource: {
    type: 'github',
    ref: 'main',
    org: 'faithinspire',
    repo: 'SMS',
    sha: 'main'
  },
  target: 'production'
});

const req = https.request(options, (res) => {
  let data = '';
  
  res.on('data', chunk => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`Response Status: ${res.statusCode}\n`);
    
    try {
      const response = JSON.parse(data);
      console.log('✅ Deployment triggered successfully!\n');
      console.log('📊 Response:');
      console.log(JSON.stringify(response, null, 2));
      
      console.log('\n📍 Monitor at:');
      console.log('  https://vercel.com/dashboard/projects/sms-gold-eta\n');
      console.log('✨ Build starting now...\n');
    } catch (e) {
      console.log('Response:', data);
    }
    
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});

req.write(body);
req.end();
