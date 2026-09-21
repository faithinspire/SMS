-- ============================================================================
-- Migration 126 FIXED: Fix CBT Results Pipeline
-- ============================================================================
-- FIXED: Now handles case where cbt_results table doesn't exist
-- Run this in Supabase SQL Editor instead of previous version
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Drop old broken trigger (safely - handles missing table)
-- ============================================================================
DO $$
BEGIN
  EXECUTE 'DROP TRIGGER IF EXISTS trigger_cbt_auto_populate_score_sheets ON cbt_results CASCADE';
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DROP FUNCTION IF EXISTS auto_populate_score_sheets_from_cbt() CASCADE;

-- ============================================================================
-- STEP 2: Create corrected function and trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION auto_populate_score_sheets_from_cbt()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process GRADED submissions
  IF NEW.status = 'GRADED' AND NEW.score IS NOT NULL THEN
    
    -- Get exam details
    DECLARE
      v_exam_id UUID;
      v_subject_id UUID;
      v_assessment_type TEXT;
      v_total_marks NUMERIC;
      v_academic_session_id UUID;
      v_session_year TEXT;
      v_score_column TEXT;
      v_source_column TEXT;
      v_cbt_source_column TEXT;
      v_scaled_score NUMERIC;
      v_student_class_id UUID;
    BEGIN
      
      -- Get exam and session details
      SELECT 
        e.subject_id, 
        e.assessment_type, 
        e.total_marks,
        s.class_arm_combo_id,
        at.session_id,
        asess.session_year
      INTO v_subject_id, v_assessment_type, v_total_marks, v_student_class_id, v_academic_session_id, v_session_year
      FROM cbt_exams e
      LEFT JOIN students s ON s.id = NEW.student_id
      LEFT JOIN academic_terms at ON at.id = NEW.term_id
      LEFT JOIN academic_sessions asess ON asess.id = at.session_id
      WHERE e.id = NEW.cbt_exam_id;
      
      -- Skip if essential data is missing
      IF v_subject_id IS NULL OR NEW.term_id IS NULL THEN
        RETURN NEW;
      END IF;
      
      -- Determine which score column based on assessment type
      v_assessment_type := COALESCE(v_assessment_type, 'EXAM');
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
      
      -- Scale score to appropriate max (10 for CA, 60 for EXAM)
      IF v_score_column = 'exam' THEN
        v_scaled_score := ROUND((NEW.score / COALESCE(v_total_marks, 100)) * 60 * 100) / 100;
      ELSE
        v_scaled_score := ROUND((NEW.score / COALESCE(v_total_marks, 100)) * 10 * 100) / 100;
      END IF;
      
      -- Upsert into score_sheets
      INSERT INTO score_sheets (
        school_id, 
        student_id, 
        subject_id, 
        term_id, 
        class_arm_combo_id,
        academic_session_id,
        session_year,
        created_at,
        updated_at
      )
      VALUES (
        NEW.school_id,
        NEW.student_id,
        v_subject_id,
        NEW.term_id,
        v_student_class_id,
        v_academic_session_id,
        v_session_year,
        NOW(),
        NOW()
      )
      ON CONFLICT (school_id, student_id, subject_id, term_id, class_arm_combo_id) DO
      UPDATE SET
        updated_at = NOW()
      RETURNING id INTO v_academic_session_id;
      
      -- Update the score column
      EXECUTE format(
        'UPDATE score_sheets SET %I = %L, %I = %L, %I = %L, updated_at = NOW() WHERE school_id = %L AND student_id = %L AND subject_id = %L AND term_id = %L',
        v_score_column, v_scaled_score,
        v_source_column, 'CBT',
        v_cbt_source_column, NEW.id,
        NEW.school_id, NEW.student_id, v_subject_id, NEW.term_id
      );
      
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on cbt_submissions (CORRECT TABLE)
CREATE TRIGGER trigger_cbt_auto_populate_score_sheets_v2
AFTER INSERT OR UPDATE ON cbt_submissions
FOR EACH ROW
EXECUTE FUNCTION auto_populate_score_sheets_from_cbt();

-- ============================================================================
-- STEP 3: Backfill - Sync all existing graded CBT submissions to score_sheets
-- ============================================================================
WITH graded_submissions AS (
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
  WHERE cs.status = 'GRADED' 
    AND cs.score IS NOT NULL
    AND ce.subject_id IS NOT NULL
    AND cs.term_id IS NOT NULL
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
  gs.school_id,
  gs.student_id,
  gs.subject_id,
  gs.term_id,
  gs.class_arm_combo_id,
  gs.session_id,
  gs.session_year,
  CASE WHEN COALESCE(gs.exam_assessment_type, gs.assessment_type) = 'CA1' 
    THEN ROUND((gs.score / COALESCE(gs.total_marks, 100)) * 10 * 100) / 100 
    ELSE NULL 
  END as test1,
  CASE WHEN COALESCE(gs.exam_assessment_type, gs.assessment_type) = 'CA2' 
    THEN ROUND((gs.score / COALESCE(gs.total_marks, 100)) * 10 * 100) / 100 
    ELSE NULL 
  END as test2,
  CASE WHEN COALESCE(gs.exam_assessment_type, gs.assessment_type) = 'CA3' 
    THEN ROUND((gs.score / COALESCE(gs.total_marks, 100)) * 10 * 100) / 100 
    ELSE NULL 
  END as test3,
  CASE WHEN COALESCE(gs.exam_assessment_type, gs.assessment_type) = 'CA4' 
    THEN ROUND((gs.score / COALESCE(gs.total_marks, 100)) * 10 * 100) / 100 
    ELSE NULL 
  END as test4,
  CASE WHEN COALESCE(gs.exam_assessment_type, gs.assessment_type) IN ('EXAM', NULL) 
    THEN ROUND((gs.score / COALESCE(gs.total_marks, 100)) * 60 * 100) / 100 
    ELSE NULL 
  END as exam,
  CASE WHEN COALESCE(gs.exam_assessment_type, gs.assessment_type) = 'CA1' THEN 'CBT' ELSE NULL END,
  CASE WHEN COALESCE(gs.exam_assessment_type, gs.assessment_type) = 'CA2' THEN 'CBT' ELSE NULL END,
  CASE WHEN COALESCE(gs.exam_assessment_type, gs.assessment_type) = 'CA3' THEN 'CBT' ELSE NULL END,
  CASE WHEN COALESCE(gs.exam_assessment_type, gs.assessment_type) = 'CA4' THEN 'CBT' ELSE NULL END,
  CASE WHEN COALESCE(gs.exam_assessment_type, gs.assessment_type) IN ('EXAM', NULL) THEN 'CBT' ELSE NULL END,
  CASE WHEN COALESCE(gs.exam_assessment_type, gs.assessment_type) = 'CA1' THEN gs.submission_id ELSE NULL END,
  CASE WHEN COALESCE(gs.exam_assessment_type, gs.assessment_type) = 'CA2' THEN gs.submission_id ELSE NULL END,
  CASE WHEN COALESCE(gs.exam_assessment_type, gs.assessment_type) = 'CA3' THEN gs.submission_id ELSE NULL END,
  CASE WHEN COALESCE(gs.exam_assessment_type, gs.assessment_type) = 'CA4' THEN gs.submission_id ELSE NULL END,
  CASE WHEN COALESCE(gs.exam_assessment_type, gs.assessment_type) IN ('EXAM', NULL) THEN gs.submission_id ELSE NULL END,
  NOW(),
  NOW()
FROM graded_submissions gs
ON CONFLICT (school_id, student_id, subject_id, term_id, class_arm_combo_id) DO
UPDATE SET
  test1 = COALESCE(EXCLUDED.test1, score_sheets.test1),
  test2 = COALESCE(EXCLUDED.test2, score_sheets.test2),
  test3 = COALESCE(EXCLUDED.test3, score_sheets.test3),
  test4 = COALESCE(EXCLUDED.test4, score_sheets.test4),
  exam = COALESCE(EXCLUDED.exam, score_sheets.exam),
  test1_cbt_source = COALESCE(EXCLUDED.test1_cbt_source, score_sheets.test1_cbt_source),
  test2_cbt_source = COALESCE(EXCLUDED.test2_cbt_source, score_sheets.test2_cbt_source),
  test3_cbt_source = COALESCE(EXCLUDED.test3_cbt_source, score_sheets.test3_cbt_source),
  test4_cbt_source = COALESCE(EXCLUDED.test4_cbt_source, score_sheets.test4_cbt_source),
  exam_cbt_source = COALESCE(EXCLUDED.exam_cbt_source, score_sheets.exam_cbt_source),
  updated_at = NOW();

-- ============================================================================
-- STEP 4: Verification
-- ============================================================================
SELECT 
  'STEP 4: CBT Results Pipeline Verification' as status,
  (SELECT COUNT(*) FROM cbt_submissions WHERE status = 'GRADED') as total_graded_submissions,
  (SELECT COUNT(*) FROM score_sheets WHERE exam_source = 'CBT' OR test1_source = 'CBT' OR test2_source = 'CBT' OR test3_source = 'CBT' OR test4_source = 'CBT') as score_sheets_from_cbt,
  (SELECT COUNT(*) FROM cbt_submissions WHERE status = 'GRADED' AND score IS NOT NULL AND cbt_exam_id IN (SELECT id FROM cbt_exams WHERE subject_id IS NOT NULL)) as eligible_for_sync;

COMMIT;
