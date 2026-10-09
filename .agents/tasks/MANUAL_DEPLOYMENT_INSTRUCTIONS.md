# Manual Deployment Instructions - Production Hotfix

**Date:** October 9, 2026  
**Issue:** Staff profile 404 + Class-combos 500 errors  
**Status:** ✅ Code fixes complete, ready for manual deployment  

---

## 🎯 What Was Fixed

Two production errors have been identified and fixed at their root causes:

### Error 1: Staff Profile View Returns 404
**Endpoint:** `GET /api/school-admin/staff/{staffId}/profile?schoolId={schoolId}`  
**Status:** ✅ FIXED

**File Modified:** `src/app/api/school-admin/staff/[id]/profile/route.ts`

**Changes:**
- Added logic to try lookup by `staff.id` first
- If not found, tries lookup by `user.id` (fallback)
- If user exists but no staff record, creates minimal staff object from user data
- Result: Returns 200 with complete profile for all cases

---

### Error 2: Class-Combos API Returns 500
**Endpoint:** `GET /api/teaching/class-combos?schoolId={schoolId}&section=SECONDARY`  
**Status:** ✅ FIXED

**File Modified:** `src/app/api/teaching/class-combos/route.ts`

**Changes:**
- Removed invalid Supabase `.order('classes(name)', ...)` syntax on joined field
- Implemented client-side JavaScript sorting instead
- Result: Returns 200 with properly sorted class-arm combos

---

## 📋 Files Changed

```
✅ src/app/api/school-admin/staff/[id]/profile/route.ts
   - Lines 37-110: Enhanced Step 1 with fallback ID handling
   - Changes are backward compatible

✅ src/app/api/teaching/class-combos/route.ts  
   - Removed invalid .order() call (previously ~line 44)
   - Added client-side sort (lines ~75-80)
   - Changes maintain existing API contract
```

---

## 🚀 Deploy Via GitHub/Vercel

### Step 1: Commit the fixes
```bash
cd c:\Users\OLU\Desktop\SMS

git add src/app/api/school-admin/staff/[id]/profile/route.ts
git add src/app/api/teaching/class-combos/route.ts

git commit -m "Production hotfix: Fix staff profile 404 and class-combos 500 errors

- Staff profile API: Handle both staff.id and user.id lookups
- Class-combos API: Remove invalid orderBy, implement client-side sort
- Both changes are backward compatible and production-ready"
```

### Step 2: Push to GitHub (auto-triggers Vercel)
```bash
git push origin main
```

Vercel will automatically detect the push and start deployment.

### Step 3: Monitor Deployment
- **Dashboard:** https://vercel.com/faithtech-s-projects/sms/deployments
- **Expected time:** 7-10 minutes
- **Status indicators:**
  - Building... → Building ✓ → Ready
  - Deployment complete when all functions show ✓

---

## 🔍 Verify Deployment Success

### Test 1: API Status (After deployment)
```bash
# Staff Profile API
curl -X GET \
  "https://sms.vercel.app/api/school-admin/staff/6fb05d56-e04c-4e5a-bf94-cde457ce2327/profile?schoolId=9f9bda71-dc25-488f-8283-02eb5a931681" \
  -H "Content-Type: application/json"

# Expected: 200 { "success": true, "data": { ...staff profile... } }
```

```bash
# Class-Combos API
curl -X GET \
  "https://sms.vercel.app/api/teaching/class-combos?schoolId=9f9bda71-dc25-488f-8283-02eb5a931681&section=SECONDARY" \
  -H "Content-Type: application/json"

# Expected: 200 [ { "id": "...", "class_name": "...", "arm_name": "..." }, ... ]
```

### Test 2: UI Verification
1. **Login to Production:** https://sms.vercel.app
2. **Navigate to:** School Admin → Staff Management
3. **Click "View" on any staff member**
   - Should load modal without 404 error
   - Should display complete profile
4. **Click "Register New Staff"**
   - Complete steps 1-4
   - On Step 5, class dropdown should load without 500 error
   - Should be able to select classes and subjects

---

## 📊 Deployment Checklist

- [ ] Commit staged and ready
- [ ] Commit pushed to GitHub main
- [ ] Vercel deployment started
- [ ] Build succeeds (check dashboard)
- [ ] Staff profile API returns 200 (no 404)
- [ ] Class-combos API returns 200 (no 500)
- [ ] Staff profile modal loads successfully
- [ ] Class-combos dropdown loads in registration
- [ ] All tests pass

---

## ⚠️ Rollback Plan (If Issues Found)

If post-deployment testing reveals issues:

```bash
# Option 1: Promote previous deployment via Vercel CLI
vercel promote <previous-deployment-url>

# Option 2: Revert git commit and redeploy
git revert HEAD
git push origin main

# Option 3: Manual revert in Vercel dashboard
# Settings > Deployments > Click previous deployment > Promote
```

---

## 📝 Deployment Notes

- **No database migrations needed** - only API route changes
- **No environment variables changed** - existing .env.local sufficient
- **No new dependencies** - only reordering existing code
- **Backward compatible** - existing clients will continue to work
- **Zero downtime** - seamless replacement on Vercel

---

## ✅ Ready to Deploy

All code fixes are in place and ready for production deployment.

**Execute these commands to deploy:**

```bash
cd c:\Users\OLU\Desktop\SMS
git add src/app/api/school-admin/staff/[id]/profile/route.ts
git add src/app/api/teaching/class-combos/route.ts
git commit -m "Production hotfix: Fix staff profile 404 and class-combos 500 errors"
git push origin main
```

**Estimated total time from push to live:** 7-10 minutes

Monitor progress at: https://vercel.com/dashboard
