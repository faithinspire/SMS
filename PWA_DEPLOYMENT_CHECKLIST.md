# PWA Deployment Checklist

Complete this checklist before pushing to Vercel.

## ✅ Code Readiness

- [ ] All PWA files created:
  - [x] `public/manifest.json` - app metadata
  - [x] `public/sw.js` - service worker
  - [x] `public/offline.html` - offline page
  - [x] `src/app/layout.tsx` - PWA headers
  - [x] `src/components/PWAInstaller.tsx` - install prompt
  - [x] `src/hooks/useOfflineDetection.ts` - offline detection
  - [x] `src/app/globals.css` - PWA animations
  - [x] `vercel.json` - deployment config
  - [x] `next.config.js` - PWA plugin configured

- [ ] Dependencies installed:
  ```bash
  npm install
  ```

- [ ] No build errors:
  ```bash
  npm run build
  ```

- [ ] `.env.local` exists with:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 📱 PWA Features

- [ ] App icons generated (8 PNG files):
  - [ ] `public/icons/icon-72x72.png`
  - [ ] `public/icons/icon-96x96.png`
  - [ ] `public/icons/icon-128x128.png`
  - [ ] `public/icons/icon-144x144.png`
  - [ ] `public/icons/icon-152x152.png`
  - [ ] `public/icons/icon-192x192.png`
  - [ ] `public/icons/icon-384x384.png`
  - [ ] `public/icons/icon-512x512.png`

- [ ] Service Worker configured:
  - [ ] `public/sw.js` handles Cache First for assets
  - [ ] Network First strategy for API calls
  - [ ] Background sync for submissions
  - [ ] Offline fallback page works

- [ ] Manifest configured:
  - [ ] App name: "School Management System"
  - [ ] Start URL: "/"
  - [ ] Display: "standalone"
  - [ ] Orientation: "portrait-primary"
  - [ ] All 8 icons listed
  - [ ] Theme color: "#2563eb"
  - [ ] Background color: "#ffffff"

- [ ] Install prompt works:
  - [ ] PWAInstaller component renders
  - [ ] Service Worker registers
  - [ ] Install button appears after 2 page loads

- [ ] Offline functionality:
  - [ ] Service Worker caches static assets
  - [ ] Offline page displays when disconnected
  - [ ] IndexedDB stores pending data
  - [ ] Background sync queues submissions

## 🔐 Environment & Security

- [ ] `.env.local` not committed (check `.gitignore`)
- [ ] No secrets in manifest.json
- [ ] No secrets in vercel.json
- [ ] Public environment variables safe to expose:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Vercel security headers configured:
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - X-XSS-Protection: 1; mode=block
  - Referrer-Policy: strict-origin-when-cross-origin

## 📋 Configuration Files

Verify these exist and are correct:

```
✓ vercel.json
  - Build command: npm run build
  - Install command: npm install
  - Environment variables defined
  - Headers configured for PWA
  - Cache strategies set

✓ next.config.js
  - next-pwa plugin configured
  - Runtime caching for:
    * Fonts
    * Images
    * Supabase API
  - PWA enabled

✓ package.json
  - next-pwa@5.6.0 installed
  - All dependencies present
  - Build scripts defined

✓ tsconfig.json
  - TypeScript configured
  - Module resolution correct

✓ .gitignore
  - .env.local excluded
  - node_modules/ excluded
  - .next/ excluded
```

## 🌐 GitHub Setup

- [ ] GitHub account created at https://github.com
- [ ] New repository created:
  - Name: `school-management-sms`
  - Public (for free Vercel)
  - License: MIT (optional)
- [ ] Local repo has remote:
  ```bash
  git remote -v
  # Should show origin pointing to GitHub
  ```
- [ ] All changes committed:
  ```bash
  git status
  # Should show "working tree clean"
  ```

## 🚀 Vercel Setup

- [ ] Vercel account created at https://vercel.com (free tier OK)
- [ ] Project ready to import:
  - GitHub connected to Vercel
  - Repository visible in Vercel UI
- [ ] Build settings configured:
  - Framework: Next.js
  - Build command: npm run build
  - Output directory: .next
- [ ] Environment variables added:
  - NEXT_PUBLIC_SUPABASE_URL
  - NEXT_PUBLIC_SUPABASE_ANON_KEY
- [ ] Domain ready:
  - Free tier gets `*.vercel.app` domain
  - Optional: custom domain configured

## 🧪 Local Testing (Before Push)

Run these tests locally before deploying:

```bash
# 1. Build test
npm run build
# Should complete without errors

# 2. Start production build
npm start
# Visit http://localhost:3000

# 3. Check DevTools (F12)
# Application tab → Manifest
# - Should show all icons
# - Start URL correct
# - App name displays

# 4. Check Service Worker
# Application tab → Service Workers
# - Should show registered
# - Status: activated and running

# 5. Test offline
# Check "Offline" in DevTools
# Refresh page
# Should show offline.html fallback

# 6. Check install prompt
# Visit site 2+ times
# Should show "Install App" button in bottom-right
```

## 📤 Deployment Steps

1. **Generate icons** (if not done):
   - Follow ICON_GENERATION_GUIDE.md
   - Place in `public/icons/`

2. **Commit all changes**:
   ```bash
   git add .
   git commit -m "feat: complete PWA setup for Vercel deployment"
   ```

3. **Push to GitHub**:
   ```bash
   git push -u origin main
   ```

4. **Import to Vercel**:
   - Go to vercel.com/dashboard
   - Click "New Project"
   - Select your GitHub repo
   - Configure environment variables
   - Click "Deploy"

5. **Wait for deployment** (2-3 minutes)

6. **Test on Vercel**:
   - Visit your domain
   - Verify Service Worker registered
   - Test install prompt
   - Test offline mode

## ✨ Post-Deployment

- [ ] Vercel deployment succeeded (green checkmark)
- [ ] Domain accessible: `https://your-domain.vercel.app`
- [ ] PWA features working:
  - [ ] Service Worker registered
  - [ ] Manifest loads
  - [ ] Icons display
  - [ ] Install prompt appears
  - [ ] Offline mode works
- [ ] Share with team:
  - [ ] Send Vercel domain to teachers
  - [ ] Send domain to students
  - [ ] Include installation instructions
- [ ] Monitor performance:
  - [ ] Check Vercel Analytics
  - [ ] Monitor error rates
  - [ ] Watch Core Web Vitals

## 🔗 Important Links

- **Vercel Dashboard:** https://vercel.com/dashboard
- **GitHub Repository:** https://github.com/YOUR_USERNAME/school-management-sms
- **Live App:** https://your-domain.vercel.app
- **Vercel Docs:** https://vercel.com/docs

## 📝 Notes

Add your specific information:
- [ ] GitHub username: _______________
- [ ] Repository name: _______________
- [ ] Vercel project name: _______________
- [ ] Production domain: _______________
- [ ] Custom domain (if any): _______________

## ⚠️ Common Issues

**Service Worker not registering:**
- Ensure `public/sw.js` exists
- Hard refresh (Ctrl+Shift+R)
- Check DevTools Console for errors

**Icons not showing:**
- All 8 PNG files must exist in `public/icons/`
- File names must match manifest.json exactly
- PNG files must be valid images

**Build fails on Vercel:**
- Check Vercel deployment logs
- Verify environment variables set
- Ensure local `npm run build` works

**Install prompt not appearing:**
- PWA only installs on HTTPS (Vercel provides this ✓)
- Wait for 2+ page loads
- Check if already installed
- Check DevTools for Service Worker errors

## 🎯 Success Indicators

When everything is working:
1. ✅ Vercel shows green deployment
2. ✅ Site loads fast with HTTPS
3. ✅ Service Worker in DevTools → Application tab
4. ✅ Install button appears on supported browsers
5. ✅ Offline page displays when disconnected
6. ✅ Can install as native app on device
7. ✅ App works offline with cached data

---

**Ready?** Start with ICON_GENERATION_GUIDE.md, then follow GITHUB_VERCEL_DEPLOYMENT_GUIDE.md

Good luck! 🚀
