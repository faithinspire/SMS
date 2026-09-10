# DATABASE MIGRATIONS - COMPLETE GUIDE

## REQUIRED MIGRATIONS FOR FULL SYSTEM

All migrations must be run IN ORDER in Supabase SQL Editor.

### ✅ MIGRATION 012: Disable RLS on All Tables
**File:** `database/migrations/012_master_disable_rls_all_tables.sql`
**Status:** ✅ ALREADY RUN
**What It Does:**
- Disables Row Level Security on 34+ tables
- Allows anon and authenticated users to query without RLS restrictions
- Required for development and multi-school isolation to work

**Run in Supabase:**
```bash
Copy entire file → Paste in SQL Editor → Click Run
```

---

### ✅ MIGRATION 013: Insert Test Data
**File:** `database/migrations/013_insert_test_data.sql`
**Status:** ✅ READY TO RUN
**What It Does:**
- Creates 12 classes (Primary 1-6, JSS 1-3, SS1-3)
- Creates 36 arms (A, B, C for each class)
- Creates 27 subjects (English, Math, Science, etc.)
- Creates class_arm_combo mappings
- **CRITICAL:** Must insert at least once per school before registration works

**Important:**
- This migration inserts data with a specific school_id
- You need to replace the school_id with YOUR school's UUID
- Test data must exist for dropdowns to populate

**How to Run:**
1. Get your school UUID:
   - Log in to Supabase dashboard
   - Go to schools table
   - Copy the `id` of your school
2. In SQL Editor, find these lines:
   ```sql
   -- Replace this UUID with your actual school_id:
   INSERT INTO classes (school_id, name, level, type) VALUES
     ('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', 'Primary 1', 1, 'PRIMARY'),
   ```
3. Replace `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` with your school UUID
4. Copy entire file → Paste → Run

**Verification:**
After running, in SQL Editor:
```sql
SELECT COUNT(*) FROM classes WHERE school_id = 'your-school-uuid';
SELECT COUNT(*) FROM subjects WHERE school_id = 'your-school-uuid';
SELECT COUNT(*) FROM class_arm_combos WHERE school_id = 'your-school-uuid';

-- Should show: 12 classes, 27 subjects, 36 combos
```

---

### ✅ MIGRATION 014: Auto Create Users on Auth Signup
**File:** `database/migrations/014_auto_create_users_on_auth_signup.sql`
**Status:** ⏳ NEEDS TO BE RUN
**What It Does:**
- Creates `pending_auth_users` table to queue new signups
- Creates `register_pending_auth_user()` function (called by auth service)
- Creates `sync_pending_auth_users()` function (processes the queue)
- Creates `debug_user_sync` view for monitoring
- Fixes the 406 errors and role mapping issues

**Why It's Critical:**
- Without this, users are created in auth.users but NOT in users table
- Causes 406 errors when auth service tries to query users table
- Auth falls back to metadata with wrong role (ADMIN not SCHOOL_ADMIN)
- Users get redirected to wrong dashboard

**How to Run:**
1. Go to https://supabase.com/dashboard
2. Select project: `egdreueuspmuxhezdpqm`
3. Go to **SQL Editor** → **New Query**
4. Copy entire file: `database/migrations/014_auto_create_users_on_auth_signup.sql`
5. Paste into SQL Editor
6. Click **Run**

**Verification:**
After running, in SQL Editor:
```sql
SELECT * FROM public.pending_auth_users LIMIT 1;
-- Should return empty or existing rows (table exists ✅)

SELECT COUNT(*) FROM public.users;
-- Should show count of existing users
```

---

## ORDER OF EXECUTION

```
012 (Disable RLS) 
  ↓
013 (Insert Test Data) - for EACH school
  ↓
014 (Auto Create Users)
  ↓
✅ System Ready
```

---

## WHAT EACH MIGRATION ENABLES

### After Migration 012:
- ✅ Data can be queried without RLS restrictions
- ✅ Multi-school isolation works via SQL queries
- ✅ Registration APIs can access data

### After Migration 013 (per school):
- ✅ Teachers can register (see classes/subjects in modal)
- ✅ Students can register (see classes in modal)
- ✅ Dropdowns populate correctly

### After Migration 014:
- ✅ New registrations work end-to-end
- ✅ Correct role routing to dashboards
- ✅ No 406 errors
- ✅ No "undefined role" issues

---

## IF MIGRATIONS FAIL

### Error: "Syntax error in SQL statement"
**Cause:** Copy/paste error or incomplete file
**Fix:**
1. Copy the ENTIRE file again
2. Make sure no lines are cut off
3. Verify braces/parentheses are balanced
4. Try again

### Error: "Table already exists"
**Cause:** Migration ran twice
**Fix:** This is fine, just skip it

### Error: "column does not exist"
**Cause:** Using wrong table name or column name
**Fix:**
1. Check the table name in migration
2. Verify it matches your schema
3. Try running just the CREATE TABLE part first

### Error: "permission denied"
**Cause:** User role doesn't have access
**Fix:**
1. Make sure you're logged in as owner/admin of the project
2. Try with service role key instead of anon key
3. Contact Supabase support

---

## MIGRATION 013 - DETAILED STEPS

Since Migration 013 needs customization for each school:

### Step 1: Get Your School UUID
```sql
SELECT id, name FROM public.schools LIMIT 10;
-- Copy the id of your school
```

### Step 2: Customize the Migration
In the file `database/migrations/013_insert_test_data.sql`:

Find this section:
```sql
-- REPLACE THIS UUID:
INSERT INTO classes (school_id, name, level, type) VALUES
  ('10459a61-7e93-494c-b951-6cef5d589a88', 'Primary 1', 1, 'PRIMARY'),
  ...
```

Replace `'10459a61-7e93-494c-b951-6cef5d589a88'` with YOUR school_id

Or use find/replace:
- Find: `'10459a61-7e93-494c-b951-6cef5d589a88'`
- Replace All: `'your-actual-school-uuid'`

### Step 3: Run in SQL Editor
- Paste the modified file
- Click Run
- Wait for completion

### Step 4: Verify
```sql
SELECT COUNT(*) as classes FROM classes 
  WHERE school_id = 'your-school-uuid';
SELECT COUNT(*) as subjects FROM subjects 
  WHERE school_id = 'your-school-uuid';
-- Both should show > 0
```

---

## ALTERNATIVE: API Method

Instead of running SQL migrations manually, you can use the API endpoint:

```bash
curl -X POST http://localhost:3000/api/debug/insert-test-data \
  -H "Content-Type: application/json" \
  -d '{"schoolId": "your-school-uuid-here"}'
```

This endpoint:
1. Takes schoolId as parameter
2. Creates 12 classes
3. Creates 36 arms
4. Creates 27 subjects
5. Returns statistics

**Response:**
```json
{
  "success": true,
  "message": "Test data inserted successfully",
  "data": {
    "classes": 12,
    "arms": 36,
    "combos": 36,
    "subjects": 27
  }
}
```

---

## STATUS OF CURRENT SYSTEM

- ✅ Migration 012 (Disable RLS) - COMPLETE
- ⏳ Migration 013 (Test Data) - NEEDS TO RUN (per school)
- ⏳ Migration 014 (Auto Users) - NEEDS TO RUN

---

## RECOMMENDED WORKFLOW

1. **Setup Phase** (once):
   - Run Migration 012 ✅
   - Run Migration 014

2. **Per School**:
   - Run Migration 013 for that school's UUID
   - OR call `/api/debug/insert-test-data` API

3. **Result**:
   - Teachers can register with class/subject dropdowns
   - Students can register with class dropdowns
   - Auth flow works correctly
   - Multi-school isolation maintained

---

## ROLLBACK (If Needed)

### Rollback Migration 014:
```sql
DROP FUNCTION IF EXISTS public.sync_pending_auth_users();
DROP FUNCTION IF EXISTS public.register_pending_auth_user(UUID, TEXT, VARCHAR, UUID, TEXT);
DROP TABLE IF EXISTS public.pending_auth_users CASCADE;
DROP VIEW IF EXISTS public.debug_user_sync;
-- System still works via metadata fallback, just less reliable
```

### Rollback Migration 013 (Delete Test Data):
```sql
DELETE FROM class_arm_combos WHERE school_id = 'your-school-uuid';
DELETE FROM arms WHERE school_id = 'your-school-uuid';
DELETE FROM classes WHERE school_id = 'your-school-uuid';
DELETE FROM subjects WHERE school_id = 'your-school-uuid';
```

### Rollback Migration 012 (Re-enable RLS):
```sql
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ... repeat for all tables
-- Not recommended in development
```

---

## QUICK CHECKLIST

Before testing registration:
- [ ] Migration 012 ran successfully
- [ ] Migration 013 ran with YOUR school UUID
- [ ] Migration 014 ran successfully
- [ ] Verified classes exist: `SELECT COUNT(*) FROM classes WHERE school_id = 'your-uuid'`
- [ ] Verified subjects exist: `SELECT COUNT(*) FROM subjects WHERE school_id = 'your-uuid'`
- [ ] Dev server running: `npm run dev`
- [ ] Logged in as school admin
- [ ] Can open registration modal
- [ ] Class dropdown shows options
- [ ] Subject list shows options

---

**Status:** All migrations prepared, ready to execute
**Next Step:** Run Migration 014 in Supabase
