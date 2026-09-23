-- ============================================================================
-- Migration 135: Fix CBT Auto-Population - Backfill Missing Scores
-- ============================================================================
-- PROBLEM:
-- CBT subject scores are not automatically appearing in:
-- 1. Subject teacher score sheets
-- 2. Class teacher result pages
-- 3. Student result pages
--
-- SOLUTION:
-- 1. ✅ Fixed typo in CBT start route (cbtExamId → cbt_exam_id)
-- 2. ✅ Verified trigger exists in Migration 126
-- 3. → Create backfill function to sync any missed CBT scores
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Create Simple Backfill Function (Type-Safe)
-- ============================================================================

CREATE OR REPLACE FUNCTION backfill_cbt_scores_to_score_sheets()
RETURNS TABLE (
  message VARCHAR
) AS $$
DECLARE
  v_synced INT := 0;
  v_failed INT := 0;
  v_gap RECORD;
  v_school_id UUID;
  v_total_marks NUMERIC;
  v_assessment_type VARCHAR;
  v_student_class_id UUID;
  v_academic_session_id UUID;
  v_session_year VARCHAR;
  v_score_column VARCHAR;
  v_source_column VARCHAR;
  v_cbt_source_column VARCHAR;
  v_scaled_score NUMERIC;
BEGIN
  
  -- Find all GRADED CBT submissions that aren't in score_sheets
  FOR v_gap IN 
    SELECT 
      cs.id AS submission_id,
      cs.student_id,
      cs.cbt_exam_id,
      cs.score,
      cs.term_id,
      ce.subject_id,
      ce.total_marks,
      ce.assessment_type,
      ce.school_id
    FROM cbt_submissions cs
    JOIN cbt_exams ce ON ce.id = cs.cbt_exam_id
    WHERE cs.status = 'GRADED' 
      AND cs.score IS NOT NULL
      AND cs.term_id IS NOT NULL
      AND ce.subject_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM score_sheets ss
        WHERE ss.school_id = ce.school_id
          AND ss.student_id = cs.student_id
          AND ss.subject_id = ce.subject_id
          AND ss.term_id = cs.term_id
      )
  LOOP
    BEGIN
      v_school_id := v_gap.school_id;
      v_total_marks := v_gap.total_marks;
      v_assessment_type := COALESCE(v_gap.assessment_type, 'EXAM');
      
      -- Get student class and academic session
      SELECT s.class_arm_combo_id 
      INTO v_student_class_id
      FROM students s
      WHERE s.id = v_gap.student_id
      LIMIT 1;
      
      SELECT at.session_id, asess.session_year
      INTO v_academic_session_id, v_session_year
      FROM academic_terms at
      LEFT JOIN academic_sessions asess ON asess.id = at.session_id
      WHERE at.id = v_gap.term_id
      LIMIT 1;
      
      -- Determine score column based on assessment type
      CASE v_assessment_type
        WHEN 'CA1' THEN 
          v_score_column := 'test1';
          v_source_column := 'test1_source';
          v_cbt_source_column := 'test1_cbt_source';
        WHEN 'CA2' THEN 
          v_score_column := 'test2';
          v_source_column := 'test2_source';
          v_cbt_source_column := 'test2_cbt_source';
        WHEN 'CA3' THEN 
          v_score_column := 'test3';
          v_source_column := 'test3_source';
          v_cbt_source_column := 'test3_cbt_source';
        WHEN 'CA4' THEN 
          v_score_column := 'test4';
          v_source_column := 'test4_source';
          v_cbt_source_column := 'test4_cbt_source';
        ELSE 
          v_score_column := 'exam';
          v_source_column := 'exam_source';
          v_cbt_source_column := 'exam_cbt_source';
      END CASE;
      
      -- Scale score
      IF v_score_column = 'exam' THEN
        v_scaled_score := ROUND((v_gap.score / COALESCE(v_total_marks, 100)) * 60 * 100) / 100;
      ELSE
        v_scaled_score := ROUND((v_gap.score / COALESCE(v_total_marks, 100)) * 10 * 100) / 100;
      END IF;
      
      -- Insert into score_sheets
      INSERT INTO score_sheets (
        school_id, student_id, subject_id, term_id,
        class_arm_combo_id, academic_session_id, session_year,
        created_at, updated_at
      )
      VALUES (
        v_school_id, v_gap.student_id, v_gap.subject_id, v_gap.term_id,
        v_student_class_id, v_academic_session_id, v_session_year,
        NOW(), NOW()
      );
      
      -- Update the score column
      EXECUTE format(
        'UPDATE score_sheets SET %I = %L, %I = %L, %I = %L, updated_at = NOW() 
         WHERE school_id = %L AND student_id = %L AND subject_id = %L AND term_id = %L',
        v_score_column, v_scaled_score,
        v_source_column, 'CBT',
        v_cbt_source_column, v_gap.submission_id,
        v_school_id, v_gap.student_id, v_gap.subject_id, v_gap.term_id
      );
      
      v_synced := v_synced + 1;
      
    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed + 1;
      RAISE WARNING '[backfill] Error syncing submission %: %', v_gap.submission_id, SQLERRM;
    END;
  END LOOP;
  
  RETURN QUERY 
  SELECT format('✅ Backfill complete: Synced %s scores, Failed %s', v_synced, v_failed)::VARCHAR;
  
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 2: Report Current State
-- ============================================================================

DO $$
DECLARE
  v_graded_count INT;
  v_in_sheets_count INT;
  v_gap_count INT;
BEGIN
  
  -- Count graded CBT submissions
  SELECT COUNT(*) INTO v_graded_count
  FROM cbt_submissions
  WHERE status = 'GRADED' AND score IS NOT NULL;
  
  -- Count graded CBT with corresponding score_sheets
  SELECT COUNT(DISTINCT cs.id) INTO v_in_sheets_count
  FROM cbt_submissions cs
  JOIN cbt_exams ce ON ce.id = cs.cbt_exam_id
  JOIN score_sheets ss ON (
    ss.school_id = ce.school_id
    AND ss.student_id = cs.student_id
    AND ss.subject_id = ce.subject_id
    AND ss.term_id = cs.term_id
  )
  WHERE cs.status = 'GRADED' AND cs.score IS NOT NULL;
  
  v_gap_count := v_graded_count - v_in_sheets_count;
  
  RAISE NOTICE '[Migration 135] === CBT Score Population Status ===';
  RAISE NOTICE '[Migration 135] Total GRADED CBT submissions: %', v_graded_count;
  RAISE NOTICE '[Migration 135] Already in score_sheets: %', v_in_sheets_count;
  RAISE NOTICE '[Migration 135] Missing (gaps to sync): %', v_gap_count;
  
  IF v_gap_count > 0 THEN
    RAISE NOTICE '[Migration 135] ⚠️  Found % gaps - running backfill...', v_gap_count;
  ELSE
    RAISE NOTICE '[Migration 135] ✅ All GRADED CBT scores already in score_sheets!';
  END IF;
  
END $$;

-- ============================================================================
-- STEP 3: Run Backfill
-- ============================================================================

DO $$
DECLARE
  v_result RECORD;
BEGIN
  FOR v_result IN SELECT * FROM backfill_cbt_scores_to_score_sheets()
  LOOP
    RAISE NOTICE '[Migration 135] %', v_result.message;
  END LOOP;
END $$;

COMMIT;

-- ============================================================================
-- POST-DEPLOYMENT VERIFICATION:
-- ============================================================================
-- Run these queries in Supabase SQL Editor to verify:

-- 1. Check that CBT scores are now in score_sheets:
-- SELECT COUNT(*) as cbt_scores_in_sheets
-- FROM score_sheets 
-- WHERE test1_source = 'CBT' OR test2_source = 'CBT' 
--    OR test3_source = 'CBT' OR test4_source = 'CBT' 
--    OR exam_source = 'CBT';

-- 2. Verify score calculation (CA should be 0-10, EXAM should be 0-60):
-- SELECT subject_id, test1, test2, test3, test4, exam, test1_source, exam_source
-- FROM score_sheets
-- WHERE test1_source = 'CBT' OR exam_source = 'CBT'
-- LIMIT 5;

-- 3. Check for any remaining gaps (should be 0):
-- SELECT COUNT(*) as remaining_gaps
-- FROM cbt_submissions cs
-- JOIN cbt_exams ce ON ce.id = cs.cbt_exam_id
-- WHERE cs.status = 'GRADED' AND cs.score IS NOT NULL
--   AND NOT EXISTS (
--     SELECT 1 FROM score_sheets ss
--     WHERE ss.school_id = ce.school_id
--       AND ss.student_id = cs.student_id
--       AND ss.subject_id = ce.subject_id
--       AND ss.term_id = cs.term_id
--   );
