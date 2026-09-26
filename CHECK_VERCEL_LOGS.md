# 🔍 Check Vercel Logs for Environment Variables

**Status:** Deployed with detailed logging

After Vercel finishes rebuilding (2-3 minutes), check the Vercel logs to see if the environment variables are being read.

---

## How to Check Vercel Logs

### Method 1: Vercel Dashboard (Easiest)

1. Go to: https://vercel.com/dashboard
2. Click your **SMS project**
3. Click **Deployments** tab
4. Click the **latest deployment** (should say "Building..." or "Ready")
5. Click **Functions** tab
6. Click `/api/admin/dashboard-data`
7. Look for logs like:

```
[API] Environment check: {
  urlExists: true,
  urlLength: 27,
  keyExists: true,    ← This should be TRUE
  keyLength: 234
}
```

### Method 2: Terminal (If you have Vercel CLI)

```bash
vercel logs --follow
```

Then refresh the dashboard page to trigger the API call.

---

## What to Look For

**If keyExists = true:**
- Environment variable is set ✅
- If still failing, it's a Supabase connection issue
- Check if the key is CORRECT (not malformed)

**If keyExists = false:**
- Environment variable is NOT being read
- Check Vercel Settings → Environment Variables
- Verify the name is exactly `SUPABASE_SERVICE_ROLE_KEY`
- Redeploy after adding/updating

**If you see error logs:**
- Send me the exact error message from the logs
- Include which step failed (URL check, key check, Supabase query)

---

## Next Steps

1. **Wait for Vercel to rebuild** (check Deployments tab)
2. **Open dashboard:** https://sms-gold-eta.vercel.app/school-admin/dashboard
3. **Check Vercel Function Logs** (link above)
4. **Send me the log output** if still not working

This will tell us exactly what's happening. ✅
