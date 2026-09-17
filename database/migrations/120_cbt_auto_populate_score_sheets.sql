-- Migration 120: Enable CBT Auto-Population to Score Sheets
-- When students complete CBT exams, automatically create/update score_sheets records

BEGIN;

-- ============================================================================
-- PART 1: Create trigger function to auto-populate score_sheets from cbt_results
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_populate_score_sheets_from_cbt()
RETURNS TRIGGER AS $$
DECLARE
  v_school_id UUID;
  v_subject_id UUID;
  v_term_id UUID;
  v_existing_score_id UUID;
  v_exam_score DECIMAL;
BEGIN
  -- Get CBT exam details
  SELECT 
    ce.school_id,
    ce.subject_id,
    ce.term_id,
    cr.score_obtained
  INTO 
    v_school_id,
    v_subject_id,
    v_term_id,
    v_exam_score
  FROM cbt_exams ce
  JOIN cbt_results cr ON cr.exam_id = ce.id
  WHERE cr.id = NEW.id;

  IF v_school_id IS NULL THEN
    RAISE NOTICE 'Could not find CBT exam details for result %', NEW.id;
    RETURN NEW;
  END IF;

  -- Check if score_sheet already exists for this student/subject/term
  SELECT id INTO v_existing_score_id
  FROM score_sheets
  WHERE student_id = NEW.student_id
    AND subject_id = v_subject_id
    AND term_id = v_term_id
    AND school_id = v_school_id;

  IF v_existing_score_id IS NOT NULL THEN
    -- Update existing record - set exam score from CBT
    UPDATE score_sheets
    SET 
      exam = v_exam_score,
      exam_source = 'CBT',
      total = COALESCE(test1, 0) + COALESCE(test2, 0) + COALESCE(test3, 0) + COALESCE(test4, 0) + v_exam_score,
      updated_at = NOW()
    WHERE id = v_existing_score_id;
    
    RAISE NOTICE 'Updated score_sheet % with CBT exam score %', v_existing_score_id, v_exam_score;
  ELSE
    -- Create new score_sheet record with CBT exam score
    INSERT INTO score_sheets (
      school_id,
      student_id,
      subject_id,
      term_id,
      exam,
      exam_source,
      total,
      grade,
      created_at,
      updated_at
    ) VALUES (
      v_school_id,
      NEW.student_id,
      v_subject_id,
      v_term_id,
      v_exam_score,
      'CBT',
      v_exam_score, -- Only exam score, no CA scores yet
      NULL, -- Grade will be calculated
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'Created new score_sheet for student % subject % with CBT score %', NEW.student_id, v_subject_id, v_exam_score;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 2: Create trigger on cbt_results to call auto-populate function
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_cbt_auto_populate_score_sheets ON cbt_results CASCADE;

-- Create trigger
CREATE TRIGGER trigger_cbt_auto_populate_score_sheets
AFTER INSERT OR UPDATE ON cbt_results
FOR EACH ROW
EXECUTE FUNCTION auto_populate_score_sheets_from_cbt();

RAISE NOTICE '';
RAISE NOTICE '========== CBT AUTO-POPULATION ENABLED ==========';
RAISE NOTICE 'Trigger created: trigger_cbt_auto_populate_score_sheets';
RAISE NOTICE 'Function created: auto_populate_score_sheets_from_cbt()';
RAISE NOTICE '';
RAISE NOTICE 'How it works:';
RAISE NOTICE '1. When student completes CBT exam (inserted into cbt_results)';
RAISE NOTICE '2. Trigger fires automatically';
RAISE NOTICE '3. If score_sheet exists for that student/subject/term:';
RAISE NOTICE '   - Updates the exam column with CBT score';
RAISE NOTICE '   - Sets exam_source = CBT';
RAISE NOTICE '   - Recalculates total score';
RAISE NOTICE '4. If score_sheet does NOT exist:';
RAISE NOTICE '   - Creates new record with exam score only';
RAISE NOTICE '5. Result pages now show CBT scores automatically';
RAISE NOTICE '';
RAISE NOTICE 'Score Sheet Structure:';
RAISE NOTICE '  test1 (CA1) - Manual entry by teacher';
RAISE NOTICE '  test2 (CA2) - Manual entry by teacher';
RAISE NOTICE '  test3 (CA3) - Manual entry by teacher';
RAISE NOTICE '  test4 (CA4) - Manual entry by teacher';
RAISE NOTICE '  exam - AUTO-POPULATED from CBT';
RAISE NOTICE '  total - exam + test1 + test2 + test3 + test4';
RAISE NOTICE '';
RAISE NOTICE 'You can now safely:';
RAISE NOTICE '✓ Have students complete CBT exams';
RAISE NOTICE '✓ Scores automatically appear in score_sheets';
RAISE NOTICE '✓ Results pages show combined manual + CBT scores';
RAISE NOTICE '================================================';
RAISE NOTICE '';

COMMIT;
