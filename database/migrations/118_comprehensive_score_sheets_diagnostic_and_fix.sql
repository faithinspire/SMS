-- Migration 118: Comprehensive Score Sheets Diagnostic and Fix
-- Ensures score_sheets table is properly populated and queries work
-- This is the FINAL DIAGNOSTIC to fix scores not showing in results

BEGIN;

-- ============================================================================
-- PHASE 1: VERIFY FOREIGN KEY RELATIONSHIPS
-- ============================================================================

-- Check if term_id FK exists and is correct
DO $$
DECLARE
  constraint_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'score_sheets'
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%term_id%'
  ) INTO constraint_exists;
  
  IF constraint_exists THEN
    RAISE NOTICE 'Term ID FK exists - removing and re-creating';
    ALTER TABLE score_sheets DROP CONSTRAINT IF EXISTS score_sheets_term_id_fkey CASCADE;
    ALTER TABLE score_sheets DROP CONSTRAINT IF EXISTS fk_score_sheets_term CASCADE;
    ALTER TABLE score_sheets DROP CONSTRAINT IF EXISTS fk_score_sheets_academic_terms CASCADE;
  END IF;
  
  -- Add correct FK to academic_terms
  ALTER TABLE score_sheets 
  ADD CONSTRAINT fk_score_sheets_academic_terms_fix 
    FOREIGN KEY (term_id) 
    REFERENCES academic_terms(id) 
    ON DELETE CASCADE;
    
  RAISE NOTICE 'Term ID FK corrected';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'FK fix attempt: %', SQLERRM;
END $$;

-- ============================================================================
-- PHASE 2: VERIFY AND POPULATE academic_sessions AND academic_terms
-- ============================================================================

-- Count existing records
DO $$
DECLARE
  session_count INTEGER;
  term_count INTEGER;
  school_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO session_count FROM academic_sessions;
  SELECT COUNT(*) INTO term_count FROM academic_terms;
  SELECT COUNT(*) INTO school_count FROM schools;
  
  RAISE NOTICE 'Current state - Sessions: %, Terms: %, Schools: %', session_count, term_count, school_count;
  
  -- If no sessions exist, populate them
  IF session_count = 0 THEN
    RAISE NOTICE 'Populating academic_sessions...';
    INSERT INTO academic_sessions (school_id, session_year, start_year, end_year, is_active)
    SELECT 
      s.id,
      '2025/2026'::VARCHAR,
      2025,
      2026,
      true
    FROM schools s
    ON CONFLICT (school_id, session_year) DO NOTHING;
  END IF;
  
  -- If no terms exist, populate them
  IF term_count = 0 THEN
    RAISE NOTICE 'Populating academic_terms...';
    INSERT INTO academic_terms (session_id, school_id, term_name, term_order, is_active)
    SELECT 
      ast.id,
      ast.school_id,
      'First Term'::VARCHAR,
      1,
      true
    FROM academic_sessions ast
    WHERE NOT EXISTS (
      SELECT 1 FROM academic_terms at2 
      WHERE at2.session_id = ast.id AND at2.term_name = 'First Term'
    )
    ON CONFLICT (session_id, term_name) DO NOTHING;
    
    RAISE NOTICE 'Terms populated';
  END IF;
END $$;

-- ============================================================================
-- PHASE 3: VERIFY SCORE_SHEETS DATA EXISTENCE
-- ============================================================================

DO $$
DECLARE
  total_scores INTEGER;
  scores_with_test1 INTEGER;
  scores_with_exam INTEGER;
  orphaned_scores INTEGER;
  nullterm_scores INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_scores FROM score_sheets;
  SELECT COUNT(*) INTO scores_with_test1 FROM score_sheets WHERE test1 IS NOT NULL;
  SELECT COUNT(*) INTO scores_with_exam FROM score_sheets WHERE exam IS NOT NULL;
  SELECT COUNT(*) INTO orphaned_scores FROM score_sheets ss
    LEFT JOIN academic_terms at ON ss.term_id = at.id
    WHERE at.id IS NULL;
  SELECT COUNT(*) INTO nullterm_scores FROM score_sheets WHERE term_id IS NULL;
  
  RAISE NOTICE '=== SCORE SHEETS DIAGNOSTIC ===';
  RAISE NOTICE 'Total score sheets: %', total_scores;
  RAISE NOTICE 'Score sheets with test1 populated: %', scores_with_test1;
  RAISE NOTICE 'Score sheets with exam populated: %', scores_with_exam;
  RAISE NOTICE 'Orphaned scores (term_id points to non-existent term): %', orphaned_scores;
  RAISE NOTICE 'Scores with NULL term_id: %', nullterm_scores;
END $$;

-- ============================================================================
-- PHASE 4: VERIFY THE QUERY THAT RESULTS PAGE USES WORKS
-- ============================================================================

-- Create a diagnostic procedure to test the results API query
DO $$
DECLARE
  test_school_id UUID;
  test_student_id UUID;
  test_term_id UUID;
  result_count INTEGER;
BEGIN
  -- Get a sample school
  SELECT id INTO test_school_id FROM schools LIMIT 1;
  
  IF test_school_id IS NOT NULL THEN
    -- Get a sample student in that school
    SELECT id INTO test_student_id FROM students 
    WHERE school_id = test_school_id LIMIT 1;
    
    IF test_student_id IS NOT NULL THEN
      -- Get a sample term
      SELECT at.id INTO test_term_id FROM academic_terms at
      WHERE at.school_id = test_school_id LIMIT 1;
      
      IF test_term_id IS NOT NULL THEN
        -- Run the actual results query
        SELECT COUNT(*) INTO result_count FROM score_sheets
        WHERE school_id = test_school_id
          AND student_id = test_student_id
          AND term_id = test_term_id;
        
        RAISE NOTICE '=== RESULTS QUERY TEST ===';
        RAISE NOTICE 'Test School: %', test_school_id;
        RAISE NOTICE 'Test Student: %', test_student_id;
        RAISE NOTICE 'Test Term: %', test_term_id;
        RAISE NOTICE 'Query returned: % scores', result_count;
      ELSE
        RAISE NOTICE 'No terms found for test school';
      END IF;
    ELSE
      RAISE NOTICE 'No students found in test school';
    END IF;
  ELSE
    RAISE NOTICE 'No schools found in database';
  END IF;
END $$;

-- ============================================================================
-- PHASE 5: ENSURE INDEXES ARE OPTIMIZED FOR RESULTS QUERIES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_score_sheets_results_query 
  ON score_sheets(school_id, student_id, term_id, subject_id);

CREATE INDEX IF NOT EXISTS idx_score_sheets_test1_not_null 
  ON score_sheets(school_id, student_id, term_id) 
  WHERE test1 IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_score_sheets_exam_not_null 
  ON score_sheets(school_id, student_id, term_id) 
  WHERE exam IS NOT NULL;

-- ============================================================================
-- PHASE 6: FINAL VERIFICATION VIEW
-- ============================================================================

DROP VIEW IF EXISTS v_score_sheets_status_final CASCADE;

CREATE VIEW v_score_sheets_status_final AS
SELECT 
  'total_scores'::TEXT as metric,
  COUNT(*)::TEXT as value,
  NOW() as checked_at
FROM score_sheets
UNION ALL
SELECT 
  'scores_with_any_data',
  COUNT(*)::TEXT,
  NOW()
FROM score_sheets
WHERE test1 IS NOT NULL 
   OR test2 IS NOT NULL 
   OR test3 IS NOT NULL 
   OR test4 IS NOT NULL 
   OR exam IS NOT NULL
UNION ALL
SELECT 
  'scores_by_test1',
  COUNT(*)::TEXT,
  NOW()
FROM score_sheets
WHERE test1 IS NOT NULL
UNION ALL
SELECT 
  'scores_by_exam',
  COUNT(*)::TEXT,
  NOW()
FROM score_sheets
WHERE exam IS NOT NULL
UNION ALL
SELECT 
  'total_academic_terms',
  COUNT(*)::TEXT,
  NOW()
FROM academic_terms
UNION ALL
SELECT 
  'total_academic_sessions',
  COUNT(*)::TEXT,
  NOW()
FROM academic_sessions
UNION ALL
SELECT 
  'schools',
  COUNT(*)::TEXT,
  NOW()
FROM schools;

-- ============================================================================
-- PHASE 7: CREATE RESULTS DEBUG LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS results_query_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID,
  student_id UUID,
  term_id UUID,
  results_found INTEGER,
  query_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  test1_count INTEGER,
  exam_count INTEGER
);

COMMIT;
