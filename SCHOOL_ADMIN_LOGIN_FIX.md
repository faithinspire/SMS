# SCHOOL ADMIN LOGIN FIX - CRITICAL UPDATE

## PROBLEM IDENTIFIED

When a school admin registers, they are being redirected to the **Student Dashboard** instead of the **School Admin Dashboard**. This is caused by multiple interconnected issues:

### Error Symptoms:
```
- 406 Not Acceptable error on Supabase queries
- "⚠️ Using metadata role: undefined"
- "No school_id for student"
- User being routed to student dashboard
```

### Root Causes:

1. **Missing User Records in Database**
   - When users sign up via Supabase Auth, a record is created in `auth.users` table
   - BUT no corresponding record is created in the public `users` table
   - The auth service tries to query the `users` table and gets 406 error
   - Falls back to using metadata, which doesn't have the correct role

2. **Role Mapping Issue**
   - Registration stores role as `'ADMIN'` in metadata
   - Auth service needs to map `'ADMIN'` → `'SCHOOL_ADMIN'`
   - Without this mapping, the user defaults to `'STUDENT'` role

3. **Missing Trigger**
   - No automatic trigger to create `users` table records when auth users sign up
   - All existing school admins are orphaned without database records

## FIXES APPLIED

### Fix 1: Create Auto-Trigger Migration (Migration 014)
**File:** `database/migrations/014_auto_create_users_on_auth_signup.sql`

**What it does:**
- Creates a PostgreSQL trigger on `auth.users` table
- When a user signs up, automatically creates a record in `public.users` table
- Extracts role and school_id from user metadata
- Fixes all existing orphaned auth users

**Execute this:**
```bash
# Go to Supabase Dashboard → SQL Editor
# Copy the entire content of: database/migrations/014_auto_create_users_on_auth_signup.sql
# Run the SQL script
# You should see: "Migration 014: Fixed X existing users"
```

### Fix 2: Improve Auth Service Fallback (Already Applied)
**File:** `src/services/auth.service.ts` (Lines 395-445)

**What changed:**
- Better error logging when users table query fails
- Maps `'ADMIN'` role to `'SCHOOL_ADMIN'` when using metadata fallback
- Extracts schoolId from metadata as backup

## VERIFICATION STEPS

### Step 1: Run the Migration
1. Go to https://supabase.com/dashboard
2. Select your project: `egdreueuspmuxhezdpqm`
3. Go to **SQL Editor**
4. Create a new query
5. Copy and paste the entire contents of `database/migrations/014_auto_create_users_on_auth_signup.sql`
6. Click **Run**
7. Check the output - you should see a message like: `"Migration 014: Fixed 5 existing users"`

### Step 2: Verify Existing Schools Were Fixed
1. In SQL Editor, run:
```sql
SELECT COUNT(*) as auth_users FROM auth.users;
SELECT COUNT(*) as users_table FROM public.users;
SELECT COUNT(*) as missing FROM auth.users au 
  WHERE NOT EXISTS (SELECT 1 FROM public.users pu WHERE pu.id = au.id);
```

**Expected results:**
- `auth_users` and `users_table` should have same count (or very close)
- `missing` should be 0 (or very small)

### Step 3: Test With Problem School
1. Log in with the school admin that was showing student dashboard
2. You should now be redirected to **School Admin Dashboard** instead of student dashboard
3. Check the browser console - you should see:
   - `✅ User record found: SCHOOL_ADMIN School: [UUID]`
   - `→ Redirecting to School Admin dashboard`

### Step 4: Test New Registration
1. Register a brand new school admin
2. Login with that account
3. Should immediately go to School Admin Dashboard (no student dashboard redirect)

## PREVENTING THIS FOR FUTURE SCHOOLS

The trigger is now in place, so all NEW registrations will automatically:
1. Create the auth user in Supabase Auth
2. Create a corresponding `users` table record
3. Set the correct role (`SCHOOL_ADMIN`)
4. Link to the correct school

## IF STILL HAVING ISSUES

### Scenario A: Still Showing Student Dashboard
**Cause:** Trigger didn't apply to existing users
**Fix:** 
1. Go to Supabase SQL Editor
2. Run:
```sql
-- Find the problematic user
SELECT id, email, role FROM public.users 
WHERE email = 'gateway@gmail.com'
LIMIT 1;

-- Update their role if needed
UPDATE public.users 
SET role = 'SCHOOL_ADMIN'
WHERE email = 'gateway@gmail.com';
```

### Scenario B: 406 Error Still Appearing
**Cause:** Database permissions issue or RLS not disabled
**Fix:**
1. Go to Supabase SQL Editor
2. Run:
```sql
-- Check if RLS is disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'users' AND schemaname = 'public';
-- Should show: rowsecurity = false

-- If not, disable it:
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools DISABLE ROW LEVEL SECURITY;
```

### Scenario C: New Registrations Not Working
**Cause:** Trigger was not created properly
**Fix:**
1. Go to Supabase SQL Editor
2. Run:
```sql
-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- If empty, the trigger doesn't exist - re-run the migration file
```

## AFFECTED USERS

The following school admins had this issue:
- `gateway@gmail.com` (email from the error logs)
- Any other schools registered with ADMIN role

All should be fixed after running Migration 014.

## DEFINITION OF FIXED

✅ School Admin Registration is fixed when:
1. ✅ New school admins can register
2. ✅ They immediately see School Admin Dashboard on login
3. ✅ Not redirected to Student Dashboard
4. ✅ Can access Staff & Teachers, Register Teacher/Student
5. ✅ Registration modals show class and subject dropdowns
6. ✅ Can complete full teacher and student registration
7. ✅ Data saves to Supabase correctly

## MIGRATION STATUS

- ✅ Migration file created: `014_auto_create_users_on_auth_signup.sql`
- ✅ Auth service updated with role mapping
- ⏳ **NEEDS USER ACTION:** Execute the SQL migration in Supabase

---

**Next Action:** Run the SQL migration, then test with your school admin account.
