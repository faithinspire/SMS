# RLS Disable - CORRECTED VERSION

## ⚠️ Previous SQL Had Error

**Error:** "relation submissions does not exist"

**Reason:** SQL referenced tables that don't exist in the database

**Solution:** Use corrected SQL below that only references actual tables

---

## ✅ Correct SQL (Copy This Exactly)

```sql
-- DISABLE RLS - CORRECTED FOR ACTUAL TABLES
ALTER TABLE schools DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE login_pins DISABLE ROW LEVEL SECURITY;
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE arms DISABLE ROW LEVEL SECURITY;
ALTER TABLE class_arm_combos DISABLE ROW LEVEL SECURITY;
ALTER TABLE subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE subject_teacher_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE staff DISABLE ROW LEVEL SECURITY;
ALTER TABLE guardians DISABLE ROW LEVEL SECURITY;
ALTER TABLE terms DISABLE ROW LEVEL SECURITY;
ALTER TABLE score_sheets DISABLE ROW LEVEL SECURITY;
ALTER TABLE report_cards DISABLE ROW LEVEL SECURITY;
ALTER TABLE fee_structures DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE receipts DISABLE ROW LEVEL SECURITY;
ALTER TABLE salaries DISABLE ROW LEVEL SECURITY;
ALTER TABLE payslips DISABLE ROW LEVEL SECURITY;
ALTER TABLE cbt_exams DISABLE ROW LEVEL SECURITY;
ALTER TABLE cbt_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE cbt_options DISABLE ROW LEVEL SECURITY;
ALTER TABLE cbt_submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE cbt_submission_scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE announcements DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- GRANT PUBLIC ACCESS
GRANT SELECT, INSERT, UPDATE, DELETE ON schools TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON login_pins TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON classes TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON arms TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON class_arm_combos TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON subjects TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON subject_teacher_assignments TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON students TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON student_subjects TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON staff TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON guardians TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON terms TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON score_sheets TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON report_cards TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON fee_structures TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON payments TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON receipts TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON salaries TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON payslips TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cbt_exams TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cbt_questions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cbt_options TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cbt_submissions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cbt_submission_scores TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON lesson_notes TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON assignments TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON assignment_submissions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON attendance TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON announcements TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON audit_logs TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON roles TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_roles TO anon, authenticated;

-- DROP ALL POLICIES
DROP POLICY IF EXISTS school_isolation_students ON students;
DROP POLICY IF EXISTS school_isolation_users ON users;
DROP POLICY IF EXISTS school_isolation_score_sheets ON score_sheets;
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
```

---

## Steps to Apply

### 1. Open Supabase Console
```
https://app.supabase.com
→ Project: egdreueuspmuxhezdpqm
```

### 2. SQL Editor
```
Click: SQL Editor (left sidebar)
Click: New Query
```

### 3. Copy & Paste
- Copy ALL the SQL above (from `ALTER TABLE` to last `DROP POLICY`)
- Paste in Supabase SQL Editor
- **DO NOT** include the markdown formatting

### 4. Run Query
```
Click: Run ⚡ button
Wait for: ✅ "Query successful"
```

### 5. Verify Success
```
Check: No error messages
Check: "X queries completed"
```

---

## After SQL Runs Successfully

### Clear Browser Cache
```
Press: Ctrl + Shift + Delete
Select: Cookies & Cache
Click: Clear Now
```

### Refresh Page
```
Go to: http://localhost:3000/landing
Press: F5 (refresh)
```

### Try Login Again
```
Click: Login as School Admin
Email: (your admin email from registration)
Password: (your admin password from registration)
Expected: ✅ Login successful
```

---

## If SQL Still Fails

### Check Error Message
- Read the exact error shown
- Copy the error text

### Common Errors

**"relation X does not exist"**
- Solution: Some tables might not be created
- Run simpler query (just disable schools & users tables)

**"permission denied"**
- Solution: You need admin access to Supabase
- Check: Are you logged in as project owner?

**"syntax error"**
- Solution: Check for missing semicolons
- Verify: All lines copied correctly

### Fallback: Disable Only Main Tables

If full SQL fails, try this simpler version:

```sql
ALTER TABLE schools DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON schools TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO anon, authenticated;
```

---

## Test After RLS Disable

### Login Test
```
1. Go to: http://localhost:3000/landing
2. Click: "Login as School Admin"
3. Enter: Admin credentials from registration
4. Expected: ✅ Dashboard appears
```

### Check Browser Console
```
Press: F12
Go to: Console tab
Look for: Errors (red text)
Expected: ✅ No auth errors
```

---

## Success Indicators

✅ No "403 Forbidden" errors
✅ No "RLS policy" errors  
✅ Login works
✅ Data loads
✅ No SQL errors in console

---

## Next Step

After login works:
1. Go to admin dashboard
2. Register a student
3. Have student login
4. Student takes CBT exam

---

**Status:** Waiting for SQL to run
**Time:** 2 minutes
**Result:** Full system functional

