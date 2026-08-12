-- Disable RLS on schools table to allow anon key access
-- This is safe because schools is a public table with no sensitive data

ALTER TABLE schools DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Grant public access to schools table
GRANT SELECT, INSERT, UPDATE, DELETE ON schools TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO anon, authenticated;

-- Drop all policies on schools
DROP POLICY IF EXISTS schools_public_select ON schools;
DROP POLICY IF EXISTS schools_auth_select ON schools;
DROP POLICY IF EXISTS schools_service_role ON schools;
DROP POLICY IF EXISTS schools_super_admin_all ON schools;
DROP POLICY IF EXISTS schools_super_admin_write ON schools;
DROP POLICY IF EXISTS schools_super_admin_update ON schools;
DROP POLICY IF EXISTS schools_super_admin_delete ON schools;

-- Drop all policies on users
DROP POLICY IF EXISTS users_select_own_school ON users;
DROP POLICY IF EXISTS users_update_own ON users;
DROP POLICY IF EXISTS users_super_admin_all ON users;
DROP POLICY IF EXISTS users_super_admin_insert ON users;
DROP POLICY IF EXISTS users_school_access ON users;
DROP POLICY IF EXISTS users_school_admin ON users;

-- Drop other table policies
DROP POLICY IF EXISTS students_school_scope ON students;
DROP POLICY IF EXISTS classes_school_scope ON classes;
DROP POLICY IF EXISTS subjects_school_scope ON subjects;
DROP POLICY IF EXISTS staff_school_scope ON staff;
DROP POLICY IF EXISTS terms_school_scope ON terms;

-- Drop all RLS-enabled tables' policies and disable RLS temporarily for setup
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE staff DISABLE ROW LEVEL SECURITY;
ALTER TABLE terms DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS students_school_access ON students;
DROP POLICY IF EXISTS classes_school_access ON classes;
DROP POLICY IF EXISTS subjects_school_access ON subjects;
DROP POLICY IF EXISTS staff_school_access ON staff;
DROP POLICY IF EXISTS terms_school_access ON terms;
