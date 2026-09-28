#!/usr/bin/env node
const https = require('https');
const fs = require('fs');

// Manual Vercel deployment
console.log('🚀 Manual Vercel Deployment Trigger\n');

// Read the Vercel token from .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const tokenMatch = envContent.match(/VERCEL_OIDC_TOKEN="([^"]+)"/);

if (!tokenMatch) {
  console.error('❌ VERCEL_OIDC_TOKEN not found');
  process.exit(1);
}

const token = tokenMatch[1];
const projectId = 'prj_aEoHqwFq43E4vkedEcQ3IfrVlYmY';
const teamId = 'team_TL6yFOaJymXvXyXzVF1UmAzo';

console.log('Using token (first 20 chars):', token.substring(0, 20) + '...');
console.log('Project ID:', projectId);
console.log('Team ID:', teamId);
console.log('');

// Try using the Vercel API to create a deployment
const postData = JSON.stringify({
  name: 'sms',
  gitSource: {
    type: 'github',
    ref: 'main',
    repo: 'faithinspire/SMS',
    repoId: '652267820'
  }
});

const options = {
  hostname: 'api.vercel.com',
  port: 443,
  path: `/v13/deployments?teamId=${teamId}`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': postData.length,
    'Authorization': `Bearer ${token}`
  }
};

console.log('Making request to:', `https://${options.hostname}${options.path}`);
console.log('');

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('');

    if (res.statusCode >= 200 && res.statusCode < 400) {
      console.log('✅ Deployment triggered successfully!');
      console.log('');
      try {
        const response = JSON.parse(data);
        console.log('Deployment ID:', response.id || 'pending');
        console.log('URL:', response.url || 'https://sms-gold-eta.vercel.app');
      } catch (e) {
        console.log('Response:', data.substring(0, 300));
      }
    } else {
      console.log('❌ Deployment failed');
      console.log('Response:', data);
    }

    console.log('');
    console.log('📍 Check Vercel Dashboard:');
    console.log('   https://vercel.com/dashboard/projects/sms-gold-eta');
    console.log('');
  });
});

req.on('error', (e) => {
  console.error('❌ Request error:', e.message);
  process.exit(1);
});

req.write(postData);
req.end();
