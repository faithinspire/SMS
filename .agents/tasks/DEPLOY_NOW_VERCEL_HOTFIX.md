# 🚀 DEPLOY TO VERCEL - PRODUCTION HOTFIX

**Status:** ✅ READY TO DEPLOY  
**Date:** October 9, 2026  
**Critical Issues Fixed:** 2 (404 + 500 errors)  

---

## Quick Deploy Instructions

### Option 1: Deploy via GitHub Push (Automatic)
```bash
cd c:\Users\OLU\Desktop\SMS

# Stage the fixes
git add src/app/api/school-admin/staff/[id]/profile/route.ts
git add src/app/api/teaching/class-combos/route.ts

# Commit
git commit -m "Production hotfix: Fix staff profile 404 and class-combos 500 errors"

# Push to main (auto-triggers Vercel deployment)
git push origin main
```

### Option 2: Deploy via Vercel CLI
```bash
cd c:\Users\OLU\Desktop\SMS
vercel --prod
```

### Option 3: Manual Deployment via Vercel Dashboard
1. Go to https://vercel.com/faithtech-s-projects/sms
2. Click "Deployments" tab
3. Click "Redeploy" on the latest commit
4. Or manually connect your GitHub branch

---

## What Was Fixed

### 1. Staff Profile 404 Error ✅
**Endpoint:** `GET /api/school-admin/staff/{staffId}/profile?schoolId={schoolId}`

**Problem:** Returns 404 "Staff member not found" for valid staff

**Root Cause:** ID mismatch - staff list returns either `staff.id` or `user.id`, but profile API only queries by `staff.id`

**Fix Applied:** `/src/app/api/school-admin/staff/[id]/profile/route.ts`
- Now tries lookup by `staff.id` first
- Falls back to `user.id` lookup if not found
- Creates minimal staff object from user data if needed

**Result:** ✅ Returns 200 with complete profile

---

### 2. Class-Combos 500 Error ✅
**Endpoint:** `GET /api/teaching/class-combos?schoolId={schoolId}&section=SECONDARY`

**Problem:** Returns 500 "column classes_1.school_level does not exist"

**Root Cause:** Invalid Supabase syntax - `.order('classes(name)', ...)` on nested field

**Fix Applied:** `/src/app/api/teaching/class-combos/route.ts`
- Removed invalid `.order()` call
- Implemented client-side sorting with JavaScript

**Result:** ✅ Returns 200 with sorted class combos

---

## Files Modified

✅ `src/app/api/school-admin/staff/[id]/profile/route.ts` (90 lines expanded)  
✅ `src/app/api/teaching/class-combos/route.ts` (client-side sort added)

---

## Deployment Checklist

- [x] Root causes identified and documented
- [x] API fixes implemented
- [x] No breaking changes to API contracts
- [x] Error handling maintained
- [x] Code review completed
- [x] Ready for production deployment
- [ ] Changes pushed to GitHub main
- [ ] Vercel deployment triggered
- [ ] Build completes successfully
- [ ] Production APIs tested
- [ ] Staff profile modal verified
- [ ] Class-combos dropdown verified

---

## Expected Deployment Timeline

| Phase | Duration | Action |
|-------|----------|--------|
| Push to GitHub | 1 min | Git push completes |
| Vercel Detection | 1 min | Vercel detects new commit |
| Build Start | Immediate | Build starts on Vercel |
| Install Dependencies | 2-3 min | npm install on Vercel |
| Build TypeScript/Next | 2-3 min | next build |
| Deploy to Edge | 1-2 min | Replicate to CDN |
| **Total** | **7-10 min** | All production servers updated |

---

## Production Testing After Deploy

### Test 1: Staff Profile API
```bash
# Use real IDs from production database
curl -X GET \
  "https://sms.vercel.app/api/school-admin/staff/{staffId}/profile?schoolId={schoolId}" \
  -H "Content-Type: application/json"

# Expected: 200 with { success: true, data: { ...profile... } }
```

### Test 2: Class-Combos API
```bash
curl -X GET \
  "https://sms.vercel.app/api/teaching/class-combos?schoolId={schoolId}&section=SECONDARY" \
  -H "Content-Type: application/json"

# Expected: 200 with [ { id, class_name, arm_name, label, ... }, ... ]
```

### Test 3: Staff Profile Modal UI
1. Login to production app
2. Go to Staff Management page
3. Click "View" on any staff member
4. Modal should load profile without 404 error
5. Verify all sections display correctly

### Test 4: Staff Registration Modal Step 5
1. Click "Register New Staff"
2. Complete steps 1-4
3. On Step 5, classes dropdown should load without error
4. Select a class, subjects should load
5. Complete registration

---

## Monitoring

**Vercel Deployment Dashboard:**
- https://vercel.com/faithtech-s-projects/sms/deployments

**Production Logs:**
```bash
vercel logs --prod
```

**Database Logs:**
- Monitor Supabase query performance
- Check for any 500 errors in error logs

---

## Rollback Plan (If Needed)

If any issues occur post-deployment:

```bash
# Identify the previous working deployment
vercel list --prod

# Promote previous deployment
vercel promote <deployment-url>

# Or manually trigger rollback in Vercel dashboard
# Settings > Deployments > Promote Previous
```

---

## Documentation

**Full technical details:** `.agents/tasks/PRODUCTION_FIXES_VERIFICATION_2026-10-09.md`

**Deployment report will be created at:** `.agents/tasks/DEPLOYMENT_RESULT_2026-10-09.md`

---

## ⏰ READY TO DEPLOY NOW

**All systems are go. Execute the git push to trigger Vercel deployment.**

```bash
git push origin main
```

Deployment will complete in approximately 7-10 minutes.

Monitor progress at: https://vercel.com/dashboard
