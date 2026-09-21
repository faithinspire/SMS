-- ============================================================================
-- Migration 128: Backfill All CBT Scores to Score Sheets
-- ============================================================================
-- PURPOSE:
-- Sync ALL existing CBT submissions (regardless of status) to score_sheets
-- This ensures historical data isn't lost and all scores appear immediately
--
-- LOGIC:
-- 1. Find all submissions with scores (whether status='GRADED' or older 'SUBMITTED')
-- 2. Calculate scaled scores for score_sheets table
-- 3. Map assessment types to correct score columns
-- 4. Insert/update score_sheets with all historical submissions
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Sync all CBT submissions with scores to score_sheets
-- ============================================================================
WITH all_submissions_with_scores AS (
  SELECT 
    cs.id as submission_id,
    cs.school_id,
    cs.student_id,
    cs.cbt_exam_id,
    cs.term_id,
    cs.score,
    cs.assessment_type,
    ce.subject_id,
    ce.total_marks,
    ce.assessment_type as exam_assessment_type,
    st.class_arm_combo_id,
    at.session_id,
    asess.session_year
  FROM cbt_submissions cs
  LEFT JOIN cbt_exams ce ON ce.id = cs.cbt_exam_id
  LEFT JOIN students st ON st.id = cs.student_id
  LEFT JOIN academic_terms at ON at.id = cs.term_id
  LEFT JOIN academic_sessions asess ON asess.id = at.session_id
  WHERE cs.score IS NOT NULL  -- Has a score value
    AND ce.subject_id IS NOT NULL  -- Exam has subject
    AND cs.term_id IS NOT NULL  -- Submission has term
)
INSERT INTO score_sheets (
  school_id,
  student_id,
  subject_id,
  term_id,
  class_arm_combo_id,
  academic_session_id,
  session_year,
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
  ams.school_id,
  ams.student_id,
  ams.subject_id,
  ams.term_id,
  ams.class_arm_combo_id,
  ams.session_id,
  ams.session_year,
  -- CA1 (test1): Score scaled to 0-10
  CASE WHEN COALESCE(ams.exam_assessment_type, ams.assessment_type) = 'CA1' 
    THEN ROUND((ams.score / COALESCE(ams.total_marks, 100)) * 10 * 100) / 100 
    ELSE NULL 
  END as test1,
  -- CA2 (test2): Score scaled to 0-10
  CASE WHEN COALESCE(ams.exam_assessment_type, ams.assessment_type) = 'CA2' 
    THEN ROUND((ams.score / COALESCE(ams.total_marks, 100)) * 10 * 100) / 100 
    ELSE NULL 
  END as test2,
  -- CA3 (test3): Score scaled to 0-10
  CASE WHEN COALESCE(ams.exam_assessment_type, ams.assessment_type) = 'CA3' 
    THEN ROUND((ams.score / COALESCE(ams.total_marks, 100)) * 10 * 100) / 100 
    ELSE NULL 
  END as test3,
  -- CA4 (test4): Score scaled to 0-10
  CASE WHEN COALESCE(ams.exam_assessment_type, ams.assessment_type) = 'CA4' 
    THEN ROUND((ams.score / COALESCE(ams.total_marks, 100)) * 10 * 100) / 100 
    ELSE NULL 
  END as test4,
  -- EXAM: Score scaled to 0-60
  CASE WHEN COALESCE(ams.exam_assessment_type, ams.assessment_type) IN ('EXAM', NULL) 
    THEN ROUND((ams.score / COALESCE(ams.total_marks, 100)) * 60 * 100) / 100 
    ELSE NULL 
  END as exam,
  -- Source tracking
  CASE WHEN COALESCE(ams.exam_assessment_type, ams.assessment_type) = 'CA1' THEN 'CBT' ELSE NULL END,
  CASE WHEN COALESCE(ams.exam_assessment_type, ams.assessment_type) = 'CA2' THEN 'CBT' ELSE NULL END,
  CASE WHEN COALESCE(ams.exam_assessment_type, ams.assessment_type) = 'CA3' THEN 'CBT' ELSE NULL END,
  CASE WHEN COALESCE(ams.exam_assessment_type, ams.assessment_type) = 'CA4' THEN 'CBT' ELSE NULL END,
  CASE WHEN COALESCE(ams.exam_assessment_type, ams.assessment_type) IN ('EXAM', NULL) THEN 'CBT' ELSE NULL END,
  -- CBT source tracking (submission ID)
  CASE WHEN COALESCE(ams.exam_assessment_type, ams.assessment_type) = 'CA1' THEN ams.submission_id ELSE NULL END,
  CASE WHEN COALESCE(ams.exam_assessment_type, ams.assessment_type) = 'CA2' THEN ams.submission_id ELSE NULL END,
  CASE WHEN COALESCE(ams.exam_assessment_type, ams.assessment_type) = 'CA3' THEN ams.submission_id ELSE NULL END,
  CASE WHEN COALESCE(ams.exam_assessment_type, ams.assessment_type) = 'CA4' THEN ams.submission_id ELSE NULL END,
  CASE WHEN COALESCE(ams.exam_assessment_type, ams.assessment_type) IN ('EXAM', NULL) THEN ams.submission_id ELSE NULL END,
  NOW(),
  NOW()
FROM all_submissions_with_scores ams
ON CONFLICT (school_id, student_id, subject_id, term_id) DO
UPDATE SET
  -- Update scores only if currently NULL (preserve manual teacher entries)
  test1 = COALESCE(EXCLUDED.test1, score_sheets.test1),
  test2 = COALESCE(EXCLUDED.test2, score_sheets.test2),
  test3 = COALESCE(EXCLUDED.test3, score_sheets.test3),
  test4 = COALESCE(EXCLUDED.test4, score_sheets.test4),
  exam = COALESCE(EXCLUDED.exam, score_sheets.exam),
  -- Track CBT sources
  test1_cbt_source = COALESCE(EXCLUDED.test1_cbt_source, score_sheets.test1_cbt_source),
  test2_cbt_source = COALESCE(EXCLUDED.test2_cbt_source, score_sheets.test2_cbt_source),
  test3_cbt_source = COALESCE(EXCLUDED.test3_cbt_source, score_sheets.test3_cbt_source),
  test4_cbt_source = COALESCE(EXCLUDED.test4_cbt_source, score_sheets.test4_cbt_source),
  exam_cbt_source = COALESCE(EXCLUDED.exam_cbt_source, score_sheets.exam_cbt_source),
  updated_at = NOW();

-- ============================================================================
-- STEP 2: Update submission statuses to GRADED (for consistency)
-- ============================================================================
UPDATE cbt_submissions
SET status = 'GRADED'
WHERE score IS NOT NULL 
  AND status != 'GRADED'
  AND cbt_exam_id IN (SELECT id FROM cbt_exams WHERE subject_id IS NOT NULL);

-- ============================================================================
-- STEP 3: Verification
-- ============================================================================
SELECT 
  'Migration 128: CBT Score Backfill Complete' as status,
  (SELECT COUNT(*) FROM cbt_submissions WHERE status = 'GRADED' AND score IS NOT NULL) as total_graded_submissions,
  (SELECT COUNT(*) FROM cbt_submissions WHERE score IS NOT NULL) as total_scored_submissions,
  (SELECT COUNT(*) FROM score_sheets WHERE exam_source = 'CBT' OR test1_source = 'CBT' OR test2_source = 'CBT' OR test3_source = 'CBT' OR test4_source = 'CBT') as score_sheets_with_cbt,
  (SELECT COUNT(*) FROM score_sheets) as total_score_sheets;

COMMIT;
