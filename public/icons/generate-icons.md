# FTECH School Management System - Icon Generation Guide

## Overview
This directory contains the logo assets for the FTECH School Management System PWA.

## Required Icon Sizes

The following icon sizes are required for complete PWA support:

### Standard Icons
- **32x32** - Browser tabs, bookmarks (favicon)
- **64x64** - Desktop shortcuts, app tiles
- **96x96** - Windows taskbar
- **128x128** - Chrome Web Store, Windows Start Menu
- **192x192** - Android home screen, Chrome installation
- **256x256** - Windows tile
- **512x512** - PWA splash screen, app store

### Maskable Icons (for adaptive displays)
- **192x192** - Maskable variant for rounded/custom display shapes
- **512x512** - Maskable variant for splash screens

## Current Assets

### SVG Master (icon.svg)
The master SVG file contains:
- Professional FTECH branding
- Book icon (education symbol)
- Network nodes (technology symbol)
- Blue-to-Cyan gradient background
- Suitable for all size scaling

## How to Generate PNG Files

### Option 1: Using Node.js + Sharp (Recommended)

```bash
npm install sharp
node scripts/generate-icons.js
```

### Option 2: Using ImageMagick

```bash
# Convert SVG to PNG at specific sizes
convert -density 300 public/icons/icon.svg -resize 32x32 public/icons/icon-32x32.png
convert -density 300 public/icons/icon.svg -resize 64x64 public/icons/icon-64x64.png
convert -density 300 public/icons/icon.svg -resize 96x96 public/icons/icon-96x96.png
convert -density 300 public/icons/icon.svg -resize 128x128 public/icons/icon-128x128.png
convert -density 300 public/icons/icon.svg -resize 192x192 public/icons/icon-192x192.png
convert -density 300 public/icons/icon.svg -resize 256x256 public/icons/icon-256x256.png
convert -density 300 public/icons/icon.svg -resize 512x512 public/icons/icon-512x512.png

# Create maskable variants
convert -density 300 public/icons/icon.svg -resize 192x192 public/icons/icon-192x192-maskable.png
convert -density 300 public/icons/icon.svg -resize 512x512 public/icons/icon-512x512-maskable.png
```

### Option 3: Using Online Tools

Use an online SVG to PNG converter like:
- https://svgtopng.com/
- https://convertio.co/svg-png/

Upload `icon.svg` and generate the following sizes:
- 32x32
- 64x64
- 96x96
- 128x128
- 192x192
- 256x256
- 512x512

## Icon Design Features

### Visual Elements
1. **Open Book** - Represents education and learning
2. **Network Nodes** - Represents digital/technology and connectivity
3. **Gradient** - Professional Blue-to-Cyan gradient reflecting modern tech
4. **Responsive** - Scales well from 32px to 512px

### Color Scheme
- Primary: #2563eb (Blue)
- Secondary: #0ea5e9 (Cyan)
- Accent: #60a5fa (Light Blue)
- Text: White

### Design Principles
- ✓ Recognizable at all sizes
- ✓ No tiny unreadable text in icon body
- ✓ Clear symbol (book + network)
- ✓ Professional appearance
- ✓ Works in both light and dark contexts
- ✓ Maskable-friendly (important elements in center)

## Manifest Configuration

The `manifest.json` references icons as follows:

```json
{
  "icons": [
    {
      "src": "/icons/icon-32x32.png",
      "sizes": "32x32",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-192x192-maskable.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icons/icon-512x512-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

## Favicon

The favicon.ico should be generated from the same icon at 32x32 pixels.

## Testing

After generating icons:

1. Open DevTools → Application → Manifest
2. Verify all icon sizes are listed
3. Check that icons appear correctly in Chrome's install prompt
4. Test on Android - install the app and verify icon on home screen
5. Test on iOS - add to home screen and verify appearance
6. Test on Windows - check taskbar and Start menu icons

## Notes

- Maskable icons will be displayed with a safe zone in the center (typically 80% of the icon)
- Ensure important design elements (FTECH text, symbols) stay within this safe zone
- The current design is centered and should work well for masking

## Browser Support

- ✓ Chrome 78+
- ✓ Edge 79+
- ✓ Firefox 55+ (basic PWA, icons may vary)
- ✓ Safari 16.4+ (iOS and macOS)
- ✓ Samsung Internet 12+
- ✓ Android Firefox

## Future Improvements

- Consider generating animated WebP variants for supported browsers
- Add light/dark mode variants if needed
- Create alternative square vs. rounded icon variants
- Add seasonal or event-specific icon variants
