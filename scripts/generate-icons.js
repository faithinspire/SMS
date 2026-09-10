/**
 * Icon Generation Script
 * Generates PNG icons from SVG master at all required sizes for PWA
 * 
 * Usage: node scripts/generate-icons.js
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Define icon sizes to generate
const sizes = [32, 64, 96, 128, 192, 256, 512];
const iconPath = path.join(__dirname, '../public/icons/icon.svg');
const outputDir = path.join(__dirname, '../public/icons');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
  console.log('🎨 Starting icon generation from SVG...');
  console.log(`📁 Source: ${iconPath}`);
  console.log(`📁 Output: ${outputDir}\n`);

  try {
    // Check if SVG file exists
    if (!fs.existsSync(iconPath)) {
      console.error(`❌ Error: SVG file not found at ${iconPath}`);
      process.exit(1);
    }

    // Generate regular icons
    console.log('📦 Generating regular PNG icons...');
    for (const size of sizes) {
      const outputFile = path.join(outputDir, `icon-${size}x${size}.png`);
      
      await sharp(iconPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toFile(outputFile);
      
      console.log(`  ✓ Generated icon-${size}x${size}.png`);
    }

    // Generate maskable icons (for adaptive displays)
    console.log('\n📦 Generating maskable PNG icons...');
    for (const size of [192, 512]) {
      const outputFile = path.join(outputDir, `icon-${size}x${size}-maskable.png`);
      
      await sharp(iconPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toFile(outputFile);
      
      console.log(`  ✓ Generated icon-${size}x${size}-maskable.png`);
    }

    // Generate favicon
    console.log('\n📦 Generating favicon...');
    await sharp(iconPath)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(path.join(outputDir, 'favicon.png'));
    
    console.log('  ✓ Generated favicon.png');

    console.log('\n✅ Icon generation complete!');
    console.log(`\n📊 Summary:`);
    console.log(`  • Regular icons: ${sizes.length}`);
    console.log(`  • Maskable icons: 2`);
    console.log(`  • Favicon: 1`);
    console.log(`  • Total files: ${sizes.length + 2 + 1}`);
    console.log(`\n📝 Next steps:`);
    console.log(`  1. Verify icons in public/icons/`);
    console.log(`  2. Test PWA install in Chrome`);
    console.log(`  3. Verify icon appearance on Android/iOS`);

  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
    process.exit(1);
  }
}

// Run the generation
generateIcons();
