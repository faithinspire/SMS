-- ============================================================================
-- Migration 087: CBT SCORE SYNC FINAL
-- Simple, working sync that only touches score_sheets table
-- NO universal_scores references - only what exists
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_sync_cbt_to_universal ON cbt_submissions CASCADE;
DROP FUNCTION IF EXISTS sync_cbt_to_universal_scores() CASCADE;

CREATE OR REPLACE FUNCTION sync_cbt_to_universal_scores()
RETURNS TRIGGER AS $$
DECLARE
  v_exam_row RECORD;
  v_assessment_type TEXT;
  v_scaled_score DECIMAL;
BEGIN
  IF NEW.status != 'GRADED' THEN
    RETURN NEW;
  END IF;

  SELECT e.id, e.subject_id, e.assessment_type, e.total_marks
  INTO v_exam_row
  FROM cbt_exams e
  WHERE e.id = NEW.cbt_exam_id
  LIMIT 1;

  IF v_exam_row IS NULL OR NEW.term_id IS NULL OR v_exam_row.assessment_type IS NULL THEN
    RETURN NEW;
  END IF;

  v_assessment_type := v_exam_row.assessment_type;
  IF v_exam_row.total_marks > 0 THEN
    CASE v_assessment_type
      WHEN 'CA1' THEN v_scaled_score := LEAST((NEW.score::DECIMAL / v_exam_row.total_marks) * 10, 10);
      WHEN 'CA2' THEN v_scaled_score := LEAST((NEW.score::DECIMAL / v_exam_row.total_marks) * 10, 10);
      WHEN 'CA3' THEN v_scaled_score := LEAST((NEW.score::DECIMAL / v_exam_row.total_marks) * 10, 10);
      WHEN 'CA4' THEN v_scaled_score := LEAST((NEW.score::DECIMAL / v_exam_row.total_marks) * 10, 10);
      WHEN 'EXAM' THEN v_scaled_score := LEAST((NEW.score::DECIMAL / v_exam_row.total_marks) * 60, 60);
      ELSE v_scaled_score := NEW.score::DECIMAL;
    END CASE;
  ELSE
    v_scaled_score := NEW.score::DECIMAL;
  END IF;

  INSERT INTO score_sheets (
    school_id, student_id, subject_id, term_id,
    test1, test1_source, test2, test2_source,
    test3, test3_source, test4, test4_source,
    exam, exam_source, created_at, updated_at
  )
  VALUES (
    NEW.school_id, NEW.student_id, v_exam_row.subject_id, NEW.term_id,
    CASE WHEN v_assessment_type = 'CA1' THEN v_scaled_score ELSE NULL END,
    CASE WHEN v_assessment_type = 'CA1' THEN 'CBT' ELSE NULL END,
    CASE WHEN v_assessment_type = 'CA2' THEN v_scaled_score ELSE NULL END,
    CASE WHEN v_assessment_type = 'CA2' THEN 'CBT' ELSE NULL END,
    CASE WHEN v_assessment_type = 'CA3' THEN v_scaled_score ELSE NULL END,
    CASE WHEN v_assessment_type = 'CA3' THEN 'CBT' ELSE NULL END,
    CASE WHEN v_assessment_type = 'CA4' THEN v_scaled_score ELSE NULL END,
    CASE WHEN v_assessment_type = 'CA4' THEN 'CBT' ELSE NULL END,
    CASE WHEN v_assessment_type = 'EXAM' THEN v_scaled_score ELSE NULL END,
    CASE WHEN v_assessment_type = 'EXAM' THEN 'CBT' ELSE NULL END,
    NOW(), NOW()
  )
  ON CONFLICT (school_id, student_id, subject_id, term_id) DO UPDATE SET
    test1 = CASE WHEN v_assessment_type = 'CA1' THEN EXCLUDED.test1 ELSE score_sheets.test1 END,
    test1_source = CASE WHEN v_assessment_type = 'CA1' THEN 'CBT' ELSE score_sheets.test1_source END,
    test2 = CASE WHEN v_assessment_type = 'CA2' THEN EXCLUDED.test2 ELSE score_sheets.test2 END,
    test2_source = CASE WHEN v_assessment_type = 'CA2' THEN 'CBT' ELSE score_sheets.test2_source END,
    test3 = CASE WHEN v_assessment_type = 'CA3' THEN EXCLUDED.test3 ELSE score_sheets.test3 END,
    test3_source = CASE WHEN v_assessment_type = 'CA3' THEN 'CBT' ELSE score_sheets.test3_source END,
    test4 = CASE WHEN v_assessment_type = 'CA4' THEN EXCLUDED.test4 ELSE score_sheets.test4 END,
    test4_source = CASE WHEN v_assessment_type = 'CA4' THEN 'CBT' ELSE score_sheets.test4_source END,
    exam = CASE WHEN v_assessment_type = 'EXAM' THEN EXCLUDED.exam ELSE score_sheets.exam END,
    exam_source = CASE WHEN v_assessment_type = 'EXAM' THEN 'CBT' ELSE score_sheets.exam_source END,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_cbt_to_universal
AFTER UPDATE ON cbt_submissions
FOR EACH ROW
EXECUTE FUNCTION sync_cbt_to_universal_scores();

ALTER TABLE score_sheets 
ADD COLUMN IF NOT EXISTS test1_source TEXT,
ADD COLUMN IF NOT EXISTS test2_source TEXT,
ADD COLUMN IF NOT EXISTS test3_source TEXT,
ADD COLUMN IF NOT EXISTS test4_source TEXT,
ADD COLUMN IF NOT EXISTS exam_source TEXT;

-- Done
