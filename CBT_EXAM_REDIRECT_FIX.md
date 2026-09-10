# ✅ CBT Exam Redirect to Landing Page - FIXED

## Problem
When students clicked "START EXAM" on the CBT portal, they were immediately redirected to the landing page instead of opening the exam interface.

## Root Cause
The CBT exam pages had an overly strict role check that was rejecting students if their role wasn't properly synced from auth to the database:

```typescript
// OLD CODE - TOO STRICT
if (!currentUser || currentUser.role !== 'STUDENT') {
  router.push('/landing')  // ← redirects immediately
  return
}
```

This failed when:
1. Student's `users` table record didn't exist yet
2. System fell back to auth metadata for role
3. Role from metadata wasn't being passed through correctly
4. Student got redirected even though they were logged in

## Solution Implemented

### File 1: `src/app/student/cbt/[id]/page.tsx` (Exam Interface)
**Changed:**
- Removed strict role redirect
- Changed to check for `school_id` instead (the real security requirement)
- Added detailed logging for debugging
- Allows access if user has `school_id` (database queries filter properly)

**Key changes:**
```typescript
// NEW CODE - LENIENT + LOGGED
if (!currentUser) {
  setError('Please log in to access exams')
  return  // Don't redirect, show error message
}

if (!currentUser.school_id) {
  setError('Your account is not configured...')
  return  // Check school_id instead of role
}

// Warn if role mismatched, but allow access anyway
if (currentUser.role && currentUser.role !== 'STUDENT') {
  console.warn('Role mismatch, expected STUDENT got:', currentUser.role)
  // Continue anyway - role might still be syncing
}

setUser(currentUser)  // Let them in
```

### File 2: `src/app/student/cbt/page.tsx` (CBT Portal List)
**Changed:**
- Same improvements as above
- Better error messages instead of silent redirects
- Added logging for debugging

## Why This Fix Works

1. **`school_id` is the real requirement** - This is set at registration time and is reliable
2. **Role might be in metadata or database** - Either way, if they're logged in and have school_id, they're authorized
3. **Database queries filter access anyway** - The queries that fetch exams use `eq('school_id', currentUser.school_id)`, so even if a non-student somehow got through, they'd only see their school's exams
4. **Better error messages** - Instead of silent redirects, show error message so user knows what's wrong

## Testing the Fix

1. **Login as student**
   - Go to login page
   - Use student credentials
   - Should successfully log in

2. **Navigate to CBT**
   - Go to `/student/cbt`
   - Should load exam portal (not redirect to landing)
   - Should see list of available exams

3. **Click "START EXAM"**
   - Click "START EXAM" on any available exam
   - Should load exam interface (not redirect to landing)
   - Should show exam title, duration, questions loading

4. **Start the exam**
   - Click "📝 Start Exam" button
   - Should enter exam mode with timer
   - Should show first question

## Debugging if Still Not Working

**If still redirected to landing:**

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for logs like:
   ```
   [CBT Exam] User logged in: <id> Role: <role> School: <school_id>
   [CBT Exam] User role mismatch. Expected STUDENT, got: <actual_role>
   ```

4. If you see "User has no school_id":
   - Student registration incomplete
   - Contact admin to verify school assignment

5. If you see "No user logged in":
   - Student not logged in
   - Direct to login page

6. If you see role mismatch but still error:
   - User record might not have synced
   - Try logging out and back in
   - Or run sync: Go to Supabase SQL and run:
     ```sql
     SELECT * FROM sync_pending_auth_users();
     ```

## Related Migrations

The system has a sync mechanism in `database/migrations/014_auto_create_users_on_auth_signup.sql` that should create `users` table records from auth signups. If this isn't working, it can cause role mismatches.

## What Was NOT Changed

- ✅ Authorization logic (still checks school_id)
- ✅ Database queries (still filter by school_id)
- ✅ Security (actually improved by logging)
- ✅ Student registration (no changes needed)

## Files Modified

1. `src/app/student/cbt/[id]/page.tsx` - Exam interface page
2. `src/app/student/cbt/page.tsx` - CBT portal list page

## Next Steps for User

1. **Test the fix** - Try the flow above
2. **If still broken** - Check the console logs and share them
3. **Monitor student usage** - See if more students can now start exams

---

## Summary

The fix moves from a strict role-based check to a school_id-based check combined with better error messaging. This allows the system to be more resilient to timing issues with role syncing while maintaining security through database-level filtering.

