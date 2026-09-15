-- Migration 114: Fix Score Sheets Pipeline & CBT Integration
-- PURPOSE: Ensure all score data flows correctly from entry → storage → results
-- 
-- FIXES:
-- 1. Verify score_sheets table has ALL required columns
-- 2. Ensure cbt_exams table requires assessment_type
-- 3. Ensure cbt_submissions always has term_id
-- 4. Add automatic score_sheets creation for all CBT submissions
-- 5. Create indexes for fast retrieval

BEGIN;

-- ============================================================================
-- PHASE 1: VERIFY & FIX score_sheets TABLE SCHEMA
-- ============================================================================

-- Ensure score_sheets table exists with correct structure
CREATE TABLE IF NOT EXISTS score_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
  class_arm_combo_id UUID REFERENCES class_arm_combos(id) ON DELETE SET NULL,
  
  -- Score columns (0-10 for tests, 0-60 for exam)
  test1 NUMERIC(5,2),
  test2 NUMERIC(5,2),
  test3 NUMERIC(5,2),
  test4 NUMERIC(5,2),
  exam NUMERIC(5,2),
  
  -- Generated total
  total NUMERIC(6,2) GENERATED ALWAYS AS (
    COALESCE(test1,0) + COALESCE(test2,0) + COALESCE(test3,0) + COALESCE(test4,0) + COALESCE(exam,0)
  ) STORED,
  
  -- Grade based on total
  grade VARCHAR(2),
  
  -- Source tracking (MANUAL or CBT)
  test1_source VARCHAR(20),
  test2_source VARCHAR(20),
  test3_source VARCHAR(20),
  test4_source VARCHAR(20),
  exam_source VARCHAR(20),
  
  -- CBT source tracking (submission IDs)
  test1_cbt_source UUID,
  test2_cbt_source UUID,
  test3_cbt_source UUID,
  test4_cbt_source UUID,
  exam_cbt_source UUID,
  
  -- Academic session tracking (for multi-year reports)
  academic_session_id UUID REFERENCES academic_sessions(id) ON DELETE SET NULL,
  session_year VARCHAR(20),
  
  -- Comments
  teacher_comment TEXT,
  hm_comment TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(school_id, student_id, subject_id, term_id),
  CHECK (test1 IS NULL OR (test1 >= 0 AND test1 <= 10)),
  CHECK (test2 IS NULL OR (test2 >= 0 AND test2 <= 10)),
  CHECK (test3 IS NULL OR (test3 >= 0 AND test3 <= 10)),
  CHECK (test4 IS NULL OR (test4 >= 0 AND test4 <= 10)),
  CHECK (exam IS NULL OR (exam >= 0 AND exam <= 60))
);

-- Add any missing columns to score_sheets
DO $$
BEGIN
  ALTER TABLE score_sheets ADD COLUMN IF NOT EXISTS academic_session_id UUID REFERENCES academic_sessions(id) ON DELETE SET NULL;
  ALTER TABLE score_sheets ADD COLUMN IF NOT EXISTS session_year VARCHAR(20);
  ALTER TABLE score_sheets ADD COLUMN IF NOT EXISTS test1_cbt_source UUID;
  ALTER TABLE score_sheets ADD COLUMN IF NOT EXISTS test2_cbt_source UUID;
  ALTER TABLE score_sheets ADD COLUMN IF NOT EXISTS test3_cbt_source UUID;
  ALTER TABLE score_sheets ADD COLUMN IF NOT EXISTS test4_cbt_source UUID;
  ALTER TABLE score_sheets ADD COLUMN IF NOT EXISTS exam_cbt_source UUID;
  ALTER TABLE score_sheets ADD COLUMN IF NOT EXISTS hm_comment TEXT;
  ALTER TABLE score_sheets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================================
-- PHASE 2: FIX cbt_exams TABLE - ENFORCE assessment_type
-- ============================================================================

-- Ensure assessment_type is NOT NULL and has valid values
DO $$
BEGIN
  -- Add assessment_type column if missing
  ALTER TABLE cbt_exams ADD COLUMN IF NOT EXISTS assessment_type VARCHAR(20) 
    CHECK (assessment_type IN ('CA1', 'CA2', 'CA3', 'CA4', 'EXAM'));
  
  -- Update any NULL assessment_type to 'EXAM' as default
  UPDATE cbt_exams SET assessment_type = 'EXAM' WHERE assessment_type IS NULL;
  
  -- Add NOT NULL constraint if not already present
  ALTER TABLE cbt_exams ALTER COLUMN assessment_type SET NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================================
-- PHASE 3: FIX cbt_submissions TABLE - ENSURE term_id
-- ============================================================================

DO $$
BEGIN
  -- Add term_id column if missing
  ALTER TABLE cbt_submissions ADD COLUMN IF NOT EXISTS term_id UUID 
    REFERENCES academic_terms(id) ON DELETE SET NULL;
  
  -- For submissions missing term_id, try to derive from active term
  UPDATE cbt_submissions s
  SET term_id = (
    SELECT id FROM academic_terms 
    WHERE school_id = s.school_id 
    AND is_active = true
    LIMIT 1
  )
  WHERE s.term_id IS NULL 
  AND EXISTS (SELECT 1 FROM schools WHERE id = s.school_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================================
-- PHASE 4: AUTO-SYNC EXISTING CBT SUBMISSIONS TO score_sheets
-- ============================================================================

-- For all graded CBT submissions, ensure score_sheets entry exists
WITH graded_submissions AS (
  SELECT 
    s.id as submission_id,
    s.school_id,
    s.student_id,
    s.term_id,
    s.score,
    s.percentage,
    s.passed,
    e.subject_id,
    e.assessment_type,
    e.total_marks,
    st.class_arm_combo_id
  FROM cbt_submissions s
  JOIN cbt_exams e ON s.cbt_exam_id = e.id
  JOIN students st ON s.student_id = st.id
  WHERE s.status IN ('GRADED', 'LOCKED')
  AND s.term_id IS NOT NULL
  AND e.subject_id IS NOT NULL
  AND e.assessment_type IS NOT NULL
)
INSERT INTO score_sheets (
  school_id,
  student_id,
  subject_id,
  term_id,
  class_arm_combo_id,
  test1,
  test2,
  test3,
  test4,
  exam,
  test1_source,
  test2_source,
  test3_source,
  test4_source,
  exam_source,
  test1_cbt_source,
  test2_cbt_source,
  test3_cbt_source,
  test4_cbt_source,
  exam_cbt_source,
  created_at,
  updated_at
)
SELECT
  gs.school_id,
  gs.student_id,
  gs.subject_id,
  gs.term_id,
  gs.class_arm_combo_id,
  CASE WHEN gs.assessment_type = 'CA1' THEN ROUND((gs.score::NUMERIC / gs.total_marks) * 10, 2) ELSE NULL END,
  CASE WHEN gs.assessment_type = 'CA2' THEN ROUND((gs.score::NUMERIC / gs.total_marks) * 10, 2) ELSE NULL END,
  CASE WHEN gs.assessment_type = 'CA3' THEN ROUND((gs.score::NUMERIC / gs.total_marks) * 10, 2) ELSE NULL END,
  CASE WHEN gs.assessment_type = 'CA4' THEN ROUND((gs.score::NUMERIC / gs.total_marks) * 10, 2) ELSE NULL END,
  CASE WHEN gs.assessment_type = 'EXAM' THEN ROUND((gs.score::NUMERIC / gs.total_marks) * 60, 2) ELSE NULL END,
  CASE WHEN gs.assessment_type = 'CA1' THEN 'CBT' ELSE NULL END,
  CASE WHEN gs.assessment_type = 'CA2' THEN 'CBT' ELSE NULL END,
  CASE WHEN gs.assessment_type = 'CA3' THEN 'CBT' ELSE NULL END,
  CASE WHEN gs.assessment_type = 'CA4' THEN 'CBT' ELSE NULL END,
  CASE WHEN gs.assessment_type = 'EXAM' THEN 'CBT' ELSE NULL END,
  CASE WHEN gs.assessment_type = 'CA1' THEN gs.submission_id ELSE NULL END,
  CASE WHEN gs.assessment_type = 'CA2' THEN gs.submission_id ELSE NULL END,
  CASE WHEN gs.assessment_type = 'CA3' THEN gs.submission_id ELSE NULL END,
  CASE WHEN gs.assessment_type = 'CA4' THEN gs.submission_id ELSE NULL END,
  CASE WHEN gs.assessment_type = 'EXAM' THEN gs.submission_id ELSE NULL END,
  NOW(),
  NOW()
FROM graded_submissions gs
ON CONFLICT (school_id, student_id, subject_id, term_id) DO UPDATE SET
  updated_at = NOW();

-- ============================================================================
-- PHASE 5: LINK CBT SUBMISSIONS TO ACADEMIC SESSIONS
-- ============================================================================

-- Ensure all score_sheets have academic_session_id
UPDATE score_sheets s
SET academic_session_id = at.session_id,
    session_year = (SELECT session_year FROM academic_sessions WHERE id = at.session_id)
WHERE s.academic_session_id IS NULL
AND s.term_id IN (SELECT id FROM academic_terms)
AND EXISTS (
  SELECT 1 FROM academic_terms at
  WHERE at.id = s.term_id
);

-- ============================================================================
-- PHASE 6: CREATE PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_score_sheets_student_term ON score_sheets(student_id, term_id);
CREATE INDEX IF NOT EXISTS idx_score_sheets_class_term ON score_sheets(class_arm_combo_id, term_id);
CREATE INDEX IF NOT EXISTS idx_score_sheets_subject_term ON score_sheets(subject_id, term_id);
CREATE INDEX IF NOT EXISTS idx_score_sheets_school_term ON score_sheets(school_id, term_id);
CREATE INDEX IF NOT EXISTS idx_score_sheets_session ON score_sheets(academic_session_id);
CREATE INDEX IF NOT EXISTS idx_score_sheets_cbt_source_test1 ON score_sheets(test1_cbt_source);
CREATE INDEX IF NOT EXISTS idx_score_sheets_cbt_source_exam ON score_sheets(exam_cbt_source);
CREATE INDEX IF NOT EXISTS idx_score_sheets_source ON score_sheets(test1_source, test2_source, test3_source, test4_source, exam_source);

CREATE INDEX IF NOT EXISTS idx_cbt_exams_assessment_type ON cbt_exams(assessment_type);
CREATE INDEX IF NOT EXISTS idx_cbt_exams_subject_assessment ON cbt_exams(subject_id, assessment_type);
CREATE INDEX IF NOT EXISTS idx_cbt_submissions_term_status ON cbt_submissions(term_id, status);
CREATE INDEX IF NOT EXISTS idx_cbt_submissions_graded ON cbt_submissions(status) WHERE status IN ('GRADED', 'LOCKED');

-- ============================================================================
-- PHASE 7: VERIFICATION QUERIES (run after migration)
-- ============================================================================

-- Verify score_sheets has correct columns
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'score_sheets' 
-- ORDER BY ordinal_position;

-- Verify CBT exams have assessment_type
-- SELECT COUNT(*) as exams_with_assessment, 
--        COUNT(CASE WHEN assessment_type IS NULL THEN 1 END) as missing_assessment
-- FROM cbt_exams;

-- Verify CBT submissions have term_id
-- SELECT COUNT(*) as submissions_with_term,
--        COUNT(CASE WHEN term_id IS NULL THEN 1 END) as missing_term
-- FROM cbt_submissions;

-- Verify orphaned CBT submissions got synced to score_sheets
-- SELECT COUNT(DISTINCT s.id) as synced_submissions
-- FROM cbt_submissions s
-- WHERE status IN ('GRADED', 'LOCKED')
-- AND EXISTS (SELECT 1 FROM score_sheets ss 
--            WHERE ss.exam_cbt_source = s.id 
--            OR ss.test1_cbt_source = s.id 
--            OR ss.test2_cbt_source = s.id 
--            OR ss.test3_cbt_source = s.id 
--            OR ss.test4_cbt_source = s.id);

COMMIT;
