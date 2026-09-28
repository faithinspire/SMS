#!/usr/bin/env node
const https = require('https');
const fs = require('fs');

console.log('🚀 SMS Dashboard Deployment');
console.log('============================');
console.log('');

// Try simple webhook approach first
console.log('Attempting to trigger Vercel rebuild...');
console.log('');

const makeRequest = (path, method = 'POST', body = {}) => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.vercel.com',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Deploy-Bot'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: data,
          headers: res.headers
        });
      });
    });

    req.on('error', () => {
      resolve({ status: 0, data: '', error: true });
    });

    if (method === 'POST') {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

const deploy = async () => {
  // Strategy 1: Direct GitHub hook
  console.log('[1] Checking GitHub integration...');
  let result = await makeRequest('/v1/integrations/git/namespaces/github/projects/SMS/latest-deployment?teamId=team_TL6yFOaJymXvXyXzVF1UmAzo');
  
  if (result.status >= 200 && result.status < 400) {
    console.log('✅ Deployment triggered via GitHub integration!');
    console.log('   Status: ' + result.status);
  } else {
    console.log('⚠️  Strategy 1 failed (Status ' + result.status + ')');
    
    // Strategy 2: Try listing deployments
    console.log('[2] Querying project deployments...');
    result = await makeRequest('/v6/projects/prj_aEoHqwFq43E4vkedEcQ3IfrVlYmY?teamId=team_TL6yFOaJymXvXyXzVF1UmAzo', 'GET');
    
    if (result.status >= 200 && result.status < 400) {
      console.log('✅ Project accessible, deployment info retrieved');
      console.log('   Status: ' + result.status);
      const projectData = JSON.parse(result.data || '{}');
      if (projectData.latestDeployments) {
        console.log('   Latest deployments found');
      }
    } else {
      console.log('⚠️  Strategy 2 failed (Status ' + result.status + ')');
      
      // Strategy 3: Simple trigger
      console.log('[3] Attempting simple deployment trigger...');
      result = await makeRequest(
        '/v1/projects/sms/deployments?teamId=team_TL6yFOaJymXvXyXzVF1UmAzo',
        'POST',
        { target: 'production' }
      );
      
      if (result.status >= 200 && result.status < 400) {
        console.log('✅ Deployment triggered!');
        console.log('   Status: ' + result.status);
      } else {
        console.log('⚠️  Strategy 3 failed (Status ' + result.status + ')');
        console.log('');
        console.log('Manual deployment required:');
        console.log('1. Go to: https://vercel.com/dashboard/projects/sms-gold-eta');
        console.log('2. Click "Redeploy"');
        console.log('3. Select "main" branch');
        console.log('4. Click "Deploy"');
      }
    }
  }

  console.log('');
  console.log('📍 Check deployment status:');
  console.log('   Dashboard: https://vercel.com/dashboard/projects/sms-gold-eta');
  console.log('   Live Site: https://sms-gold-eta.vercel.app');
  console.log('');
};

deploy();
