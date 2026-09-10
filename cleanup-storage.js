#!/usr/bin/env node

/**
 * Storage Cleanup Script
 * 
 * Usage: node cleanup-storage.js
 * 
 * This script deletes all files from Supabase storage buckets
 * to free up disk space when your database is full.
 * 
 * Requires: 
 * - NEXT_PUBLIC_SUPABASE_URL in .env.local
 * - SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nMake sure .env.local contains these values.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

// List of buckets to clean
const BUCKETS = [
  'student_photos',
  'uploads',
  'photos',
  'documents',
  'files',
  'avatars'
];

let totalDeleted = 0;
let totalErrors = 0;

async function cleanupBucket(bucketName) {
  console.log(`\n📂 Cleaning bucket: ${bucketName}`);
  
  try {
    // List all files in bucket
    const { data: files, error: listError } = await supabase
      .storage
      .from(bucketName)
      .list('', { 
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' }
      });
    
    if (listError) {
      console.error(`   ❌ Error listing files: ${listError.message}`);
      totalErrors++;
      return;
    }
    
    if (!files || files.length === 0) {
      console.log(`   ✓ Bucket is empty`);
      return;
    }
    
    console.log(`   Found ${files.length} files to delete...`);
    
    // Delete files in batches of 100 to avoid timeouts
    const batchSize = 100;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const fileNames = batch.map(f => f.name);
      
      console.log(`   Deleting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(files.length / batchSize)} (${fileNames.length} files)...`);
      
      const { error: deleteError } = await supabase
        .storage
        .from(bucketName)
        .remove(fileNames);
      
      if (deleteError) {
        console.error(`   ❌ Error deleting batch: ${deleteError.message}`);
        totalErrors++;
      } else {
        totalDeleted += fileNames.length;
        console.log(`   ✓ Deleted ${fileNames.length} files`);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
  } catch (err) {
    console.error(`   ❌ Unexpected error: ${err.message}`);
    totalErrors++;
  }
}

async function main() {
  console.log('🚀 Supabase Storage Cleanup Started');
  console.log('=====================================\n');
  console.log(`Database URL: ${supabaseUrl}`);
  console.log(`Buckets to clean: ${BUCKETS.join(', ')}\n`);
  
  for (const bucket of BUCKETS) {
    await cleanupBucket(bucket);
  }
  
  console.log('\n=====================================');
  console.log('✅ Storage Cleanup Complete');
  console.log(`   Total files deleted: ${totalDeleted}`);
  console.log(`   Errors: ${totalErrors}`);
  console.log('\n📋 Next steps:');
  console.log('   1. Run: SUPABASE_CLEANUP_NO_STORAGE.sql in Supabase SQL Editor');
  console.log('   2. This will delete old records and compact the database');
  console.log('   3. Check your storage usage: Supabase Dashboard → Usage');
  console.log('=====================================\n');
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
