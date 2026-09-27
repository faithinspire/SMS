#!/usr/bin/env node

const nodegit = require('nodegit');
const path = require('path');

async function forceCommitAndDeploy() {
  try {
    console.log('🔥 FORCE COMMIT AND DEPLOY INITIATED');
    
    // Open the repository
    const repoPath = path.resolve(__dirname, 'c:', 'Users', 'OLU', 'Desktop', 'SMS');
    console.log(`📂 Opening repo at: ${repoPath}`);
    
    const repo = await nodegit.Repository.open(repoPath);
    console.log('✅ Repository opened');

    // Get the index
    const index = await repo.refreshIndex();
    console.log('✅ Index refreshed');

    // Add all modified files
    await index.addAll();
    console.log('✅ All files staged');

    // Write the index
    await index.write();
    console.log('✅ Index written');

    // Get the signature (commit author)
    const signature = nodegit.Signature.now(
      'School Admin Bot',
      'admin@schoolms.app'
    );

    // Get HEAD
    const headCommit = await repo.getHeadCommit();
    console.log('✅ HEAD commit retrieved');

    // Write the tree
    const treeId = await index.writeTree();
    console.log(`✅ Tree written: ${treeId}`);

    // Create the commit
    const commitId = await repo.createCommit(
      'HEAD',
      signature,
      signature,
      '🔥 FORCE FIX: Dashboard loading + Real-time navbar - Added missing useEffect, real-time subscriptions, parallel queries, timeout protection',
      treeId,
      [headCommit]
    );
    console.log(`✅ Commit created: ${commitId}`);

    // Get the origin remote
    const remote = await repo.getRemote('origin');
    console.log('✅ Origin remote found');

    // Push to origin/main
    const refSpecs = [
      `refs/heads/main:refs/heads/main`
    ];

    console.log('🚀 Pushing to GitHub...');
    await remote.push(refSpecs, {
      callbacks: {
        credentials: (url, user) => {
          // Try to use git credentials or environment variables
          return nodegit.Cred.sshKeyNew(
            user,
            path.join(process.env.USERPROFILE || process.env.HOME || '', '.ssh', 'id_rsa.pub'),
            path.join(process.env.USERPROFILE || process.env.HOME || '', '.ssh', 'id_rsa'),
            ''
          );
        },
        certificateCheck: () => 0 // Accept any certificate
      }
    });

    console.log('✅ Push successful!');
    console.log('🎉 Commit and push completed!');
    console.log('📍 Vercel webhook should trigger automatically');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

forceCommitAndDeploy();
