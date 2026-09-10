# 🔍 Diagnostic Steps - Debug Server Issue

## Current Status
- ✅ Dev server IS running on port **3001**
- ✅ Dev server shows "Ready in 16.7s"
- ⚠️ But pages still showing 404 errors from port 3000

## Root Cause Unknown - Let's Diagnose

### Step 1: Test the Server is Actually Responding

**Visit this simple test page:**
```
http://localhost:3001/teacher/test-page
```

### What You Should See
- A white page with "🧪 Test Page" heading
- Your current URL showing port 3001
- A green box with "Test Results"
- A button "Test API Connection"

### Step 2: Click the Test Button
Click **"Test API Connection"** button

You should see:
- ✅ **Success**: "✅ API Working! Response: ..."
- ❌ **Failure**: Red error message

## Possible Outcomes & Solutions

### Outcome A: Test Page LOADS & API Button Works
**This means:** Server is fine, issue is with class-scoresheet page logic
- Go to: `http://localhost:3001/teacher/class-scoresheet`
- Check browser console (F12) for errors
- You may need authentication first (go to login/landing page)

### Outcome B: Test Page LOADS but API Button FAILS
**This means:** Server is running but API calls are breaking
- Check what error message you see
- Common causes:
  - Supabase connection issue
  - Database problem
  - Authentication missing

### Outcome C: Test Page WON'T LOAD (404 Error)
**This means:** Server is NOT properly serving pages
- Stop the dev server (Ctrl+C)
- Run: `npm run build`
- Check for build errors
- Then start: `npm run dev` again

### Outcome D: Page Shows Different Error
**This means:** We need to see the actual error
- Open browser console: Press **F12**
- Go to **Console** tab
- Take a screenshot of any red errors
- Share the error message

---

## Manual Verification Steps

### Check 1: Can you access landing page?
```
http://localhost:3001/landing
```
- Does it load?
- Can you see login form?

### Check 2: Can you access dashboard?
```
http://localhost:3001/teacher/dashboard
```
- Does it load?
- Do you see "Class Score Sheet" button?

### Check 3: Direct health check
```
http://localhost:3001/api/health
```
- Should show JSON response
- If you see this, API is working

---

## Browser Console Debugging

Press **F12** while on the broken page to open:

1. Click **Console** tab
2. Look for red errors
3. Look for failed network requests (Network tab)
4. Take note of:
   - Any 404 errors (which URL?)
   - Any 500 errors (what endpoint?)
   - Any CORS errors
   - Any fetch failures

---

## Server Log Checking

The terminal where you ran `npm run dev` should show:

```
✓ Ready in 16.7s
```

After this, when you try to visit a page, you should see:
```
GET /teacher/test-page
GET /api/health
```

**If you don't see these lines appearing**, the server is not receiving requests.

---

## Next Steps

1. **Visit test page**: `http://localhost:3001/teacher/test-page`
2. **Report what you see**:
   - Does it load? Yes/No
   - Can you click button? Yes/No
   - What error do you see?
3. **Open console**: F12
4. **Share any red errors you see**

This will help us identify the exact problem!

---

## Quick Sanity Check

In your browser address bar, you should see:
```
http://localhost:3001/...
```

NOT:
```
http://localhost:3000/...
```

If you see 3000 anywhere, that's still the problem - hard refresh (Ctrl+Shift+R) and clear cookies again.

---

**Visit the test page now and tell me what you see!** 🚀
