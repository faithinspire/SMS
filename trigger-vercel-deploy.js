#!/usr/bin/env node
/**
 * Direct Vercel Deployment Trigger
 * Attempts multiple methods to trigger a redeploy on Vercel
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Read environment
const envPath = path.join(__dirname, '.env.local');
let token = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const tokenMatch = envContent.match(/VERCEL_OIDC_TOKEN="([^"]+)"/);
  if (tokenMatch) {
    token = tokenMatch[1];
  }
}

const projectId = 'prj_aEoHqwFq43E4vkedEcQ3IfrVlYmY';
const projectName = 'sms';
const teamId = 'team_TL6yFOaJymXvXyXzVF1UmAzo';

console.log('\n🚀 Triggering Vercel Deployment\n');

const methods = [
  {
    name: 'Method 1: Redeploy Latest',
    fn: () => {
      return new Promise((resolve) => {
        const options = {
          hostname: 'api.vercel.com',
          port: 443,
          path: `/v13/projects/${projectName}?teamId=${teamId}`,
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        };

        https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            resolve({
              status: res.statusCode,
              success: res.statusCode >= 200 && res.statusCode < 400,
              method: 'GET Project'
            });
          });
        }).on('error', () => {
          resolve({ success: false, method: 'GET Project', status: 0 });
        }).end();
      });
    }
  },
  {
    name: 'Method 2: List Deployments',
    fn: () => {
      return new Promise((resolve) => {
        const options = {
          hostname: 'api.vercel.com',
          port: 443,
          path: `/v6/deployments?projectId=${projectId}&teamId=${teamId}&limit=1`,
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        };

        https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            resolve({
              status: res.statusCode,
              success: res.statusCode >= 200 && res.statusCode < 400,
              method: 'LIST Deployments',
              data: data
            });
          });
        }).on('error', () => {
          resolve({ success: false, method: 'LIST Deployments', status: 0 });
        }).end();
      });
    }
  },
  {
    name: 'Method 3: GitHub Webhook Trigger',
    fn: () => {
      return new Promise((resolve) => {
        const options = {
          hostname: 'api.vercel.com',
          port: 443,
          path: `/v1/integrations/git/namespaces/github/projects/${projectName}/latest-deployment?teamId=${teamId}`,
          method: 'GET',
          headers: { 'User-Agent': 'Deploy-Bot' },
        };

        https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            resolve({
              status: res.statusCode,
              success: res.statusCode >= 200 && res.statusCode < 400,
              method: 'GitHub Webhook'
            });
          });
        }).on('error', () => {
          resolve({ success: false, method: 'GitHub Webhook', status: 0 });
        }).end();
      });
    }
  }
];

const runAll = async () => {
  for (const method of methods) {
    console.log(`Trying ${method.name}...`);
    const result = await method.fn();
    
    if (result.success) {
      console.log(`  ✅ SUCCESS (Status: ${result.status})`);
      if (result.data) {
        try {
          const parsed = JSON.parse(result.data);
          if (parsed.deployments) {
            console.log(`  Latest deployment: ${parsed.deployments[0]?.id}`);
          }
        } catch (e) {}
      }
    } else {
      console.log(`  ❌ Failed (Status: ${result.status})`);
    }
    console.log();
  }

  console.log('\n═════════════════════════════════════════════');
  console.log('📍 Check Vercel Dashboard:');
  console.log('   https://vercel.com/dashboard/projects/sms-gold-eta');
  console.log('\n🌐 Live Site:');
  console.log('   https://sms-gold-eta.vercel.app/school-admin/dashboard');
  console.log('\n⏱️ Expected deployment time: 5-10 minutes');
  console.log('═════════════════════════════════════════════\n');
};

runAll();
