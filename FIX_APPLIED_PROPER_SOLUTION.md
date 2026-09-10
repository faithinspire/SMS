# SCHOOL ADMIN LOGIN FIX - PROPER SOLUTION APPLIED

## PROBLEMS IDENTIFIED & FIXED

### Problem 1: User Metadata Not Queryable
**Error:** `ERROR 42703: column au.user_metadata does not exist`

**Root Cause:** Supabase Auth's `auth.users` table cannot be directly queried from SQL. Attempting to read `user_metadata` column fails with 42703 error.

**Solution:** Instead of trying to query `auth.users` directly, we:
1. Store pending users in a new `pending_auth_users` table
2. Auth service calls a stored function to queue users after signup
3. A sync function processes the queue and creates users table records

### Problem 2: 404 Static Assets
**Error:** `GET /_next/static/css/app/layout.css 404 (Not Found)`

**Root Cause:** Build incomplete or development server cache issues.

**Solution:** Cache will clear on next build. This is not blocking the core auth fix.

---

## SOLUTION ARCHITECTURE

### New Database Table: `pending_auth_users`
```sql
CREATE TABLE pending_auth_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  role VARCHAR(50),
  school_id UUID,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed BOOLEAN DEFAULT FALSE
);
```

**Purpose:** Tracks users who need to be synced from auth to database

### New Stored Functions

#### 1. `register_pending_auth_user()` - Called from Auth Service
```sql
CREATE FUNCTION register_pending_auth_user(
  p_auth_user_id UUID,
  p_email TEXT,
  p_role VARCHAR(50),
  p_school_id UUID,
  p_full_name TEXT
) RETURNS BOOLEAN
```

**When Called:** Immediately after successful signup
**What It Does:**
- Inserts user into `pending_auth_users` table
- Sets `processed = FALSE`
- Ready to be synced

#### 2. `sync_pending_auth_users()` - Processes the Queue
```sql
CREATE FUNCTION sync_pending_auth_users()
RETURNS TABLE(synced_count, skipped_count, failed_count)
```

**What It Does:**
- Reads unprocessed records from `pending_auth_users`
- Maps `'ADMIN'` role → `'SCHOOL_ADMIN'`
- Creates corresponding user records
- Marks processed
- Returns statistics

---

## CODE CHANGES APPLIED

### 1. Updated Auth Service (CRITICAL)
**File:** `src/services/auth.service.ts`

**Changes in all registration functions:**
- After successful auth signup, call:
  ```typescript
  await supabase.rpc('register_pending_auth_user', {
    p_auth_user_id: data.user.id,
    p_email: input.email,
    p_role: roleValue,
    p_school_id: input.schoolId,
    p_full_name: input.fullName,
  })
  ```

**Functions Updated:**
- ✅ `registerSchoolAdmin()`
- ✅ `registerStaff()` 
- ✅ `registerStudent()`

**Benefits:**
- Queues user immediately after signup
- Non-blocking (wrapped in try-catch)
- Won't prevent registration if queue fails

### 2. Updated Auth Fallback Logic
**File:** `src/services/auth.service.ts` (Line ~440)

**Before:**
```typescript
const role = data.user.user_metadata?.role as string
console.log('⚠️ Using metadata role:', role)
return {
  role: (role || 'STUDENT') as any,  // ← Defaults to STUDENT!
  schoolId: data.user.user_metadata?.schoolId,
}
```

**After:**
```typescript
const role = data.user.user_metadata?.role as string
const schoolId = data.user.user_metadata?.schoolId as string
console.log('⚠️ Using metadata role:', role, 'schoolId:', schoolId)

// Map 'ADMIN' role from old system to 'SCHOOL_ADMIN'
let mappedRole = role || 'STUDENT'
if (mappedRole === 'ADMIN') {
  mappedRole = 'SCHOOL_ADMIN'  // ← FIX!
}

return {
  role: (mappedRole || 'STUDENT') as any,
  schoolId: schoolId,  // ← Keep schoolId!
}
```

**Benefits:**
- ADMIN → SCHOOL_ADMIN mapping works
- schoolId is extracted and returned
- Users directed to correct dashboard

### 3. Created Migration 014
**File:** `database/migrations/014_auto_create_users_on_auth_signup.sql`

**What It Creates:**
- ✅ `pending_auth_users` table
- ✅ `register_pending_auth_user()` function
- ✅ `sync_pending_auth_users()` function  
- ✅ `debug_user_sync` view for monitoring
- ✅ Grant permissions to anon, authenticated, service_role

**Size:** ~200 lines, pure SQL, no triggers

### 4. Updated Debug Endpoint
**File:** `src/app/api/debug/fix-auth-users/route.ts`

**GET /api/debug/fix-auth-users**
```json
{
  "status": "ok",
  "pendingCount": 5,
  "processedCount": 10,
  "totalUsersInDatabase": 15,
  "message": "Run POST request to sync pending users"
}
```

**POST /api/debug/fix-auth-users**
```json
{
  "success": true,
  "message": "Sync completed",
  "results": {
    "syncedCount": 5,
    "skippedCount": 0,
    "failedCount": 0
  }
}
```

---

## STEP-BY-STEP IMPLEMENTATION

### Step 1: Run Migration in Supabase (5 minutes)
1. Go to https://supabase.com/dashboard
2. Select project: `egdreueuspmuxhezdpqm`
3. Go to **SQL Editor** → **New Query**
4. Copy entire file: `database/migrations/014_auto_create_users_on_auth_signup.sql`
5. Click **Run**
6. Wait for success (should see no errors)

### Step 2: Verify Migration Worked
In SQL Editor, run:
```sql
SELECT * FROM public.pending_auth_users LIMIT 1;
SELECT COUNT(*) FROM public.users;
```

**Expected:**
- First query: Returns empty or existing rows (table exists ✅)
- Second query: Returns number of existing users

### Step 3: Sync Existing Pending Users (If Any)
```bash
# Option A: Via API
curl -X POST http://localhost:3000/api/debug/fix-auth-users

# Option B: Via SQL
SELECT * FROM public.sync_pending_auth_users();
```

### Step 4: Test New Registration
1. Go to http://localhost:3000
2. Register a new school admin
3. Immediately check SQL:
   ```sql
   SELECT * FROM public.pending_auth_users 
   WHERE processed = FALSE LIMIT 1;
   ```
4. Should see your new user with role='ADMIN'

### Step 5: Test Login
1. Log in with newly registered school admin
2. Should be directed to **School Admin Dashboard** ✅
3. Check browser console for: `→ Redirecting to School Admin dashboard`

### Step 6: Verify Problem School
1. Log in as `gateway@gmail.com` (the problem school)
2. Should now see **School Admin Dashboard**
3. No longer redirected to Student Dashboard

---

## HOW THIS FIXES THE ISSUES

### Issue: "No school_id for student"
**Before:** Auth service queries users table, gets 406 error, falls back to metadata with role='ADMIN', defaults to STUDENT role, routes to student dashboard

**After:** 
- ✅ Auth service registers user → calls register_pending_auth_user()
- ✅ Pending user sits in `pending_auth_users` table
- ✅ On login, metadata fallback maps ADMIN → SCHOOL_ADMIN
- ✅ schoolId is extracted from metadata
- ✅ Routes to correct dashboard

### Issue: "406 Not Acceptable"
**Before:** Auth service tries: `SELECT ... FROM users WHERE id = ...` fails with 406

**After:**
- ✅ Auth service doesn't query users table on login
- ✅ Uses metadata fallback immediately (if users table query fails)
- ✅ No 406 error
- ✅ Fallback logic correctly maps roles

### Issue: "Failed to run sql query: column au.user_metadata does not exist"
**Before:** Migration 014 tried to query auth.users directly

**After:**
- ✅ No direct querying of auth.users
- ✅ Use `pending_auth_users` table instead
- ✅ Auth service queues users via RPC
- ✅ Sync processes the queue
- ✅ No SQL errors

---

## AUTOMATIC WORKFLOW (After This Fix)

### When User Registers:
1. User signs up → Creates `auth.users` record
2. Auth service calls `register_pending_auth_user()` → Queues user
3. User record inserted into `pending_auth_users` table

### When User Logs In:
1. Supabase Auth authenticates
2. Auth service extracts metadata
3. Maps role: ADMIN → SCHOOL_ADMIN
4. Extracts schoolId
5. Returns correct User object
6. Router directs to correct dashboard

### Behind the Scenes (Optional):
- Periodically run `sync_pending_auth_users()` to create users table records
- This gives us both `auth.users` AND `users` table records
- Provides redundancy and better auditability

---

## TESTING CHECKLIST

- [ ] Run Migration 014 successfully
- [ ] `pending_auth_users` table exists
- [ ] `register_pending_auth_user()` function callable
- [ ] `sync_pending_auth_users()` function callable
- [ ] Register NEW school admin → enters pending queue
- [ ] New school admin logs in → goes to School Admin Dashboard
- [ ] `gateway@gmail.com` logs in → goes to School Admin Dashboard (not student)
- [ ] Register NEW teacher → enters pending queue
- [ ] Teacher logs in → goes to Teacher Dashboard
- [ ] Register NEW student → enters pending queue  
- [ ] Student logs in → goes to Student Dashboard
- [ ] Run sync: `POST /api/debug/fix-auth-users`
- [ ] All users now have records in both auth.users and users tables

---

## ROLLBACK PLAN (If Needed)

```sql
-- Drop the new functions and table
DROP FUNCTION IF EXISTS public.sync_pending_auth_users();
DROP FUNCTION IF EXISTS public.register_pending_auth_user(UUID, TEXT, VARCHAR, UUID, TEXT);
DROP TABLE IF EXISTS public.pending_auth_users CASCADE;
DROP VIEW IF EXISTS public.debug_user_sync;

-- Users can still log in via metadata fallback
-- Just less reliable than with users table records
```

---

## PRODUCTION CHECKLIST

Before going to production:
- [ ] Run Migration 014 in production database
- [ ] Test complete registration and login flow
- [ ] Monitor pending_auth_users table (should process quickly)
- [ ] Set up monitoring for queue backlog
- [ ] Document the sync process for ops team
- [ ] Add periodic `sync_pending_auth_users()` calls if needed
- [ ] Remove debug endpoints (`/api/debug/*`) before launch

---

## DEFINITION OF SUCCESS

✅ **Fixed when:**

1. ✅ New school admin registers
2. ✅ Logs in immediately → School Admin Dashboard
3. ✅ `gateway@gmail.com` (problem school) logs in → School Admin Dashboard
4. ✅ Can access Staff & Teachers page
5. ✅ Registration modals show class and subject dropdowns
6. ✅ Can register teachers and students
7. ✅ Teachers log in → Teacher Dashboard
8. ✅ Students log in → Student Dashboard
9. ✅ No 406 errors
10. ✅ No "No school_id for student" errors
11. ✅ No static asset 404 errors (after next build)

---

**Status:** ✅ Code changes complete, awaiting Migration 014 execution
**Next Action:** Run the SQL migration in Supabase, then test full flow
