-- ============================================================================
-- MASTER CBT & RESULTS CANONICAL ARCHITECTURE FIX
-- This migration creates the authoritative CBT and Results system
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. CREATE MISSING CBT_ANSWERS TABLE (ONE CANONICAL TABLE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS cbt_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES cbt_submissions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES cbt_questions(id) ON DELETE CASCADE,
  selected_option_id UUID REFERENCES cbt_options(id) ON DELETE SET NULL,
  answer_text TEXT, -- For theory questions
  marks_awarded NUMERIC(5,2) DEFAULT 0,
  is_correct BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(submission_id, question_id)
);

-- ============================================================================
-- 2. ADD MISSING COLUMNS TO CBT_SUBMISSIONS (If not present)
-- ============================================================================

-- Status tracking
ALTER TABLE cbt_submissions ADD COLUMN IF NOT EXISTS status VARCHAR(50) 
  CHECK (status IS NULL OR status IN ('STARTED', 'IN_PROGRESS', 'SUBMITTED', 'GRADED', 'LOCKED'))
  DEFAULT 'STARTED';

-- Score tracking
ALTER TABLE cbt_submissions ADD COLUMN IF NOT EXISTS total_marks NUMERIC(5,2);
ALTER TABLE cbt_submissions ADD COLUMN IF NOT EXISTS passing_score NUMERIC(5,2);
ALTER TABLE cbt_submissions ADD COLUMN IF NOT EXISTS percentage NUMERIC(5,2);
ALTER TABLE cbt_submissions ADD COLUMN IF NOT EXISTS passed BOOLEAN DEFAULT FALSE;

-- Assessment type linking
ALTER TABLE cbt_submissions ADD COLUMN IF NOT EXISTS assessment_type VARCHAR(50) 
  CHECK (assessment_type IS NULL OR assessment_type IN ('CA1', 'CA2', 'CA3', 'CA4', 'MIDTERM', 'EXAM'));

-- Term linking
ALTER TABLE cbt_submissions ADD COLUMN IF NOT EXISTS term_id UUID REFERENCES terms(id) ON DELETE SET NULL;

-- Grading timestamp
ALTER TABLE cbt_submissions ADD COLUMN IF NOT EXISTS graded_at TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- 3. ADD MISSING COLUMNS TO CBT_EXAMS
-- ============================================================================

-- Assessment type
ALTER TABLE cbt_exams ADD COLUMN IF NOT EXISTS assessment_type VARCHAR(50) 
  CHECK (assessment_type IS NULL OR assessment_type IN ('CA1', 'CA2', 'CA3', 'CA4', 'MIDTERM', 'EXAM'));

-- Teacher ID (who created it)
ALTER TABLE cbt_exams ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Status of exam
ALTER TABLE cbt_exams ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE'
  CHECK (status IN ('DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED'));

-- ============================================================================
-- 4. ENHANCE SCORE_SHEETS TABLE FOR CBT INTEGRATION
-- ============================================================================

-- Add CBT-generated score sources
ALTER TABLE score_sheets ADD COLUMN IF NOT EXISTS test1_cbt_source UUID REFERENCES cbt_submissions(id) ON DELETE SET NULL;
ALTER TABLE score_sheets ADD COLUMN IF NOT EXISTS test2_cbt_source UUID REFERENCES cbt_submissions(id) ON DELETE SET NULL;
ALTER TABLE score_sheets ADD COLUMN IF NOT EXISTS test3_cbt_source UUID REFERENCES cbt_submissions(id) ON DELETE SET NULL;
ALTER TABLE score_sheets ADD COLUMN IF NOT EXISTS test4_cbt_source UUID REFERENCES cbt_submissions(id) ON DELETE SET NULL;
ALTER TABLE score_sheets ADD COLUMN IF NOT EXISTS exam_cbt_source UUID REFERENCES cbt_submissions(id) ON DELETE SET NULL;

-- Teacher comment
ALTER TABLE score_sheets ADD COLUMN IF NOT EXISTS teacher_comment TEXT;
ALTER TABLE score_sheets ADD COLUMN IF NOT EXISTS hm_comment TEXT;

-- ============================================================================
-- 5. TEACHER ASSIGNMENT RELATIONSHIPS
-- ============================================================================

-- Ensure teachers are properly linked to subjects and classes
CREATE TABLE IF NOT EXISTS teacher_class_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_arm_combo_id UUID NOT NULL REFERENCES class_arm_combos(id) ON DELETE CASCADE,
  is_class_teacher BOOLEAN DEFAULT FALSE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, teacher_id, class_arm_combo_id)
);

-- ============================================================================
-- 6. STUDENT-SUBJECT-TEACHER LINKING (CANONICAL)
-- ============================================================================

-- Ensure student_subjects properly links to subject teachers
ALTER TABLE student_subjects ADD COLUMN IF NOT EXISTS class_arm_combo_id UUID 
  REFERENCES class_arm_combos(id) ON DELETE SET NULL;

-- ============================================================================
-- 7. CREATE INDICES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_cbt_answers_submission ON cbt_answers(submission_id);
CREATE INDEX IF NOT EXISTS idx_cbt_answers_question ON cbt_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_cbt_submissions_student ON cbt_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_cbt_submissions_exam ON cbt_submissions(cbt_exam_id);
CREATE INDEX IF NOT EXISTS idx_cbt_submissions_term ON cbt_submissions(term_id);
CREATE INDEX IF NOT EXISTS idx_cbt_exams_subject ON cbt_exams(subject_id);
CREATE INDEX IF NOT EXISTS idx_cbt_exams_class_arm ON cbt_exams(class_arm_combo_id);
CREATE INDEX IF NOT EXISTS idx_cbt_exams_teacher ON cbt_exams(created_by);
CREATE INDEX IF NOT EXISTS idx_score_sheets_student_term ON score_sheets(student_id, term_id);
CREATE INDEX IF NOT EXISTS idx_score_sheets_subject_term ON score_sheets(subject_id, term_id);
CREATE INDEX IF NOT EXISTS idx_student_subjects_student ON student_subjects(student_id);
CREATE INDEX IF NOT EXISTS idx_subject_teacher_assignments_teacher ON subject_teacher_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_subject_teacher_assignments_class_arm ON subject_teacher_assignments(class_arm_combo_id);

-- ============================================================================
-- 8. DATA INTEGRITY CHECKS
-- ============================================================================

-- Ensure all CBT answers reference valid submissions
ALTER TABLE cbt_answers ADD CONSTRAINT fk_cbt_answers_submission 
  FOREIGN KEY (submission_id) REFERENCES cbt_submissions(id) ON DELETE CASCADE;

-- Ensure all student subjects belong to proper class/arm
-- (This is informational - may need manual review in existing data)

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (Run after migration)
-- ============================================================================
-- SELECT * FROM information_schema.tables WHERE table_name = 'cbt_answers';
-- SELECT * FROM information_schema.columns WHERE table_name = 'cbt_submissions' ORDER BY ordinal_position;
-- SELECT * FROM information_schema.columns WHERE table_name = 'cbt_exams' ORDER BY ordinal_position;
