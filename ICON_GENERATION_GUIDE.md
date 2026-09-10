# PWA Icon Generation Guide

Your SMS app is now a PWA! The final step is to generate app icons. Follow one of these methods:

## Quick Start (Recommended)

### Option 1: Online Icon Generator (Easiest - 2 minutes)
1. Go to **https://www.favicon-generator.org/**
2. Choose "Upload Image" and select or create your app icon (PNG, SVG, JPG)
3. Click "Generate Favicon"
4. Select these sizes: **72, 96, 128, 144, 152, 192, 384, 512**
5. Download the ZIP file
6. Extract to `public/icons/` folder
7. Done! Your PWA now has icons

### Option 2: Using Vercel's Image Optimization
Icons are already configured in `vercel.json` with aggressive caching. Just add your PNG files to `public/icons/`

### Option 3: Node.js Script (Automatic)
```bash
# Create a script to generate from a base icon
node scripts/generate-icons.js
```

Create `scripts/generate-icons.js`:
```javascript
const sharp = require('sharp');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const sourceImage = 'public/base-icon.png'; // Your 512x512 icon

async function generateIcons() {
  for (const size of sizes) {
    await sharp(sourceImage)
      .resize(size, size)
      .png()
      .toFile(path.join('public/icons', `icon-${size}x${size}.png`));
    console.log(`✓ Generated ${size}x${size} icon`);
  }
  console.log('All icons generated!');
}

generateIcons().catch(console.error);
```

Then run:
```bash
npm install -g sharp-cli
node scripts/generate-icons.js
```

## Required Icon Files

After generation, verify you have these files in `public/icons/`:
- ✓ icon-72x72.png
- ✓ icon-96x96.png
- ✓ icon-128x128.png
- ✓ icon-144x144.png
- ✓ icon-152x152.png
- ✓ icon-192x192.png
- ✓ icon-384x384.png
- ✓ icon-512x512.png

## Optional: App Screenshots

Add these for better app store appearance:
- `public/screenshots/screenshot-540x720.png` (mobile)
- `public/screenshots/screenshot-1280x720.png` (tablet/desktop)

## Testing Icons Locally

```bash
npm run dev
```

Then:
1. Open `http://localhost:3000`
2. Open DevTools → Application → Manifest
3. Check that all icons appear in the icons list
4. Test "Add to Home Screen" on mobile

## Icon Design Tips

Your icon should:
- ✓ Be square (512x512 minimum)
- ✓ Have no transparent borders
- ✓ Use your school branding/logo
- ✓ Be recognizable at small sizes (72x72)
- ✓ Have good contrast
- ✓ Use solid colors or simple gradients

## Quick Icon from Text

If you don't have a logo, generate one:
1. Go to **https://www.canva.com**
2. Choose "Create a Design" → "Social Media Post"
3. Design a simple icon (e.g., "SMS" text on gradient)
4. Download as PNG 512x512
5. Use one of the generation methods above

## Deployment Checklist

Before pushing to Vercel:
- [ ] All 8 PNG files in `public/icons/`
- [ ] manifest.json references the icons
- [ ] next.config.js has PWA plugin configured
- [ ] public/sw.js exists
- [ ] public/offline.html exists
- [ ] vercel.json configured with caching headers

## After Deployment

Once deployed to Vercel:
1. Visit your app: `https://your-domain.vercel.app`
2. Open DevTools → Application → Manifest
3. Try "Add to Home Screen"
4. Test offline functionality

## Troubleshooting

### Icons not showing
- Check file paths in `manifest.json`
- Verify PNG files are in `public/icons/`
- Clear browser cache and rebuild

### Install prompt not appearing
- Check service worker is registered (DevTools → Application → Service Workers)
- Ensure HTTPS (Vercel provides this automatically)
- Must meet PWA install criteria (see Chrome docs)

### App not installable
- Verify all manifest fields are present
- Check icons are valid PNG files
- Ensure start_url is correct

## Next Steps

After icon generation:
1. Commit and push to GitHub:
   ```bash
   git add public/icons/
   git commit -m "Add PWA app icons"
   git push
   ```

2. Vercel will auto-deploy

3. Share your app:
   - Desktop/Laptop: Install from browser
   - iOS: Add to Home Screen (Safari)
   - Android: Install from Chrome

## Support

For issues with icon generation, check:
- https://web.dev/install-criteria/
- https://developer.chrome.com/docs/web-platform/web-app-launch/
- https://developers.google.com/web/fundamentals/web-app-manifest

Your PWA is ready! Just add the icons and deploy! 🚀
