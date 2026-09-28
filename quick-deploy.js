#!/usr/bin/env node
const https = require('https');

// Vercel deployment webhook - this triggers a rebuild from latest main branch
const webhookUrl = 'https://api.vercel.com/v1/integrations/git/namespaces/github/projects/SMS/latest-deployment?teamId=team_TL6yFOaJymXvXyXzVF1UmAzo';

console.log('🚀 Triggering Vercel deployment...');
console.log('');

const url = new URL(webhookUrl);
const options = {
  hostname: url.hostname,
  port: 443,
  path: url.pathname + url.search,
  method: 'GET',
  headers: {
    'User-Agent': 'SMS-Deploy-Bot/1.0'
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('📊 Response Status:', res.statusCode);
    
    if (res.statusCode >= 200 && res.statusCode < 400) {
      console.log('✅ Deployment triggered!');
    } else {
      console.log('Status:', res.statusCode);
      if (data) console.log('Response:', data);
    }
    
    console.log('');
    console.log('⏱️ Next steps:');
    console.log('   1. Vercel rebuilding from latest commit on main');
    console.log('   2. Build should start within 1-2 minutes');
    console.log('   3. Check: https://vercel.com/dashboard/projects/sms-gold-eta');
    console.log('');
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
});

req.end();
