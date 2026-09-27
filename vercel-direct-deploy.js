#!/usr/bin/env node

/**
 * Direct Vercel API deployment
 * Uploads files directly to Vercel without GitHub push
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const PROJECT_ID = 'prj_aEoHqwFq43E4vkedEcQ3IfrVlYmY';
const ORG_ID = 'team_TL6yFOaJymXvXyXzVF1UmAzo';
const VERCEL_TOKEN = process.env.VERCEL_TOKEN || process.env.VERCEL_API_TOKEN || '';

if (!VERCEL_TOKEN) {
  console.error('❌ ERROR: VERCEL_TOKEN not found');
  console.error('The token should be in .vercel/config.json or VERCEL_TOKEN env var');
  console.error('');
  console.error('Alternative: Get token from https://vercel.com/account/tokens');
  process.exit(1);
}

function readAllFiles(dir, prefix = '') {
  const files = {};
  const items = fs.readdirSync(dir);
  
  items.forEach(item => {
    if (item.startsWith('.') || item === 'node_modules' || item === '.next') return;
    
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      const subFiles = readAllFiles(fullPath, prefix ? `${prefix}/${item}` : item);
      Object.assign(files, subFiles);
    } else {
      const relativePath = prefix ? `${prefix}/${item}` : item;
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        files[relativePath] = content;
      } catch (e) {
        // Skip binary files
      }
    }
  });
  
  return files;
}

async function makeRequest(method, pathname, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.vercel.com',
      path: pathname,
      method: method,
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
        ...headers
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function deploy() {
  console.log('🚀 Vercel Direct Deployment');
  console.log('============================\n');
  
  try {
    console.log('1️⃣  Reading project files...');
    const files = readAllFiles('c:/Users/OLU/Desktop/SMS');
    console.log(`   ✓ Found ${Object.keys(files).length} files`);

    console.log('\n2️⃣  Creating deployment...');
    const deployRes = await makeRequest('POST', `/v13/deployments?teamId=${ORG_ID}`, {
      name: 'sms',
      project: PROJECT_ID,
      gitSource: null,
      source: 'cli'
    });

    if (deployRes.status !== 200 && deployRes.status !== 201) {
      throw new Error(`Failed to create deployment: ${deployRes.status}`);
    }

    const deploymentId = deployRes.data.id;
    console.log(`   ✓ Deployment created: ${deploymentId}`);

    console.log('\n3️⃣  Uploading files...');
    const uploadRes = await makeRequest(
      'POST',
      `/v2/deployments/${deploymentId}/files?teamId=${ORG_ID}`,
      files,
      { 'Content-Type': 'application/json' }
    );

    if (uploadRes.status !== 200 && uploadRes.status !== 201) {
      throw new Error(`Failed to upload files: ${uploadRes.status}`);
    }

    console.log(`   ✓ Files uploaded`);

    console.log('\n4️⃣  Finalizing deployment...');
    const finalRes = await makeRequest(
      'POST',
      `/v13/deployments/${deploymentId}/finalize?teamId=${ORG_ID}`,
      { deployed: true }
    );

    if (finalRes.status !== 200) {
      throw new Error(`Failed to finalize: ${finalRes.status}`);
    }

    console.log(`   ✓ Deployment finalized\n`);

    console.log('✅ SUCCESS!\n');
    console.log('📊 Your site is being deployed to Vercel');
    console.log('   Expected time: 3-5 minutes');
    console.log('🔗 Monitor: https://vercel.com/dashboard\n');

  } catch (error) {
    console.error('❌ Deployment failed!');
    console.error(error.message);
    process.exit(1);
  }
}

deploy();
