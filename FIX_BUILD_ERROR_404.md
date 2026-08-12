# CRITICAL FIX: Build Error 404 - Static Files Not Found

## ⚠️ THE PROBLEM

```
GET http://localhost:3000/_next/static/chunks/main-app.js net::ERR_ABORTED 404
GET http://localhost:3000/_next/static/chunks/app-pages-internals.js net::ERR_ABORTED 404
GET http://localhost:3000/_next/static/media/e4af272ccee01ff0-s.p.woff2 404
```

**What This Means:**
- The Next.js build folder (.next) is missing or corrupted
- Static assets weren't generated during build
- The dev server is running but build files don't exist

**Why It Happens:**
1. Build was interrupted
2. Disk space issue during build
3. File permissions issue
4. Node process crashed during build
5. Dependencies are incompatible

---

## ✅ SOLUTION 1: Quick Fix (Try First)

### Step 1: Stop the dev server
```
Press Ctrl+C in terminal
```

### Step 2: Clear and rebuild
```bash
# Option A: Using PowerShell (Recommended for Windows)
.\rebuild.ps1

# Option B: Using Command Prompt
rebuild.bat

# Option C: Manual commands
rm -r .next
npm run build
npm run dev
```

### Step 3: Test
- Open http://localhost:3000 in browser
- Press F5 to refresh
- Check if 404 errors are gone

---

## ✅ SOLUTION 2: Complete Clean Rebuild

If Solution 1 doesn't work, do a complete rebuild:

### Step 1: Stop everything
```bash
# Kill all Node processes
taskkill /F /IM node.exe

# Wait 2-3 seconds
timeout /t 3
```

### Step 2: Clean slate
```bash
# Remove build folders
rm -r .next
rm -r node_modules
rm -r dist

# Clear npm cache
npm cache clean --force
```

### Step 3: Reinstall everything
```bash
# Fresh install
npm install

# Verify installation
npm list --depth=0
```

### Step 4: Build
```bash
# Build for production (more reliable than dev)
npm run build

# Start production server
npm start
```

### Step 5: Test
- Open http://localhost:3000
- Check browser console for errors (F12)
- Navigate to dashboard

---

## ✅ SOLUTION 3: Fix Without Deleting node_modules

If you want to keep node_modules:

```bash
# 1. Stop server (Ctrl+C)

# 2. Just rebuild .next folder
npm run build

# 3. Start server
npm run dev

# 4. Clear browser cache
# In browser: Ctrl+Shift+Delete or DevTools → Application → Clear storage
```

---

## ✅ SOLUTION 4: Force Production Build

If dev mode keeps failing:

```bash
# 1. Stop current server

# 2. Full production build
npm run build

# If build succeeds, start production server
npm start

# If still fails, try with more verbose output
npm run build -- --debug
```

---

## 🔍 TROUBLESHOOTING BY SYMPTOM

### Symptom 1: Build Hangs
**Solution:**
```bash
# Kill the process
Ctrl+C

# Try again with output
npm run build -- --verbose
```

### Symptom 2: Out of Disk Space
**Solution:**
```bash
# Check disk space
# Windows: Run "Disk Cleanup" utility
# or in PowerShell:
Get-Volume

# If low on space, delete:
# - .next folder
# - node_modules (can be reinstalled)
# - Temporary files
```

### Symptom 3: File Permission Denied
**Solution:**
```bash
# Run as Administrator
# Then try rebuild
npm run build
```

### Symptom 4: Keeps Showing Old Errors
**Solution:**
```bash
# Clear browser cache first
# DevTools → Application → Clear storage → Clear site data

# Then hard refresh
Ctrl+Shift+R (or Cmd+Shift+R on Mac)
```

### Symptom 5: Still Getting 404s After Rebuild
**Solution:**
```bash
# Check if .next folder exists
ls -la .next

# If missing, run build again
npm run build

# If build succeeded but .next is missing, check:
# 1. Disk space
# 2. File permissions
# 3. Node version (should be 16+)
node --version
```

---

## 📋 STEP-BY-STEP GUIDE FOR WINDOWS

### Using PowerShell (Recommended)

```powershell
# 1. Navigate to project
cd C:\Users\OLU\Desktop\SMS

# 2. Stop any running servers (Ctrl+C if needed)

# 3. Check Node version
node --version
# Should be 16 or higher

# 4. Run rebuild script
.\rebuild.ps1

# 5. Wait for completion (should show "✅ Rebuild completed")

# 6. Start dev server
npm run dev

# 7. Open browser
# Go to http://localhost:3000
```

### Using Command Prompt (Alternative)

```cmd
# 1. Navigate to project
cd C:\Users\OLU\Desktop\SMS

# 2. Run rebuild script
rebuild.bat

# 3. Wait for completion

# 4. Start dev server
npm run dev

# 5. Open browser to http://localhost:3000
```

### Manual Steps (No Scripts)

```powershell
# 1. Stop server if running
# Press Ctrl+C

# 2. Navigate to project
cd C:\Users\OLU\Desktop\SMS

# 3. Remove .next folder
Remove-Item -Recurse -Force .next

# 4. Build
npm run build

# 5. Start dev server
npm run dev

# 6. Test in browser
# http://localhost:3000
```

---

## ✅ VERIFICATION CHECKLIST

After rebuilding, check:

- [ ] `.next` folder exists
  ```bash
  ls -la .next
  # Should show: standalone, static, etc.
  ```

- [ ] Build succeeded
  ```bash
  npm run build
  # Should end with: "✓ Compiled in X.XXs"
  ```

- [ ] Dev server starts
  ```bash
  npm run dev
  # Should show: "ready - started server on 0.0.0.0:3000"
  ```

- [ ] Page loads
  ```
  http://localhost:3000/school-admin/dashboard
  # Should load without 404 errors
  ```

- [ ] No console errors
  ```
  Browser DevTools (F12) → Console tab
  # Should be clean or only have warnings
  ```

- [ ] No network 404s
  ```
  Browser DevTools → Network tab
  # Check all requests return 200, not 404
  ```

---

## 🚀 IF STILL BROKEN AFTER ALL SOLUTIONS

### Nuclear Option: Complete Fresh Start

```bash
# 1. Delete everything except src and public
# (On Windows, manually or use these commands)

# 2. Copy the files from backup or git
git status
git checkout .

# 3. Delete all generated files
Remove-Item -Recurse -Force .next
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json

# 4. Reinstall from scratch
npm install
npm run build
npm run dev
```

### Check for Actual Code Issues

```bash
# Run TypeScript check
npx tsc --noEmit

# If errors, fix them first, then rebuild
npm run build
```

---

## 📊 DIAGNOSTIC COMMANDS

Run these to find the issue:

```bash
# Check Node version (should be 16+)
node --version

# Check npm version (should be 7+)
npm --version

# Check if build folder exists
ls -la .next

# Check if .next/standalone exists (production build)
ls -la .next/standalone

# Check if .next/static exists (static files)
ls -la .next/static

# Check file count in .next
(Get-ChildItem .next -Recurse).Count

# Check disk space
Get-Volume
```

---

## 📝 COMMON ROOT CAUSES

| Issue | Cause | Fix |
|-------|-------|-----|
| 404 on main-app.js | Build incomplete | Run `npm run build` |
| 404 on fonts | Fonts not copied | Rebuild and check public/ |
| 404 on all static | .next missing | Clean build: `rm .next && npm run build` |
| Hangs during build | Out of memory | Close other apps, increase Node heap |
| Permission denied | Admin rights needed | Run as Administrator |
| Out of disk space | Disk full | Delete old files, free space |
| Incompatible deps | Old node_modules | Delete and reinstall: `rm node_modules && npm i` |

---

## ⚡ QUICK REFERENCE

### For Development
```bash
npm run dev
# Then open http://localhost:3000
```

### For Production Testing
```bash
npm run build
npm start
# Then open http://localhost:3000
```

### Full Clean Rebuild
```bash
rm -r .next node_modules
npm install
npm run build
npm run dev
```

### Just Clear Cache
```bash
npm cache clean --force
npm run build
```

---

## ✅ EXPECTED SUCCESS OUTPUT

### Build Success
```
✓ Compiled in X.XXs
✓ Webpack compilation complete
```

### Dev Server Success
```
ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

### Page Load Success
```
Network tab: All files return 200 status
Console: No 404 errors
Page: Fully rendered and interactive
```

---

## 📞 IF STILL STUCK

1. **Check error message** - Read what exact error shows
2. **Check browser console** - F12 → Console tab
3. **Check terminal output** - Look for error messages
4. **Check .next folder** - Does it exist and have files?
5. **Check disk space** - Do you have enough space?
6. **Check Node version** - `node --version` (need 16+)

---

## SUMMARY

**The Fix:**
1. Stop the dev server (Ctrl+C)
2. Delete `.next` folder
3. Run `npm run build`
4. Run `npm run dev`
5. Refresh browser (Ctrl+F5)
6. Check no 404 errors

**Time to Fix:** 2-5 minutes

**Success Indicator:** Page loads without 404 errors in Console/Network tabs

---

*Last Updated: August 12, 2026*
*For: Windows Development Environment*
