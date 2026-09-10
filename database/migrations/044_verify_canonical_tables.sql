-- ============================================================================
-- MIGRATION 044: VERIFY & ENFORCE CANONICAL TABLE SCHEMA
-- Ensure score_sheets, subject_teacher_assignments, student_subjects are correct
-- ============================================================================

BEGIN;

-- ============================================================================
-- SCORE_SHEETS: CANONICAL ASSESSMENT STORAGE
-- ============================================================================

-- Ensure table exists with all required columns
CREATE TABLE IF NOT EXISTS score_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  class_arm_combo_id UUID REFERENCES class_arm_combos(id) ON DELETE SET NULL,
  
  -- Test scores (0-10 each)
  test1 NUMERIC(5,2) CHECK (test1 IS NULL OR (test1 >= 0 AND test1 <= 10)),
  test2 NUMERIC(5,2) CHECK (test2 IS NULL OR (test2 >= 0 AND test2 <= 10)),
  test3 NUMERIC(5,2) CHECK (test3 IS NULL OR (test3 >= 0 AND test3 <= 10)),
  test4 NUMERIC(5,2) CHECK (test4 IS NULL OR (test4 >= 0 AND test4 <= 10)),
  
  -- Exam score (0-60)
  exam NUMERIC(5,2) CHECK (exam IS NULL OR (exam >= 0 AND exam <= 60)),
  
  -- Auto-calculated total (0-100)
  total NUMERIC(5,2) GENERATED ALWAYS AS (
    COALESCE(test1, 0) + COALESCE(test2, 0) + COALESCE(test3, 0) + COALESCE(test4, 0) + COALESCE(exam, 0)
  ) STORED,
  
  -- Grade (auto-assigned)
  grade VARCHAR(2),
  
  -- Source tracking (MANUAL or CBT)
  test1_source VARCHAR(20) CHECK (test1_source IS NULL OR test1_source IN ('MANUAL', 'CBT')),
  test2_source VARCHAR(20) CHECK (test2_source IS NULL OR test2_source IN ('MANUAL', 'CBT')),
  test3_source VARCHAR(20) CHECK (test3_source IS NULL OR test3_source IN ('MANUAL', 'CBT')),
  test4_source VARCHAR(20) CHECK (test4_source IS NULL OR test4_source IN ('MANUAL', 'CBT')),
  exam_source VARCHAR(20) CHECK (exam_source IS NULL OR exam_source IN ('MANUAL', 'CBT')),
  
  -- CBT linkage (which cbt_submissions generated this score)
  test1_cbt_source UUID REFERENCES cbt_submissions(id) ON DELETE SET NULL,
  test2_cbt_source UUID REFERENCES cbt_submissions(id) ON DELETE SET NULL,
  test3_cbt_source UUID REFERENCES cbt_submissions(id) ON DELETE SET NULL,
  test4_cbt_source UUID REFERENCES cbt_submissions(id) ON DELETE SET NULL,
  exam_cbt_source UUID REFERENCES cbt_submissions(id) ON DELETE SET NULL,
  
  -- Comments
  teacher_comment TEXT,
  hm_comment TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- UNIQUE constraint: ONE score per student-subject-term
  UNIQUE(school_id, student_id, subject_id, term_id)
);

-- Ensure all columns are NOT NULL where required
ALTER TABLE score_sheets ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE score_sheets ALTER COLUMN student_id SET NOT NULL;
ALTER TABLE score_sheets ALTER COLUMN subject_id SET NOT NULL;
ALTER TABLE score_sheets ALTER COLUMN term_id SET NOT NULL;

-- Add missing columns if they don't exist
ALTER TABLE score_sheets ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE score_sheets ADD COLUMN IF NOT EXISTS class_arm_combo_id UUID REFERENCES class_arm_combos(id) ON DELETE SET NULL;
ALTER TABLE score_sheets ADD COLUMN IF NOT EXISTS test1_source VARCHAR(20) CHECK (test1_source IS NULL OR test1_source IN ('MANUAL', 'CBT'));
ALTER TABLE score_sheets ADD COLUMN IF NOT EXISTS test2_source VARCHAR(20) CHECK (test2_source IS NULL OR test2_source IN ('MANUAL', 'CBT'));
ALTER TABLE score_sheets ADD COLUMN IF NOT EXISTS test3_source VARCHAR(20) CHECK (test3_source IS NULL OR test3_source IN ('MANUAL', 'CBT'));
ALTER TABLE score_sheets ADD COLUMN IF NOT EXISTS test4_source VARCHAR(20) CHECK (test4_source IS NULL OR test4_source IN ('MANUAL', 'CBT'));
ALTER TABLE score_sheets ADD COLUMN IF NOT EXISTS exam_source VARCHAR(20) CHECK (exam_source IS NULL OR exam_source IN ('MANUAL', 'CBT'));
ALTER TABLE score_sheets ADD COLUMN IF NOT EXISTS test1_cbt_source UUID REFERENCES cbt_submissions(id) ON DELETE SET NULL;
ALTER TABLE score_sheets ADD COLUMN IF NOT EXISTS test2_cbt_source UUID REFERENCES cbt_submissions(id) ON DELETE SET NULL;
ALTER TABLE score_sheets ADD COLUMN IF NOT EXISTS test3_cbt_source UUID REFERENCES cbt_submissions(id) ON DELETE SET NULL;
ALTER TABLE score_sheets ADD COLUMN IF NOT EXISTS test4_cbt_source UUID REFERENCES cbt_submissions(id) ON DELETE SET NULL;
ALTER TABLE score_sheets ADD COLUMN IF NOT EXISTS exam_cbt_source UUID REFERENCES cbt_submissions(id) ON DELETE SET NULL;
ALTER TABLE score_sheets ADD COLUMN IF NOT EXISTS teacher_comment TEXT;
ALTER TABLE score_sheets ADD COLUMN IF NOT EXISTS hm_comment TEXT;
ALTER TABLE score_sheets ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE score_sheets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create trigger to auto-update updated_at (only if function exists)
-- NOTE: update_timestamp() function may not exist, so we skip this
-- If it exists, uncomment below:
-- DROP TRIGGER IF EXISTS score_sheets_update_timestamp ON score_sheets;
-- CREATE TRIGGER score_sheets_update_timestamp
-- BEFORE UPDATE ON score_sheets
-- FOR EACH ROW
-- EXECUTE FUNCTION update_timestamp();

-- ============================================================================
-- SUBJECT_TEACHER_ASSIGNMENTS: TEACHER → SUBJECT → CLASS LINKAGE
-- ============================================================================

CREATE TABLE IF NOT EXISTS subject_teacher_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_arm_combo_id UUID NOT NULL REFERENCES class_arm_combos(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- UNIQUE: Teacher teaches this subject in this class only once
  UNIQUE(school_id, teacher_id, subject_id, class_arm_combo_id)
);

-- Ensure all columns NOT NULL
ALTER TABLE subject_teacher_assignments ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE subject_teacher_assignments ALTER COLUMN teacher_id SET NOT NULL;
ALTER TABLE subject_teacher_assignments ALTER COLUMN subject_id SET NOT NULL;
ALTER TABLE subject_teacher_assignments ALTER COLUMN class_arm_combo_id SET NOT NULL;

-- ============================================================================
-- STUDENT_SUBJECTS: STUDENT → SUBJECT ENROLLMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- UNIQUE: Student enrolled in this subject only once
  UNIQUE(student_id, subject_id)
);

-- Ensure all columns NOT NULL
ALTER TABLE student_subjects ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE student_subjects ALTER COLUMN student_id SET NOT NULL;
ALTER TABLE student_subjects ALTER COLUMN subject_id SET NOT NULL;

-- ============================================================================
-- CBT_SUBMISSIONS: CBT EXAM SUBMISSIONS & GRADING
-- ============================================================================

-- Ensure all required columns exist
ALTER TABLE cbt_submissions ADD COLUMN IF NOT EXISTS status VARCHAR(50) 
  CHECK (status IS NULL OR status IN ('STARTED', 'IN_PROGRESS', 'SUBMITTED', 'GRADED', 'LOCKED'))
  DEFAULT 'STARTED';

ALTER TABLE cbt_submissions ADD COLUMN IF NOT EXISTS total_marks NUMERIC(5,2);
ALTER TABLE cbt_submissions ADD COLUMN IF NOT EXISTS passing_score NUMERIC(5,2);
ALTER TABLE cbt_submissions ADD COLUMN IF NOT EXISTS percentage NUMERIC(5,2);
ALTER TABLE cbt_submissions ADD COLUMN IF NOT EXISTS passed BOOLEAN DEFAULT FALSE;
ALTER TABLE cbt_submissions ADD COLUMN IF NOT EXISTS assessment_type VARCHAR(50) 
  CHECK (assessment_type IS NULL OR assessment_type IN ('CA1', 'CA2', 'CA3', 'CA4', 'MIDTERM', 'EXAM'));
ALTER TABLE cbt_submissions ADD COLUMN IF NOT EXISTS term_id UUID REFERENCES terms(id) ON DELETE SET NULL;
ALTER TABLE cbt_submissions ADD COLUMN IF NOT EXISTS graded_at TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- CBT_EXAMS: CBT EXAM CONFIGURATION
-- ============================================================================

-- Ensure critical columns exist
ALTER TABLE cbt_exams ADD COLUMN IF NOT EXISTS assessment_type VARCHAR(50) 
  CHECK (assessment_type IS NULL OR assessment_type IN ('CA1', 'CA2', 'CA3', 'CA4', 'MIDTERM', 'EXAM'));

ALTER TABLE cbt_exams ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE cbt_exams ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE'
  CHECK (status IN ('DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED'));

-- ============================================================================
-- CBT_ANSWERS: INDIVIDUAL QUESTION ANSWERS (CANONICAL FOR QUESTION-LEVEL DATA)
-- ============================================================================

CREATE TABLE IF NOT EXISTS cbt_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES cbt_submissions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES cbt_questions(id) ON DELETE CASCADE,
  selected_option_id UUID REFERENCES cbt_options(id) ON DELETE SET NULL,
  answer_text TEXT,
  marks_awarded NUMERIC(5,2) DEFAULT 0,
  is_correct BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- UNIQUE: One answer per question per submission
  UNIQUE(submission_id, question_id)
);

-- ============================================================================
-- CREATE/ENSURE INDICES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_score_sheets_student ON score_sheets(student_id);
CREATE INDEX IF NOT EXISTS idx_score_sheets_subject ON score_sheets(subject_id);
CREATE INDEX IF NOT EXISTS idx_score_sheets_term ON score_sheets(term_id);
CREATE INDEX IF NOT EXISTS idx_score_sheets_teacher ON score_sheets(teacher_id);
CREATE INDEX IF NOT EXISTS idx_score_sheets_class ON score_sheets(class_arm_combo_id);
CREATE INDEX IF NOT EXISTS idx_score_sheets_school_term ON score_sheets(school_id, term_id);
CREATE INDEX IF NOT EXISTS idx_score_sheets_student_subject_term ON score_sheets(student_id, subject_id, term_id);

CREATE INDEX IF NOT EXISTS idx_subject_teacher_assignments_teacher ON subject_teacher_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_subject_teacher_assignments_subject ON subject_teacher_assignments(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_teacher_assignments_class ON subject_teacher_assignments(class_arm_combo_id);
CREATE INDEX IF NOT EXISTS idx_subject_teacher_assignments_teacher_subject ON subject_teacher_assignments(teacher_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_teacher_assignments_school_teacher ON subject_teacher_assignments(school_id, teacher_id);

CREATE INDEX IF NOT EXISTS idx_student_subjects_student ON student_subjects(student_id);
CREATE INDEX IF NOT EXISTS idx_student_subjects_subject ON student_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_student_subjects_student_subject ON student_subjects(student_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_student_subjects_school ON student_subjects(school_id);

CREATE INDEX IF NOT EXISTS idx_cbt_submissions_student ON cbt_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_cbt_submissions_exam ON cbt_submissions(cbt_exam_id);
CREATE INDEX IF NOT EXISTS idx_cbt_submissions_term ON cbt_submissions(term_id);
CREATE INDEX IF NOT EXISTS idx_cbt_submissions_assessment_type ON cbt_submissions(assessment_type);
CREATE INDEX IF NOT EXISTS idx_cbt_submissions_status ON cbt_submissions(status);

CREATE INDEX IF NOT EXISTS idx_cbt_answers_submission ON cbt_answers(submission_id);
CREATE INDEX IF NOT EXISTS idx_cbt_answers_question ON cbt_answers(question_id);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY (if disabled, re-enable with permissive policies)
-- ============================================================================

ALTER TABLE score_sheets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to score_sheets" ON score_sheets;
CREATE POLICY "Allow all access to score_sheets" ON score_sheets FOR ALL USING (true);

ALTER TABLE subject_teacher_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to subject_teacher_assignments" ON subject_teacher_assignments;
CREATE POLICY "Allow all access to subject_teacher_assignments" ON subject_teacher_assignments FOR ALL USING (true);

ALTER TABLE student_subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to student_subjects" ON student_subjects;
CREATE POLICY "Allow all access to student_subjects" ON student_subjects FOR ALL USING (true);

-- ============================================================================
-- DATA INTEGRITY CHECKS
-- ============================================================================

-- Remove any orphaned records
DELETE FROM score_sheets WHERE student_id NOT IN (SELECT id FROM students);
DELETE FROM score_sheets WHERE subject_id NOT IN (SELECT id FROM subjects);
DELETE FROM score_sheets WHERE term_id NOT IN (SELECT id FROM terms);
DELETE FROM score_sheets WHERE school_id NOT IN (SELECT id FROM schools);

DELETE FROM subject_teacher_assignments WHERE teacher_id NOT IN (SELECT id FROM users);
DELETE FROM subject_teacher_assignments WHERE subject_id NOT IN (SELECT id FROM subjects);
DELETE FROM subject_teacher_assignments WHERE class_arm_combo_id NOT IN (SELECT id FROM class_arm_combos);
DELETE FROM subject_teacher_assignments WHERE school_id NOT IN (SELECT id FROM schools);

DELETE FROM student_subjects WHERE student_id NOT IN (SELECT id FROM students);
DELETE FROM student_subjects WHERE subject_id NOT IN (SELECT id FROM subjects);
DELETE FROM student_subjects WHERE school_id NOT IN (SELECT id FROM schools);

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE score_sheets IS 'CANONICAL SOURCE OF TRUTH for all academic scores. All data flows here: manual subject teacher entry, CBT auto-population. Used by: Subject Teachers (data entry), Class Teachers (aggregation), Students (viewing own results).';

COMMENT ON TABLE subject_teacher_assignments IS 'CANONICAL SOURCE for teacher subject assignments. Links teacher → subject → class. Every subject teacher enters scores for students in their assigned subject-class combinations.';

COMMENT ON TABLE student_subjects IS 'CANONICAL SOURCE for student subject enrollments. Links student → subject. Every student score must have corresponding enrollment.';

COMMENT ON TABLE cbt_submissions IS 'CBT submission tracking. After grading, data automatically flows to score_sheets based on assessment_type (CA1/CA2/CA3/CA4/EXAM).';

COMMENT ON TABLE cbt_answers IS 'Question-level answers and marks. Used for detailed exam review. Aggregated into cbt_submissions.score, then into score_sheets.';

COMMENT ON COLUMN score_sheets.test1_source IS 'Source of test1: MANUAL (teacher-entered) or CBT (auto from cbt_submissions)';
COMMENT ON COLUMN score_sheets.test2_source IS 'Source of test2: MANUAL (teacher-entered) or CBT (auto from cbt_submissions)';
COMMENT ON COLUMN score_sheets.test3_source IS 'Source of test3: MANUAL (teacher-entered) or CBT (auto from cbt_submissions)';
COMMENT ON COLUMN score_sheets.test4_source IS 'Source of test4: MANUAL (teacher-entered) or CBT (auto from cbt_submissions)';
COMMENT ON COLUMN score_sheets.exam_source IS 'Source of exam: MANUAL (teacher-entered) or CBT (auto from cbt_submissions)';

-- ============================================================================
-- COMPLETE
-- ============================================================================

COMMIT;

-- Verification queries to run separately:
-- SELECT COUNT(*) as score_sheets_count FROM score_sheets;
-- SELECT COUNT(*) as teacher_subject_assignments FROM subject_teacher_assignments;
-- SELECT COUNT(*) as student_subject_enrollments FROM student_subjects;
-- SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('result_entries', 'student_subject_enrollment', 'teacher_assignments');
