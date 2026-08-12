-- COMPREHENSIVE RLS DISABLE - ONLY EXISTING TABLES
-- This disables RLS and grants public access to all tables that actually exist

-- Disable RLS on all existing tables
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

-- Grant public access to all tables
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

-- Drop all existing RLS policies
DROP POLICY IF EXISTS school_isolation_students ON students;
DROP POLICY IF EXISTS school_isolation_users ON users;
DROP POLICY IF EXISTS school_isolation_score_sheets ON score_sheets;

-- Drop any other policies that might exist
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

