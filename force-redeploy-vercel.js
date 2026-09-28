#!/usr/bin/env node

/**
 * Force Vercel Redeploy Script
 * Uses Vercel API to manually trigger a redeploy of the latest commit
 */

const https = require('https');
const fs = require('fs');

// Vercel Project Details
const projectId = 'prj_aEoHqwFq43E4vkedEcQ3IfrVlYmY';
const teamId = 'team_TL6yFOaJymXvXyXzVF1UmAzo';
const vercelToken = process.env.VERCEL_TOKEN;

if (!vercelToken) {
    console.error('❌ VERCEL_TOKEN environment variable not set');
    process.exit(1);
}

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║         FORCE VERCEL REDEPLOY - Latest Commit             ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');

// Read git commit info
const { execSync } = require('child_process');
let commitHash = '';
let commitMsg = '';

try {
    commitHash = execSync('git rev-parse --short HEAD').toString().trim();
    commitMsg = execSync('git log -1 --pretty=%B').toString().trim();
    console.log(`📝 Current commit: ${commitHash}`);
    console.log(`📝 Message: ${commitMsg}`);
    console.log('');
} catch (e) {
    console.error('❌ Failed to read git info');
    process.exit(1);
}

// Function to make HTTPS request
function makeRequest(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.vercel.com',
            path: `${path}?teamId=${teamId}`,
            method: method,
            headers: {
                'Authorization': `Bearer ${vercelToken}`,
                'Content-Type': 'application/json',
            },
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', reject);
        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function redeploy() {
    try {
        // Get latest deployment
        console.log('🔍 Fetching latest deployment info...');
        const deploymentsRes = await makeRequest('GET', `/v6/projects/${projectId}/deployments`);
        
        if (deploymentsRes.status !== 200) {
            console.error(`❌ Failed to fetch deployments: ${deploymentsRes.status}`);
            console.error(JSON.stringify(deploymentsRes.data, null, 2));
            process.exit(1);
        }

        const deployments = deploymentsRes.data.deployments || [];
        if (deployments.length === 0) {
            console.error('❌ No deployments found');
            process.exit(1);
        }

        const latestDeploy = deployments[0];
        console.log(`✅ Latest deployment: ${latestDeploy.uid}`);
        console.log(`   Created: ${new Date(latestDeploy.created).toLocaleString()}`);
        console.log('');

        // Trigger redeploy by creating a new deployment
        console.log('🚀 Triggering redeploy...');
        const redeployBody = {
            source: 'cli',
            commit: {
                message: `🔄 Redeploy: ${commitMsg}`,
            },
        };

        const redeployRes = await makeRequest('POST', `/v13/projects/${projectId}/deployments`, redeployBody);
        
        if (redeployRes.status !== 200 && redeployRes.status !== 201) {
            console.error(`❌ Redeploy failed: ${redeployRes.status}`);
            console.error(JSON.stringify(redeployRes.data, null, 2));
            process.exit(1);
        }

        console.log('✅ Redeploy triggered successfully!');
        console.log('');
        console.log('╔════════════════════════════════════════════════════════════╗');
        console.log('║           📊 DEPLOYMENT IN PROGRESS                       ║');
        console.log('╚════════════════════════════════════════════════════════════╝');
        console.log('');
        console.log('⏱️  Timeline:');
        console.log('   Now:     Deployment triggered');
        console.log('   +30 sec: Build starts');
        console.log('   +2 min:  Build completes');
        console.log('   +1 min:  Deploy to CDN');
        console.log('');
        console.log('📊 Monitor at:');
        console.log('   https://vercel.com/dashboard/projects/sms/deployments');
        console.log('');
        console.log('🌐 Live at:');
        console.log('   https://sms-gold-eta.vercel.app/school-admin/dashboard');
        console.log('');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

redeploy();
