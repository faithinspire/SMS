-- ============================================================================
-- Migration 148: HARD FIX CBT SCORING PIPELINE
-- ============================================================================
-- CRITICAL ISSUES FIXED:
-- 1. CBT exams must have subject_id, term_id, total_marks populated before scoring
-- 2. Trigger must properly cascade scores to score_sheets table
-- 3. Migration 129 had logic bug: checking wrong column (subject_id instead of term_id)
-- 4. Results pages must query and display CBT scores correctly
-- ============================================================================

-- STEP 1: Verify cbt_exams table structure
-- Expected columns: id, school_id, subject_id, term_id, total_marks, assessment_type
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'cbt_exams'
ORDER BY ordinal_position;

-- STEP 2: CRITICAL FIX - Backfill missing subject_id and term_id in cbt_exams
-- For exams that don't have these fields populated, try to infer from context

-- First, get exams without subject_id
-- Try to infer from cbt_questions table or from the exam creation context
UPDATE cbt_exams ce
SET 
  subject_id = COALESCE(
    (SELECT DISTINCT subject_id FROM cbt_questions cq WHERE cq.cbt_exam_id = ce.id LIMIT 1),
    ce.subject_id
  )
WHERE ce.subject_id IS NULL AND ce.id IN (
  SELECT DISTINCT cbt_exam_id FROM cbt_questions
);

-- Second, get exams without term_id
-- Find the active term for the school
UPDATE cbt_exams ce
SET term_id = (
  SELECT at.id FROM academic_terms at
  WHERE at.school_id = ce.school_id 
  AND at.is_active = true
  LIMIT 1
)
WHERE ce.term_id IS NULL;

-- If no active term, find any term for the school
UPDATE cbt_exams ce
SET term_id = (
  SELECT at.id FROM academic_terms at
  WHERE at.school_id = ce.school_id 
  LIMIT 1
)
WHERE ce.term_id IS NULL;

-- Third, ensure total_marks is set
UPDATE cbt_exams
SET total_marks = 100
WHERE total_marks IS NULL OR total_marks = 0;

-- Verify the updates
SELECT 
  COUNT(*) as total_exams,
  COUNT(CASE WHEN subject_id IS NOT NULL THEN 1 END) as with_subject,
  COUNT(CASE WHEN term_id IS NOT NULL THEN 1 END) as with_term,
  COUNT(CASE WHEN total_marks > 0 THEN 1 END) as with_marks
FROM cbt_exams;

-- ============================================================================
-- STEP 3: Drop and recreate the CBT scoring trigger (FIXED VERSION)
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_cbt_auto_populate_score_sheets_v3 ON cbt_submissions;
DROP FUNCTION IF EXISTS auto_populate_score_sheets_from_cbt_v3();

CREATE OR REPLACE FUNCTION auto_populate_score_sheets_from_cbt_v3()
RETURNS TRIGGER AS $$
DECLARE
  v_subject_id UUID;
  v_exam_total_marks DECIMAL;
  v_term_id UUID;
  v_assessment_type VARCHAR;
  v_score_column VARCHAR;
  v_source_column VARCHAR;
  v_cbt_source_column VARCHAR;
  v_scaled_score DECIMAL;
  v_max_marks DECIMAL := 10;  -- Default for CA scores
BEGIN
  -- Only process when status changes to GRADED and score is not null
  IF NEW.status = 'GRADED' AND NEW.score IS NOT NULL THEN
    
    -- Get exam details
    SELECT ce.subject_id, ce.total_marks, ce.term_id, ce.assessment_type
    INTO v_subject_id, v_exam_total_marks, v_term_id, v_assessment_type
    FROM cbt_exams ce
    WHERE ce.id = NEW.cbt_exam_id;

    -- CRITICAL VALIDATION: All required fields must be populated
    IF v_subject_id IS NULL THEN
      RAISE WARNING '[CBT Trigger] subject_id is NULL for exam % - skipping score population', NEW.cbt_exam_id;
      RETURN NEW;
    END IF;

    IF v_term_id IS NULL THEN
      RAISE WARNING '[CBT Trigger] term_id is NULL for exam % - trying fallback', NEW.cbt_exam_id;
      -- Fallback: use term from submission if available
      SELECT term_id INTO v_term_id FROM cbt_submissions WHERE id = NEW.id;
      IF v_term_id IS NULL THEN
        RAISE WARNING '[CBT Trigger] No term_id found - skipping score population';
        RETURN NEW;
      END IF;
    END IF;

    IF v_exam_total_marks IS NULL OR v_exam_total_marks <= 0 THEN
      RAISE WARNING '[CBT Trigger] Invalid total_marks (%) for exam % - using 100', v_exam_total_marks, NEW.cbt_exam_id;
      v_exam_total_marks := 100;
    END IF;

    IF v_assessment_type IS NULL THEN
      RAISE WARNING '[CBT Trigger] assessment_type is NULL for exam %', NEW.cbt_exam_id;
      v_assessment_type := 'CA1';  -- Default
    END IF;

    -- Determine which column to update based on assessment_type
    CASE v_assessment_type
      WHEN 'CA1' THEN
        v_score_column := 'test1';
        v_source_column := 'test1_source';
        v_cbt_source_column := 'test1_cbt_source';
        v_max_marks := 10;
      WHEN 'CA2' THEN
        v_score_column := 'test2';
        v_source_column := 'test2_source';
        v_cbt_source_column := 'test2_cbt_source';
        v_max_marks := 10;
      WHEN 'CA3' THEN
        v_score_column := 'test3';
        v_source_column := 'test3_source';
        v_cbt_source_column := 'test3_cbt_source';
        v_max_marks := 10;
      WHEN 'CA4' THEN
        v_score_column := 'test4';
        v_source_column := 'test4_source';
        v_cbt_source_column := 'test4_cbt_source';
        v_max_marks := 10;
      WHEN 'EXAM' THEN
        v_score_column := 'exam';
        v_source_column := 'exam_source';
        v_cbt_source_column := 'exam_cbt_source';
        v_max_marks := 60;
      ELSE
        RAISE WARNING '[CBT Trigger] Unknown assessment_type: % - using test1', v_assessment_type;
        v_score_column := 'test1';
        v_source_column := 'test1_source';
        v_cbt_source_column := 'test1_cbt_source';
        v_max_marks := 10;
    END CASE;

    -- Scale the score from original max (usually 100) to the column max
    v_scaled_score := (NEW.score / v_exam_total_marks) * v_max_marks;
    v_scaled_score := LEAST(v_scaled_score, v_max_marks); -- Cap at max
    v_scaled_score := GREATEST(v_scaled_score, 0);          -- Min 0

    -- Check if score_sheets record exists
    IF EXISTS (
      SELECT 1 FROM score_sheets
      WHERE school_id = NEW.school_id
        AND student_id = NEW.student_id
        AND subject_id = v_subject_id
        AND term_id = v_term_id
    ) THEN
      -- UPDATE existing record
      EXECUTE format(
        'UPDATE score_sheets SET %I = %L, %I = %L, %I = %L, updated_at = NOW() WHERE school_id = %L AND student_id = %L AND subject_id = %L AND term_id = %L',
        v_score_column, v_scaled_score,
        v_source_column, 'CBT',
        v_cbt_source_column, NEW.id,
        NEW.school_id, NEW.student_id, v_subject_id, v_term_id
      );
      RAISE NOTICE '[CBT Trigger] Updated score_sheets for student %, subject %, score: %', NEW.student_id, v_subject_id, v_scaled_score;
    ELSE
      -- INSERT new record with only this assessment
      INSERT INTO score_sheets (
        school_id, student_id, subject_id, term_id,
        test1, test1_source, test1_cbt_source,
        test2, test2_source, test2_cbt_source,
        test3, test3_source, test3_cbt_source,
        test4, test4_source, test4_cbt_source,
        exam, exam_source, exam_cbt_source,
        created_at, updated_at
      ) VALUES (
        NEW.school_id, NEW.student_id, v_subject_id, v_term_id,
        CASE WHEN v_score_column = 'test1' THEN v_scaled_score ELSE NULL END,
        CASE WHEN v_score_column = 'test1' THEN 'CBT' ELSE NULL END,
        CASE WHEN v_score_column = 'test1' THEN NEW.id ELSE NULL END,
        CASE WHEN v_score_column = 'test2' THEN v_scaled_score ELSE NULL END,
        CASE WHEN v_score_column = 'test2' THEN 'CBT' ELSE NULL END,
        CASE WHEN v_score_column = 'test2' THEN NEW.id ELSE NULL END,
        CASE WHEN v_score_column = 'test3' THEN v_scaled_score ELSE NULL END,
        CASE WHEN v_score_column = 'test3' THEN 'CBT' ELSE NULL END,
        CASE WHEN v_score_column = 'test3' THEN NEW.id ELSE NULL END,
        CASE WHEN v_score_column = 'test4' THEN v_scaled_score ELSE NULL END,
        CASE WHEN v_score_column = 'test4' THEN 'CBT' ELSE NULL END,
        CASE WHEN v_score_column = 'test4' THEN NEW.id ELSE NULL END,
        CASE WHEN v_score_column = 'exam' THEN v_scaled_score ELSE NULL END,
        CASE WHEN v_score_column = 'exam' THEN 'CBT' ELSE NULL END,
        CASE WHEN v_score_column = 'exam' THEN NEW.id ELSE NULL END,
        NOW(), NOW()
      );
      RAISE NOTICE '[CBT Trigger] Inserted new score_sheets record for student %, subject %', NEW.student_id, v_subject_id;
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER trigger_cbt_auto_populate_score_sheets_v3
AFTER UPDATE OF status ON cbt_submissions
FOR EACH ROW
EXECUTE FUNCTION auto_populate_score_sheets_from_cbt_v3();

-- ============================================================================
-- STEP 4: Backfill existing graded submissions that haven't been scored yet
-- ============================================================================

-- Find all graded submissions with no corresponding score_sheets record
-- and manually trigger the scoring

WITH graded_submissions AS (
  SELECT 
    cs.id as submission_id,
    cs.school_id,
    cs.student_id,
    cs.cbt_exam_id,
    cs.score,
    ce.subject_id,
    ce.term_id,
    ce.total_marks,
    ce.assessment_type
  FROM cbt_submissions cs
  JOIN cbt_exams ce ON cs.cbt_exam_id = ce.id
  WHERE cs.status = 'GRADED' 
    AND cs.score IS NOT NULL
    AND ce.subject_id IS NOT NULL
    AND ce.term_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM score_sheets ss
      WHERE ss.school_id = cs.school_id
        AND ss.student_id = cs.student_id
        AND ss.subject_id = ce.subject_id
        AND ss.term_id = ce.term_id
    )
  LIMIT 1000  -- Process in batches to avoid large transaction
)
SELECT 
  COUNT(*) as submissions_to_backfill,
  COUNT(DISTINCT student_id) as students_affected,
  COUNT(DISTINCT subject_id) as subjects_affected
FROM graded_submissions;

-- Manually populate score_sheets for graded submissions using trigger-like logic
INSERT INTO score_sheets (
  school_id, student_id, subject_id, term_id,
  test1, test1_source, test1_cbt_source,
  test2, test2_source, test2_cbt_source,
  test3, test3_source, test3_cbt_source,
  test4, test4_source, test4_cbt_source,
  exam, exam_source, exam_cbt_source,
  created_at, updated_at
)
SELECT 
  cs.school_id,
  cs.student_id,
  ce.subject_id,
  ce.term_id,
  CASE WHEN ce.assessment_type = 'CA1' THEN LEAST((cs.score / GREATEST(ce.total_marks, 1)) * 10, 10) ELSE NULL END,
  CASE WHEN ce.assessment_type = 'CA1' THEN 'CBT' ELSE NULL END,
  CASE WHEN ce.assessment_type = 'CA1' THEN cs.id ELSE NULL END,
  CASE WHEN ce.assessment_type = 'CA2' THEN LEAST((cs.score / GREATEST(ce.total_marks, 1)) * 10, 10) ELSE NULL END,
  CASE WHEN ce.assessment_type = 'CA2' THEN 'CBT' ELSE NULL END,
  CASE WHEN ce.assessment_type = 'CA2' THEN cs.id ELSE NULL END,
  CASE WHEN ce.assessment_type = 'CA3' THEN LEAST((cs.score / GREATEST(ce.total_marks, 1)) * 10, 10) ELSE NULL END,
  CASE WHEN ce.assessment_type = 'CA3' THEN 'CBT' ELSE NULL END,
  CASE WHEN ce.assessment_type = 'CA3' THEN cs.id ELSE NULL END,
  CASE WHEN ce.assessment_type = 'CA4' THEN LEAST((cs.score / GREATEST(ce.total_marks, 1)) * 10, 10) ELSE NULL END,
  CASE WHEN ce.assessment_type = 'CA4' THEN 'CBT' ELSE NULL END,
  CASE WHEN ce.assessment_type = 'CA4' THEN cs.id ELSE NULL END,
  CASE WHEN ce.assessment_type = 'EXAM' THEN LEAST((cs.score / GREATEST(ce.total_marks, 1)) * 60, 60) ELSE NULL END,
  CASE WHEN ce.assessment_type = 'EXAM' THEN 'CBT' ELSE NULL END,
  CASE WHEN ce.assessment_type = 'EXAM' THEN cs.id ELSE NULL END,
  NOW(),
  NOW()
FROM cbt_submissions cs
JOIN cbt_exams ce ON cs.cbt_exam_id = ce.id
WHERE cs.status = 'GRADED' 
  AND cs.score IS NOT NULL
  AND ce.subject_id IS NOT NULL
  AND ce.term_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM score_sheets ss
    WHERE ss.school_id = cs.school_id
      AND ss.student_id = cs.student_id
      AND ss.subject_id = ce.subject_id
      AND ss.term_id = ce.term_id
  )
ON CONFLICT (school_id, student_id, subject_id, term_id) DO UPDATE SET
  test1 = COALESCE(EXCLUDED.test1, score_sheets.test1),
  test2 = COALESCE(EXCLUDED.test2, score_sheets.test2),
  test3 = COALESCE(EXCLUDED.test3, score_sheets.test3),
  test4 = COALESCE(EXCLUDED.test4, score_sheets.test4),
  exam = COALESCE(EXCLUDED.exam, score_sheets.exam),
  updated_at = NOW();

-- Verify backfill
SELECT 
  COUNT(DISTINCT ss.id) as score_sheets_created,
  COUNT(DISTINCT ss.student_id) as students_with_scores,
  COUNT(DISTINCT ss.subject_id) as subjects_scored
FROM score_sheets ss
WHERE ss.test1_source = 'CBT' OR ss.test2_source = 'CBT' OR ss.test3_source = 'CBT' OR ss.test4_source = 'CBT' OR ss.exam_source = 'CBT';

-- ============================================================================
-- STEP 5: Verify trigger exists and is correct
-- ============================================================================

SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name = 'trigger_cbt_auto_populate_score_sheets_v3';

-- ============================================================================
-- STEP 6: Grant permissions on all tables
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON score_sheets TO anon;
GRANT SELECT, INSERT, UPDATE ON score_sheets TO authenticated;
GRANT SELECT ON cbt_submissions TO anon;
GRANT SELECT ON cbt_exams TO anon;
GRANT SELECT ON cbt_questions TO anon;

-- ============================================================================
-- Verification complete
-- ============================================================================

SELECT 'Migration 148 completed: CBT Scoring Pipeline Hard Fix' as status;
