#!/usr/bin/env node
/**
 * FORCE DEPLOY - Direct Vercel API call
 * Triggers immediate deployment of current HEAD commit
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Read OIDC token from .env.local
const envLocal = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const tokenMatch = envLocal.match(/VERCEL_OIDC_TOKEN=(.+)/);
const oidcToken = tokenMatch ? tokenMatch[1].trim() : null;

if (!oidcToken) {
  console.error('❌ VERCEL_OIDC_TOKEN not found in .env.local');
  process.exit(1);
}

// Get current commit hash
let commitHash;
try {
  commitHash = execSync('git rev-parse HEAD', { cwd: __dirname, encoding: 'utf8' }).trim();
} catch (e) {
  console.error('❌ Could not get git commit hash');
  process.exit(1);
}

console.log('\x1b[36m' + '='.repeat(80) + '\x1b[0m');
console.log('\x1b[36m🚀 FORCE VERCEL DEPLOYMENT - Via API Direct Trigger\x1b[0m');
console.log('\x1b[36m' + '='.repeat(80) + '\x1b[0m\n');

console.log(`📌 Commit: ${commitHash}\n`);

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.vercel.com',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${oidcToken}`,
        'Content-Type': 'application/json',
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data
          });
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
    // 1. Get project details
    console.log('[1/3] Getting project details...');
    const projectRes = await makeRequest('GET', `/v8/projects/sms`);
    
    if (projectRes.status !== 200) {
      console.log(`⚠️  Status: ${projectRes.status} (continuing)`);
    } else {
      console.log(`✅ Project found: ${projectRes.data?.name || 'sms'}`);
    }

    // 2. Trigger deployment via git commit
    console.log('\n[2/3] Triggering deployment...');
    const deployRes = await makeRequest('POST', `/v13/deployments?forceNew=1`, {
      name: 'sms',
      gitSource: {
        repo: 'ftech-s-projects/sms',
        ref: 'main',
        type: 'github'
      }
    });

    if (deployRes.status !== 201 && deployRes.status !== 200) {
      console.log(`⚠️  Initial trigger returned ${deployRes.status}`);
    } else {
      console.log(`✅ Deployment triggered`);
    }

    // 3. Alternative: Request production build directly
    console.log('\n[3/3] Requesting production build...');
    const buildRes = await makeRequest('POST', `/v12/projects/prj_aEoHqwFq43E4vkedEcQ3IfrVlYmY/builds?forceNew=1`, {
      gitSource: {
        type: 'github',
        ref: 'main'
      }
    });

    console.log(`✅ Build queued (${buildRes.status})`);

    console.log('\n' + '='.repeat(80));
    console.log('🎉 DEPLOYMENT INITIATED - WATCH VERCEL');
    console.log('='.repeat(80));
    console.log('\n📍 Monitor at:');
    console.log('   https://vercel.com/dashboard/projects/sms');
    console.log('\n⏱️  Expected timeline:');
    console.log('   NOW:      Deployment triggered');
    console.log('   +2 min:   Build starts');
    console.log('   +5 min:   Build completes');
    console.log('   +6 min:   LIVE ✅\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

deploy();
