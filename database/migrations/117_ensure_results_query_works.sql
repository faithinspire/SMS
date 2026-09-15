-- Migration 117: Absolutely Ensure Results Query Works
-- This migration will:
-- 1. Verify the EXACT query used by results page can find scores
-- 2. Fix any remaining issues preventing results from showing
-- 3. Create diagnostic views for troubleshooting

BEGIN;

-- ============================================================================
-- PHASE 1: CREATE A VIEW THAT MIRRORS THE RESULTS PAGE QUERY
-- This helps debug exactly what the results page sees
-- ============================================================================

DROP VIEW IF EXISTS v_student_scores_for_results CASCADE;

CREATE VIEW v_student_scores_for_results AS
SELECT 
  ss.school_id,
  ss.student_id,
  ss.subject_id,
  ss.term_id,
  s.id as student_id_check,
  subj.id as subject_id_check,
  at.id as term_id_check,
  ss.test1,
  ss.test2,
  ss.test3,
  ss.test4,
  ss.exam,
  ss.total,
  ss.grade,
  ss.test1_source,
  ss.test2_source,
  ss.test3_source,
  ss.test4_source,
  ss.exam_source,
  ss.created_at
FROM score_sheets ss
LEFT JOIN students s ON ss.student_id = s.id
LEFT JOIN subjects subj ON ss.subject_id = subj.id
LEFT JOIN academic_terms at ON ss.term_id = at.id
WHERE ss.test1 IS NOT NULL 
   OR ss.test2 IS NOT NULL 
   OR ss.test3 IS NOT NULL 
   OR ss.test4 IS NOT NULL 
   OR ss.exam IS NOT NULL;

-- ============================================================================
-- PHASE 2: CREATE DIAGNOSTIC VIEWS
-- ============================================================================

DROP VIEW IF EXISTS v_scores_debug CASCADE;

CREATE VIEW v_scores_debug AS
SELECT 
  'Total Scores' as metric,
  COUNT(*) as value
FROM score_sheets
UNION ALL
SELECT 
  'Scores with test1',
  COUNT(*) FROM score_sheets WHERE test1 IS NOT NULL
UNION ALL
SELECT 
  'Scores with test2',
  COUNT(*) FROM score_sheets WHERE test2 IS NOT NULL
UNION ALL
SELECT 
  'Scores with test3',
  COUNT(*) FROM score_sheets WHERE test3 IS NOT NULL
UNION ALL
SELECT 
  'Scores with test4',
  COUNT(*) FROM score_sheets WHERE test4 IS NOT NULL
UNION ALL
SELECT 
  'Scores with exam',
  COUNT(*) FROM score_sheets WHERE exam IS NOT NULL
UNION ALL
SELECT 
  'Total Academic Terms',
  COUNT(*) FROM academic_terms
UNION ALL
SELECT 
  'Orphaned Scores (no term)',
  COUNT(*) FROM score_sheets ss 
  LEFT JOIN academic_terms at ON ss.term_id = at.id 
  WHERE at.id IS NULL
UNION ALL
SELECT 
  'Score-Term FK Status',
  COUNT(*) FROM information_schema.table_constraints 
  WHERE table_name = 'score_sheets' 
  AND constraint_type = 'FOREIGN KEY';

-- ============================================================================
-- PHASE 3: ENSURE EVERY SCHOOL HAS ACTIVE TERM
-- ============================================================================

-- If no school has an active term, make all first terms active
UPDATE academic_terms at
SET is_active = true
WHERE term_order = 1 
  AND NOT EXISTS (
    SELECT 1 FROM academic_terms at2
    WHERE at2.session_id = at.session_id
      AND at2.school_id = at.school_id
      AND at2.is_active = true
  );

-- If STILL no active terms, make the oldest term active
WITH no_active_term AS (
  SELECT DISTINCT school_id
  FROM academic_terms at1
  WHERE NOT EXISTS (
    SELECT 1 FROM academic_terms at2
    WHERE at1.school_id = at2.school_id
      AND at2.is_active = true
  )
)
UPDATE academic_terms
SET is_active = true
WHERE id IN (
  SELECT at.id FROM academic_terms at
  JOIN no_active_term nat ON at.school_id = nat.school_id
  ORDER BY at.created_at ASC
  LIMIT 1
);

-- ============================================================================
-- PHASE 4: ENSURE score_sheets TERMS ARE LINKED TO ACTIVE SESSION
-- ============================================================================

-- Update score_sheets to link to the correct academic session
UPDATE score_sheets ss
SET academic_session_id = (
  SELECT as.id FROM academic_sessions as
  WHERE as.school_id = ss.school_id
  AND as.is_active = true
  LIMIT 1
)
WHERE academic_session_id IS NULL;

-- ============================================================================
-- PHASE 5: CREATE FUNCTION FOR RESULTS QUERY DEBUGGING
-- ============================================================================

CREATE OR REPLACE FUNCTION get_student_scores_debug(
  p_school_id UUID,
  p_student_id UUID,
  p_term_id UUID
)
RETURNS TABLE (
  found_scores BIGINT,
  found_subjects BIGINT,
  first_score_test1 NUMERIC,
  first_score_test2 NUMERIC,
  first_score_test3 NUMERIC,
  first_score_test4 NUMERIC,
  first_score_exam NUMERIC,
  error_message TEXT
) AS $$
BEGIN
  -- Check if scores exist for this student/term combination
  WITH score_check AS (
    SELECT 
      COUNT(*) as score_count,
      COUNT(DISTINCT subject_id) as subject_count,
      MAX(test1) as max_test1,
      MAX(test2) as max_test2,
      MAX(test3) as max_test3,
      MAX(test4) as max_test4,
      MAX(exam) as max_exam
    FROM score_sheets
    WHERE school_id = p_school_id
      AND student_id = p_student_id
      AND term_id = p_term_id
  )
  SELECT 
    score_count,
    subject_count,
    max_test1,
    max_test2,
    max_test3,
    max_test4,
    max_exam,
    CASE 
      WHEN score_count = 0 THEN 'NO SCORES FOUND'
      WHEN score_count > 0 AND subject_count = 0 THEN 'SCORES EXIST BUT SUBJECTS MISSING'
      WHEN score_count > 0 AND score_count > 0 THEN 'SCORES FOUND'
      ELSE 'UNKNOWN'
    END
  FROM score_check;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PHASE 6: CREATE TRIGGER TO AUTO-UPDATE score_sheets.updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_score_sheets_timestamp()
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
EXECUTE FUNCTION update_score_sheets_timestamp();

-- ============================================================================
-- PHASE 7: ENSURE ALL REQUIRED INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_score_sheets_query ON score_sheets(school_id, student_id, term_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_score_sheets_has_scores ON score_sheets(test1, test2, test3, test4, exam) WHERE (test1 IS NOT NULL OR test2 IS NOT NULL OR test3 IS NOT NULL OR test4 IS NOT NULL OR exam IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_academic_terms_school_active ON academic_terms(school_id, is_active);

COMMIT;
