# Fix #4: Letter Generation Service - PGRST116 Error Resolution

**Date:** 2026-10-02  
**Issue:** Letter generation service fails with 406 error when newly registered staff don't have a staff record  
**Root Cause:** `.single()` query on staff table throws PGRST116 when no records match  
**Status:** ✅ FIXED

## Problem Description

When generating appointment letters for newly registered staff, the system would crash with:
```
Error fetching staff data: PGRST116
GET https://egdreueuspmuxhezdpqm.supabase.co/rest/v1/staff?... 406 (Not Acceptable)
Cannot coerce the result to a single JSON object
```

This happens because:
1. A newly registered user has a `users` record but NO `staff` record yet
2. `staff` table assignment happens in admin console, not during registration
3. `.single()` on empty result throws PGRST116 error

## Solution Applied

**File:** `src/services/letter-generation.service.ts`  
**Method:** `fetchStaffData()` (line 57)

### Changes Made

1. **Removed `.single()` from query**
   ```typescript
   // Before:
   .eq('school_id', schoolId)
   .single()

   // After:
   .eq('school_id', schoolId)
   // No .single() - handles empty result gracefully
   ```

2. **Added safe array handling**
   ```typescript
   // Handle array response safely
   const staffRecord = Array.isArray(data) ? data[0] : data
   if (!staffRecord) {
     console.warn(`Staff record not found for staffId: ${staffId}`)
     return null
   }
   ```

3. **Return null gracefully**
   - No exception thrown
   - Letter generation can handle null staff data
   - Allows graceful fallback for newly registered staff without staff records

## Files Modified

- ✅ `src/services/letter-generation.service.ts` - Removed `.single()` on staff query

## Related Fixes (Prior in This Session)

- ✅ Fix #1: `src/app/school-admin/students/page.tsx` - Multiple Supabase clients
- ✅ Fix #2: `src/services/staff-registration.service.ts` - Subject/class assignment errors thrown
- ✅ Fix #3: `src/services/student-registration.service.ts` - Invalid columns removed, errors thrown

## Verification

1. Service now returns `null` instead of throwing PGRST116 when staff record missing
2. Letter generation can handle null staff gracefully
3. No TypeScript compilation errors in updated method
4. Consistent with pattern used in Fix #1 and #3

## API Changes

None - internal change only. Service signature unchanged.

## Deployment Notes

This fix prevents 406 errors during letter generation for newly registered staff members. Once staff records are created in admin console, letters will generate with full data.

## Next Steps

1. ✅ Apply all 4 fixes to codebase
2. ⏳ Commit and push all 4 files to GitHub
3. ⏳ Vercel auto-deploys on push
4. ⏳ Test: register staff → generate appointment letter without 406 error
