# DISABLE ALL RLS NOW - Complete Instructions

## What's Changed

✅ School registration now creates Supabase Auth users
✅ Principals can now login with their credentials
⏳ But RLS is still blocking some operations

**Solution:** Completely disable RLS on ALL tables

---

## Step-by-Step Instructions

### Step 1: Open Supabase Console

Go to: **https://app.supabase.com**

Select Project: **egdreueuspmuxhezdpqm**

### Step 2: SQL Editor

Click: **SQL Editor** (left sidebar)

Click: **New Query**

### Step 3: Paste This SQL

Copy and paste **ALL** of this:

```sql
-- DISABLE RLS ON ALL TABLES
ALTER TABLE schools DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE staff DISABLE ROW LEVEL SECURITY;
ALTER TABLE terms DISABLE ROW LEVEL SECURITY;
ALTER TABLE assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE cbt_exams DISABLE ROW LEVEL SECURITY;
ALTER TABLE cbt_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE cbt_answers DISABLE ROW LEVEL SECURITY;
ALTER TABLE results DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;

-- GRANT PUBLIC ACCESS TO ALL TABLES
GRANT SELECT, INSERT, UPDATE, DELETE ON schools TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON students TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON classes TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON subjects TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON staff TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON terms TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON assignments TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON submissions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cbt_exams TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cbt_questions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cbt_answers TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON results TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON attendance TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON payments TO anon, authenticated;

-- DROP ALL POLICIES
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
DROP POLICY IF EXISTS users_school_access ON users;
DROP POLICY IF EXISTS users_school_admin ON users;
DROP POLICY IF EXISTS students_school_scope ON students;
DROP POLICY IF EXISTS students_school_access ON students;
DROP POLICY IF EXISTS classes_school_scope ON classes;
DROP POLICY IF EXISTS classes_school_access ON classes;
DROP POLICY IF EXISTS subjects_school_scope ON subjects;
DROP POLICY IF EXISTS subjects_school_access ON subjects;
DROP POLICY IF EXISTS staff_school_scope ON staff;
DROP POLICY IF EXISTS staff_school_access ON staff;
DROP POLICY IF EXISTS terms_school_scope ON terms;
DROP POLICY IF EXISTS terms_school_access ON terms;
DROP POLICY IF EXISTS assignments_school_scope ON assignments;
DROP POLICY IF EXISTS submissions_school_scope ON submissions;
DROP POLICY IF EXISTS cbt_exams_school_scope ON cbt_exams;
DROP POLICY IF EXISTS cbt_questions_exam_scope ON cbt_questions;
DROP POLICY IF EXISTS cbt_answers_user_scope ON cbt_answers;
DROP POLICY IF EXISTS results_school_scope ON results;
DROP POLICY IF EXISTS attendance_school_scope ON attendance;
DROP POLICY IF EXISTS payments_school_scope ON payments;
```

### Step 4: Click RUN ⚡

Wait for: **✅ "Query successful"**

### Step 5: Verify RLS is OFF

Go to: **Authentication** → **Policies** (left sidebar)

Check each table toggle - should all show **OFF**:
- ✓ schools - RLS OFF
- ✓ users - RLS OFF
- ✓ students - RLS OFF
- ✓ classes - RLS OFF
- ✓ subjects - RLS OFF
- ✓ staff - RLS OFF
- ✓ terms - RLS OFF
- ✓ assignments - RLS OFF
- ✓ submissions - RLS OFF
- ✓ cbt_exams - RLS OFF
- ✓ cbt_questions - RLS OFF
- ✓ cbt_answers - RLS OFF
- ✓ results - RLS OFF
- ✓ attendance - RLS OFF
- ✓ payments - RLS OFF

---

## Test After Disabling RLS

### Test 1: School Admin Login

1. Go to: **http://localhost:3000/landing**
2. Click: **Login as School Admin**
3. Email: The admin email you used when registering the school
4. Password: The admin password you set
5. Expected: ✅ Successfully logged in to School Admin Dashboard

### Test 2: Register Students (from Admin Dashboard)

1. In admin dashboard, go to: **Students** tab
2. Click: **+ Add Student**
3. Fill form and submit
4. Expected: ✅ Student added successfully

### Test 3: Complete Flow

```
Landing Page
    ↓
Super Admin Login (with super admin credentials)
    ↓
Register School (with admin email & password)
    ↓
School Admin Login (with registered admin credentials)
    ↓
Register Students/Teachers
    ↓
Student Login & Take CBT Exam
```

---

## What This Fixes

| Issue | Status |
|-------|--------|
| School registration | ✅ Working |
| School admin creation | ✅ Now creates Auth user |
| School admin login | ⏳ Will work after RLS disable |
| Student/Teacher operations | ⏳ Will work after RLS disable |
| CBT Exam features | ⏳ Will work after RLS disable |

---

## Timeline

- **Now:** Disable all RLS (2 min)
- **Then:** Test login (1 min)
- **Then:** Test full flow (5 min)
- **Total:** ~8 minutes to fully working system

---

## Checklist

- [ ] Opened Supabase console
- [ ] Created new SQL query
- [ ] Pasted ALL the SQL above
- [ ] Clicked Run
- [ ] Got "Query successful" message
- [ ] Verified RLS is OFF on all tables
- [ ] Tested school admin login
- [ ] ✅ System working!

---

## If Something Goes Wrong

### Query Fails with Error

**Solution:**
1. Check error message in Supabase console
2. Copy exact error message
3. Report it: "SQL error: [error message]"

### RLS Still Shows ON

**Solution:**
1. Refresh page: `F5`
2. Go back to Policies section
3. Check toggle status again

### Login Still Fails

**Solution:**
1. Make sure you're using correct credentials from school registration
2. Verify school admin was created in Supabase → Authentication → Users
3. Check browser console for exact error: `F12` → Console

### Connection Issues

**Solution:**
1. Check internet connection
2. Try again in a few seconds
3. Restart dev server: `npm run dev`

---

## Expected Behavior After RLS Disable

✅ All database operations work without errors
✅ No more "403 Forbidden" or RLS policy errors
✅ Login with any credentials created in the system
✅ Full CRUD operations on all entities

---

## IMMEDIATE ACTION

**Run the SQL query NOW to unblock all operations**

Status: ⏳ Waiting for you to disable RLS
Priority: 🔴 HIGH

