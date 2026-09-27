#!/usr/bin/env node

/**
 * Direct GitHub API Push
 * Upload file directly to GitHub without git CLI
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const REPO_OWNER = 'faithinspire';
const REPO_NAME = 'SMS';
const FILE_PATH = 'src/app/school-admin/dashboard/page.tsx';
const BRANCH = 'main';

// ⚠️ IMPORTANT: This will prompt for personal access token at runtime
// Or read from environment: GITHUB_TOKEN

const readFileContent = () => {
  const filePath = path.join(__dirname, FILE_PATH);
  return fs.readFileSync(filePath, 'utf-8');
};

const makeGitHubRequest = (method, path, body, token) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: path,
      method: method,
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'Node.js GitHub Push',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(`GitHub API Error ${res.statusCode}: ${parsed.message || data}`));
          } else {
            resolve({ status: res.statusCode, data: parsed });
          }
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
};

const pushToGitHub = async (token) => {
  console.log('\n🚀 GitHub Direct Push\n');

  try {
    // Step 1: Read file
    console.log('1️⃣  Reading file...');
    const fileContent = readFileContent();
    const base64Content = Buffer.from(fileContent).toString('base64');
    console.log(`   ✓ File size: ${fileContent.length} bytes\n`);

    // Step 2: Get current commit SHA
    console.log('2️⃣  Getting current branch info...');
    const branchRes = await makeGitHubRequest(
      'GET',
      `/repos/${REPO_OWNER}/${REPO_NAME}/git/refs/heads/${BRANCH}`,
      null,
      token
    );
    const currentSha = branchRes.data.object.sha;
    console.log(`   ✓ Current commit: ${currentSha.substring(0, 7)}\n`);

    // Step 3: Get current file info (if exists)
    let fileSha = null;
    try {
      console.log('3️⃣  Getting current file SHA...');
      const fileRes = await makeGitHubRequest(
        'GET',
        `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}?ref=${BRANCH}`,
        null,
        token
      );
      fileSha = fileRes.data.sha;
      console.log(`   ✓ Current file SHA: ${fileSha.substring(0, 7)}\n`);
    } catch (e) {
      console.log('   ℹ File is new (will be created)\n');
    }

    // Step 4: Push file
    console.log('4️⃣  Pushing file to GitHub...');
    const pushBody = {
      message: 'Fix: ALL 7 critical issues - Letters, Edit, Delete, Results, Classes, Real-time Fees, Academic Tab - Syntax errors resolved',
      content: base64Content,
      branch: BRANCH,
    };
    if (fileSha) pushBody.sha = fileSha;

    const pushRes = await makeGitHubRequest(
      'PUT',
      `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`,
      pushBody,
      token
    );

    console.log(`   ✓ File pushed successfully!\n`);
    console.log(`📝 Commit SHA: ${pushRes.data.commit.sha.substring(0, 7)}\n`);

    console.log('✅ DEPLOYMENT TRIGGERED!\n');
    console.log('⏱️  Vercel will auto-deploy in 1-2 seconds\n');
    console.log('📊 Monitor at: https://vercel.com/dashboard/projects/sms-gold-eta\n');
    console.log('🌐 Expected LIVE in 3-5 minutes\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

// Get token
const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error('\n❌ GitHub token not found!\n');
  console.error('Set your token:');
  console.error('  Windows CMD:     set GITHUB_TOKEN=your_token && node github-direct-push.js');
  console.error('  Windows PowerShell: $env:GITHUB_TOKEN="your_token"; node github-direct-push.js');
  console.error('  Linux/Mac:       export GITHUB_TOKEN=your_token && node github-direct-push.js\n');
  console.error('To get a token: https://github.com/settings/tokens/new\n');
  process.exit(1);
}

pushToGitHub(token);
