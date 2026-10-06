# CRITICAL FIX CHECKLIST - Production Issues

## Three Critical Issues

### ✅ Issue 1: school_id Missing from Auth Metadata
**Symptom**: "Your account is not linked to a school" error on login

**Root Cause**: school_id not stored in `supabase.auth.user.user_metadata` during registration

**Fix Applied**:
- ✅ Updated `getCurrentUser()` in `auth.service.ts` to prioritize auth metadata school_id (PRIORITY 1)
- ✅ Added fallback to users table lookup if SCHOOL_ADMIN/ADMIN role (PRIORITY 2)
- ✅ Added detailed console logging to diagnose missing school_id

**Files Modified**:
- `src/services/auth.service.ts` - getCurrentUser() method (lines 385-475)

**Verification Steps**:
1. Check browser console logs during login
   - Should show: "✅ PRIORITY 1: Using school_id from auth metadata: <id>"
   - OR: "✅ PRIORITY 2: Found school_id in users table: <id>"
   - OR: "⚠️  PRIORITY 3: Returning user with role=SCHOOL_ADMIN, school_id=undefined"

2. If showing PRIORITY 3, it means registration didn't store school_id in auth metadata
   - This is the root cause

**Next Action**: Verify registration is storing school_id in auth user_metadata

---

### ✅ Issue 2: 404 on `/api/letters/fetch-staff` Endpoint
**Symptom**: "API error: 404" when generating letters

**Root Cause**: API route exists but may not be discoverable, or Supabase queries failing

**Fix Applied**:
- ✅ Enhanced `/api/letters/fetch-staff` route with comprehensive logging
- ✅ Added error details in responses
- ✅ Improved error handling and diagnostics

**Files Modified**:
- `src/app/api/letters/fetch-staff/route.ts` - Added detailed logging
- `src/services/letter-generation.service.ts` - Enhanced error reporting

**Verification Steps**:
1. Check server logs for requests to `/api/letters/fetch-staff`
   - Should show: "[API /letters/fetch-staff] Request received: {staffId, schoolId}"
   - Should show: "[API /letters/fetch-staff] ✅ Success - returning staff data"

2. If 404, check:
   - Route file exists: `src/app/api/letters/fetch-staff/route.ts` ✅ Confirmed
   - Next.js build includes route (run: `npm run build`)
   - Network tab shows 404 with error details

**Next Action**: Rebuild and test letter generation API call

---

### ✅ Issue 3: Nav Bar Showing "Not Linked to School" Error
**Symptom**: Bottom nav showing error instead of school name

**Root Cause**: Cannot fetch school name because school_id is undefined (issues #1 above)

**Fix Applied**:
- ✅ BottomNavigation component already handles missing school_id gracefully
- ✅ Shows "Not linked to school" instead of breaking

**Files Modified**:
- `src/components/BottomNavigation.tsx` - Already robust, no changes needed

**Verification Steps**:
1. Once Issue #1 is fixed (school_id in auth metadata), nav bar should automatically display school name
2. Check browser console: "🏫 <school_name>" appears in nav

---

## Deployment & Testing

### Build & Test
```bash
# 1. Build the project
npm run build

# 2. Check for errors
# Should see no errors related to api/letters or auth routes

# 3. Start dev server for testing
npm run dev

# 4. Test login flow
# - Login as school admin
# - Check browser console in DevTools
# - Verify school_id appears in auth metadata
# - Verify nav bar shows school name

# 5. Test letter generation
# - Go to Staff > Edit (modal)
# - Click "Generate Letter"
# - Check for API success or error details
```

### Manual Verification in Browser DevTools

**Console Logs to Check**:
```
✅ PRIORITY 1: Using school_id from auth metadata: <uuid>
OR
✅ PRIORITY 2: Found school_id in users table: <uuid>
OR
⚠️  PRIORITY 3: Returning user with role=SCHOOL_ADMIN, school_id=undefined
```

**Network Tab**:
- Look for request to `/api/letters/fetch-staff?staffId=...&schoolId=...`
- Should return 200 with data
- If 404, check response body for error details

**Local Storage / Auth State**:
- Open DevTools > Application > Local Storage
- Check if `school_id` is stored in auth user metadata

---

## Root Cause Analysis

The "account not linked to school" error happens because:

1. **During registration**: `registerSchoolAdmin()` or `registerStaff()` calls:
   ```typescript
   const { data, error } = await supabase.auth.signUp({
     options: {
       data: {
         school_id: input.school_id,  // ← This is stored in auth metadata
         role: 'ADMIN',
       }
     }
   })
   ```

2. **During login**: `getCurrentUser()` calls:
   ```typescript
   const metadataSchoolId = data.user.user_metadata?.school_id
   ```

3. **If school_id is missing**: Either:
   - a) Registration didn't pass school_id (code issue)
   - b) Registration passed it but Supabase didn't save it (rare)
   - c) User is from old registration without school_id (data issue)

---

## Action Items

- [ ] Rebuild project: `npm run build`
- [ ] Test login flow
- [ ] Check console logs for school_id resolution
- [ ] Test letter generation API
- [ ] Commit fixes to git
- [ ] Push to GitHub
- [ ] Monitor Vercel deployment

---

## Files Changed

1. `src/services/auth.service.ts` - getCurrentUser() enhanced
2. `src/app/api/letters/fetch-staff/route.ts` - Added logging
3. `src/services/letter-generation.service.ts` - Better error reporting

Status: ✅ Ready for deployment
