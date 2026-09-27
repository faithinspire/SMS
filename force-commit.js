#!/usr/bin/env node

/**
 * Force commit and push using nodegit (libgit2)
 * Bypasses git CLI entirely
 */

const Git = require('nodegit');
const fs = require('fs');
const path = require('path');

const REPO_PATH = 'c:/Users/OLU/Desktop/SMS';
const FILE_PATH = 'src/app/school-admin/dashboard/page.tsx';
const COMMIT_MESSAGE = '🔧 ALL 7 FIXES: Letters, Edit, Delete, Results, Classes, Real-time Fees, Academic Tab';

async function forceCommit() {
  try {
    console.log('📂 Opening repository...');
    const repo = await Git.Repository.open(REPO_PATH);
    console.log('✓ Repository opened');

    console.log('📝 Staging file...');
    const index = await repo.refreshIndex();
    await index.addByPath(FILE_PATH);
    await index.write();
    console.log(`✓ File staged: ${FILE_PATH}`);

    console.log('👤 Getting user config...');
    const config = await repo.config();
    let authorName = await config.getStringBuf('user.name').then(
      buf => buf.toString(),
      () => 'School Admin Bot'
    );
    let authorEmail = await config.getStringBuf('user.email').then(
      buf => buf.toString(),
      () => 'admin@schoolms.app'
    );
    console.log(`✓ Author: ${authorName} <${authorEmail}>`);

    console.log('✍️  Creating commit...');
    const signature = Git.Signature.create(authorName, authorEmail, Math.floor(Date.now() / 1000), 0);
    const tree = await index.writeTree();
    const parent = await repo.getHeadCommit();
    
    const commitId = await repo.createCommit(
      'HEAD',
      signature,
      signature,
      COMMIT_MESSAGE,
      tree,
      [parent]
    );
    console.log(`✓ Commit created: ${commitId.toString().substring(0, 7)}`);

    console.log('🚀 Pushing to remote...');
    const remote = await repo.getRemote('origin');
    await remote.push(['refs/heads/main:refs/heads/main']);
    console.log('✓ Pushed to origin/main');

    console.log('\n✅ SUCCESS! Code committed and pushed!\n');
    console.log('📊 Vercel will auto-deploy in 3-5 minutes');
    console.log('🔗 Check: https://vercel.com/dashboard/projects');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    
    // If nodegit not installed, provide instructions
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('\n📦 Installing nodegit...');
      console.log('Run: npm install nodegit');
      console.log('Then run this script again');
    }
    
    process.exit(1);
  }
}

forceCommit();
