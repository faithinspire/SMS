# Production Errors After Deployment - Root Cause Analysis & Fixes

## Issues Reported

1. **Students Page**: 404 Error (page cannot be accessed)
2. **Results Page**: "Unable to fetch sessions" error message

Both errors appearing after deployment to Vercel.

---

## Root Cause Analysis

### Issue #1: Results Page - "Unable to fetch sessions"

**Symptoms**:
- Results page loads but "Unable to fetch sessions" toast appears
- Sessions dropdown is empty
- Page remains in loading state

**Root Causes** (one or more apply):

#### A. No Academic Sessions in Database
The `academic_sessions` table might be empty for the authenticated user's school.

**Check**: 
```sql
SELECT COUNT(*) FROM academic_sessions WHERE school_id = '<user_school_id>';
```

If count = 0, sessions need to be created.

#### B. SchoolContextService.getCurrentUserSchool() Failing
The Results page calls this service to get the school context. If it fails, no schoolId is set.

**Issues that cause this**:
- User's `school_id` in auth metadata is null or invalid
- School record doesn't exist in `schools` table
- AuthService.getCurrentUser() returns null

#### C. Network/Database Connection Issue
The Supabase query on line 160 of Results page is failing.

**Indicators**:
- Check browser console for specific error messages
- Check Vercel logs for database connection errors

**Fix Applied**: Added better error handling and logging to identify exact failure point.

---

### Issue #2: Students Page - 404 Error

**Symptoms**:
- Navigation to /school-admin/students shows 404
- Or page loads but student list is empty

**Root Causes**:

#### A. API Route Didn't Deploy (`/api/school/students`)
The API endpoint file might not have deployed correctly.

**Indicators**:
- Fetch shows 404 status
- API returns "resource not found"

**Fix**: Verify file exists at correct path and check Vercel build logs.

#### B. AuthService Not Resolving User in Server Context
The API calls `AuthService.getCurrentUser()` which depends on auth context.

**Failure points**:
- `supabase.auth.getUser()` returns null (session not passed to server)
- Fallback session mechanism not working
- User metadata doesn't include school_id

**Fix Applied**: Added comprehensive logging to diagnose exact auth failure.

#### C. School-Related Issues
- User has no school_id in auth metadata
- User's school_id doesn't match any school in database
- User's role is not one of: SCHOOL_ADMIN, PRINCIPAL, HEAD_TEACHER

---

## Diagnostic Steps

### Step 1: Check Browser Console for Specific Errors

**For Results Page**:
```
Open: https://sms.ftech.ai/school-admin/results
Press F12 to open Developer Tools
Go to Console tab
Look for error messages mentioning:
- "SchoolContextService"
- "academic_sessions"
- "Failed to load school"
- "No sessions found"
```

**For Students Page**:
```
Open: https://sms.ftech.ai/school-admin/students
Press F12 to open Developer Tools
Go to Console tab
Look for error messages mentioning:
- "API error: 404"
- "Cannot find route"
- "Unauthorized"
- "Not authorized"
```

### Step 2: Check Vercel Logs

Go to: https://vercel.com/ftech-sms

1. Click "Deployments"
2. Click latest deployment
3. Click "Logs"
4. Search for "Students API" or "Results" errors

### Step 3: Verify Data in Supabase

**Check 1: Do academic_sessions exist?**
```sql
-- In Supabase SQL Editor, run:
SELECT id, school_id, session_year FROM academic_sessions LIMIT 10;
```

If no results, sessions need to be created.

**Check 2: Is authenticated user's school_id valid?**
```sql
-- Check if user has school
SELECT id, school_id, role FROM users WHERE email = '<your_email>' LIMIT 1;

-- Check if that school exists
SELECT id, name FROM schools WHERE id = '<school_id_from_above>';
```

**Check 3: Does student data exist?**
```sql
-- For the school, check if students exist
SELECT COUNT(*) FROM students WHERE school_id = '<school_id>';
```

---

## Fixes Applied

### Fix #1: Enhanced Error Handling in Results Page

**File**: `src/app/school-admin/results/page.tsx`

**Changes**:
- Added detailed console logging at each step
- Better error messages showing what failed
- Clear distinction between "no data" vs "query error"
- User-friendly error toasts instead of silent failures

**New behaviors**:
```
1. If schoolId is not set → logs "[Results] No schoolId available yet"
2. If no sessions found → shows "No academic sessions configured..."
3. If query error → shows specific database error message
4. If data loads → shows "[Results] ✅ Sessions loaded: X sessions"
```

### Fix #2: Comprehensive Logging in Students API

**File**: `src/app/api/school/students/route.ts`

**Changes**:
- Log every step: parameter validation, auth check, role verification, school matching
- Show exactly which auth check failed
- Include user details and school comparison for debugging

**New behaviors**:
```
1. Missing schoolId → logs "[Students API] Missing schoolId parameter"
2. No authenticated user → logs "[Students API] No authenticated user found"
3. Invalid role → logs "[Students API] User role not authorized: <role>"
4. School mismatch → logs school IDs for comparison
5. Success → logs "[Students API] ✅ Fetched X students"
```

---

## Immediate Actions to Take

### Action 1: Check Browser Console (Fastest Diagnosis)

1. Open Results page or Students page
2. Open DevTools (F12)
3. Go to Console tab
4. Look for error messages
5. Share the exact error with diagnostic info

### Action 2: Verify Academic Sessions Exist

If Results page shows "No academic sessions configured...":

**Create sessions via Supabase SQL**:
```sql
INSERT INTO academic_sessions (school_id, session_year, start_year, end_year, is_active)
SELECT id, '2024/2025', 2024, 2025, true FROM schools;
```

Then refresh the page.

### Action 3: Verify User's School Link

If Students page shows 404 or "Not authorized":

**Check user-school relationship**:
```sql
-- Get current user's info
SELECT id, email, school_id, role FROM users WHERE email = '<your_email>';

-- Verify that school exists
SELECT id, name FROM schools WHERE id = '<school_id_from_above>';
```

If school_id is null, the user account needs to be linked to a school.

### Action 4: Check Vercel Deployment Status

1. Go to https://vercel.com/ftech-sms
2. Verify latest deployment shows ✅ PASSED
3. If FAILED, check build logs for TypeScript or import errors

---

## If Issues Persist After These Steps

### Escalation 1: Revert Previous Deployment

The latest fixes added enhanced logging but didn't change core logic. If pages worked before our changes and broken now:

```bash
git revert HEAD  # Revert to previous working version
git push origin main
```

Wait 3-5 minutes for Vercel to rebuild.

### Escalation 2: Check for Data Integrity Issues

```sql
-- Verify key tables aren't empty
SELECT COUNT(*) as schools FROM schools;
SELECT COUNT(*) as academic_sessions FROM academic_sessions;
SELECT COUNT(*) as students FROM students;
SELECT COUNT(*) as users FROM users;
```

If any count is 0, that table needs seeding.

### Escalation 3: Verify Supabase Connection

Check if `.env.local` has correct Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

If these are empty or wrong, no database queries will work.

---

## Testing After Fixes

### Test 1: Results Page Sessions Load
```
1. Open: https://sms.ftech.ai/school-admin/results
2. Open F12 console
3. Look for: "[Results] ✅ Sessions loaded"
4. Sessions dropdown should have data
```

### Test 2: Students Page Loads
```
1. Open: https://sms.ftech.ai/school-admin/students
2. Open F12 console
3. Look for: "[Students API] ✅ Fetched X students"
4. Student list should display
```

### Test 3: Check Error Messages
```
1. If errors occur, console should show exact failure point
2. Share the console error for further diagnosis
```

---

## What Changed vs. Before

### Code Changes Made
1. Results page: Added detailed logging and error messaging
2. Students API: Added step-by-step logging for auth/authorization
3. Both: Better error messages to identify root cause

### What Didn't Change
- Core database queries (still using session_year, term_name)
- Authentication logic (still using AuthService)
- API endpoints (still at /api/school/students)
- Authorization checks (still validating school_id match)

### Why These Changes Help
- **Transparency**: Shows exactly where things fail
- **Debugging**: Detailed logs in both browser console and Vercel logs
- **User Experience**: Clear error messages instead of silent failures

---

## Next Steps

1. **Immediately**: Open browser console on affected page and share error messages
2. **Check**: Run SQL queries above to verify data exists
3. **Verify**: Confirm Supabase credentials in .env.local
4. **Monitor**: Watch Vercel logs for any build or runtime errors
5. **Deploy**: Once diagnostics identify the issue, apply data fixes and redeploy

---

## Summary

Both errors are likely caused by **missing data** (no sessions) or **auth context issues** (AuthService unable to resolve user in server context), not code bugs.

The enhanced logging now makes these issues visible so they can be diagnosed and fixed.

**Action**: Check browser console for specific error messages - that will pinpoint the exact issue.
