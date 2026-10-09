# Fix: Student Results Page - "Student Record Not Found" Error

## Problem

When students navigated to the Student Results page, they saw this error:
```
GET https://egdreueuspmuxhezdpqm.supabase.co/rest/v1/students?... 406 (Not Acceptable)

[StudentResults] Error fetching student record: 
{code: 'PGRST116', details: 'The result contains 0 rows', message: 'Cannot coerce the result to a single JSON object'}
```

## Root Cause

The issue had TWO parts:

### 1. **`.single()` Method Error (406 Not Acceptable)**
The code used `.single()` which requires EXACTLY ONE row, but was finding 0 rows:
```typescript
// BEFORE (BROKEN):
const { data: studentRecord } = await supabase
  .from('students')
  .select('id')
  .eq('user_id', user.id)
  .eq('school_id', user.school_id)
  .single()  // ❌ Requires exactly 1 row, throws 406 if 0 rows found
```

When no student record exists, Supabase returns a 406 error with message "Cannot coerce the result to a single JSON object".

### 2. **Missing `school_id` in Auth**
For STUDENT users, the `school_id` was often `undefined` in the auth metadata because:
- It's only stored during student registration
- Not all registrations properly set it in auth metadata
- Students falling back to Priority 3 in `AuthService.getCurrentUser()` get `school_id: undefined`

When `user.school_id` is undefined, the query becomes:
```sql
SELECT * FROM students WHERE user_id = 'xyz' AND school_id = NULL
-- This returns 0 rows because school_id can't be null
```

## Solution

### Fixed the Query Logic:
```typescript
// AFTER (FIXED):
const { data: studentRecords, error: studentError } = await supabase
  .from('students')
  .select('id, user_id, school_id, admission_number')
  .eq('user_id', user.id)
  .eq('school_id', schoolId)
  .limit(10)  // ✅ Use limit instead of .single()

// Use first record if found
const studentRecord = studentRecords[0]
```

### Added Fallback for school_id:
```typescript
let schoolId = user.school_id

// If no school_id from auth, get it from student record
if (!schoolId) {
  const { data: studentLookup } = await supabase
    .from('students')
    .select('school_id')
    .eq('user_id', user.id)
    .limit(1)
  
  if (studentLookup?.length > 0) {
    schoolId = studentLookup[0].school_id
  }
}
```

### Enhanced Error Messages:
- Better diagnostic logging of query parameters
- Clear error message if school cannot be determined
- Actionable feedback to students

## Changes Made

**File:** `src/app/student/results/page.tsx`

**In `loadResult()` function:**
1. ✅ Removed `.single()` call (changed to `.limit(10)`)
2. ✅ Added fallback logic to find `school_id` from student record if not in auth
3. ✅ Added detailed console logging for debugging
4. ✅ Improved error messages
5. ✅ Added `setLoadingResult(false)` in error paths

## How to Verify the Fix

### Before Deploying:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for these new log messages:
   ```
   [StudentResults] User data: { user_id: '...', school_id: '...', role: 'STUDENT' }
   [StudentResults] Query params - user_id: '...' school_id: '...'
   [StudentResults] Student records found: 1
   ```

### After Fix Works:
- ✅ No more 406 errors
- ✅ No more "Cannot coerce" error
- ✅ Student record found successfully
- ✅ Results display correctly
- ✅ Dropdowns work without errors

## Testing Steps

1. **Log in as a student** with a valid account
2. **Navigate to Student Results page**
3. **Check browser console** (F12 → Console)
4. **Verify** you see:
   - No 406 errors
   - Proper log messages with query parameters
   - "Student records found: 1" (or more if student has duplicates)
5. **Select a term** from the dropdown
6. **View results** → Should display scores

## Related Files

- **Main Fix:** `src/app/student/results/page.tsx` (lines 173-240)
- **Auth Service:** `src/services/auth.service.ts` (provides user object)
- **Student Table:** students table schema should have user_id and school_id

## Edge Cases Handled

✅ **Student without auth metadata school_id:**
- Fallback queries the student record to find school_id
- If found, uses it for subsequent queries
- If not found, shows clear error message

✅ **Student with no record in database:**
- Shows "Your student record not found" message
- Suggests contacting school administrator

✅ **Multiple student records** (shouldn't happen but now handled):
- Uses first record found
- Won't crash like `.single()` would

✅ **Database query errors:**
- Catches and logs errors clearly
- Shows database error message to user
- Sets loading to false to unblock UI

## Deployment

This fix is ready to deploy immediately:

```bash
git add src/app/student/results/page.tsx
git commit -m "fix: Handle missing school_id and remove .single() from student results query

- Replace .single() with .limit(10) to avoid 406 errors when student record not found
- Add fallback logic to find school_id from student record if not in auth metadata
- Add detailed logging for debugging  
- Improve error messages with actionable feedback
- Fix loading state in all error paths

This resolves the '406 Not Acceptable' and 'Cannot coerce result to single JSON' errors
students were seeing when trying to view results."

git push origin main
```

## Impact

- ✅ No breaking changes
- ✅ Backward compatible
- ✅ Improves user experience
- ✅ Better error messages
- ✅ Better debugging capability

---

**Status:** ✅ READY FOR PRODUCTION
**Severity:** HIGH (blocking feature)
**Risk:** LOW (only improves query robustness)
