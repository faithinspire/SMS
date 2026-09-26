# 🔑 VERCEL ENVIRONMENT VARIABLES - REQUIRED

**Error:** `Missing Supabase credentials`

**Cause:** `SUPABASE_SERVICE_ROLE_KEY` environment variable not set in Vercel

---

## Solution: Add to Vercel

### Step 1: Get Your Supabase Service Role Key

1. Go to: https://app.supabase.com
2. Login to your project
3. Go to **Settings** → **API**
4. Under "Project API keys", find the **"Service role" key** (secret key)
5. Click the **copy icon** to copy it

---

### Step 2: Add to Vercel Environment Variables

1. Go to: https://vercel.com/dashboard
2. Click your **SMS project**
3. Go to **Settings** (tab at top)
4. Click **Environment Variables** (left sidebar)
5. Click **Add New** button
6. Fill in:
   - **Name:** `SUPABASE_SERVICE_ROLE_KEY`
   - **Value:** Paste the key you copied from Supabase
   - **Environments:** Check all (Production, Preview, Development)
7. Click **Save**

---

### Step 3: Redeploy

1. Go back to **Deployments** tab
2. Find the latest failed deployment
3. Click the **three dots menu** (•••)
4. Click **Redeploy**

---

## Verify It's Working

After redeployment:
1. Open dashboard: https://sms-gold-eta.vercel.app/school-admin/dashboard
2. Check browser console (F12)
3. Should see `[Dashboard] API Response: {staffCount: X, studentCount: Y}`
4. Staff and students should appear on the page

---

## If Still Not Working

Check that you copied the **SERVICE ROLE key**, not the ANON key:
- ✅ **Correct key starts with:** `eyJhbGciOiJIUzI1NiIsInR5cCI...` (long string, ~200+ chars)
- ❌ **Wrong key location:** "Anon public" key (shorter, only for frontend)

Make sure you got the SERVICE ROLE key (secret key, for backend only).

---

## Quick Summary

| Step | Action |
|------|--------|
| 1 | Copy Supabase Service Role Key from Settings → API |
| 2 | Add to Vercel: Settings → Environment Variables |
| 3 | Name: `SUPABASE_SERVICE_ROLE_KEY` |
| 4 | Value: Paste the key |
| 5 | Save → Redeploy |

That's it! Dashboard will work after redeployment. ✅
