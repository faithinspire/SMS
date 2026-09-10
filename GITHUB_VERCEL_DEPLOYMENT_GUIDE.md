# GitHub & Vercel Deployment Guide

Your SMS PWA is ready to deploy! Follow these steps to push to GitHub and deploy on Vercel.

## Step 1: Prepare Your Code

### 1.1 Commit Your Changes Locally
```bash
# From your project root
git add .
git commit -m "Convert SMS to PWA with offline support and Vercel deployment config"
```

### 1.2 Verify Git is Initialized
```bash
git log
# If this fails, run: git init
```

## Step 2: Create GitHub Repository

### 2.1 Create Repo on GitHub
1. Go to **https://github.com/new**
2. Repository name: `school-management-sms` (or your choice)
3. Description: "Progressive Web App for school management with offline support"
4. Choose: **Public** (for free Vercel deployment) or **Private** (paid required)
5. Click "Create repository"

### 2.2 Add Remote and Push
```bash
# If it's a new repo (copy from GitHub page):
git remote add origin https://github.com/YOUR_USERNAME/school-management-sms.git
git branch -M main
git push -u origin main

# If you're updating existing repo:
git remote set-url origin https://github.com/YOUR_USERNAME/school-management-sms.git
git push -u origin main
```

## Step 3: Connect to Vercel

### 3.1 Import Project to Vercel
1. Go to **https://vercel.com**
2. Click "New Project"
3. Click "Import Git Repository"
4. Search for your repo: `school-management-sms`
5. Click "Import"

### 3.2 Configure Vercel Project

**Framework Preset:** Next.js (auto-detected)

**Build & Output Settings:**
- Build Command: `npm run build`
- Output Directory: `.next` (default)
- Install Command: `npm install`

**Environment Variables:**
Add these from your `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` → paste your value
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → paste your value

Note: These are already in your code as public vars (safe for client-side)

**Project Settings:**
- Root Directory: `.` (default)
- Node.js Version: 18.x (recommended)

### 3.3 Deploy
Click "Deploy" and wait for completion (~2-3 minutes)

Your PWA is now live! 🎉

## Step 4: Verify Deployment

### 4.1 Check Vercel Dashboard
- Go to **https://vercel.com/dashboard**
- Click your project
- Verify "Production" shows green checkmark
- Copy your domain (e.g., `school-management-sms.vercel.app`)

### 4.2 Test PWA Features
1. Visit your domain: `https://your-domain.vercel.app`
2. Open DevTools (F12) → Application tab
3. Check:
   - ✓ Service Worker registered
   - ✓ Manifest loaded
   - ✓ Install prompt appears (after 2 page loads)
   - ✓ Icons display correctly

### 4.3 Test Offline
1. DevTools → Application → Service Workers
2. Check "Offline" checkbox
3. Refresh page
4. Should show your offline.html fallback

### 4.4 Install on Device
- **Desktop:** Click install button in address bar
- **Mobile (Android):** Chrome menu → "Install app"
- **Mobile (iOS):** Safari → Share → "Add to Home Screen"

## Step 5: Continuous Deployment

Your setup is now automated:
- Push to `main` branch → Vercel auto-deploys
- Each push creates new deployment
- Preview deployments for pull requests

### Deploy via Git
```bash
git add .
git commit -m "Update feature X"
git push origin main
# Vercel deploys automatically!
```

## Step 6: Custom Domain (Optional)

### 6.1 Add Domain
1. Vercel Dashboard → Settings → Domains
2. Add your domain (e.g., `sms.yourschool.edu`)
3. Update DNS records as instructed

### 6.2 SSL/HTTPS
Automatically included with Vercel!

## Troubleshooting

### Build Fails on Vercel
1. Check build logs: Vercel Dashboard → Deployments → failed build
2. Common issues:
   - Missing env vars (check Environment Variables)
   - Node version mismatch (set to 18.x)
   - npm install errors (clear cache: Settings → "Redeploy")

### Service Worker Not Registering
1. Check manifest.json exists at `/public/manifest.json`
2. Check sw.js exists at `/public/sw.js`
3. Verify icons in `public/icons/` folder (8 PNG files)
4. Clear browser cache and hard refresh (Ctrl+Shift+R)

### Icons Missing
1. Ensure all 8 icon files are in `public/icons/`:
   - icon-72x72.png
   - icon-96x96.png
   - icon-128x128.png
   - icon-144x144.png
   - icon-152x152.png
   - icon-192x192.png
   - icon-384x384.png
   - icon-512x512.png
2. Redeploy: Vercel Dashboard → Settings → Deployments → Redeploy

### App Not Installable
- Must be HTTPS (✓ Vercel provides this)
- Valid manifest.json (✓ already created)
- Service Worker (✓ public/sw.js)
- Icons at specified sizes (need to add 8 PNG files)
- Wait 2+ page loads before install prompt appears

## Important Files for Deployment

✅ Already configured:
- `vercel.json` - deployment config
- `next.config.js` - PWA settings
- `public/manifest.json` - app metadata
- `public/sw.js` - service worker
- `public/offline.html` - offline page
- `src/app/layout.tsx` - PWA headers
- `package.json` - dependencies

❌ Still needed:
- `public/icons/*.png` - 8 icon files (see ICON_GENERATION_GUIDE.md)

## Next Steps

### Before First Deployment
1. ✓ Generate app icons (see ICON_GENERATION_GUIDE.md)
2. ✓ Run `npm install` locally
3. ✓ Test with `npm run build` to verify no errors
4. ✓ Commit and push to GitHub

### After Deployment
1. Share your Vercel domain with teachers/students
2. Test install on multiple devices
3. Monitor Vercel Analytics (Vercel Dashboard → Analytics)
4. Set up GitHub Actions for automated tests (optional)

## GitHub Best Practices

### .gitignore (Already Configured)
Your `.gitignore` already includes:
- `node_modules/`
- `.env.local` (credentials safe ✓)
- `.next/` (build artifacts)
- `*.log`

### Commit Messages
```bash
# Good commits:
git commit -m "feat: add PWA offline support"
git commit -m "fix: service worker caching strategy"
git commit -m "docs: add deployment guide"

# Link issues:
git commit -m "feat: offline support (closes #42)"
```

## Environment Variables

### Public Variables (Safe in Git)
- `NEXT_PUBLIC_SUPABASE_URL` ✓ Safe to commit
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✓ Safe to commit

### Private Variables (Never Commit)
- Database passwords ✗
- API secrets ✗
- Private keys ✗

These go in Vercel Environment Variables only (never in `.env.local`)

## Performance Tips

### Vercel Analytics
1. Vercel Dashboard → Analytics
2. Monitor:
   - Core Web Vitals
   - Real User Metrics
   - Edge Function Performance

### Improve PWA Performance
- Manifest icons are cached for 1 year
- Service Worker updates checked every load
- API calls cached for offline use
- Supabase API calls use Network First strategy

## Support & Resources

- **Vercel Docs:** https://vercel.com/docs
- **Next.js PWA:** https://nextjs.org/learn-react/basics/what-is-nextjs
- **PWA Standards:** https://web.dev/progressive-web-apps/
- **Supabase on Vercel:** https://supabase.com/docs/guides/hosting/vercel

## Deployment Checklist

Before hitting "Deploy":
- [ ] All files committed to GitHub
- [ ] `.env.local` not committed (check .gitignore)
- [ ] GitHub repo created and public/private set
- [ ] Vercel account created (free tier sufficient)
- [ ] Environment variables configured in Vercel
- [ ] App icons generated and placed in `public/icons/`
- [ ] `npm run build` runs without errors locally
- [ ] vercel.json configured with headers
- [ ] manifest.json has all required fields

You're ready for deployment! 🚀

## FAQ

**Q: Can I use a free Vercel account?**
A: Yes! Free tier includes unlimited deployments, domains, and PWA support. Paid tier adds priority support and analytics.

**Q: Do I need to configure anything else for offline?**
A: No! Service worker handles caching automatically. Users just need to install the app.

**Q: How do I update the app after deployment?**
A: Push to GitHub → Vercel auto-deploys. Service Worker updates check on next app launch.

**Q: Can I use a custom domain without Vercel Pro?**
A: Yes! Just point DNS to Vercel. Free tier supports custom domains.

**Q: What if the service worker doesn't update?**
A: Hard refresh browser (Ctrl+Shift+R) or clear app data and reinstall.
