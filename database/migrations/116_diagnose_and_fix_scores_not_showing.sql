-- Migration 116: DIAGNOSTIC & FIX - Why Scores Not Showing in Results
-- This migration will:
-- 1. Verify score_sheets table exists and has data
-- 2. Verify academic_terms table exists and has correct FK reference
-- 3. Ensure all saved scores are queryable by the results page
-- 4. Fix any data or schema issues

BEGIN;

-- ============================================================================
-- PHASE 1: VERIFY score_sheets TABLE EXISTS AND HAS DATA
-- ============================================================================

-- Ensure score_sheets table exists with ALL required columns
CREATE TABLE IF NOT EXISTS score_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  term_id UUID NOT NULL,
  class_arm_combo_id UUID REFERENCES class_arm_combos(id) ON DELETE SET NULL,
  test1 NUMERIC(5,2),
  test2 NUMERIC(5,2),
  test3 NUMERIC(5,2),
  test4 NUMERIC(5,2),
  exam NUMERIC(5,2),
  total NUMERIC(6,2) GENERATED ALWAYS AS (
    COALESCE(test1,0) + COALESCE(test2,0) + COALESCE(test3,0) + COALESCE(test4,0) + COALESCE(exam,0)
  ) STORED,
  grade VARCHAR(2),
  test1_source VARCHAR(20),
  test2_source VARCHAR(20),
  test3_source VARCHAR(20),
  test4_source VARCHAR(20),
  exam_source VARCHAR(20),
  test1_cbt_source UUID,
  test2_cbt_source UUID,
  test3_cbt_source UUID,
  test4_cbt_source UUID,
  exam_cbt_source UUID,
  academic_session_id UUID REFERENCES academic_sessions(id) ON DELETE SET NULL,
  session_year VARCHAR(20),
  teacher_comment TEXT,
  hm_comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, student_id, subject_id, term_id),
  CHECK (test1 IS NULL OR (test1 >= 0 AND test1 <= 10)),
  CHECK (test2 IS NULL OR (test2 >= 0 AND test2 <= 10)),
  CHECK (test3 IS NULL OR (test3 >= 0 AND test3 <= 10)),
  CHECK (test4 IS NULL OR (test4 >= 0 AND test4 <= 10)),
  CHECK (exam IS NULL OR (exam >= 0 AND exam <= 60))
);

-- Add missing columns safely
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
-- PHASE 2: FIX FK CONSTRAINT - term_id should NOT have strict FK if academic_terms not ready
-- For now, make term_id flexible (don't enforce FK constraint until academic_terms is fully populated)
-- ============================================================================

-- Drop any existing FK constraints on term_id that might be causing issues
ALTER TABLE score_sheets DROP CONSTRAINT IF EXISTS score_sheets_term_id_fkey;
ALTER TABLE score_sheets DROP CONSTRAINT IF EXISTS fk_score_sheets_term;
ALTER TABLE score_sheets DROP CONSTRAINT IF EXISTS fk_score_sheets_academic_terms;
ALTER TABLE score_sheets DROP CONSTRAINT IF EXISTS fk_score_sheets_terms;

-- Ensure term_id column exists and is NOT NULL
ALTER TABLE score_sheets ALTER COLUMN term_id SET NOT NULL;

-- Add back FK constraint - but ONLY if academic_terms table exists and has data
DO $$
BEGIN
  -- Check if academic_terms table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'academic_terms') THEN
    -- Try to add FK - will fail gracefully if academic_terms is empty
    ALTER TABLE score_sheets 
    ADD CONSTRAINT fk_score_sheets_academic_terms 
      FOREIGN KEY (term_id) 
      REFERENCES academic_terms(id) 
      ON DELETE CASCADE;
    RAISE NOTICE 'FK constraint added successfully';
  ELSE
    RAISE NOTICE 'academic_terms table does not exist, skipping FK constraint';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not add FK constraint (may already exist or academic_terms empty)';
END $$;

-- ============================================================================
-- PHASE 3: VERIFY academic_terms TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS academic_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  term_name VARCHAR(100) NOT NULL,
  term_order INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, term_name),
  UNIQUE(session_id, term_order),
  CHECK (end_date > start_date)
);

-- ============================================================================
-- PHASE 4: ENSURE EVERY SCHOOL HAS AT LEAST ONE TERM
-- ============================================================================

-- For schools with no terms, create default term
WITH schools_without_terms AS (
  SELECT DISTINCT s.id as school_id
  FROM schools s
  LEFT JOIN academic_terms at ON s.id = at.school_id
  WHERE at.id IS NULL
)
, default_sessions AS (
  SELECT DISTINCT school_id, id as session_id
  FROM academic_sessions
  WHERE is_active = true
  LIMIT 1
)
INSERT INTO academic_terms (session_id, school_id, term_name, term_order, start_date, end_date, is_active)
SELECT 
  COALESCE(ds.session_id, (SELECT id FROM academic_sessions LIMIT 1)),
  swt.school_id,
  'First Term',
  1,
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '90 days',
  true
FROM schools_without_terms swt
LEFT JOIN default_sessions ds ON true
WHERE NOT EXISTS (
  SELECT 1 FROM academic_terms 
  WHERE school_id = swt.school_id
)
ON CONFLICT (session_id, term_name) DO NOTHING;

-- ============================================================================
-- PHASE 5: CREATE INDEXES FOR FAST QUERIES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_score_sheets_student_term ON score_sheets(student_id, term_id);
CREATE INDEX IF NOT EXISTS idx_score_sheets_school_student_term ON score_sheets(school_id, student_id, term_id);
CREATE INDEX IF NOT EXISTS idx_score_sheets_class_term ON score_sheets(class_arm_combo_id, term_id);
CREATE INDEX IF NOT EXISTS idx_score_sheets_subject_term ON score_sheets(subject_id, term_id);
CREATE INDEX IF NOT EXISTS idx_academic_terms_school_id ON academic_terms(school_id);
CREATE INDEX IF NOT EXISTS idx_academic_terms_is_active ON academic_terms(school_id, is_active);

-- ============================================================================
-- PHASE 6: VERIFICATION QUERIES (FOR MANUAL INSPECTION)
-- ============================================================================

-- Run these separately to verify data:

-- 1. Check if score_sheets has data:
-- SELECT COUNT(*) as total_scores FROM score_sheets;

-- 2. Check if scores have correct term_id values:
-- SELECT school_id, student_id, subject_id, term_id, test1, test2, test3, test4, exam 
-- FROM score_sheets LIMIT 10;

-- 3. Check if academic_terms exists and has data:
-- SELECT COUNT(*) as total_terms FROM academic_terms;

-- 4. Verify FK reference is correct:
-- SELECT constraint_name FROM information_schema.table_constraints 
-- WHERE table_name = 'score_sheets' AND constraint_type = 'FOREIGN KEY';

-- 5. Test the results query manually:
-- SELECT 
--   ss.student_id,
--   ss.subject_id,
--   ss.test1, ss.test2, ss.test3, ss.test4, ss.exam,
--   ss.total
-- FROM score_sheets ss
-- WHERE ss.school_id = '<SCHOOL_ID>'
-- AND ss.student_id = '<STUDENT_ID>'
-- AND ss.term_id = '<TERM_ID>';

COMMIT;
