#!/usr/bin/env node

/**
 * Pure JavaScript Git push using isomorphic-git
 * No compilation needed, works on Windows
 */

const git = require('isomorphic-git');
const fs = require('fs');
const path = require('path');
const http = require('isomorphic-git/http/node');

const dir = 'c:/Users/OLU/Desktop/SMS';
const filepath = 'src/app/school-admin/dashboard/page.tsx';

async function pushChanges() {
  try {
    console.log('🔍 Checking git status...');
    const status = await git.status({ fs, dir, filepath });
    console.log(`   Status: ${status}`);

    console.log('\n📝 Staging changes...');
    await git.add({ fs, dir, filepath });
    console.log('   ✓ File staged');

    console.log('\n✍️  Creating commit...');
    const commit = await git.commit({
      fs,
      dir,
      message: '🔧 ALL 7 FIXES: Letters, Edit, Delete, Results, Classes, Real-time Fees, Academic Tab',
      author: {
        name: 'School Admin Bot',
        email: 'admin@schoolms.app'
      }
    });
    console.log(`   ✓ Commit: ${commit.substring(0, 7)}`);

    console.log('\n🚀 Pushing to GitHub...');
    
    // Get credentials from git config or use default
    let username = '';
    let password = '';
    
    // Try to read from git credentials or environment
    try {
      const config = await git.getConfig({ fs, dir, path: 'user.name' });
      console.log(`   Using user: ${config}`);
    } catch (e) {
      // Ignore
    }

    // Attempt push
    await git.push({
      fs,
      http,
      dir,
      remote: 'origin',
      ref: 'main',
      onAuth: () => {
        // Return cached credentials or prompt
        return { username, password };
      }
    });
    
    console.log('\n✅ SUCCESS! Pushed to GitHub!\n');
    console.log('📊 Vercel auto-deployment starting...');
    console.log('   Expected time: 3-5 minutes');
    console.log('🔗 Monitor: https://vercel.com/dashboard\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.code === 'MODULE_NOT_FOUND' || !error.message.includes('isomorphic-git')) {
      console.log('\n📦 isomorphic-git not found');
      console.log('Run: npm install isomorphic-git');
      console.log('Then run this script again\n');
    }
    
    process.exit(1);
  }
}

pushChanges();
