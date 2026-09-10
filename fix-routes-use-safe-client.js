const fs = require('fs');
const path = require('path');

let updated = 0;
let skipped = 0;
const errors = [];

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;
    
    // Fix 1: Replace direct Supabase import with safe wrapper
    // FROM: import { createClient } from '@supabase/supabase-js';
    // TO:   import { createClient } from '@/lib/supabase-client';
    if (content.includes("import { createClient } from '@supabase/supabase-js'")) {
      content = content.replace(
        "import { createClient } from '@supabase/supabase-js'",
        "import { createClient } from '@/lib/supabase-client'"
      );
      console.log(`✓ FIXED: ${filePath.replace(/\\/g, '/')} (replaced import)`);
    }
    
    // Fix 2: Remove the non-null assertion (!) from env vars in createClient calls
    // FROM: createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    // TO:   createClient()
    content = content.replace(
      /createClient\(\s*process\.env\.NEXT_PUBLIC_SUPABASE_URL!,\s*process\.env\.NEXT_PUBLIC_SUPABASE_ANON_KEY!\s*\)/g,
      'createClient()'
    );
    
    // Also handle single-line and multi-line variations
    content = content.replace(
      /const supabase = createClient\(\s*process\.env\.NEXT_PUBLIC_SUPABASE_URL!,\s*process\.env\.NEXT_PUBLIC_SUPABASE_ANON_KEY!\s*\);?/g,
      'const supabase = createClient();'
    );
    
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      if (!filePath.includes("✓ FIXED")) {
        updated++;
      }
    }
  } catch (error) {
    errors.push({ file: filePath, error: error.message });
  }
}

function walkDir(dir) {
  try {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        walkDir(filePath);
      } else if (file === 'route.ts' || file === 'route.js' || file === 'route.tsx') {
        processFile(filePath);
      }
    });
  } catch (error) {
    console.error(`Error walking directory ${dir}:`, error.message);
  }
}

const apiDir = path.join(__dirname, 'src/app/api');
console.log(`Processing route files in ${apiDir}\n`);

walkDir(apiDir);

console.log(`\n✓ Total files fixed: ${updated}`);
if (errors.length > 0) {
  console.log(`⚠ Errors encountered: ${errors.length}`);
  errors.forEach(e => console.log(`  - ${e.file}: ${e.error}`));
}
