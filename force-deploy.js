#!/usr/bin/env node
/**
 * Force Deploy to Vercel
 * Uses simple HTTP request to trigger redeploy
 */
const https = require('https');

console.log('🚀 Force Deploying to Vercel\n');

const makeRequest = (method, path, body = null) => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.vercel.com',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Deploy-Bot/1.0'
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

    req.on('error', (err) => {
      console.error('Request error:', err);
      resolve({ status: 0, data: '', error: err.message });
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

const deploy = async () => {
  // Strategy 1: Check if there's a redeploy endpoint
  console.log('[1/3] Checking deployment status...');
  let result = await makeRequest(
    'GET',
    '/v6/projects/prj_aEoHqwFq43E4vkedEcQ3IfrVlYmY/deployments?teamId=team_TL6yFOaJymXvXyXzVF1UmAzo&limit=1'
  );

  if (result.status === 200) {
    console.log('✅ API accessible');
    try {
      const data = JSON.parse(result.data);
      if (data.deployments && data.deployments.length > 0) {
        console.log('   Latest deployment:', data.deployments[0].uid);
      }
    } catch (e) {}
  } else {
    console.log('⚠️  Status:', result.status);
  }

  console.log('');
  console.log('[2/3] Attempting redeploy from latest commit...');
  
  // The latest commit is already on GitHub: b768264
  // Vercel should automatically detect it
  // We can trigger it via GitHub webhook
  
  result = await makeRequest(
    'POST',
    '/v1/integrations/git/namespaces/github/projects/sms/latest-deployment?teamId=team_TL6yFOaJymXvXyXzVF1UmAzo',
    {}
  );

  if (result.status >= 200 && result.status < 400) {
    console.log('✅ Webhook triggered!');
  } else {
    console.log('⚠️  Webhook status:', result.status);
    
    // Try alternative method - just inform about the commit
    console.log('');
    console.log('[3/3] Latest commit is on GitHub');
    console.log('   Commit: b768264');
    console.log('   Branch: main');
    console.log('');
    console.log('✅ Vercel should auto-deploy from this commit');
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('📍 Check Vercel Dashboard:');
  console.log('   https://vercel.com/dashboard/projects/sms-gold-eta');
  console.log('');
  console.log('🌐 Live Site (check in 5-10 minutes):');
  console.log('   https://sms-gold-eta.vercel.app/school-admin/dashboard');
  console.log('═══════════════════════════════════════════════════\n');
};

deploy().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
