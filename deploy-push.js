#!/usr/bin/env node

/**
 * Direct GitHub API push using Node.js
 * Pushes the fixed dashboard file to GitHub and triggers Vercel deployment
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const OWNER = 'faithinspire';
const REPO = 'SMS';
const BRANCH = 'main';
const FILE_PATH = 'src/app/school-admin/dashboard/page.tsx';

// Read the fixed file
const filePath = path.join(__dirname, FILE_PATH);
const fileContent = fs.readFileSync(filePath, 'utf-8');
const fileBase64 = Buffer.from(fileContent).toString('base64');

// You need to set your GitHub token as an environment variable
// Or paste it here temporarily
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

if (!GITHUB_TOKEN) {
  console.error('❌ ERROR: GITHUB_TOKEN environment variable not set');
  console.error('Please run: set GITHUB_TOKEN=your_token && node deploy-push.js');
  console.error('');
  console.error('To get a token:');
  console.error('1. Go to https://github.com/settings/tokens/new');
  console.error('2. Select scopes: repo (full control)');
  console.error('3. Copy the token');
  process.exit(1);
}

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: path,
      method: method,
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'User-Agent': 'Node.js Deployment Script',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function deploy() {
  console.log('🚀 Starting deployment...');
  console.log(`📦 File: ${FILE_PATH}`);
  console.log(`📍 Repo: ${OWNER}/${REPO}`);
  console.log(`🌿 Branch: ${BRANCH}`);
  console.log('');

  try {
    // Step 1: Get current commit SHA
    console.log('1️⃣  Getting current commit SHA...');
    const refRes = await makeRequest('GET', `/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`);
    if (refRes.status !== 200) {
      throw new Error(`Failed to get branch ref: ${refRes.status}`);
    }
    const currentSha = refRes.data.object.sha;
    console.log(`   ✓ Current commit: ${currentSha.substring(0, 7)}`);

    // Step 2: Get current file SHA (if exists)
    console.log('2️⃣  Getting current file info...');
    const fileRes = await makeRequest('GET', `/repos/${OWNER}/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`);
    let fileSha = null;
    if (fileRes.status === 200) {
      fileSha = fileRes.data.sha;
      console.log(`   ✓ Current file SHA: ${fileSha.substring(0, 7)}`);
    } else {
      console.log('   ℹ File is new (will be created)');
    }

    // Step 3: Create/Update file via API
    console.log('3️⃣  Pushing file to GitHub...');
    const updateData = {
      message: '🔧 ALL 7 FIXES: Letters, Edit, Delete, Results, Classes, Real-time Fees, Academic Tab',
      content: fileBase64,
      branch: BRANCH
    };
    if (fileSha) {
      updateData.sha = fileSha;
    }

    const updateRes = await makeRequest('PUT', `/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`, updateData);
    if (updateRes.status !== 201 && updateRes.status !== 200) {
      throw new Error(`Failed to update file: ${updateRes.status} - ${JSON.stringify(updateRes.data)}`);
    }
    console.log(`   ✓ File pushed successfully!`);
    console.log(`   📝 Commit: ${updateRes.data.commit.sha.substring(0, 7)}`);

    // Step 4: Success!
    console.log('');
    console.log('✅ Deployment Complete!');
    console.log('');
    console.log('📊 Next steps:');
    console.log('   • Vercel will auto-detect the push');
    console.log('   • Deployment starts automatically');
    console.log('   • Check: https://vercel.com/dashboard');
    console.log('   • Expected time: 3-5 minutes');
    console.log('');
    console.log('🔗 View your site: https://sms-gold-eta.vercel.app/school-admin/dashboard');
    console.log('');

  } catch (error) {
    console.error('❌ Deployment failed!');
    console.error(error.message);
    process.exit(1);
  }
}

deploy();
