# 🚀 Vercel Deployment Checklist

**Goal**: Deploy fixed build to Vercel (all 14+ features preserved, zero build errors)

**Current Status**: ✅ All code fixes applied locally

---

## ❌ Current Blocker: Git & Shell Frozen

PowerShell and `cmd` appear to hang on all commands. **You must open a NEW terminal window** to proceed.

### Solution: Fresh Terminal
1. **Windows**: Press `Win + R` → type `cmd` → press Enter (new Command Prompt window)
2. OR: Open PowerShell (new window, NOT the current one)
3. Navigate: `cd C:\Users\OLU\Desktop\SMS`
4. Proceed with checklist below

---

## ✅ Phase 1: Local Verification (5-10 min)

### Step 1: Clean Build
```bash
# In fresh terminal, in SMS directory:
rm -r .next/
npm run build
```

**Expected**: Build completes with **ZERO fatal errors**
- ✅ SUCCESS: `compiled client and server successfully` message
- ✅ OK: Metadata warnings (hundreds) — non-fatal
- ❌ FAIL: Any `useSearchParams()` errors → abort

**If FAIL**: Report full error output

### Step 2: Start Dev Server
```bash
npm run start
```

**Expected**: Server starts on `http://localhost:3000`

### Step 3: Test 3 Critical Routes

In browser, visit each:

1. **Account Locked Page** (no auth needed):
   ```
   http://localhost:3000/student/account-locked?reason=Testing
   ```
   - ✅ Shows: Account locked UI with lock emoji
   - ❌ Shows: Error → abort

2. **Teacher Results** (requires auth, or shows redirect):
   ```
   http://localhost:3000/teacher/results/test-student-id
   ```
   - ✅ Shows: Loading spinner or redirect to login
   - ❌ Shows: Error → abort

3. **CBT Results** (requires auth):
   ```
   http://localhost:3000/student/cbt/test-exam-id/results?submission=test-id
   ```
   - ✅ Shows: Loading spinner or redirect to login
   - ❌ Shows: Error → abort

### Step 4: Verify Features Still Work

Quick sanity checks:
- ✅ Can navigate between pages (no build errors in console)
- ✅ No red errors in browser DevTools Console
- ✅ API calls work (check Network tab for 200/400 responses, not 500)

**Stop dev server**: Press `Ctrl+C` in terminal

---

## ✅ Phase 2: Git Commit & Push (2-3 min)

### Step 5: Stage All Changes
```bash
git add .
```

**Expected**: No errors

### Step 6: Commit Changes
```bash
git commit -m "fix: Suspense boundaries for dynamic page rendering

- Wrap useSearchParams() in Suspense boundaries on 3 pages
- Remove invalid export const dynamic from client components
- Fix production build blocker: useSearchParams Suspense error
- Preserve all 14+ existing features (no deletions)
- Preserve all API routes and dashboards

Pages fixed:
- /student/account-locked
- /teacher/results/[studentId]
- /student/cbt/[id]/results

All features preserved:
- Student pause/unpause
- Staff management
- Results dashboards
- Academic management
- CBT portal
- All 14+ user roles
- Multi-tenancy
- Supabase integration"
```

**Expected**: Commit succeeds with message

### Step 7: Push to Main
```bash
git push origin main
```

**Expected**: 
- ✅ `Counting objects...` → `[new branch]` or similar
- ✅ Push completes
- ❌ `Permission denied` → check git credentials
- ❌ `Rejected` → pull first: `git pull origin main` then retry

---

## ✅ Phase 3: Verify Vercel Deployment (2-5 min)

### Step 8: Check Vercel Dashboard
1. Go to: https://vercel.com
2. Log in if needed
3. Find project: `SMS` or `faithinspire/SMS`
4. Click on it
5. Deployments tab
6. Look for your latest commit

### Step 9: Wait for Build
Vercel automatically starts building when you push.

**Building**:
- 🟡 Yellow status = Building (takes 2-5 min)
- Logs show: `npm run build`

**Success**:
- 🟢 Green status = `Ready`
- Can see: `Production` deployment live
- Can see: Commit message you pushed

**Failure**:
- 🔴 Red status = Failed
- Click to see logs
- Look for: Build error (report if not obvious)

### Step 10: Test Live Deployment
Once Vercel shows 🟢 `Ready`:

```
1. Go to your Vercel deployment URL (copy from Vercel dashboard)
   - OR: Your custom domain if configured

2. Test same 3 routes:
   - https://yoursite.vercel.app/student/account-locked?reason=Live
   - https://yoursite.vercel.app/teacher/results/test
   - https://yoursite.vercel.app/student/cbt/test/results?submission=test

3. All should work ✅
```

---

## 🎯 Expected Outcomes

### ✅ SUCCESS
- Vercel shows 🟢 **Ready** status
- `npm run build` completed locally with zero errors
- 3 test routes load without errors
- Can see all 14+ dashboards and features
- No "useSearchParams Suspense" errors anywhere

### ❌ FAILURE (What to Check)
1. **Build error in Vercel**: Check `VERCEL_BUILD_FIX_COMPLETE.md` for root cause
2. **Routes still fail**: Check browser console for specific errors
3. **Features missing**: Verify nothing was deleted (should all be in code)
4. **API errors**: Check API route responses (Supabase connectivity?)

---

## 📋 Quick Reference

| Phase | Action | Command | Time |
|-------|--------|---------|------|
| 1 | Clean build | `rm -r .next/ && npm run build` | 3-5 min |
| 1 | Start server | `npm run start` | immediate |
| 1 | Test routes | Browser visits | 2-3 min |
| 2 | Commit | `git add . && git commit` | 1 min |
| 2 | Push | `git push origin main` | 1-2 min |
| 3 | Verify | Check Vercel dashboard | 3-5 min |
| 3 | Test live | Visit deployment URL | 2-3 min |

**Total Time**: ~15-25 minutes

---

## 🆘 Troubleshooting

### "npm: command not found"
- Node.js not installed or PATH issue
- Install from: https://nodejs.org/
- Restart computer after install
- Reopen terminal

### "git: command not found"
- Git not installed
- Install from: https://git-scm.com/
- Restart terminal

### "Permission denied (publickey)"
- SSH keys not set up for GitHub
- Alternative: Use GitHub Desktop or git with HTTPS token
- Or: Set up SSH: https://github.com/settings/keys

### Build fails locally with "useSearchParams error"
- **Did you use the FIXED files?**
- Verify these 3 files exist and are complete:
  - `src/app/student/account-locked/page.tsx`
  - `src/app/teacher/results/[studentId]/page.tsx`
  - `src/app/student/cbt/[id]/results/page.tsx`
- Check for complete `<Suspense>` wrapper (not partial edits)

### Vercel build fails but local build succeeds
- Caches might differ
- Force Vercel rebuild:
  1. Vercel dashboard → Deployments
  2. Click latest deployment
  3. Menu → Redeploy
  4. Wait for build

---

## ✅ Done!

Once Vercel shows 🟢 **Ready**, your deployment is complete! 🎉

All features preserved, build errors fixed, ready for production.
