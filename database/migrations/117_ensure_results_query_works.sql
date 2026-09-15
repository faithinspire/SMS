-- Migration 117: Ensure Results Query Works
-- This migration will:
-- 1. Verify score_sheets schema is correct
-- 2. Ensure academic_terms are properly populated
-- 3. Create diagnostic views and triggers

BEGIN;

-- ============================================================================
-- PHASE 1: VERIFY AND FIX score_sheets TABLE
-- ============================================================================

-- Ensure score_sheets table exists with all required columns
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

-- Add any missing columns
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
-- PHASE 2: ENSURE academic_terms ARE POPULATED
-- ============================================================================

-- Drop wrong FK constraint if it exists
ALTER TABLE score_sheets DROP CONSTRAINT IF EXISTS score_sheets_term_id_fkey;
ALTER TABLE score_sheets DROP CONSTRAINT IF EXISTS fk_score_sheets_term;
ALTER TABLE score_sheets DROP CONSTRAINT IF EXISTS fk_score_sheets_academic_terms;

-- Add correct FK constraint to academic_terms
DO $$
BEGIN
  ALTER TABLE score_sheets 
  ADD CONSTRAINT fk_score_sheets_academic_terms 
    FOREIGN KEY (term_id) 
    REFERENCES academic_terms(id) 
    ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Ensure every school has at least one active term
INSERT INTO academic_terms (session_id, school_id, term_name, term_order, start_date, end_date, is_active)
SELECT 
  (SELECT id FROM academic_sessions WHERE school_id = s.id AND is_active = true LIMIT 1),
  s.id,
  'First Term',
  1,
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '90 days',
  true
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM academic_terms at
  WHERE at.school_id = s.id
)
ON CONFLICT (session_id, term_name) DO NOTHING;

-- ============================================================================
-- PHASE 3: CREATE DIAGNOSTIC VIEW
-- ============================================================================

DROP VIEW IF EXISTS v_score_sheet_status CASCADE;

CREATE VIEW v_score_sheet_status AS
SELECT 
  'total_scores' as metric,
  COUNT(*)::TEXT as value
FROM score_sheets
UNION ALL
SELECT 
  'total_terms',
  COUNT(*)::TEXT
FROM academic_terms
UNION ALL
SELECT 
  'total_sessions',
  COUNT(*)::TEXT
FROM academic_sessions
UNION ALL
SELECT 
  'orphaned_scores',
  COUNT(*)::TEXT
FROM score_sheets ss
LEFT JOIN academic_terms at ON ss.term_id = at.id
WHERE at.id IS NULL
UNION ALL
SELECT 
  'scores_with_test1',
  COUNT(*)::TEXT
FROM score_sheets
WHERE test1 IS NOT NULL
UNION ALL
SELECT 
  'scores_with_exam',
  COUNT(*)::TEXT
FROM score_sheets
WHERE exam IS NOT NULL;

-- ============================================================================
-- PHASE 4: CREATE TRIGGER FOR updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_score_sheets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS score_sheets_update_timestamp ON score_sheets;

CREATE TRIGGER score_sheets_update_timestamp
BEFORE UPDATE ON score_sheets
FOR EACH ROW
EXECUTE FUNCTION update_score_sheets_updated_at();

-- ============================================================================
-- PHASE 5: CREATE PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_score_sheets_query ON score_sheets(school_id, student_id, term_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_academic_terms_school ON academic_terms(school_id);
CREATE INDEX IF NOT EXISTS idx_academic_terms_active ON academic_terms(school_id, is_active);

COMMIT;
