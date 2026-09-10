const fs = require('fs');
const path = require('path');

const dynamicExport = "export const dynamic = 'force-dynamic';\n";
let updated = 0;
let skipped = 0;

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (file === 'route.ts' || file === 'route.js' || file === 'route.tsx') {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Check if already has dynamic export
      if (content.includes("export const dynamic")) {
        console.log(`⊘ SKIP: ${filePath.replace(/\\/g, '/')} (already has export)`);
        skipped++;
        return;
      }
      
      // Check if empty
      if (!content.trim()) {
        console.log(`⊘ SKIP: ${filePath.replace(/\\/g, '/')} (empty file)`);
        skipped++;
        return;
      }
      
      // Prepend the dynamic export
      const newContent = dynamicExport + content;
      fs.writeFileSync(filePath, newContent, 'utf8');
      
      console.log(`✓ FIXED: ${filePath.replace(/\\/g, '/')}`);
      updated++;
    }
  });
}

const apiDir = path.join(__dirname, 'src/app/api');
console.log(`Starting to process route files in ${apiDir}\n`);

walkDir(apiDir);

console.log(`\n✓ Total files updated: ${updated}`);
console.log(`⊘ Total files skipped: ${skipped}`);
