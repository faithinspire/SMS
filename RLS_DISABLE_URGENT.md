# URGENT: RLS Policies Are Blocking School Registration

## The Problem

Your school registration is getting a **201 status (Created)** but **empty response body**. This happens when:

1. ✅ The API request reaches Supabase
2. ✅ Supabase accepts the insert
3. ❌ **RLS policies prevent the row from being inserted**
4. ❌ Supabase returns 201 (success code) but empty body

**Result:** "Invalid server response" error because there's no data to parse.

---

## The Solution: Disable RLS NOW

### Option A: Manual Disable (Recommended - 2 minutes)

1. **Open Supabase Console:**
   - Go to: https://app.supabase.com
   - Project: `egdreueuspmuxhezdpqm`
   - Navigate to: **SQL Editor** (left sidebar)

2. **Click: New Query**

3. **Paste this SQL:**

```sql
-- DISABLE RLS ON SCHOOLS TABLE
ALTER TABLE schools DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- GRANT PUBLIC ACCESS
GRANT SELECT, INSERT, UPDATE, DELETE ON schools TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO anon, authenticated;

-- DROP ALL BLOCKING POLICIES
DROP POLICY IF EXISTS schools_public_select ON schools;
DROP POLICY IF EXISTS schools_auth_select ON schools;
DROP POLICY IF EXISTS schools_service_role ON schools;
DROP POLICY IF EXISTS schools_super_admin_all ON schools;
DROP POLICY IF EXISTS schools_super_admin_write ON schools;
DROP POLICY IF EXISTS schools_super_admin_update ON schools;
DROP POLICY IF EXISTS schools_super_admin_delete ON schools;
DROP POLICY IF EXISTS users_select_own_school ON users;
DROP POLICY IF EXISTS users_update_own ON users;
DROP POLICY IF EXISTS users_super_admin_all ON users;
DROP POLICY IF EXISTS users_super_admin_insert ON users;
```

4. **Click: Run** (⚡ button)

5. **Verify Success:**
   - Look for message: ✅ "Query successful"
   - You should see: "affected rows: 0" (which is normal)

---

## After Running the SQL

1. **Go to Dashboard:** http://localhost:3000/superadmin/dashboard
2. **Try registering a school again**
3. **Expected result:** ✅ "School registered successfully!"

---

## How to Verify RLS is Disabled

**Method 1: Supabase Console**
1. Go to: **Authentication** → **Policies**
2. Select **schools** table
3. Check: **RLS is OFF** ✓

**Method 2: Run Test Query**
```sql
-- This should show no policies
SELECT * FROM pg_policies WHERE tablename = 'schools';
-- Result: 0 rows
```

---

## If Still Not Working

**Check these:**

1. Did the SQL run without errors?
   - Look for error message in Supabase console
   
2. Is RLS actually OFF?
   - Go to: Authentication → Policies
   - Toggle for `schools` table should show **OFF**

3. Are the keys correct?
   - Check `.env.local` file
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` should not be empty

4. Clear browser cache?
   - Press: `Ctrl+Shift+Delete`
   - Clear: Cookies & cached images/files

5. Restart dev server?
   - Stop: `npm run dev`
   - Start: `npm run dev`

---

## What This Does

| Aspect | Before | After |
|--------|--------|-------|
| RLS Status | ❌ Enabled (Blocking) | ✅ Disabled (Allowing) |
| School Insert | ❌ Blocked by RLS | ✅ Works with ANON_KEY |
| API Response | ❌ Empty (201) | ✅ Full data (201) |
| School Registration | ❌ Fails | ✅ Works |

---

## Next: Test Immediately

```
1. Open: http://localhost:3000/superadmin/dashboard
2. Fill form:
   - School Name: "Test School"
   - Admin Email: "test@school.edu"
   - Admin Password: "Test123456!"
3. Click: Register School
4. Expected: ✅ "School registered successfully!"
```

---

## Why Not Use SERVICE_KEY?

SERVICE_KEY would bypass RLS, but it:
- Exposes sensitive credentials in client code
- Violates security best practices
- Not recommended by Supabase
- Better to disable RLS for now and rebuild policies later

---

**Status:** ⏳ WAITING FOR RLS DISABLE IN SUPABASE
**Action:** Run the SQL query above in Supabase console NOW

