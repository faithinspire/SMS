-- Migration 138: Fix school deletion with proper cascading
-- Purpose: Ensure all foreign keys have ON DELETE CASCADE to allow school deletion
-- This will prevent orphaned records when a school is deleted

BEGIN;

-- Ensure all user-related cascades
ALTER TABLE login_pins DROP CONSTRAINT IF EXISTS login_pins_school_id_fkey;
ALTER TABLE login_pins ADD CONSTRAINT login_pins_school_id_fkey 
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

-- Ensure user_roles cascade
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_school_id_fkey;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_school_id_fkey 
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

-- Academic structure cascades
ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_school_id_fkey;
ALTER TABLE classes ADD CONSTRAINT classes_school_id_fkey 
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

ALTER TABLE arms DROP CONSTRAINT IF EXISTS arms_school_id_fkey;
ALTER TABLE arms ADD CONSTRAINT arms_school_id_fkey 
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

ALTER TABLE class_arm_combos DROP CONSTRAINT IF EXISTS class_arm_combos_school_id_fkey;
ALTER TABLE class_arm_combos ADD CONSTRAINT class_arm_combos_school_id_fkey 
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

-- Terms/Sessions cascade
ALTER TABLE academic_sessions DROP CONSTRAINT IF EXISTS academic_sessions_school_id_fkey;
ALTER TABLE academic_sessions ADD CONSTRAINT academic_sessions_school_id_fkey 
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

ALTER TABLE terms DROP CONSTRAINT IF EXISTS terms_school_id_fkey;
ALTER TABLE terms ADD CONSTRAINT terms_school_id_fkey 
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

-- Students cascade
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_school_id_fkey;
ALTER TABLE students ADD CONSTRAINT students_school_id_fkey 
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

-- Subjects and assignments cascade
ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_school_id_fkey;
ALTER TABLE subjects ADD CONSTRAINT subjects_school_id_fkey 
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

ALTER TABLE subject_teacher_assignments DROP CONSTRAINT IF EXISTS subject_teacher_assignments_school_id_fkey;
ALTER TABLE subject_teacher_assignments ADD CONSTRAINT subject_teacher_assignments_school_id_fkey 
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

ALTER TABLE student_subjects DROP CONSTRAINT IF EXISTS student_subjects_school_id_fkey;
ALTER TABLE student_subjects ADD CONSTRAINT student_subjects_school_id_fkey 
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

-- Score sheets cascade
ALTER TABLE score_sheets DROP CONSTRAINT IF EXISTS score_sheets_school_id_fkey;
ALTER TABLE score_sheets ADD CONSTRAINT score_sheets_school_id_fkey 
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

-- CBT cascade (cbt_exams not cbt_tests)
ALTER TABLE cbt_exams DROP CONSTRAINT IF EXISTS cbt_exams_school_id_fkey;
ALTER TABLE cbt_exams ADD CONSTRAINT cbt_exams_school_id_fkey 
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

ALTER TABLE cbt_questions DROP CONSTRAINT IF EXISTS cbt_questions_school_id_fkey;
ALTER TABLE cbt_questions ADD CONSTRAINT cbt_questions_school_id_fkey 
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

ALTER TABLE cbt_submissions DROP CONSTRAINT IF EXISTS cbt_submissions_school_id_fkey;
ALTER TABLE cbt_submissions ADD CONSTRAINT cbt_submissions_school_id_fkey 
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

-- Assignments and lessons cascade
ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_school_id_fkey;
ALTER TABLE assignments ADD CONSTRAINT assignments_school_id_fkey 
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

ALTER TABLE lesson_notes DROP CONSTRAINT IF EXISTS lesson_notes_school_id_fkey;
ALTER TABLE lesson_notes ADD CONSTRAINT lesson_notes_school_id_fkey 
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

-- Broadcasts cascade
ALTER TABLE broadcasts DROP CONSTRAINT IF EXISTS broadcasts_school_id_fkey;
ALTER TABLE broadcasts ADD CONSTRAINT broadcasts_school_id_fkey 
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

-- Transactions cascade
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_school_id_fkey;
ALTER TABLE transactions ADD CONSTRAINT transactions_school_id_fkey 
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

-- Ensure RLS is disabled for DELETE operations
ALTER TABLE schools DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE arms DISABLE ROW LEVEL SECURITY;
ALTER TABLE class_arm_combos DISABLE ROW LEVEL SECURITY;
ALTER TABLE academic_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE terms DISABLE ROW LEVEL SECURITY;
ALTER TABLE subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE subject_teacher_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE score_sheets DISABLE ROW LEVEL SECURITY;
ALTER TABLE cbt_exams DISABLE ROW LEVEL SECURITY;
ALTER TABLE cbt_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE cbt_submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE broadcasts DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;

-- Ensure DELETE permissions
GRANT DELETE ON schools TO authenticated;
GRANT DELETE ON schools TO anon;

COMMIT;
