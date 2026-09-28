#!/usr/bin/env node
const { execSync } = require('child_process');

console.log('🔐 Setting Vercel Environment Variables\n');

const supabaseUrl = 'https://egdreueuspmuxhezdpqm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZHJldWV1c3BtdXhoZXpkcHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5NjA0MzksImV4cCI6MjA5NzUzNjQzOX0.egM1RzKJ6ThUy6xrz_Os3OYsy_p5Oyyr0RxL9N1tbGI';

console.log('[1/2] Setting NEXT_PUBLIC_SUPABASE_URL...');
try {
  const cmd1 = `vercel env add NEXT_PUBLIC_SUPABASE_URL`;
  console.log(`Running: ${cmd1}`);
  // Note: This would need interactive input, so we'll show what needs to be done
  console.log(`Value: ${supabaseUrl}`);
} catch (e) {
  console.log('⚠️  Note: Vercel env add requires interactive input');
}

console.log('\n[2/2] Setting NEXT_PUBLIC_SUPABASE_ANON_KEY...');
console.log(`Value: ${supabaseKey.substring(0, 50)}...`);

console.log('\n🔗 Alternative: Set via Vercel Dashboard');
console.log('1. Go to: https://vercel.com/dashboard/projects/sms-gold-eta');
console.log('2. Click "Settings" tab');
console.log('3. Go to "Environment Variables"');
console.log('4. Add:');
console.log('   - Key: NEXT_PUBLIC_SUPABASE_URL');
console.log(`     Value: ${supabaseUrl}`);
console.log('   - Key: NEXT_PUBLIC_SUPABASE_ANON_KEY');
console.log(`     Value: ${supabaseKey}`);
console.log('5. Re-deploy the project');

console.log('\n✅ After setting variables, re-run deployment:\n');
console.log('   vercel --prod\n');
