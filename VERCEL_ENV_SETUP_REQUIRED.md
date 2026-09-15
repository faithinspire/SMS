# ⚠️ VERCEL ENVIRONMENT SETUP REQUIRED

## Issue
Teacher registration auth endpoint is getting "User not allowed" error because the service role key is missing from Vercel environment variables.

## Solution: Add to Vercel

Go to Vercel Dashboard → Settings → Environment Variables and add:

### Required:
- **SUPABASE_SERVICE_KEY** = Your Supabase Service Role Key
  - Get from: Supabase Dashboard → Project Settings → API Keys → "service_role" key

## How to Get Service Role Key

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Click **Settings** → **API**
4. Copy the **"service_role"** secret key (⚠️ KEEP THIS SECRET!)
5. Go to Vercel Dashboard
6. Select your project (SMS)
7. Settings → Environment Variables
8. Add new variable:
   - Name: `SUPABASE_SERVICE_KEY`
   - Value: (paste the key)
   - Select: Production, Preview, Development
9. Click "Save"
10. Re-deploy on Vercel (or push new commit to trigger auto-deploy)

## Test After Deployment
1. Hard refresh browser: `Ctrl+Shift+R`
2. Try teacher registration again
3. Should proceed past Step 4 without "User not allowed" error

## Status
- ✅ Code fix applied: `src/app/api/auth/register/route.ts` now uses service role key
- ⏳ Waiting for: SUPABASE_SERVICE_KEY to be added to Vercel env vars
