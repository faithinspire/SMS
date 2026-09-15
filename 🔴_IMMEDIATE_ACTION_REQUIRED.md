# 🔴 IMMEDIATE ACTION REQUIRED - 3 STEPS TO FIX

## Current Status
✅ All code fixes are complete and saved locally
❌ Cannot push from this environment (PowerShell wrapper blocking)
❌ Vercel env variables not set (SUPABASE_SERVICE_KEY missing)

---

## STEP 1: Push Code Changes to GitHub
**Time: 2 minutes**

Open **Command Prompt** and run:
```cmd
cd c:\Users\OLU\Desktop\SMS
git add -A
git commit -m "CRITICAL: Service role key fix and vercel setup"
git push origin main
```

✅ This will:
- Push the service role key fix to GitHub
- Trigger Vercel auto-deployment

---

## STEP 2: Add Environment Variable to Vercel
**Time: 3 minutes**

1. Go to: https://vercel.com/dashboard/sms
2. Click **Settings** → **Environment Variables**
3. Click **Add New**
4. Fill in:
   - **Name**: `SUPABASE_SERVICE_KEY`
   - **Value**: (Get from Supabase dashboard below)
   - **Environments**: Check all boxes (Production, Preview, Development)
5. Click **Save**

### How to Get SUPABASE_SERVICE_KEY:
1. Go to: https://app.supabase.com
2. Select your project
3. Click **Settings** → **API**
4. Copy the **"service_role"** key (under "secret")
5. Paste it into Vercel (Step 2 above)

---

## STEP 3: Redeploy & Test
**Time: 5 minutes**

1. Go to Vercel Dashboard → **Deployments**
2. Find the latest deployment (should say "Building" or "Preparing")
3. Wait for it to complete (green checkmark)
4. Open your SMS website
5. Hard refresh: `Ctrl+Shift+R`
6. Try to register a teacher
7. Should pass Step 4 without "User not allowed" error

---

## Why These Steps Fix the Issue

**Error**: "Registration failed: Auth error: User not allowed"
**Root Cause**: Supabase RLS policies prevent anon key from creating auth users

**Solution**: Use admin/service role key which bypasses RLS
- Code fix: `src/app/api/auth/register/route.ts` now uses `process.env.SUPABASE_SERVICE_KEY`
- Env fix: Must add `SUPABASE_SERVICE_KEY` to Vercel so it's available at runtime

---

## All Fixes Summary

| Issue | File | Status |
|-------|------|--------|
| Teacher registration SQL error | `src/app/api/teaching/class-combos/route.ts` | ✅ Fixed |
| Student results not auto-loading | `src/app/student/view-results/page.tsx` | ✅ Fixed |
| Auth "User not allowed" error | `src/app/api/auth/register/route.ts` | ✅ Fixed (waiting for push) |
| Service key not available | Vercel env vars | ⏳ Needs manual setup |

---

## Do NOT Skip Any Step

Each step depends on the previous one:
1. Without push → changes won't deploy to Vercel
2. Without env var → service key won't be available to code
3. Without redeploy → old version still running
4. Without test → won't know if fix worked

---

**⏱️ Total time: 10 minutes**
**📍 Current blocker: PowerShell execution limitation (cannot run git from this interface)**
