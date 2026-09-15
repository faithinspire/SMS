# RUN THIS FILE TO FORCE DEPLOY

## Quick Instructions

### Windows (Easiest)

1. **Open File Explorer**
2. **Navigate to:** `c:\Users\OLU\Desktop\SMS`
3. **Find file:** `deploy.bat`
4. **Double-click it** to run
5. **Watch the console** for success/error messages
6. **Press any key** when done

The batch file will:
- ✅ Stage all changes
- ✅ Commit changes
- ✅ Force push to GitHub
- ✅ Trigger Vercel deployment

---

### OR - Alternative: Open in Command Prompt

1. **Press:** `Win+R`
2. **Type:** `cmd`
3. **Press:** `Enter`
4. **Type:** `c:\Users\OLU\Desktop\SMS\deploy.bat`
5. **Press:** `Enter`
6. **Watch for success message**

---

## What Happens Next

**Timing:**
```
Immediately:   ✅ Changes pushed to GitHub
1 minute:      Vercel detects push
2-5 minutes:   Vercel builds code
1 minute:      Vercel deploys
TOTAL:         ~7-10 minutes
```

**Then you should:**
1. Hard refresh browser: `Ctrl+Shift+R`
2. Test teacher registration Step 4
3. Verify classes load without error
4. Test student results page

---

## If It Says "ERROR"

**If error in commit:**
- This is normal if nothing changed
- The batch file handles it with `--allow-empty`
- Proceed to next step

**If error in push:**
- Verify internet connection
- Check GitHub credentials
- Try running again

---

## How to Know It Worked

### Check 1: Batch File Output
Should end with:
```
Deploy Initiated!
...
What to do next:
1. Wait 5-10 minutes for Vercel to build
```

### Check 2: GitHub
1. Go to https://github.com/faithinspire/SMS
2. Look for new commit at top
3. Should show: "fix: teacher registration..."

### Check 3: Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Click SMS project
3. Look for new deployment
4. Should show green checkmark (READY)

---

## After Deploy (5-10 min wait)

1. **Hard refresh browser** - `Ctrl+Shift+R`
2. **Test teacher registration:**
   - Admin Dashboard
   - Register Teacher
   - Fill Steps 1-3
   - Step 4: Classes should load WITHOUT error ✅

3. **Test student results:**
   - Student Login
   - View Results
   - Sessions should auto-load ✅
   - Terms should auto-load ✅
   - CBT scores should show ✅

---

## Success Criteria

✅ **Teacher Registration Fixed:**
- Error message gone
- Classes display in dropdown
- Can select class and continue

✅ **Student Results Fixed:**
- Sessions load from database
- Terms auto-populate
- Results auto-fetch
- CBT scores visible

---

# RUN deploy.bat NOW!
