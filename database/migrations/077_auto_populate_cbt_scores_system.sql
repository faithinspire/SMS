-- Migration 077: Auto-Populate CBT Scores in Score Sheets
-- This migration ensures that:
-- 1. All CBT test submissions automatically update score_sheets
-- 2. CBT scores are properly mapped to test1, test2, test3, test4, exam columns
-- 3. Teacher can see CBT scores mixed with manual scores
-- 4. Student results show CBT scores

-- ============================================================================
-- Step 1: Ensure score_sheets has CBT score tracking columns (if not exists)
-- ============================================================================

-- Add columns to track CBT score sources
ALTER TABLE score_sheets
ADD COLUMN IF NOT EXISTS test1_cbt_source UUID,
ADD COLUMN IF NOT EXISTS test2_cbt_source UUID,
ADD COLUMN IF NOT EXISTS test3_cbt_source UUID,
ADD COLUMN IF NOT EXISTS test4_cbt_source UUID,
ADD COLUMN IF NOT EXISTS exam_cbt_source UUID,
ADD COLUMN IF NOT EXISTS test1_source TEXT DEFAULT 'MANUAL',
ADD COLUMN IF NOT EXISTS test2_source TEXT DEFAULT 'MANUAL',
ADD COLUMN IF NOT EXISTS test3_source TEXT DEFAULT 'MANUAL',
ADD COLUMN IF NOT EXISTS test4_source TEXT DEFAULT 'MANUAL',
ADD COLUMN IF NOT EXISTS exam_source TEXT DEFAULT 'MANUAL';

-- ============================================================================
-- Step 2: Create function to auto-populate score_sheets from CBT submissions
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_cbt_score_to_score_sheets()
RETURNS TRIGGER AS $$
DECLARE
  v_subject_id UUID;
  v_term_id UUID;
  v_academic_session_id UUID;
  v_session_year TEXT;
  v_class_arm_combo_id UUID;
  v_score_value NUMERIC;
  v_scale_factor NUMERIC;
BEGIN
  -- Only process GRADED submissions
  IF NEW.status != 'GRADED' THEN
    RETURN NEW;
  END IF;

  -- Get exam details
  SELECT 
    subject_id, 
    total_marks,
    assessment_type
  INTO 
    v_subject_id,
    v_scale_factor,
    NEW.assessment_type
  FROM cbt_exams
  WHERE id = NEW.cbt_exam_id;

  IF v_subject_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get student's class info
  SELECT class_arm_combo_id INTO v_class_arm_combo_id
  FROM students
  WHERE id = NEW.student_id;

  -- Get term and academic session info
  v_term_id := NEW.term_id;
  
  SELECT session_id INTO v_academic_session_id
  FROM academic_terms
  WHERE id = v_term_id;

  IF v_academic_session_id IS NOT NULL THEN
    SELECT session_year INTO v_session_year
    FROM academic_sessions
    WHERE id = v_academic_session_id;
  END IF;

  -- Calculate scaled score (normalize to test max of 10 or exam max of 60)
  CASE WHEN NEW.assessment_type IN ('CA1', 'CA2', 'CA3', 'CA4') THEN
    v_scale_factor := COALESCE(v_scale_factor, 10);
    v_score_value := ROUND((NEW.score / NULLIF(v_scale_factor, 0)) * 10 * 100) / 100;
  WHEN NEW.assessment_type = 'EXAM' THEN
    v_scale_factor := COALESCE(v_scale_factor, 60);
    v_score_value := ROUND((NEW.score / NULLIF(v_scale_factor, 0)) * 60 * 100) / 100;
  ELSE
    v_score_value := NEW.score;
  END CASE;

  -- Try to update existing score_sheets entry
  UPDATE score_sheets
  SET
    test1 = CASE WHEN NEW.assessment_type = 'CA1' THEN v_score_value ELSE test1 END,
    test1_cbt_source = CASE WHEN NEW.assessment_type = 'CA1' THEN NEW.id ELSE test1_cbt_source END,
    test1_source = CASE WHEN NEW.assessment_type = 'CA1' THEN 'CBT' ELSE test1_source END,
    test2 = CASE WHEN NEW.assessment_type = 'CA2' THEN v_score_value ELSE test2 END,
    test2_cbt_source = CASE WHEN NEW.assessment_type = 'CA2' THEN NEW.id ELSE test2_cbt_source END,
    test2_source = CASE WHEN NEW.assessment_type = 'CA2' THEN 'CBT' ELSE test2_source END,
    test3 = CASE WHEN NEW.assessment_type = 'CA3' THEN v_score_value ELSE test3 END,
    test3_cbt_source = CASE WHEN NEW.assessment_type = 'CA3' THEN NEW.id ELSE test3_cbt_source END,
    test3_source = CASE WHEN NEW.assessment_type = 'CA3' THEN 'CBT' ELSE test3_source END,
    test4 = CASE WHEN NEW.assessment_type = 'CA4' THEN v_score_value ELSE test4 END,
    test4_cbt_source = CASE WHEN NEW.assessment_type = 'CA4' THEN NEW.id ELSE test4_cbt_source END,
    test4_source = CASE WHEN NEW.assessment_type = 'CA4' THEN 'CBT' ELSE test4_source END,
    exam = CASE WHEN NEW.assessment_type = 'EXAM' THEN v_score_value ELSE exam END,
    exam_cbt_source = CASE WHEN NEW.assessment_type = 'EXAM' THEN NEW.id ELSE exam_cbt_source END,
    exam_source = CASE WHEN NEW.assessment_type = 'EXAM' THEN 'CBT' ELSE exam_source END,
    updated_at = NOW()
  WHERE
    school_id = NEW.school_id
    AND student_id = NEW.student_id
    AND subject_id = v_subject_id
    AND term_id = v_term_id;

  -- If no existing entry, create new one
  IF NOT FOUND THEN
    INSERT INTO score_sheets (
      school_id,
      student_id,
      subject_id,
      term_id,
      academic_session_id,
      session_year,
      class_arm_combo_id,
      test1,
      test1_cbt_source,
      test1_source,
      test2,
      test2_cbt_source,
      test2_source,
      test3,
      test3_cbt_source,
      test3_source,
      test4,
      test4_cbt_source,
      test4_source,
      exam,
      exam_cbt_source,
      exam_source,
      created_at,
      updated_at
    ) VALUES (
      NEW.school_id,
      NEW.student_id,
      v_subject_id,
      v_term_id,
      v_academic_session_id,
      v_session_year,
      v_class_arm_combo_id,
      CASE WHEN NEW.assessment_type = 'CA1' THEN v_score_value ELSE NULL END,
      CASE WHEN NEW.assessment_type = 'CA1' THEN NEW.id ELSE NULL END,
      CASE WHEN NEW.assessment_type = 'CA1' THEN 'CBT' ELSE NULL END,
      CASE WHEN NEW.assessment_type = 'CA2' THEN v_score_value ELSE NULL END,
      CASE WHEN NEW.assessment_type = 'CA2' THEN NEW.id ELSE NULL END,
      CASE WHEN NEW.assessment_type = 'CA2' THEN 'CBT' ELSE NULL END,
      CASE WHEN NEW.assessment_type = 'CA3' THEN v_score_value ELSE NULL END,
      CASE WHEN NEW.assessment_type = 'CA3' THEN NEW.id ELSE NULL END,
      CASE WHEN NEW.assessment_type = 'CA3' THEN 'CBT' ELSE NULL END,
      CASE WHEN NEW.assessment_type = 'CA4' THEN v_score_value ELSE NULL END,
      CASE WHEN NEW.assessment_type = 'CA4' THEN NEW.id ELSE NULL END,
      CASE WHEN NEW.assessment_type = 'CA4' THEN 'CBT' ELSE NULL END,
      CASE WHEN NEW.assessment_type = 'EXAM' THEN v_score_value ELSE NULL END,
      CASE WHEN NEW.assessment_type = 'EXAM' THEN NEW.id ELSE NULL END,
      CASE WHEN NEW.assessment_type = 'EXAM' THEN 'CBT' ELSE NULL END,
      NOW(),
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Step 3: Create trigger to auto-sync CBT scores
-- ============================================================================

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS trigger_sync_cbt_score ON cbt_submissions;

-- Create new trigger
CREATE TRIGGER trigger_sync_cbt_score
AFTER UPDATE ON cbt_submissions
FOR EACH ROW
WHEN (NEW.status = 'GRADED' AND OLD.status != 'GRADED')
EXECUTE FUNCTION sync_cbt_score_to_score_sheets();

-- ============================================================================
-- Step 4: Backfill existing CBT scores that were submitted but not synced
-- ============================================================================

-- Sync all graded CBT submissions to score_sheets
WITH cbt_sync AS (
  SELECT
    cs.id,
    cs.school_id,
    cs.student_id,
    cs.cbt_exam_id,
    cs.score,
    cs.term_id,
    cs.assessment_type,
    ce.subject_id,
    ce.total_marks,
    at.session_id,
    st.class_arm_combo_id
  FROM cbt_submissions cs
  JOIN cbt_exams ce ON cs.cbt_exam_id = ce.id
  JOIN academic_terms at ON cs.term_id = at.id
  JOIN students st ON cs.student_id = st.id
  WHERE cs.status = 'GRADED'
    AND cs.assessment_type IS NOT NULL
)
INSERT INTO score_sheets (
  school_id,
  student_id,
  subject_id,
  term_id,
  academic_session_id,
  class_arm_combo_id,
  test1,
  test1_cbt_source,
  test1_source,
  test2,
  test2_cbt_source,
  test2_source,
  test3,
  test3_cbt_source,
  test3_source,
  test4,
  test4_cbt_source,
  test4_source,
  exam,
  exam_cbt_source,
  exam_source,
  created_at,
  updated_at
)
SELECT
  school_id,
  student_id,
  subject_id,
  term_id,
  session_id,
  class_arm_combo_id,
  CASE WHEN assessment_type = 'CA1' THEN ROUND((score / NULLIF(total_marks, 0)) * 10 * 100) / 100 ELSE NULL END,
  CASE WHEN assessment_type = 'CA1' THEN id ELSE NULL END,
  CASE WHEN assessment_type = 'CA1' THEN 'CBT' ELSE NULL END,
  CASE WHEN assessment_type = 'CA2' THEN ROUND((score / NULLIF(total_marks, 0)) * 10 * 100) / 100 ELSE NULL END,
  CASE WHEN assessment_type = 'CA2' THEN id ELSE NULL END,
  CASE WHEN assessment_type = 'CA2' THEN 'CBT' ELSE NULL END,
  CASE WHEN assessment_type = 'CA3' THEN ROUND((score / NULLIF(total_marks, 0)) * 10 * 100) / 100 ELSE NULL END,
  CASE WHEN assessment_type = 'CA3' THEN id ELSE NULL END,
  CASE WHEN assessment_type = 'CA3' THEN 'CBT' ELSE NULL END,
  CASE WHEN assessment_type = 'CA4' THEN ROUND((score / NULLIF(total_marks, 0)) * 10 * 100) / 100 ELSE NULL END,
  CASE WHEN assessment_type = 'CA4' THEN id ELSE NULL END,
  CASE WHEN assessment_type = 'CA4' THEN 'CBT' ELSE NULL END,
  CASE WHEN assessment_type = 'EXAM' THEN ROUND((score / NULLIF(total_marks, 0)) * 60 * 100) / 100 ELSE NULL END,
  CASE WHEN assessment_type = 'EXAM' THEN id ELSE NULL END,
  CASE WHEN assessment_type = 'EXAM' THEN 'CBT' ELSE NULL END,
  NOW(),
  NOW()
FROM cbt_sync
ON CONFLICT (school_id, student_id, subject_id, term_id) DO UPDATE SET
  test1 = CASE WHEN EXCLUDED.assessment_type = 'CA1' THEN EXCLUDED.test1 ELSE score_sheets.test1 END,
  test1_cbt_source = CASE WHEN EXCLUDED.assessment_type = 'CA1' THEN EXCLUDED.test1_cbt_source ELSE score_sheets.test1_cbt_source END,
  test1_source = CASE WHEN EXCLUDED.assessment_type = 'CA1' THEN EXCLUDED.test1_source ELSE score_sheets.test1_source END,
  test2 = CASE WHEN EXCLUDED.assessment_type = 'CA2' THEN EXCLUDED.test2 ELSE score_sheets.test2 END,
  test2_cbt_source = CASE WHEN EXCLUDED.assessment_type = 'CA2' THEN EXCLUDED.test2_cbt_source ELSE score_sheets.test2_cbt_source END,
  test2_source = CASE WHEN EXCLUDED.assessment_type = 'CA2' THEN EXCLUDED.test2_source ELSE score_sheets.test2_source END,
  test3 = CASE WHEN EXCLUDED.assessment_type = 'CA3' THEN EXCLUDED.test3 ELSE score_sheets.test3 END,
  test3_cbt_source = CASE WHEN EXCLUDED.assessment_type = 'CA3' THEN EXCLUDED.test3_cbt_source ELSE score_sheets.test3_cbt_source END,
  test3_source = CASE WHEN EXCLUDED.assessment_type = 'CA3' THEN EXCLUDED.test3_source ELSE score_sheets.test3_source END,
  test4 = CASE WHEN EXCLUDED.assessment_type = 'CA4' THEN EXCLUDED.test4 ELSE score_sheets.test4 END,
  test4_cbt_source = CASE WHEN EXCLUDED.assessment_type = 'CA4' THEN EXCLUDED.test4_cbt_source ELSE score_sheets.test4_cbt_source END,
  test4_source = CASE WHEN EXCLUDED.assessment_type = 'CA4' THEN EXCLUDED.test4_source ELSE score_sheets.test4_source END,
  exam = CASE WHEN EXCLUDED.assessment_type = 'EXAM' THEN EXCLUDED.exam ELSE score_sheets.exam END,
  exam_cbt_source = CASE WHEN EXCLUDED.assessment_type = 'EXAM' THEN EXCLUDED.exam_cbt_source ELSE score_sheets.exam_cbt_source END,
  exam_source = CASE WHEN EXCLUDED.assessment_type = 'EXAM' THEN EXCLUDED.exam_source ELSE score_sheets.exam_source END,
  updated_at = NOW();

-- ============================================================================
-- Step 5: Verify sync
-- ============================================================================

SELECT 
  'CBT Score Sync Complete' as status,
  COUNT(*) as total_synced_scores
FROM score_sheets
WHERE test1_source = 'CBT' 
  OR test2_source = 'CBT'
  OR test3_source = 'CBT'
  OR test4_source = 'CBT'
  OR exam_source = 'CBT';
