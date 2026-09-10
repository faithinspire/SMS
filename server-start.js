#!/usr/bin/env node

/**
 * Simple Next.js Dev Server Starter
 * This script starts the Next.js development server on port 3000
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting SMS Development Server...');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Start Next.js dev server
const dev = spawn('next', ['dev', '-p', '3000'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

dev.on('error', (err) => {
  console.error('❌ Error starting server:', err);
  process.exit(1);
});

dev.on('close', (code) => {
  console.log(`\n⚠️  Server stopped with code ${code}`);
  process.exit(code);
});

console.log('\n📍 Server should start on http://localhost:3000');
console.log('⏳ Wait for "ready - started server" message...\n');
