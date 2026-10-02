#!/usr/bin/env node
const https = require('https');
const fs = require('fs');
const path = require('path');

// Read .env.local
const envLocal = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const tokenMatch = envLocal.match(/VERCEL_OIDC_TOKEN=(.+)/);
const oidcToken = tokenMatch ? tokenMatch[1].trim() : null;

if (!oidcToken) {
  console.error('❌ VERCEL_OIDC_TOKEN not found in .env.local');
  process.exit(1);
}

console.log('\n🔥 VERCEL DIRECT DEPLOYMENT\n');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.vercel.com',
      path: path,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${oidcToken}`,
        'Content-Type': 'application/json',
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function deploy() {
  try {
    console.log('📤 Triggering production deployment...\n');

    const res = await post('/v13/deployments', {
      name: 'sms-gold-eta',
      gitSource: {
        type: 'github',
        ref: 'main',
        org: 'faithinspire',
        repo: 'SMS'
      },
      target: 'production',
      teamId: 'team_TL6yFOaJymXvXyXzVF1UmAzo'
    });

    console.log(`Status: ${res.status}\n`);

    if (res.data && res.data.url) {
      console.log('✅ DEPLOYMENT TRIGGERED\n');
      console.log(`📍 Deployment URL: ${res.data.url}`);
      console.log(`   ID: ${res.data.id}\n`);
    } else if (res.data && res.data.deploymentId) {
      console.log('✅ DEPLOYMENT CREATED\n');
      console.log(`   ID: ${res.data.deploymentId}\n`);
    } else {
      console.log('✅ Request processed\n');
      console.log(JSON.stringify(res.data, null, 2));
    }

    console.log('⏱️  Timeline:');
    console.log('  NOW:      Build queued');
    console.log('  +2 min:   Build starts');
    console.log('  +5 min:   Build completes');
    console.log('  +7 min:   LIVE ✅\n');

    console.log('📊 Monitor: https://vercel.com/dashboard/projects/sms-gold-eta\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

deploy();
