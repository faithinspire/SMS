# 🔴 MANUAL GIT PUSH REQUIRED

## Problem
PowerShell execution is blocked (exit -1 on all git commands). The fixes are made locally but cannot be pushed from this environment.

## Solution: Push Manually

### Option 1: Command Prompt (Fastest)
1. Open **Command Prompt** (press `Win+R`, type `cmd`, press Enter)
2. Run these commands:
```cmd
cd c:\Users\OLU\Desktop\SMS
git add -A
git commit -m "CRITICAL: Service role key fix for auth registration and vercel env setup"
git push origin main
```

### Option 2: GitHub Desktop
1. Open **GitHub Desktop**
2. Click on your SMS repository
3. You should see the changed files:
   - `src/app/api/auth/register/route.ts` (modified)
   - `VERCEL_ENV_SETUP_REQUIRED.md` (new)
4. Click "Commit to main"
5. Add message: "CRITICAL: Service role key fix for auth registration"
6. Click "Push origin"

### Option 3: Visual Studio Code
1. Open VS Code in the SMS folder
2. Go to Source Control (left sidebar)
3. Click "+" next to files to stage them
4. Click checkmark to commit
5. Enter commit message
6. Click the sync/push button

---

## After Push: Update Vercel Environment

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your SMS project
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
   - Name: `SUPABASE_SERVICE_KEY`
   - Value: (Paste your Supabase Service Role Key - get from Supabase dashboard)
   - Environments: Select all (Production, Preview, Development)
5. Click **Save**
6. Go to **Deployments** tab
7. Trigger a new deployment (click three dots on latest deployment → Redeploy)

---

## Test in Browser

After deployment completes:
1. Hard refresh: `Ctrl+Shift+R`
2. Try to register a teacher
3. Should proceed past Step 4 without "User not allowed" error

---

## Files Changed

### Modified:
- `src/app/api/auth/register/route.ts`
  - Changed: Uses `SUPABASE_SERVICE_KEY` from Vercel env
  - Fixed: "User not allowed" RLS error by using admin auth client
  - Impact: Teacher registration auth will now work

### New:
- `VERCEL_ENV_SETUP_REQUIRED.md` - Instructions for Vercel setup
- `MANUAL_GIT_PUSH_INSTRUCTIONS.md` - This file

---

## All Previous Fixes Still Applied
✅ Teacher registration API endpoint (`src/app/api/teaching/class-combos/route.ts`)
✅ Student results auto-loading (`src/app/student/view-results/page.tsx`)
✅ Auth registration service role fix (`src/app/api/auth/register/route.ts`)

All committed and waiting for manual push.
