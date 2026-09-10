# Server Startup Debug Guide

Your PWA setup is 100% intact, but the server isn't starting. Follow this guide to identify the issue.

## ⚡ Quick Fix (Try This First)

```bash
# 1. Clean install
rm -r node_modules .next package-lock.json

# 2. Reinstall dependencies
npm install

# 3. Try building
npm run build

# 4. Check for errors
```

If this works, proceed to testing. If it fails, continue debugging below.

---

## 🔍 Step-by-Step Debugging

### Step 1: Check Node/npm Versions

```bash
node --version   # Should be 16.x, 18.x, or 20.x
npm --version    # Should be 7.x or higher
```

**If versions are old:**
- Update Node from https://nodejs.org
- Use LTS (Long Term Support) version

---

### Step 2: Check Environment Variables

Verify `.env.local` exists and has both variables:

```bash
# Should contain:
NEXT_PUBLIC_SUPABASE_URL=https://egdreueuspmuxhezdpqm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_key_here
```

**If missing:**
- Copy from `.env.example`
- Fill in actual Supabase credentials

---

### Step 3: Capture Build Output

Run the build and save all output:

```bash
npm run build 2>&1 | tee build-output.log
```

Share the `build-output.log` file - it will show the exact error.

---

### Step 4: Common Next.js Issues

**Issue: "Cannot find module"**
```bash
Solution: npm install
```

**Issue: "Port 3000 already in use"**
```bash
Solution: npm run dev -- -p 3001
# Or kill the process using port 3000
```

**Issue: "TypeScript error"**
- Check tsconfig.json (looks correct ✅)
- Look for red squiggles in IDE
- Check for import path errors

**Issue: "Module not found" in .next-pwa**
```bash
Solution:
rm -r node_modules
npm install --legacy-peer-deps
```

---

### Step 5: Verify PWA Files Aren't Breaking Build

The PWA setup shouldn't break the build, but verify:

```bash
# Check these files exist:
- public/manifest.json ✅
- public/sw.js ✅
- public/offline.html ✅
- src/app/layout.tsx ✅
- src/components/PWAInstaller.tsx ✅
- src/app/globals.css ✅
```

All should be present (verified in PWA_SETUP_VERIFICATION_REPORT.md).

---

### Step 6: Test Individual Components

If build fails, isolate the issue:

```bash
# Option A: Disable next-pwa temporarily
# Edit next.config.js, comment out withPWA

# Option B: Check specific imports
# Look for missing @/ path aliases
```

---

## 📋 Error Categories & Solutions

### Category 1: Dependency Issues
```
Error: "Cannot find module 'X'"
Solution: npm install && npm run build
```

### Category 2: Environment Issues
```
Error: "process.env.NEXT_PUBLIC_SUPABASE_URL is undefined"
Solution: Create/verify .env.local file
```

### Category 3: TypeScript Issues
```
Error: "Type error in X.tsx"
Solution: Check tsconfig.json, fix type errors
```

### Category 4: Port Issues
```
Error: "Port 3000 is already in use"
Solution: Use different port: npm run dev -- -p 3001
```

### Category 5: Build Issues
```
Error: ".next-pwa build failed"
Solution: Delete node_modules, reinstall with --legacy-peer-deps
```

---

## 🛠️ Advanced Troubleshooting

### Clear Next.js Cache
```bash
rm -rf .next
npm run build
```

### Rebuild from Scratch
```bash
# Nuclear option
rm -rf node_modules package-lock.json .next
npm cache clean --force
npm install
npm run build
```

### Check for File Conflicts
```bash
# Make sure these don't conflict:
- next.config.js (PWA setup)
- tsconfig.json (module paths)
- package.json (dependencies)
```

---

## 📊 What I've Already Verified ✅

- ✅ next.config.js syntax is correct
- ✅ All PWA files are present
- ✅ package.json has all dependencies
- ✅ tsconfig.json is properly configured
- ✅ PWAInstaller.tsx has no syntax errors
- ✅ Environment variable config is correct

**This means the issue is likely:**
1. Dependency installation incomplete
2. Environment variables missing
3. External build error (TypeScript, imports, etc.)
4. Port conflict

---

## 🎯 Action Plan

1. **Run clean build:**
   ```bash
   rm -r node_modules .next
   npm install
   npm run build
   ```

2. **If it fails, capture output:**
   ```bash
   npm run build 2>&1 | tee build-debug.log
   ```

3. **Share the error from build-debug.log**

4. **I'll debug the specific error**

---

## 📝 Checklist Before Testing

- [ ] `.env.local` exists with Supabase credentials
- [ ] `node --version` shows 16.x or higher
- [ ] `npm --version` shows 7.x or higher
- [ ] `npm install` completes without errors
- [ ] `npm run build` succeeds
- [ ] No red squiggles in IDE (if using TypeScript)

---

## 🚀 Once Server Starts

After fixing the startup issue:

```bash
# 1. Start the dev server
npm run dev

# 2. Visit http://localhost:3000

# 3. Open DevTools (F12) → Application tab

# 4. Check Service Worker is registered
# Should show in "Service Workers" section

# 5. Check Manifest
# Should show app metadata and icons
```

---

## 💡 PWA Features to Test

Once server runs:

1. **Install Prompt**
   - Visit site 2+ times
   - Should show "Install App" button
   - Click to install as native app

2. **Offline Mode**
   - DevTools → Application → Service Workers
   - Check "Offline"
   - Refresh page
   - Should show offline.html

3. **Service Worker**
   - DevTools → Application → Service Workers
   - Should show "activated and running"

---

## 🆘 If You Get Stuck

The most helpful information you can provide:

1. **Exact error message** from `npm run build`
2. **Node version** from `node --version`
3. **npm version** from `npm --version`
4. **Last working state** - when did the server last work?
5. **Recent changes** - what was done before it stopped working?

---

## 📞 Quick Reference

| Issue | Command |
|-------|---------|
| Dependencies missing | `npm install` |
| Cache issues | `npm cache clean --force` |
| Port in use | `npm run dev -- -p 3001` |
| Build cache | `rm -rf .next && npm run build` |
| Full reset | `rm -rf node_modules .next && npm install` |
| Check versions | `node -v && npm -v` |
| See build errors | `npm run build 2>&1 \| tee output.log` |

---

**Next Steps:**
1. Try the quick fix at the top
2. If it fails, run `npm run build 2>&1 | tee build-debug.log`
3. Share the error message
4. I'll help debug the specific issue

Good luck! 🚀
