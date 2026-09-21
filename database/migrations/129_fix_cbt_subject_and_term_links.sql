-- ============================================================================
-- Migration 129: Fix CBT Subject and Term Links
-- ============================================================================
-- PROBLEM:
-- 1. CBT Exams don't have subject_id or term_id - scores can't be routed
-- 2. CBT Submissions don't have term_id - can't link to academic periods
-- 3. Score_sheets trigger fires but has nothing to work with
-- 4. Assignments created without term_id aren't visible to students
--
-- SOLUTION:
-- 1. Ensure cbt_exams have subject_id populated
-- 2. Ensure cbt_submissions inherit term_id from related sources
-- 3. Link CBT data through complete chain: exam → subject, submission → term
-- 4. Auto-populate missing fields where possible
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Ensure cbt_exams has subject_id and term_id columns
-- ============================================================================
ALTER TABLE cbt_exams ADD COLUMN IF NOT EXISTS subject_id UUID;
ALTER TABLE cbt_exams ADD COLUMN IF NOT EXISTS term_id UUID;

-- Add foreign key constraints for new columns
ALTER TABLE cbt_exams DROP CONSTRAINT IF EXISTS fk_cbt_exams_subject_id;
ALTER TABLE cbt_exams ADD CONSTRAINT fk_cbt_exams_subject_id 
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL;

ALTER TABLE cbt_exams DROP CONSTRAINT IF EXISTS fk_cbt_exams_term_id;
ALTER TABLE cbt_exams ADD CONSTRAINT fk_cbt_exams_term_id 
  FOREIGN KEY (term_id) REFERENCES academic_terms(id) ON DELETE SET NULL;

-- ============================================================================
-- STEP 2: Populate cbt_exams.subject_id from subject_teacher_assignments
-- ============================================================================
-- For CBT exams assigned to teachers, get subject_id
UPDATE cbt_exams ce
SET subject_id = sta.subject_id
FROM subject_teacher_assignments sta
WHERE ce.created_by = sta.teacher_id
  AND ce.school_id = sta.school_id
  AND ce.subject_id IS NULL
  AND sta.subject_id IS NOT NULL;

-- ============================================================================
-- STEP 3: Populate cbt_exams.term_id from academic_terms (most recent active)
-- ============================================================================
UPDATE cbt_exams ce
SET term_id = at.id
FROM academic_terms at
WHERE ce.school_id = at.school_id
  AND ce.term_id IS NULL
  AND at.is_active = true
  AND at.id IN (
    -- Get the most recent active term per school
    SELECT DISTINCT ON (school_id) id
    FROM academic_terms
    WHERE school_id = ce.school_id
    ORDER BY school_id, term_order DESC
  );

-- ============================================================================
-- STEP 4: Ensure cbt_submissions.term_id is populated
-- ============================================================================
-- Link submissions to terms through exam
UPDATE cbt_submissions cs
SET term_id = ce.term_id
FROM cbt_exams ce
WHERE cs.cbt_exam_id = ce.id
  AND cs.term_id IS NULL
  AND ce.term_id IS NOT NULL;

-- ============================================================================
-- STEP 5: Fix assignments - populate term_id for assignments without it
-- ============================================================================
-- Link assignments to active term if not assigned
UPDATE assignments a
SET term_id = at.id
FROM academic_terms at
WHERE a.school_id = at.school_id
  AND a.term_id IS NULL
  AND at.is_active = true
  AND at.id IN (
    -- Get the most recent active term per school
    SELECT DISTINCT ON (school_id) id
    FROM academic_terms
    WHERE school_id = a.school_id
    ORDER BY school_id, term_order DESC
  );

-- ============================================================================
-- STEP 6: Create indexes for CBT-score_sheets linking
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_cbt_exams_subject_id ON cbt_exams(subject_id);
CREATE INDEX IF NOT EXISTS idx_cbt_exams_term_id ON cbt_exams(term_id);
CREATE INDEX IF NOT EXISTS idx_cbt_submissions_term_id ON cbt_submissions(term_id);
CREATE INDEX IF NOT EXISTS idx_assignments_term_id ON assignments(term_id);

-- ============================================================================
-- STEP 7: Create improved trigger to handle CBT score routing
-- ============================================================================
-- Drop old trigger if exists
DROP TRIGGER IF EXISTS trigger_cbt_auto_populate_score_sheets_v2 ON cbt_submissions CASCADE;

-- Create comprehensive trigger function
CREATE OR REPLACE FUNCTION auto_populate_score_sheets_from_cbt_v3()
RETURNS TRIGGER AS $$
DECLARE
  v_subject_id UUID;
  v_term_id UUID;
  v_exam_total_marks NUMERIC;
  v_score_scaled NUMERIC;
  v_academic_session_id UUID;
  v_session_year VARCHAR;
BEGIN
  -- Only process when status changes to GRADED and score exists
  IF NEW.status = 'GRADED' AND NEW.score IS NOT NULL THEN
    
    -- Get exam details including subject and term
    SELECT ce.subject_id, ce.total_marks, ce.term_id
    INTO v_subject_id, v_exam_total_marks, v_term_id
    FROM cbt_exams ce
    WHERE ce.id = NEW.cbt_exam_id;
    
    -- Use exam's term_id if submission doesn't have one
    IF v_term_id IS NULL THEN
      v_term_id := NEW.term_id;
    END IF;
    
    -- If still no term_id, try to find active term for the school
    IF v_term_id IS NULL THEN
      SELECT at.id INTO v_term_id
      FROM academic_terms at
      WHERE at.school_id = NEW.school_id
        AND at.is_active = true
      ORDER BY at.term_order DESC
      LIMIT 1;
    END IF;
    
    -- Get academic session from term
    SELECT at.session_id INTO v_academic_session_id
    FROM academic_terms at
    WHERE at.id = v_term_id;
    
    -- Get session year
    SELECT acs.session_year INTO v_session_year
    FROM academic_sessions acs
    WHERE acs.id = v_academic_session_id;
    
    -- Verify we have required data before proceeding
    IF v_subject_id IS NOT NULL 
       AND v_term_id IS NOT NULL 
       AND NEW.assessment_type IS NOT NULL 
       AND v_exam_total_marks > 0 THEN
      
      -- Calculate scaled score based on assessment type
      CASE NEW.assessment_type
        WHEN 'CA1' THEN
          v_score_scaled := ROUND((NEW.score::NUMERIC / v_exam_total_marks) * 10, 2);
        WHEN 'CA2' THEN
          v_score_scaled := ROUND((NEW.score::NUMERIC / v_exam_total_marks) * 10, 2);
        WHEN 'CA3' THEN
          v_score_scaled := ROUND((NEW.score::NUMERIC / v_exam_total_marks) * 10, 2);
        WHEN 'CA4' THEN
          v_score_scaled := ROUND((NEW.score::NUMERIC / v_exam_total_marks) * 10, 2);
        WHEN 'EXAM' THEN
          v_score_scaled := ROUND((NEW.score::NUMERIC / v_exam_total_marks) * 60, 2);
        ELSE
          v_score_scaled := NULL;
      END CASE;
      
      -- Upsert into score_sheets
      INSERT INTO score_sheets (
        school_id,
        student_id,
        subject_id,
        term_id,
        academic_session_id,
        session_year,
        test1, test1_source, test1_cbt_source,
        test2, test2_source, test2_cbt_source,
        test3, test3_source, test3_cbt_source,
        test4, test4_source, test4_cbt_source,
        exam, exam_source, exam_cbt_source,
        created_at,
        updated_at
      ) VALUES (
        NEW.school_id,
        NEW.student_id,
        v_subject_id,
        v_term_id,
        v_academic_session_id,
        v_session_year,
        CASE WHEN NEW.assessment_type = 'CA1' THEN v_score_scaled ELSE NULL END,
        CASE WHEN NEW.assessment_type = 'CA1' THEN 'CBT' ELSE NULL END,
        CASE WHEN NEW.assessment_type = 'CA1' THEN NEW.id ELSE NULL END,
        CASE WHEN NEW.assessment_type = 'CA2' THEN v_score_scaled ELSE NULL END,
        CASE WHEN NEW.assessment_type = 'CA2' THEN 'CBT' ELSE NULL END,
        CASE WHEN NEW.assessment_type = 'CA2' THEN NEW.id ELSE NULL END,
        CASE WHEN NEW.assessment_type = 'CA3' THEN v_score_scaled ELSE NULL END,
        CASE WHEN NEW.assessment_type = 'CA3' THEN 'CBT' ELSE NULL END,
        CASE WHEN NEW.assessment_type = 'CA3' THEN NEW.id ELSE NULL END,
        CASE WHEN NEW.assessment_type = 'CA4' THEN v_score_scaled ELSE NULL END,
        CASE WHEN NEW.assessment_type = 'CA4' THEN 'CBT' ELSE NULL END,
        CASE WHEN NEW.assessment_type = 'CA4' THEN NEW.id ELSE NULL END,
        CASE WHEN NEW.assessment_type = 'EXAM' THEN v_score_scaled ELSE NULL END,
        CASE WHEN NEW.assessment_type = 'EXAM' THEN 'CBT' ELSE NULL END,
        CASE WHEN NEW.assessment_type = 'EXAM' THEN NEW.id ELSE NULL END,
        NOW(),
        NOW()
      )
      ON CONFLICT (school_id, student_id, subject_id, term_id) DO UPDATE SET
        test1 = COALESCE(EXCLUDED.test1, score_sheets.test1),
        test1_source = COALESCE(EXCLUDED.test1_source, score_sheets.test1_source),
        test1_cbt_source = COALESCE(EXCLUDED.test1_cbt_source, score_sheets.test1_cbt_source),
        test2 = COALESCE(EXCLUDED.test2, score_sheets.test2),
        test2_source = COALESCE(EXCLUDED.test2_source, score_sheets.test2_source),
        test2_cbt_source = COALESCE(EXCLUDED.test2_cbt_source, score_sheets.test2_cbt_source),
        test3 = COALESCE(EXCLUDED.test3, score_sheets.test3),
        test3_source = COALESCE(EXCLUDED.test3_source, score_sheets.test3_source),
        test3_cbt_source = COALESCE(EXCLUDED.test3_cbt_source, score_sheets.test3_cbt_source),
        test4 = COALESCE(EXCLUDED.test4, score_sheets.test4),
        test4_source = COALESCE(EXCLUDED.test4_source, score_sheets.test4_source),
        test4_cbt_source = COALESCE(EXCLUDED.test4_cbt_source, score_sheets.test4_cbt_source),
        exam = COALESCE(EXCLUDED.exam, score_sheets.exam),
        exam_source = COALESCE(EXCLUDED.exam_source, score_sheets.exam_source),
        exam_cbt_source = COALESCE(EXCLUDED.exam_cbt_source, score_sheets.exam_cbt_source),
        updated_at = NOW();
      
      RAISE NOTICE 'CBT score routed to score_sheets: submission % for subject % in term %', 
        NEW.id, v_subject_id, v_term_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_cbt_auto_populate_score_sheets_v3
AFTER UPDATE OF status ON cbt_submissions
FOR EACH ROW
EXECUTE FUNCTION auto_populate_score_sheets_from_cbt_v3();

-- ============================================================================
-- STEP 8: Backfill existing CBT submissions to score_sheets
-- ============================================================================
-- For all GRADED submissions with scores, ensure they're in score_sheets
INSERT INTO score_sheets (
  school_id,
  student_id,
  subject_id,
  term_id,
  academic_session_id,
  session_year,
  test1, test1_source, test1_cbt_source,
  test2, test2_source, test2_cbt_source,
  test3, test3_source, test3_cbt_source,
  test4, test4_source, test4_cbt_source,
  exam, exam_source, exam_cbt_source,
  created_at,
  updated_at
)
SELECT
  cs.school_id,
  cs.student_id,
  ce.subject_id,
  COALESCE(cs.term_id, ce.term_id) as term_id,
  at.session_id,
  acs.session_year,
  CASE WHEN ce.assessment_type = 'CA1' THEN ROUND((cs.score::NUMERIC / ce.total_marks) * 10, 2) ELSE NULL END,
  CASE WHEN ce.assessment_type = 'CA1' THEN 'CBT' ELSE NULL END,
  CASE WHEN ce.assessment_type = 'CA1' THEN cs.id ELSE NULL END,
  CASE WHEN ce.assessment_type = 'CA2' THEN ROUND((cs.score::NUMERIC / ce.total_marks) * 10, 2) ELSE NULL END,
  CASE WHEN ce.assessment_type = 'CA2' THEN 'CBT' ELSE NULL END,
  CASE WHEN ce.assessment_type = 'CA2' THEN cs.id ELSE NULL END,
  CASE WHEN ce.assessment_type = 'CA3' THEN ROUND((cs.score::NUMERIC / ce.total_marks) * 10, 2) ELSE NULL END,
  CASE WHEN ce.assessment_type = 'CA3' THEN 'CBT' ELSE NULL END,
  CASE WHEN ce.assessment_type = 'CA3' THEN cs.id ELSE NULL END,
  CASE WHEN ce.assessment_type = 'CA4' THEN ROUND((cs.score::NUMERIC / ce.total_marks) * 10, 2) ELSE NULL END,
  CASE WHEN ce.assessment_type = 'CA4' THEN 'CBT' ELSE NULL END,
  CASE WHEN ce.assessment_type = 'CA4' THEN cs.id ELSE NULL END,
  CASE WHEN ce.assessment_type = 'EXAM' THEN ROUND((cs.score::NUMERIC / ce.total_marks) * 60, 2) ELSE NULL END,
  CASE WHEN ce.assessment_type = 'EXAM' THEN 'CBT' ELSE NULL END,
  CASE WHEN ce.assessment_type = 'EXAM' THEN cs.id ELSE NULL END,
  NOW(),
  NOW()
FROM cbt_submissions cs
JOIN cbt_exams ce ON cs.cbt_exam_id = ce.id
LEFT JOIN academic_terms at ON COALESCE(cs.term_id, ce.term_id) = at.id
LEFT JOIN academic_sessions acs ON at.session_id = acs.id
WHERE cs.status = 'GRADED'
  AND cs.score IS NOT NULL
  AND ce.subject_id IS NOT NULL
  AND COALESCE(cs.term_id, ce.term_id) IS NOT NULL
ON CONFLICT (school_id, student_id, subject_id, term_id) DO UPDATE SET
  test1 = COALESCE(EXCLUDED.test1, score_sheets.test1),
  test1_source = COALESCE(EXCLUDED.test1_source, score_sheets.test1_source),
  test1_cbt_source = COALESCE(EXCLUDED.test1_cbt_source, score_sheets.test1_cbt_source),
  test2 = COALESCE(EXCLUDED.test2, score_sheets.test2),
  test2_source = COALESCE(EXCLUDED.test2_source, score_sheets.test2_source),
  test2_cbt_source = COALESCE(EXCLUDED.test2_cbt_source, score_sheets.test2_cbt_source),
  test3 = COALESCE(EXCLUDED.test3, score_sheets.test3),
  test3_source = COALESCE(EXCLUDED.test3_source, score_sheets.test3_source),
  test3_cbt_source = COALESCE(EXCLUDED.test3_cbt_source, score_sheets.test3_cbt_source),
  test4 = COALESCE(EXCLUDED.test4, score_sheets.test4),
  test4_source = COALESCE(EXCLUDED.test4_source, score_sheets.test4_source),
  test4_cbt_source = COALESCE(EXCLUDED.test4_cbt_source, score_sheets.test4_cbt_source),
  exam = COALESCE(EXCLUDED.exam, score_sheets.exam),
  exam_source = COALESCE(EXCLUDED.exam_source, score_sheets.exam_source),
  exam_cbt_source = COALESCE(EXCLUDED.exam_cbt_source, score_sheets.exam_cbt_source),
  updated_at = NOW();

COMMIT;
