-- ============================================================================
-- MIGRATION 043: CONSOLIDATE REDUNDANT TABLES TO UNIFIED ARCHITECTURE
-- Remove result_entries, student_subject_enrollment, teacher_assignments
-- Enforce single source of truth: score_sheets, subject_teacher_assignments, student_subjects
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: VERIFY CANONICAL TABLES EXIST AND ARE PROPERLY CONFIGURED
-- ============================================================================

-- Ensure score_sheets is the ONLY canonical assessment storage
ALTER TABLE IF EXISTS score_sheets
  ALTER COLUMN school_id SET NOT NULL,
  ALTER COLUMN student_id SET NOT NULL,
  ALTER COLUMN subject_id SET NOT NULL,
  ALTER COLUMN term_id SET NOT NULL;

-- Add missing critical columns to score_sheets if not present
ALTER TABLE score_sheets ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE score_sheets ADD COLUMN IF NOT EXISTS class_arm_combo_id UUID REFERENCES class_arm_combos(id) ON DELETE SET NULL;
ALTER TABLE score_sheets ADD COLUMN IF NOT EXISTS test1_source VARCHAR(20) CHECK (test1_source IS NULL OR test1_source IN ('MANUAL', 'CBT'));
ALTER TABLE score_sheets ADD COLUMN IF NOT EXISTS test2_source VARCHAR(20) CHECK (test2_source IS NULL OR test2_source IN ('MANUAL', 'CBT'));
ALTER TABLE score_sheets ADD COLUMN IF NOT EXISTS test3_source VARCHAR(20) CHECK (test3_source IS NULL OR test3_source IN ('MANUAL', 'CBT'));
ALTER TABLE score_sheets ADD COLUMN IF NOT EXISTS test4_source VARCHAR(20) CHECK (test4_source IS NULL OR test4_source IN ('MANUAL', 'CBT'));
ALTER TABLE score_sheets ADD COLUMN IF NOT EXISTS exam_source VARCHAR(20) CHECK (exam_source IS NULL OR exam_source IN ('MANUAL', 'CBT'));

-- Ensure subject_teacher_assignments exists with all required columns
-- CRITICAL: Add assigned_at column BEFORE trying to use it in migrations below
CREATE TABLE IF NOT EXISTS subject_teacher_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL,
  teacher_id UUID NOT NULL,
  subject_id UUID NOT NULL,
  class_arm_combo_id UUID NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, teacher_id, subject_id, class_arm_combo_id)
);

-- Set NOT NULL constraints
ALTER TABLE IF EXISTS subject_teacher_assignments
  ALTER COLUMN school_id SET NOT NULL,
  ALTER COLUMN teacher_id SET NOT NULL,
  ALTER COLUMN subject_id SET NOT NULL,
  ALTER COLUMN class_arm_combo_id SET NOT NULL;

-- Ensure assigned_at column exists (this is the CRITICAL FIX)
ALTER TABLE IF EXISTS subject_teacher_assignments 
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Ensure student_subjects is the ONLY student-subject enrollment link
ALTER TABLE IF EXISTS student_subjects
  ALTER COLUMN school_id SET NOT NULL,
  ALTER COLUMN student_id SET NOT NULL,
  ALTER COLUMN subject_id SET NOT NULL;

-- ============================================================================
-- STEP 2: MIGRATE DATA FROM REDUNDANT TABLES TO CANONICAL TABLES (IF ANY EXISTS)
-- ============================================================================

-- Migrate result_entries data to score_sheets (if result_entries exists and has data)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'result_entries') THEN
    INSERT INTO score_sheets (
      id, school_id, student_id, subject_id, term_id, teacher_id, class_arm_combo_id,
      test1, test2, test3, test4, exam, grade, updated_at
    )
    SELECT
      id, school_id, student_id, subject_id, 
      (SELECT id FROM terms LIMIT 1), -- Use current/first term if term_id missing
      teacher_id, class_arm_combo_id,
      test1_score, test2_score, test3_score, test4_score, exam_score, grade, updated_at
    FROM result_entries re
    WHERE NOT EXISTS (
      SELECT 1 FROM score_sheets ss
      WHERE ss.school_id = re.school_id
        AND ss.student_id = re.student_id
        AND ss.subject_id = re.subject_id
        AND ss.term_id = (SELECT id FROM terms LIMIT 1)
    )
    ON CONFLICT (school_id, student_id, subject_id, term_id) 
    DO UPDATE SET
      teacher_id = EXCLUDED.teacher_id,
      test1 = EXCLUDED.test1,
      test2 = EXCLUDED.test2,
      test3 = EXCLUDED.test3,
      test4 = EXCLUDED.test4,
      exam = EXCLUDED.exam,
      grade = EXCLUDED.grade,
      updated_at = NOW();
  END IF;
END $$;

-- Migrate teacher_assignments to subject_teacher_assignments (if exists and has data)
-- IMPORTANT: We now just copy id, school_id, teacher_id, subject_id, class_arm_combo_id
-- The assigned_at column already exists in subject_teacher_assignments with DEFAULT NOW()
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teacher_assignments') THEN
    INSERT INTO subject_teacher_assignments (
      id, school_id, teacher_id, subject_id, class_arm_combo_id
    )
    SELECT
      id, school_id, teacher_id, subject_id, class_arm_combo_id
    FROM teacher_assignments ta
    WHERE NOT EXISTS (
      SELECT 1 FROM subject_teacher_assignments sta
      WHERE sta.school_id = ta.school_id
        AND sta.teacher_id = ta.teacher_id
        AND sta.subject_id = ta.subject_id
        AND sta.class_arm_combo_id = ta.class_arm_combo_id
    )
    ON CONFLICT (school_id, teacher_id, subject_id, class_arm_combo_id)
    DO NOTHING;
  END IF;
END $$;

-- Migrate student_subject_enrollment to student_subjects (if exists and has data)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_subject_enrollment') THEN
    INSERT INTO student_subjects (
      id, school_id, student_id, subject_id
    )
    SELECT
      id, school_id, student_id, subject_id
    FROM student_subject_enrollment sse
    WHERE NOT EXISTS (
      SELECT 1 FROM student_subjects ss
      WHERE ss.school_id = sse.school_id
        AND ss.student_id = sse.student_id
        AND ss.subject_id = sse.subject_id
    )
    ON CONFLICT (student_id, subject_id)
    DO UPDATE SET school_id = EXCLUDED.school_id;
  END IF;
END $$;

-- ============================================================================
-- STEP 3: DROP REDUNDANT TABLES
-- ============================================================================

-- Drop result_entries and dependent objects
DROP TRIGGER IF EXISTS result_entries_calculate_test_total ON result_entries;
DROP TRIGGER IF EXISTS result_entries_calculate_total_score ON result_entries;
DROP FUNCTION IF EXISTS calculate_test_total() CASCADE;
DROP FUNCTION IF EXISTS calculate_total_score() CASCADE;
DROP TABLE IF EXISTS result_entries CASCADE;

-- Drop student_subject_enrollment
DROP TABLE IF EXISTS student_subject_enrollment CASCADE;

-- Drop teacher_assignments
DROP TABLE IF EXISTS teacher_assignments CASCADE;

-- Drop teacher_class_assignments if created
DROP TABLE IF EXISTS teacher_class_assignments CASCADE;

-- ============================================================================
-- STEP 4: CREATE/ENSURE INDICES ON CANONICAL TABLES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_score_sheets_student ON score_sheets(student_id);
CREATE INDEX IF NOT EXISTS idx_score_sheets_subject ON score_sheets(subject_id);
CREATE INDEX IF NOT EXISTS idx_score_sheets_term ON score_sheets(term_id);
CREATE INDEX IF NOT EXISTS idx_score_sheets_teacher ON score_sheets(teacher_id);
CREATE INDEX IF NOT EXISTS idx_score_sheets_class ON score_sheets(class_arm_combo_id);
CREATE INDEX IF NOT EXISTS idx_score_sheets_student_subject_term ON score_sheets(student_id, subject_id, term_id);
CREATE INDEX IF NOT EXISTS idx_score_sheets_school_term ON score_sheets(school_id, term_id);

CREATE INDEX IF NOT EXISTS idx_subject_teacher_assignments_teacher ON subject_teacher_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_subject_teacher_assignments_subject ON subject_teacher_assignments(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_teacher_assignments_class ON subject_teacher_assignments(class_arm_combo_id);
CREATE INDEX IF NOT EXISTS idx_subject_teacher_assignments_teacher_subject ON subject_teacher_assignments(teacher_id, subject_id);

CREATE INDEX IF NOT EXISTS idx_student_subjects_student ON student_subjects(student_id);
CREATE INDEX IF NOT EXISTS idx_student_subjects_subject ON student_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_student_subjects_student_subject ON student_subjects(student_id, subject_id);

-- ============================================================================
-- STEP 5: VERIFY DATA INTEGRITY
-- ============================================================================

-- Ensure no orphaned score_sheets (all must reference valid students/subjects/terms/schools)
DELETE FROM score_sheets WHERE student_id NOT IN (SELECT id FROM students);
DELETE FROM score_sheets WHERE subject_id NOT IN (SELECT id FROM subjects);
DELETE FROM score_sheets WHERE term_id NOT IN (SELECT id FROM terms);
DELETE FROM score_sheets WHERE school_id NOT IN (SELECT id FROM schools);

-- Ensure no orphaned subject_teacher_assignments
DELETE FROM subject_teacher_assignments WHERE teacher_id NOT IN (SELECT id FROM users);
DELETE FROM subject_teacher_assignments WHERE subject_id NOT IN (SELECT id FROM subjects);
DELETE FROM subject_teacher_assignments WHERE class_arm_combo_id NOT IN (SELECT id FROM class_arm_combos);
DELETE FROM subject_teacher_assignments WHERE school_id NOT IN (SELECT id FROM schools);

-- Ensure no orphaned student_subjects
DELETE FROM student_subjects WHERE student_id NOT IN (SELECT id FROM students);
DELETE FROM student_subjects WHERE subject_id NOT IN (SELECT id FROM subjects);
DELETE FROM student_subjects WHERE school_id NOT IN (SELECT id FROM schools);

-- ============================================================================
-- STEP 6: ADD COMMENTS/DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE score_sheets IS 'CANONICAL SOURCE OF TRUTH for all assessment scores. All data flows here: manual teacher entry, CBT auto-population, or calculated results. Single source for Class Teachers and Students.';

COMMENT ON COLUMN score_sheets.test1_source IS 'Source of test1 score: MANUAL (teacher-entered) or CBT (auto-populated from cbt_submissions)';
COMMENT ON COLUMN score_sheets.test2_source IS 'Source of test2 score: MANUAL (teacher-entered) or CBT (auto-populated from cbt_submissions)';
COMMENT ON COLUMN score_sheets.test3_source IS 'Source of test3 score: MANUAL (teacher-entered) or CBT (auto-populated from cbt_submissions)';
COMMENT ON COLUMN score_sheets.test4_source IS 'Source of test4 score: MANUAL (teacher-entered) or CBT (auto-populated from cbt_submissions)';
COMMENT ON COLUMN score_sheets.exam_source IS 'Source of exam score: MANUAL (teacher-entered) or CBT (auto-populated from cbt_submissions)';

COMMENT ON TABLE subject_teacher_assignments IS 'CANONICAL SOURCE for linking teachers to subjects they teach, scoped by class. All subject-teacher-class relationships must go through this table.';

COMMENT ON TABLE student_subjects IS 'CANONICAL SOURCE for linking students to subjects they are enrolled in. All student-subject enrollments must go through this table.';

-- ============================================================================
-- STEP 7: VERIFY NO DUPLICATE DATA IN CANONICAL TABLES
-- ============================================================================

-- Check for duplicate score_sheets entries (should not have any)
-- A valid result: 0 rows
DO $$
DECLARE
  dup_count INT;
BEGIN
  SELECT COUNT(*) INTO dup_count
  FROM (
    SELECT school_id, student_id, subject_id, term_id, COUNT(*) as cnt
    FROM score_sheets
    GROUP BY school_id, student_id, subject_id, term_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF dup_count > 0 THEN
    RAISE WARNING 'Found % duplicate score_sheets entries. Removing duplicates...', dup_count;
    DELETE FROM score_sheets WHERE id NOT IN (
      SELECT MAX(id) FROM score_sheets
      GROUP BY school_id, student_id, subject_id, term_id
    );
  END IF;
END $$;

-- ============================================================================
-- COMPLETE
-- ============================================================================

COMMIT;

-- Summary: This migration consolidates all redundant tables and establishes single source of truth
-- score_sheets → CANONICAL assessment storage
-- subject_teacher_assignments → CANONICAL teacher-subject-class linkage
-- student_subjects → CANONICAL student-subject enrollment
-- All APIs must read/write through these tables only
