-- ============================================================================
-- MASTER RLS DISABLE MIGRATION
-- Completely disables Row Level Security (RLS) across ALL tables in the project
-- This allows full data access without RLS restrictions
-- ============================================================================

-- ============================================================================
-- SECTION 1: DISABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE IF EXISTS schools DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS login_pins DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS arms DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS class_arm_combos DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS subject_teacher_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS students DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS student_subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS staff DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS guardians DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS terms DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS score_sheets DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS report_cards DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS fee_structures DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS receipts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS salaries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payslips DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cbt_exams DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cbt_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cbt_options DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cbt_submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cbt_submission_scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lesson_notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS assignment_submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS announcements DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_roles DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 2: DROP ALL EXISTING RLS POLICIES
-- ============================================================================

-- Schools policies
DROP POLICY IF EXISTS "schools_public_select" ON schools;
DROP POLICY IF EXISTS "schools_auth_select" ON schools;
DROP POLICY IF EXISTS "schools_service_role" ON schools;
DROP POLICY IF EXISTS "schools_super_admin_all" ON schools;
DROP POLICY IF EXISTS "schools_super_admin_write" ON schools;
DROP POLICY IF EXISTS "schools_super_admin_update" ON schools;
DROP POLICY IF EXISTS "schools_super_admin_delete" ON schools;

-- Users policies
DROP POLICY IF EXISTS "users_select_own_school" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_super_admin_all" ON users;
DROP POLICY IF EXISTS "users_super_admin_insert" ON users;
DROP POLICY IF EXISTS "users_school_access" ON users;
DROP POLICY IF EXISTS "users_school_admin" ON users;
DROP POLICY IF EXISTS "school_isolation_users" ON users;

-- Students policies
DROP POLICY IF EXISTS "school_isolation_students" ON students;
DROP POLICY IF EXISTS "students_view_own" ON students;
DROP POLICY IF EXISTS "students_school_access" ON students;

-- Score sheets policies
DROP POLICY IF EXISTS "school_isolation_score_sheets" ON score_sheets;
DROP POLICY IF EXISTS "score_sheets_view_own" ON score_sheets;

-- Login pins policies
DROP POLICY IF EXISTS "login_pins_school_isolation" ON login_pins;

-- Classes policies
DROP POLICY IF EXISTS "classes_school_isolation" ON classes;

-- Arms policies
DROP POLICY IF EXISTS "arms_school_isolation" ON arms;

-- Class arm combos policies
DROP POLICY IF EXISTS "class_arm_combos_school_isolation" ON class_arm_combos;

-- Subjects policies
DROP POLICY IF EXISTS "subjects_school_isolation" ON subjects;

-- Subject teacher assignments policies
DROP POLICY IF EXISTS "subject_teacher_assignments_school_isolation" ON subject_teacher_assignments;

-- Staff policies
DROP POLICY IF EXISTS "staff_school_isolation" ON staff;

-- Guardians policies
DROP POLICY IF EXISTS "guardians_school_isolation" ON guardians;

-- Terms policies
DROP POLICY IF EXISTS "terms_school_isolation" ON terms;

-- Report cards policies
DROP POLICY IF EXISTS "report_cards_school_isolation" ON report_cards;

-- Fee structures policies
DROP POLICY IF EXISTS "fee_structures_school_isolation" ON fee_structures;

-- Payments policies
DROP POLICY IF EXISTS "payments_school_isolation" ON payments;

-- Receipts policies
DROP POLICY IF EXISTS "receipts_school_isolation" ON receipts;

-- Salaries policies
DROP POLICY IF EXISTS "salaries_school_isolation" ON salaries;

-- Payslips policies
DROP POLICY IF EXISTS "payslips_school_isolation" ON payslips;

-- CBT exams policies
DROP POLICY IF EXISTS "cbt_exams_school_isolation" ON cbt_exams;

-- CBT questions policies
DROP POLICY IF EXISTS "cbt_questions_school_isolation" ON cbt_questions;

-- CBT options policies
DROP POLICY IF EXISTS "cbt_options_school_isolation" ON cbt_options;

-- CBT submissions policies
DROP POLICY IF EXISTS "cbt_submissions_school_isolation" ON cbt_submissions;

-- CBT submission scores policies
DROP POLICY IF EXISTS "cbt_submission_scores_school_isolation" ON cbt_submission_scores;

-- Lesson notes policies
DROP POLICY IF EXISTS "lesson_notes_school_isolation" ON lesson_notes;

-- Assignments policies
DROP POLICY IF EXISTS "assignments_school_isolation" ON assignments;

-- Assignment submissions policies
DROP POLICY IF EXISTS "assignment_submissions_school_isolation" ON assignment_submissions;

-- Attendance policies
DROP POLICY IF EXISTS "attendance_school_isolation" ON attendance;

-- Announcements policies
DROP POLICY IF EXISTS "announcements_school_isolation" ON announcements;

-- Notifications policies
DROP POLICY IF EXISTS "notifications_school_isolation" ON notifications;

-- Audit logs policies
DROP POLICY IF EXISTS "audit_logs_school_isolation" ON audit_logs;

-- Student subjects policies
DROP POLICY IF EXISTS "student_subjects_school_isolation" ON student_subjects;

-- Roles policies
DROP POLICY IF EXISTS "roles_public_read" ON roles;

-- User roles policies
DROP POLICY IF EXISTS "user_roles_school_isolation" ON user_roles;

-- ============================================================================
-- SECTION 3: GRANT FULL PERMISSIONS TO ALL ROLES
-- ============================================================================

-- Grant to anon (unauthenticated users)
GRANT SELECT, INSERT, UPDATE, DELETE ON schools TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON login_pins TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON classes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON arms TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON class_arm_combos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON subjects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON subject_teacher_assignments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON students TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON student_subjects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON staff TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON guardians TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON terms TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON score_sheets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON report_cards TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON fee_structures TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON payments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON receipts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON salaries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON payslips TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON cbt_exams TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON cbt_questions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON cbt_options TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON cbt_submissions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON cbt_submission_scores TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON lesson_notes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON assignments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON assignment_submissions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON attendance TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON announcements TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON audit_logs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON roles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_roles TO anon;

-- Grant to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON schools TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON login_pins TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON classes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON arms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON class_arm_combos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON subjects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON subject_teacher_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON students TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON student_subjects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON staff TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON guardians TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON terms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON score_sheets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON report_cards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON fee_structures TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON receipts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON salaries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON payslips TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cbt_exams TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cbt_questions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cbt_options TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cbt_submissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cbt_submission_scores TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON lesson_notes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON assignment_submissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON attendance TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON announcements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_roles TO authenticated;

-- ============================================================================
-- SECTION 4: VERIFICATION
-- ============================================================================

-- Note: Verify that RLS is disabled on all tables by running:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
-- All should show 'f' (false) for rowsecurity column after this migration executes.
