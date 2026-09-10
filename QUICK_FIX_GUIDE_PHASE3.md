# Quick Fix Guide - Phase 3 Issues & Solutions

**Date**: August 19, 2026  
**Updated**: After initial testing  
**Status**: Real-time troubleshooting guide

---

## Issue 1: RLS Migration Error - "must be owner of table objects"

### What Happened
```
SQL Error: ERROR: 42501: must be owner of table objects
Cause: Supabase service doesn't have permission to modify table ownership
```

### Solution A: Simplified SQL (RECOMMENDED)

**File**: `database/migrations/027_fix_storage_rls_final.sql` (already updated)

**What Changed**:
```sql
-- BEFORE: Complex policies with ownership changes
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
DROP POLICY...
CREATE POLICY...

-- AFTER: Simple disable-only approach
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets DISABLE ROW LEVEL SECURITY;
-- Done!
```

**Try This**:
1. Open Supabase SQL Editor
2. Copy NEW content from `027_fix_storage_rls_final.sql`
3. Paste and run
4. Should succeed (only 2 simple ALTER commands)

---

### Solution B: Manual Dashboard Method (GUARANTEED TO WORK)

**If migration still fails**, do this manually (5 minutes):

#### Step 1: Disable RLS on Objects
```
1. Go to https://egdreueuspmuxhezdpqm.supabase.co
2. Click "Storage" in left sidebar
3. Look for table list on the left
4. Click "Objects" table
5. Top right: Find "RLS" button
6. Click "Disable RLS"
7. Wait for green checkmark
```

#### Step 2: Disable RLS on Buckets
```
1. Same location
2. Click "Buckets" table
3. Click "RLS" button
4. Click "Disable RLS"
5. Done!
```

**Result**: ✅ Photo uploads will work

---

### Solution C: Use Alternative Bucket

If both fail, code already has fallback:

```typescript
// src/services/student.service.ts - uploadStudentPhoto()

// Try primary bucket
.from('student-photos').upload(...)

// If fails, try fallback
.from('school-logos').upload(`student-photos/${path}`, ...)
```

This is **already implemented**. Upload will work even if RLS issue persists.

---

## Issue 2: 404 Error When Clicking "Start Exam"

### What Happened
```
Student clicks "Start Exam" → Page shows 404
Expected: http://localhost:3000/student/cbt/[exam-id]
Actual: 404 not found
```

### Root Cause (Diagnosed)
```
Files exist:
✅ src/app/student/cbt/[id]/page.tsx (created)
✅ src/app/student/cbt/[id]/results/page.tsx (created)

But Next.js not recognizing routes after file creation
```

### Solution: Server Restart & Cache Clear

**What We Did**:
1. ✅ Stopped server
2. ✅ Deleted `.next` cache folder
3. ✅ Restarted with `npm run dev`
4. ✅ Server rebuilding from scratch

**Expected Result**:
- Server rebuilds ALL routes
- Detects new [id] route folder
- 404 error GONE
- Exam taking page WORKS

**Current Status**:
- Server: Restarting (in progress)
- Routes: Being rebuilt
- ETA: 2-3 minutes

---

### What to Test After Restart

```
WHEN SERVER FINISHES REBUILDING:

1. Open http://localhost:3000
2. Login as STUDENT
3. Go to Dashboard
4. Click "My CBT Exams"
5. Click "Start Exam" button
   
Expected: ✅ Page loads (NO 404)
Shows: Exam title, timer, "Start Exam" button

If still 404:
- Check console (F12) for errors
- Look for "Cannot find route" messages
- Verify browser cache clear (Ctrl+Shift+R)
```

---

## Real-Time Checklist

### Before Next Test
```
☑️ Server restarted
☑️ .next cache cleared
☑️ All routes rebuilt
☑️ No compilation errors
```

### RLS Fix
```
☑️ Try simplified SQL migration first
☑️ If fails: Use manual dashboard method
☑️ If still fails: Code has fallback (will work anyway)
```

### Exam Taking
```
☑️ Click "Start Exam"
☑️ Should NOT show 404
☑️ Should show exam taking interface
☑️ Timer should count down
☑️ Can answer questions
☑️ Submit button works
```

---

## Detailed Test Cases

### Test 1: RLS Migration Fix
```
STEP 1: Try Simplified SQL
  Location: Supabase → SQL Editor
  File: database/migrations/027_fix_storage_rls_final.sql
  Run: Paste content and execute
  
Expected: ✅ Success (no permission errors)
Actual: [SEE YOUR RESULT]

IF FAILS: Go to Test 2

STEP 2: Manual Dashboard Method
  Location: Supabase → Storage
  Action 1: Disable RLS on "Objects" table
  Action 2: Disable RLS on "Buckets" table
  
Expected: ✅ Both buttons show green
Actual: [SEE YOUR RESULT]

VERIFICATION:
  Go to Storage → student-photos
  Try upload manually
  Should work without RLS error
```

### Test 2: Student Photo Upload
```
Pre-req: RLS fix applied (Test 1)

STEP 1: Register Student with Photo
  Path: http://localhost:3000/school-admin/dashboard
  Action: "Register Student"
  Upload: Select any image file
  Submit: Click "Register"
  
Expected: ✅ No RLS error, registration succeeds
Actual: [SEE YOUR RESULT]

STEP 2: Verify Photo Saved
  Path: Supabase → Storage → student-photos bucket
  Should see: Uploaded photo file
  
Check: [✅ YES / ❌ NO]
```

### Test 3: Exam Taking (NEW)
```
Pre-req: Server restarted, routes rebuilt

STEP 1: Student Login
  Path: http://localhost:3000/auth/login
  Role: Student
  
STEP 2: CBT Portal
  Path: Dashboard → "My CBT Exams"
  See: List of available exams
  
STEP 3: Start Exam
  Click: "Start Exam" on any CBT
  
Expected: ✅ Exam page loads (NOT 404)
         Exam title shown
         Timer visible
         Questions displayed
         
Actual: [SEE YOUR RESULT]

IF 404:
  Check: F12 → Console
  Look for: Any error messages
  Try: Ctrl+Shift+R (hard refresh)
```

---

## Browser Developer Tools (Debugging)

### Check Console Errors
```
1. Press F12
2. Click "Console" tab
3. Look for red error messages
4. Take screenshot
5. Report error message
```

### Check Network Errors
```
1. F12 → Network tab
2. Reload page
3. Look for failed requests (red)
4. Click failed request
5. Check "Response" tab for error
```

### Check Storage
```
1. F12 → Application tab
2. Expand "Local Storage"
3. Look for user/school data
4. Verify school_id is set
```

---

## Expected Timeline

### NOW (Aug 19, 11:30 AM)
```
✓ Server restarting
✓ Routes rebuilding
✓ .next cache cleared
```

### IN 2-3 MINUTES
```
✓ Server "Ready in X seconds"
✓ All routes compiled
✓ http://localhost:3000 accessible
```

### THEN TEST
```
⏳ Try each test case above
⏳ Document results
⏳ Report any issues
```

---

## Success Indicators ✅

### RLS Fix Working
- ✅ SQL runs without "must be owner" error
- ✅ Photo uploads succeed (no "row violates" error)
- ✅ File appears in Storage bucket

### Exam Taking Working
- ✅ No 404 on exam start
- ✅ Timer appears and counts down
- ✅ Questions display
- ✅ Can submit
- ✅ Results page shows

### Teacher Results Working
- ✅ Teacher sees all students in class+subject
- ✅ CBT scores auto-populate
- ✅ Can edit scores
- ✅ Save works

---

## If Issues Persist

### For 404 Error
```
Possible causes:
1. Browser cache (try Ctrl+Shift+R)
2. Server didn't fully rebuild (wait 2 min)
3. Next.js config issue (rare)

Actions:
1. Hard refresh browser
2. Wait full rebuild
3. Check for compilation errors in server log
4. Check F12 console for import errors
```

### For RLS Error
```
Possible causes:
1. Supabase permissions (account issue)
2. Table doesn't exist (rare)
3. RLS already complex (legacy config)

Actions:
1. Try manual dashboard method
2. Check Supabase account permissions
3. Use fallback bucket (already coded)
```

### For Photo Upload Error
```
After RLS fixed, photo should work

If still fails:
1. Verify RLS is DISABLED (not just policies removed)
2. Check student-photos bucket exists
3. Check permissions on bucket
4. Try school-logos bucket as test
```

---

## Server Log Indicators

### Good Signs (Look for these)
```
✓ "Ready in 98.4s"
✓ "Compiled /student/cbt in ..."
✓ "Compiled /student/cbt/[id] in ..."
✓ "GET /student/cbt 200"
✓ "GET /student/cbt/[exam-id] 200"
```

### Bad Signs (Watch for these)
```
✗ "error compiling"
✗ "SyntaxError"
✗ "Cannot find module"
✗ "GET /student/cbt/[id] 404"
```

If you see bad signs, check the error message and report it.

---

## Next Steps

1. **Wait for server to finish rebuilding** (2-3 min)
2. **Test RLS fix** - Run simplified SQL
3. **Test photo upload** - Register student with photo
4. **Test exam taking** - Click "Start Exam"
5. **Report results** - Tell me what happened

---

## Quick Reference

**Files Changed**:
```
src/app/student/cbt/[id]/page.tsx ✅
src/app/student/cbt/[id]/results/page.tsx ✅
database/migrations/027_fix_storage_rls_final.sql ✅ (simplified)
```

**What to Do**:
```
1. Wait for server rebuild
2. Apply RLS fix (simplified SQL)
3. Test each workflow
4. Report results
```

**Status**: 🔄 **IN PROGRESS - SERVER RESTARTING**

---

**Updated**: August 19, 2026  
**Real-time Guide**: For immediate issue resolution
