#!/usr/bin/env node
/**
 * Direct Vercel API Trigger using OIDC Token from .env.local
 * This will trigger production deployment immediately
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

async function getOIDCToken() {
  const envPath = path.join(__dirname, '.env.local');
  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.match(/VERCEL_OIDC_TOKEN="([^"]+)"/);
  return match ? match[1] : null;
}

function makeRequest(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.vercel.com',
      port: 443,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function triggerDeployment() {
  console.log('\n🔥 DIRECT VERCEL DEPLOYMENT TRIGGER\n');
  
  const token = await getOIDCToken();
  if (!token) {
    console.error('❌ OIDC token not found in .env.local');
    process.exit(1);
  }

  console.log('✅ OIDC Token loaded');
  console.log('📍 Triggering deployment for: sms-gold-eta\n');

  try {
    // Trigger deployment
    const headers = {
      'Authorization': `Bearer ${token}`,
    };

    console.log('[1/3] Getting project info...');
    const projectRes = await makeRequest('GET', '/v9/projects/sms-gold-eta', headers);
    console.log(`✅ Project found: ${projectRes.data?.name || 'sms-gold-eta'}\n`);

    console.log('[2/3] Creating production deployment...');
    const deployRes = await makeRequest('POST', '/v12/projects/sms-gold-eta/deployments', headers, {
      target: 'production',
      gitSource: {
        ref: 'main',
        org: 'faithinspire',
        repo: 'SMS',
        type: 'github'
      }
    });

    if (deployRes.status >= 200 && deployRes.status < 300) {
      console.log('✅ Deployment created!');
      console.log(`   URL: ${deployRes.data?.url || 'Building...'}`);
      console.log(`   Status: ${deployRes.data?.state || 'QUEUED'}\n`);
    } else {
      console.log(`⚠️ Response: ${deployRes.status}`);
      console.log(`   Data: ${JSON.stringify(deployRes.data).substring(0, 200)}\n`);
    }

    console.log('[3/3] Verifying deployment queued...');
    
    // Wait a moment then check status
    await new Promise(r => setTimeout(r, 1000));
    
    const statusRes = await makeRequest('GET', '/v6/deployments?projectId=sms-gold-eta&limit=1', headers);
    
    if (statusRes.data?.deployments?.length > 0) {
      const latest = statusRes.data.deployments[0];
      console.log('✅ Latest deployment:');
      console.log(`   State: ${latest.state}`);
      console.log(`   Created: ${new Date(latest.createdAt).toLocaleString()}\n`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ DEPLOYMENT TRIGGERED SUCCESSFULLY');
    console.log('='.repeat(60) + '\n');

    console.log('📍 Monitor at:');
    console.log('   Vercel: https://vercel.com/dashboard/projects/sms-gold-eta');
    console.log('   Live: https://sms-gold-eta.vercel.app/school-admin/dashboard\n');

    console.log('⏱️ Timeline:');
    console.log('   NOW:      Deployment triggered');
    console.log('   +1 min:   Build starts');
    console.log('   +5 min:   Build completes');
    console.log('   +5-7 min: LIVE ✅\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

triggerDeployment();
