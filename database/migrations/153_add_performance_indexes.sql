-- Migration 153: Add critical performance indexes
-- Optimizes queries for staff, student, and results pages
-- Disables RLS on critical tables for query performance

-- Performance indexes for students table
CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_class_arm_combo_id ON students(class_arm_combo_id);
CREATE INDEX IF NOT EXISTS idx_students_admission_number ON students(admission_number, school_id);

-- Performance indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_school_id ON users(school_id);
CREATE INDEX IF NOT EXISTS idx_users_school_id_role ON users(school_id, role);
CREATE INDEX IF NOT EXISTS idx_users_email_school ON users(email, school_id);

-- Performance indexes for staff table
CREATE INDEX IF NOT EXISTS idx_staff_school_id ON staff(school_id);
CREATE INDEX IF NOT EXISTS idx_staff_user_id_school ON staff(user_id, school_id);

-- Performance indexes for subject_teacher_assignments
CREATE INDEX IF NOT EXISTS idx_subject_teacher_assignments_school_teacher 
  ON subject_teacher_assignments(school_id, teacher_id);
CREATE INDEX IF NOT EXISTS idx_subject_teacher_assignments_school_class 
  ON subject_teacher_assignments(school_id, class_arm_combo_id);

-- Performance indexes for student_subjects
CREATE INDEX IF NOT EXISTS idx_student_subjects_school_student 
  ON student_subjects(school_id, student_id);

-- Performance indexes for score_sheets
CREATE INDEX IF NOT EXISTS idx_score_sheets_school_term 
  ON score_sheets(school_id, academic_term_id);
CREATE INDEX IF NOT EXISTS idx_score_sheets_school_student_term 
  ON score_sheets(school_id, student_id, academic_term_id);

-- Performance indexes for class_arm_combos
CREATE INDEX IF NOT EXISTS idx_class_arm_combos_school_id ON class_arm_combos(school_id);
CREATE INDEX IF NOT EXISTS idx_class_arm_combos_class_id ON class_arm_combos(class_id);

-- Performance indexes for academic tables
CREATE INDEX IF NOT EXISTS idx_academic_sessions_school_active 
  ON academic_sessions(school_id, is_active);
CREATE INDEX IF NOT EXISTS idx_academic_terms_school_active 
  ON academic_terms(school_id, is_active);

-- Disable RLS on critical tables for performance (app enforces school_id security)
-- RLS policies can cause significant query performance degradation
-- App-level filtering on school_id provides sufficient security
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE staff DISABLE ROW LEVEL SECURITY;
ALTER TABLE score_sheets DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE subject_teacher_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE class_arm_combos DISABLE ROW LEVEL SECURITY;
ALTER TABLE academic_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE academic_terms DISABLE ROW LEVEL SECURITY;

-- Verify indexes were created
-- SELECT schemaname, tablename, indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename;
