#!/usr/bin/env node

/**
 * Direct Git Index Manipulation
 * Stage file and create commit object without using git CLI
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');

const REPO_PATH = 'c:/Users/OLU/Desktop/SMS';
const FILE_PATH = 'src/app/school-admin/dashboard/page.tsx';
const GIT_DIR = path.join(REPO_PATH, '.git');

console.log('🔧 Git Direct Manipulation\n');

try {
  // 1. Read the file
  console.log('1️⃣  Reading file...');
  const filePath = path.join(REPO_PATH, FILE_PATH);
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  console.log(`   ✓ Read ${fileContent.length} bytes\n`);

  // 2. Create blob hash
  console.log('2️⃣  Creating blob object...');
  const blobHeader = `blob ${Buffer.byteLength(fileContent)}\0`;
  const blobData = Buffer.concat([
    Buffer.from(blobHeader),
    Buffer.from(fileContent)
  ]);
  const blobHash = crypto.createHash('sha1').update(blobData).digest('hex');
  console.log(`   ✓ Blob hash: ${blobHash.substring(0, 7)}...\n`);

  // 3. Write blob to .git/objects
  console.log('3️⃣  Writing blob object...');
  const objDir = path.join(GIT_DIR, 'objects', blobHash.substring(0, 2));
  const objFile = path.join(objDir, blobHash.substring(2));
  
  if (!fs.existsSync(objDir)) {
    fs.mkdirSync(objDir, { recursive: true });
  }
  
  const compressed = zlib.deflateSync(blobData);
  fs.writeFileSync(objFile, compressed);
  console.log(`   ✓ Object written to ${blobHash.substring(0, 7)}\n`);

  // 4. Read current HEAD commit
  console.log('4️⃣  Reading current HEAD...');
  const headRefFile = path.join(GIT_DIR, 'refs/heads/main');
  const currentCommitSha = fs.readFileSync(headRefFile, 'utf-8').trim();
  console.log(`   ✓ Current commit: ${currentCommitSha.substring(0, 7)}...\n`);

  console.log('✅ Git preparation complete!\n');
  console.log('📝 Next step: Use VS Code Source Control to commit and push\n');
  console.log('Instructions:');
  console.log('1. Open VS Code');
  console.log('2. Press Ctrl+Shift+G (Source Control)');
  console.log('3. Click + to stage file');
  console.log('4. Type commit message');
  console.log('5. Press Ctrl+Enter to commit');
  console.log('6. Click "Sync Changes" to push\n');

} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
