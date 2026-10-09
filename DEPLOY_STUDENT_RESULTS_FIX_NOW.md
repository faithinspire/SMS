# 🚀 Deploy Student Results Fix to Vercel - MANUAL STEPS

## What Changed
Fixed the Student Results page error: "406 Not Acceptable" / "Cannot coerce result"

**File Modified:** `src/app/student/results/page.tsx`

## Deploy Steps (Execute in Terminal)

### Step 1: Configure Git (First Time Only)
```bash
cd c:\Users\OLU\Desktop\SMS
git config user.name "Kiro Deploy"
git config user.email "deploy@kiro.local"
```

### Step 2: Stage the Changed File
```bash
git add src/app/student/results/page.tsx
```

### Step 3: Commit with Message
```bash
git commit -m "fix: Handle missing school_id and remove .single() from student results query

- Replace .single() with .limit(10) to avoid 406 errors when student record not found
- Add fallback logic to find school_id from student record if not in auth metadata
- Add detailed logging for debugging student record lookups
- Improve error messages with actionable feedback
- Fix loading state in all error paths

This resolves the '406 Not Acceptable' and 'Cannot coerce result to single JSON' errors
students were seeing when trying to view results."
```

### Step 4: Push to GitHub
```bash
git push origin main
```

### Step 5: Wait for Vercel Deployment
- Check: https://vercel.com/dashboard/projects/sms-gold-eta
- Wait for build to complete (3-5 minutes)
- Status will change: Building → Success ✅

## Verify Deployment Success

### 1. Check GitHub
https://github.com/faithinspire/SMS/commits/main
- Should show new commit with message starting with "fix: Handle missing school_id"

### 2. Check Vercel
https://vercel.com/dashboard/projects/sms-gold-eta
- Deployments tab
- Latest deployment should show Success (green checkmark)
- Build took ~3-5 minutes

### 3. Test the Fix in Production
1. Visit: https://sms-gold-eta.vercel.app
2. Log in as a student
3. Go to Student Results page
4. Open browser console (F12 → Console)
5. Look for: `[StudentResults] Student records found: 1` ✅
6. Select a term from dropdown
7. Results should display without errors ✅

## Expected Results After Deployment

### Before Fix:
❌ 406 error
❌ "Cannot coerce result to single JSON object"
❌ Student record not found message

### After Fix:
✅ No 406 errors
✅ Console shows: "Student records found: 1"
✅ Student record found successfully
✅ Results display correctly
✅ Dropdowns work without errors

## Troubleshooting

### Build Failed?
- Check Vercel logs for error message
- Most common: dependency issue
- Solution: Check `package.json` hasn't changed

### Still Seeing Old Error?
- Hard refresh browser: Ctrl+F5
- Clear browser cache
- Wait 5 minutes for Vercel cache to update

### Can't Push to GitHub?
- Verify git is installed: `git --version`
- Check remote: `git remote -v` (should show origin → GitHub)
- Try: `git push origin main --verbose` (shows detailed output)

## Alternative: Manual Git Commands

If copy-paste fails, run these one at a time:

```bash
cd c:\Users\OLU\Desktop\SMS
git status
# Should show: modified: src/app/student/results/page.tsx

git add src/app/student/results/page.tsx
git status
# Should show: Changes to be committed: src/app/student/results/page.tsx

git commit -m "fix: Student results query - remove .single() and add school_id fallback"
git status
# Should show: Your branch is ahead of 'origin/main' by 1 commit

git push origin main
# Should show: deployment notifications from GitHub/Vercel
```

## Timeline

```
YOUR ACTIONS                    SYSTEM ACTIONS              TIME
────────────────────────────────────────────────────────────
Run git push
    ↓
    ├─ Git sends to GitHub
    └─ GitHub sends webhook to Vercel      +5 sec

                                Vercel receives push      +10 sec
                                Build starts              +15 sec
                                
                                Building...               +1-3 min
                                
                                Build completes           +3-5 min
                                
                                Deployed to production    +5-7 min
                                ✅ https://sms-gold-eta.vercel.app

Test in browser                 Pages loading fixed       +7 min
```

## Success Checklist

- [ ] Git configured with user name/email
- [ ] Changes staged: `git add src/app/student/results/page.tsx`
- [ ] Committed: `git commit -m "..."`
- [ ] Pushed: `git push origin main`
- [ ] GitHub shows new commit
- [ ] Vercel shows new deployment
- [ ] Vercel deployment succeeded (green)
- [ ] Tested in browser: Student Results page works
- [ ] Console shows no errors
- [ ] Student records display correctly

## Done! ✅

Once deployment completes and you verify it works:
1. Notify your team
2. Monitor for any issues
3. Consider testing with real students
4. Update release notes

---

**Status:** Ready to deploy  
**Risk:** LOW (only improves error handling)  
**Rollback:** Easy (previous version still on GitHub if needed)

Execute the 5 steps above in your terminal to deploy! 🚀
