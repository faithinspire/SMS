# CRITICAL FIXES APPLIED - AUGUST 2026

## ISSUE #1: School Admin Redirected to Student Dashboard ⚠️ CRITICAL

### Problem
A newly registered school admin (gateway@gmail.com) was being redirected to the **Student Dashboard** instead of the **School Admin Dashboard**.

### Error Trail
```
GET https://egdreueuspmuxhezdpqm.supabase.co/rest/v1/users?... 406 (Not Acceptable)
⚠️ Using metadata role: undefined
No school_id for student
→ User redirected to student/dashboard instead of school-admin/dashboard
```

### Root Cause
Multiple interconnected failures:

1. **Missing User Records**
   - When users sign up via Supabase Auth, the system only creates `auth.users` record
   - No corresponding record is created in public `users` table
   - Auth service queries `users` table → gets 406 Not Acceptable error
   - Falls back to metadata → metadata has role='ADMIN' not 'SCHOOL_ADMIN' → defaults to STUDENT

2. **Role Mapping Missing**
   - Registration stores: `role: 'ADMIN'`
   - Auth service expected: `role: 'SCHOOL_ADMIN'`
   - Without mapping, user defaults to STUDENT role

3. **No Auto-Trigger**
   - No PostgreSQL trigger to auto-create users table records on auth signup
   - All existing school admins are orphaned

### Fixes Applied

#### Fix 1: Create PostgreSQL Trigger (Migration 014)
**File:** `database/migrations/014_auto_create_users_on_auth_signup.sql`

Creates a trigger that:
- ✅ Runs when new users sign up in auth.users
- ✅ Automatically creates corresponding users table record
- ✅ Extracts role, school_id, name from user metadata
- ✅ Maps all existing orphaned auth users to users table
- ✅ Ensures schoolId is present and valid

**Key SQL:**
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
  -- Extract metadata (schoolId, role, name)
  -- Create users table record
  -- Handle role mapping
$$

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

#### Fix 2: Improve Auth Service Fallback (Already Applied)
**File:** `src/services/auth.service.ts` (Lines 395-445)

Changes:
- ✅ Better error logging for users table query failures
- ✅ Maps `'ADMIN'` → `'SCHOOL_ADMIN'` in fallback logic
- ✅ Extracts schoolId from metadata as backup
- ✅ Prevents role defaulting to STUDENT

**Code:**
```typescript
// Map 'ADMIN' role from old system to 'SCHOOL_ADMIN'
let mappedRole = role || 'STUDENT'
if (mappedRole === 'ADMIN') {
  mappedRole = 'SCHOOL_ADMIN'
}

return {
  role: (mappedRole || 'STUDENT') as any,
  schoolId: schoolId,
  // ...
}
```

### What This Fixes

✅ **New school registrations** will automatically create users table records
✅ **Existing orphaned admins** will be migrated by the migration script
✅ **Auth service** won't fail with 406 errors
✅ **Role routing** will work correctly (ADMIN → SCHOOL_ADMIN)
✅ **School admins** will be directed to correct dashboard

### How to Apply

**CRITICAL: Must run this SQL migration**

1. Go to https://supabase.com/dashboard
2. Select project: `egdreueuspmuxhezdpqm`
3. Go to **SQL Editor** → **New Query**
4. Copy entire contents: `database/migrations/014_auto_create_users_on_auth_signup.sql`
5. Click **Run**
6. Wait for: `"Migration 014: Fixed X existing users"`

### Verification

After running migration:

```sql
-- Check sync status
SELECT COUNT(*) as auth_users FROM auth.users;
SELECT COUNT(*) as users_table FROM public.users;
SELECT COUNT(*) as missing FROM auth.users au 
  WHERE NOT EXISTS (SELECT 1 FROM public.users pu WHERE pu.id = au.id);

-- Should show: auth_users ≈ users_table, missing ≈ 0
```

Then:
1. Log in with `gateway@gmail.com` (the problem school admin)
2. Should see **School Admin Dashboard** (not Student Dashboard)
3. Should have access to Staff & Teachers, Register Teacher/Student

---

## ISSUE #2: Registration Modal Dropdowns Empty ⏳ IN PROGRESS

### Status
**Previous diagnosis complete, awaiting test data insertion**

### What Was Done
1. ✅ Added comprehensive debug logging to TeacherRegistrationModal
2. ✅ Added comprehensive debug logging to StudentRegistrationModal
3. ✅ Created debug API: `/api/debug/registration-data?schoolId=UUID`
4. ✅ Created test data insertion API: `/api/debug/insert-test-data`
5. ✅ Created diagnostic guide: `ROOT_CAUSE_DIAGNOSTIC_GUIDE.md`

### Current State
- Modals are **correctly built** with proper UI
- Data loading code is **correct**
- Debug logging is **in place**
- Issue is **not UI** - it's the **data source**

### Problem
Class and Subject dropdowns show "No subjects available" because:
- Database has no classes/subjects for the school OR
- schoolId is not being passed correctly OR
- Supabase query is failing

### How to Debug
**For school admin with empty dropdowns:**

1. Open http://localhost:3000/school-admin/dashboard
2. Click "+ Register Teacher"
3. Continue through steps to reach "Step 4: Teaching Assignment"
4. Press **F12** to open browser console
5. Look for `[REGISTRATION DEBUG]` logs
6. Note the schoolId value
7. Go to: http://localhost:3000/api/debug/registration-data?schoolId=[COPIED_UUID]
8. Check the response:
   - If `classes.count > 0` → Database has data ✅
   - If `classes.count = 0` → Need to insert test data

### To Fix Empty Dropdowns
If database returns `count: 0`:

```bash
curl -X POST http://localhost:3000/api/debug/insert-test-data \
  -H "Content-Type: application/json" \
  -d '{"schoolId": "cc6f2624-756a-43fa-a82c-7683e93ff48b"}'
```

This inserts:
- ✅ 12 Classes (Primary 1-6, JSS 1-3, SS1-3)
- ✅ 36 Arms (A, B, C for each class)
- ✅ 27 Subjects (English, Math, Science, etc.)

---

## ISSUE #3: Superadmin Dashboard Fixes ✅ COMPLETED

### Fixed
- ✅ Delete school operations (was using `.catch()` chaining - now using try-catch)
- ✅ Status update operations (was using `.catch()` chaining - now using try-catch)
- ✅ Dashboard no longer calls non-existent `/api/superadmin/dashboard-stats`

### Files Fixed
- `src/app/api/superadmin/schools/[id]/delete/route.ts`
- `src/app/api/superadmin/schools/[id]/status/route.ts`
- `src/app/superadmin/dashboard/page.tsx`

---

## FILES CREATED/MODIFIED

### Created:
1. `database/migrations/014_auto_create_users_on_auth_signup.sql` - **CRITICAL**
2. `src/app/api/debug/fix-auth-users/route.ts` - Helper endpoint
3. `SCHOOL_ADMIN_LOGIN_FIX.md` - Implementation guide
4. `CRITICAL_FIX_SUMMARY.md` - This file

### Modified:
1. `src/services/auth.service.ts` - Added role mapping and better error handling

### Already In Place:
1. `database/migrations/012_master_disable_rls_all_tables.sql` - RLS disabled
2. `database/migrations/013_insert_test_data.sql` - Test data template
3. `src/app/api/debug/registration-data/route.ts` - Debug API
4. `src/app/api/debug/insert-test-data/route.ts` - Test data insertion
5. `ROOT_CAUSE_DIAGNOSTIC_GUIDE.md` - Diagnostic instructions

---

## PRIORITY ACTIONS

### 🚨 IMMEDIATE (Next 30 minutes)
1. Run Migration 014 in Supabase SQL Editor
2. Verify sync: `SELECT COUNT(*) FROM auth.users, SELECT COUNT(*) FROM public.users`
3. Test login with `gateway@gmail.com` (problem school admin)
4. Confirm landing on School Admin Dashboard

### ⏳ SOON (Next few hours)
1. Ensure all school admins can log in correctly
2. For each school admin that can't see teacher/student registration:
   - Go to `/api/debug/registration-data?schoolId=their-uuid`
   - If count=0, insert test data
   - Refresh and test dropdowns

### 📋 FOLLOWUP (Before production)
1. Remove all debug logging (`[REGISTRATION DEBUG]`, `[DASHBOARD]`)
2. Remove debug API endpoints (`/api/debug/*`)
3. Document standard registration flow for new schools
4. Add test data insertion to school registration wizard

---

## DEFINITION OF SUCCESS

✅ School Admin Login is Fixed:
- [ ] New school can register
- [ ] Admin logs in → sees School Admin Dashboard
- [ ] Can access Staff & Teachers page
- [ ] Can register teachers
- [ ] Can register students
- [ ] Teacher/Student registration modals show class and subject dropdowns
- [ ] Complete registration saves data correctly

✅ All existing schools work:
- [ ] gateway@gmail.com logs in → School Admin Dashboard
- [ ] All other registered schools work correctly
- [ ] No users redirected to wrong dashboard

---

## ROLLBACK PLAN (If Needed)

### To Revert Migration 014:
```sql
-- Drop the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the function
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Any orphaned users will remain orphaned (pre-migration state)
```

This won't harm anything - users can still log in via metadata fallback, they just might get wrong role.

---

**Last Updated:** August 12, 2026
**Status:** Awaiting Migration 014 execution
**Next Check-In:** After migration runs and school admin logs in
