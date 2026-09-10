-- Migration 084: Universal Score Synchronization System
-- COMPREHENSIVE FIX for:
-- 1. CBT scores syncing to score_sheets universally
-- 2. Manual scores displaying in student results
-- 3. Broadcast sender_name null constraint fix
-- 4. Universal synchronization across all schools

-- ============================================================================
-- PART 1: Fix Broadcasts Table - Add NOT NULL constraint handling
-- ============================================================================

-- Make sender_name optional (nullable) to fix constraint violation
ALTER TABLE broadcasts 
ALTER COLUMN sender_name DROP NOT NULL;

-- Add default for missing sender names
UPDATE broadcasts 
SET sender_name = 'Administrator' 
WHERE sender_name IS NULL;

-- ============================================================================
-- PART 2: Create Universal Score Repository Table
-- ============================================================================
-- This is the single source of truth for all scores (CBT + Manual)

CREATE TABLE IF NOT EXISTS universal_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  class_id UUID,
  term_id TEXT NOT NULL,
  academic_session_id TEXT,
  
  -- Test scores (CA1, CA2, CA3, CA4 - each out of 10)
  test1_score NUMERIC(5,2),
  test1_source TEXT DEFAULT 'NONE', -- 'CBT', 'MANUAL', 'NONE'
  test1_submission_id UUID, -- reference to cbt_submissions or manual entry
  test1_updated_at TIMESTAMP WITH TIME ZONE,
  
  test2_score NUMERIC(5,2),
  test2_source TEXT DEFAULT 'NONE',
  test2_submission_id UUID,
  test2_updated_at TIMESTAMP WITH TIME ZONE,
  
  test3_score NUMERIC(5,2),
  test3_source TEXT DEFAULT 'NONE',
  test3_submission_id UUID,
  test3_updated_at TIMESTAMP WITH TIME ZONE,
  
  test4_score NUMERIC(5,2),
  test4_source TEXT DEFAULT 'NONE',
  test4_submission_id UUID,
  test4_updated_at TIMESTAMP WITH TIME ZONE,
  
  -- Exam score (out of 60)
  exam_score NUMERIC(5,2),
  exam_source TEXT DEFAULT 'NONE',
  exam_submission_id UUID,
  exam_updated_at TIMESTAMP WITH TIME ZONE,
  
  -- Computed fields
  total_score NUMERIC(7,2),
  grade TEXT,
  status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'PENDING', 'ARCHIVED'
  
  -- Audit trail
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  synced_at TIMESTAMP WITH TIME ZONE,
  last_sync_source TEXT -- 'CBT_TRIGGER', 'MANUAL_ENTRY', 'SYNC_JOB'
);

-- Create indexes for universal_scores
CREATE INDEX IF NOT EXISTS idx_universal_scores_school_id ON universal_scores(school_id);
CREATE INDEX IF NOT EXISTS idx_universal_scores_student_id ON universal_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_universal_scores_subject_id ON universal_scores(subject_id);
CREATE INDEX IF NOT EXISTS idx_universal_scores_term_id ON universal_scores(term_id);
CREATE INDEX IF NOT EXISTS idx_universal_scores_student_subject_term ON universal_scores(student_id, subject_id, term_id);
CREATE INDEX IF NOT EXISTS idx_universal_scores_status ON universal_scores(status);
CREATE INDEX IF NOT EXISTS idx_universal_scores_updated_at ON universal_scores(updated_at DESC);

-- ============================================================================
-- PART 3: Add Unique Constraint
-- ============================================================================

ALTER TABLE universal_scores
ADD CONSTRAINT unique_student_subject_term UNIQUE (student_id, subject_id, term_id);

-- ============================================================================
-- PART 4: Function to Sync CBT Scores to Universal Repository
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_cbt_to_universal_scores()
RETURNS TRIGGER AS $$
DECLARE
  v_subject_id TEXT;
  v_term_id TEXT;
  v_school_id TEXT;
  v_student_id TEXT;
  v_class_id UUID;
  v_academic_session_id TEXT;
  v_scaled_score NUMERIC;
  v_total_marks NUMERIC;
  v_assessment_type TEXT;
BEGIN
  -- Only process GRADED submissions
  IF NEW.status != 'GRADED' THEN
    RETURN NEW;
  END IF;

  -- Get CBT exam details
  SELECT ce.subject_id, ce.total_marks, ce.assessment_type
  INTO v_subject_id, v_total_marks, v_assessment_type
  FROM cbt_exams ce
  WHERE ce.id = NEW.cbt_exam_id;

  IF v_subject_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get student info
  v_student_id := NEW.student_id;
  v_school_id := NEW.school_id;
  v_term_id := NEW.term_id;

  SELECT s.class_arm_combo_id
  INTO v_class_id
  FROM students s
  WHERE s.id = v_student_id;

  -- Get academic session
  SELECT at.session_id
  INTO v_academic_session_id
  FROM academic_terms at
  WHERE at.id = v_term_id;

  -- Calculate scaled score
  IF v_assessment_type IN ('CA1', 'CA2', 'CA3', 'CA4') THEN
    v_scaled_score := ROUND((NEW.score / NULLIF(v_total_marks, 0)) * 10 * 100) / 100;
  ELSIF v_assessment_type = 'EXAM' THEN
    v_scaled_score := ROUND((NEW.score / NULLIF(v_total_marks, 0)) * 60 * 100) / 100;
  ELSE
    v_scaled_score := NEW.score;
  END IF;

  -- Insert or update in universal_scores
  INSERT INTO universal_scores (
    school_id, student_id, subject_id, class_id, term_id, academic_session_id,
    test1_score, test1_source, test1_submission_id, test1_updated_at,
    test2_score, test2_source, test2_submission_id, test2_updated_at,
    test3_score, test3_source, test3_submission_id, test3_updated_at,
    test4_score, test4_source, test4_submission_id, test4_updated_at,
    exam_score, exam_source, exam_submission_id, exam_updated_at,
    status, synced_at, last_sync_source
  )
  VALUES (
    v_school_id, v_student_id, v_subject_id, v_class_id, v_term_id, v_academic_session_id,
    CASE WHEN v_assessment_type = 'CA1' THEN v_scaled_score ELSE NULL END,
    CASE WHEN v_assessment_type = 'CA1' THEN 'CBT' ELSE 'NONE' END,
    CASE WHEN v_assessment_type = 'CA1' THEN NEW.id ELSE NULL END,
    CASE WHEN v_assessment_type = 'CA1' THEN NOW() ELSE NULL END,
    CASE WHEN v_assessment_type = 'CA2' THEN v_scaled_score ELSE NULL END,
    CASE WHEN v_assessment_type = 'CA2' THEN 'CBT' ELSE 'NONE' END,
    CASE WHEN v_assessment_type = 'CA2' THEN NEW.id ELSE NULL END,
    CASE WHEN v_assessment_type = 'CA2' THEN NOW() ELSE NULL END,
    CASE WHEN v_assessment_type = 'CA3' THEN v_scaled_score ELSE NULL END,
    CASE WHEN v_assessment_type = 'CA3' THEN 'CBT' ELSE 'NONE' END,
    CASE WHEN v_assessment_type = 'CA3' THEN NEW.id ELSE NULL END,
    CASE WHEN v_assessment_type = 'CA3' THEN NOW() ELSE NULL END,
    CASE WHEN v_assessment_type = 'CA4' THEN v_scaled_score ELSE NULL END,
    CASE WHEN v_assessment_type = 'CA4' THEN 'CBT' ELSE 'NONE' END,
    CASE WHEN v_assessment_type = 'CA4' THEN NEW.id ELSE NULL END,
    CASE WHEN v_assessment_type = 'CA4' THEN NOW() ELSE NULL END,
    CASE WHEN v_assessment_type = 'EXAM' THEN v_scaled_score ELSE NULL END,
    CASE WHEN v_assessment_type = 'EXAM' THEN 'CBT' ELSE 'NONE' END,
    CASE WHEN v_assessment_type = 'EXAM' THEN NEW.id ELSE NULL END,
    CASE WHEN v_assessment_type = 'EXAM' THEN NOW() ELSE NULL END,
    'ACTIVE', NOW(), 'CBT_TRIGGER'
  )
  ON CONFLICT (student_id, subject_id, term_id)
  DO UPDATE SET
    test1_score = CASE WHEN v_assessment_type = 'CA1' THEN v_scaled_score ELSE universal_scores.test1_score END,
    test1_source = CASE WHEN v_assessment_type = 'CA1' THEN 'CBT' ELSE universal_scores.test1_source END,
    test1_submission_id = CASE WHEN v_assessment_type = 'CA1' THEN NEW.id ELSE universal_scores.test1_submission_id END,
    test1_updated_at = CASE WHEN v_assessment_type = 'CA1' THEN NOW() ELSE universal_scores.test1_updated_at END,
    test2_score = CASE WHEN v_assessment_type = 'CA2' THEN v_scaled_score ELSE universal_scores.test2_score END,
    test2_source = CASE WHEN v_assessment_type = 'CA2' THEN 'CBT' ELSE universal_scores.test2_source END,
    test2_submission_id = CASE WHEN v_assessment_type = 'CA2' THEN NEW.id ELSE universal_scores.test2_submission_id END,
    test2_updated_at = CASE WHEN v_assessment_type = 'CA2' THEN NOW() ELSE universal_scores.test2_updated_at END,
    test3_score = CASE WHEN v_assessment_type = 'CA3' THEN v_scaled_score ELSE universal_scores.test3_score END,
    test3_source = CASE WHEN v_assessment_type = 'CA3' THEN 'CBT' ELSE universal_scores.test3_source END,
    test3_submission_id = CASE WHEN v_assessment_type = 'CA3' THEN NEW.id ELSE universal_scores.test3_submission_id END,
    test3_updated_at = CASE WHEN v_assessment_type = 'CA3' THEN NOW() ELSE universal_scores.test3_updated_at END,
    test4_score = CASE WHEN v_assessment_type = 'CA4' THEN v_scaled_score ELSE universal_scores.test4_score END,
    test4_source = CASE WHEN v_assessment_type = 'CA4' THEN 'CBT' ELSE universal_scores.test4_source END,
    test4_submission_id = CASE WHEN v_assessment_type = 'CA4' THEN NEW.id ELSE universal_scores.test4_submission_id END,
    test4_updated_at = CASE WHEN v_assessment_type = 'CA4' THEN NOW() ELSE universal_scores.test4_updated_at END,
    exam_score = CASE WHEN v_assessment_type = 'EXAM' THEN v_scaled_score ELSE universal_scores.exam_score END,
    exam_source = CASE WHEN v_assessment_type = 'EXAM' THEN 'CBT' ELSE universal_scores.exam_source END,
    exam_submission_id = CASE WHEN v_assessment_type = 'EXAM' THEN NEW.id ELSE universal_scores.exam_submission_id END,
    exam_updated_at = CASE WHEN v_assessment_type = 'EXAM' THEN NOW() ELSE universal_scores.exam_updated_at END,
    updated_at = NOW(),
    synced_at = NOW(),
    last_sync_source = 'CBT_TRIGGER';

  -- Also sync to score_sheets for backward compatibility
  INSERT INTO score_sheets (
    school_id, student_id, subject_id, term_id,
    test1, test1_source, test2, test2_source,
    test3, test3_source, test4, test4_source,
    exam, exam_source
  )
  VALUES (
    v_school_id, v_student_id, v_subject_id, v_term_id,
    CASE WHEN v_assessment_type = 'CA1' THEN v_scaled_score ELSE NULL END,
    CASE WHEN v_assessment_type = 'CA1' THEN 'CBT' ELSE NULL END,
    CASE WHEN v_assessment_type = 'CA2' THEN v_scaled_score ELSE NULL END,
    CASE WHEN v_assessment_type = 'CA2' THEN 'CBT' ELSE NULL END,
    CASE WHEN v_assessment_type = 'CA3' THEN v_scaled_score ELSE NULL END,
    CASE WHEN v_assessment_type = 'CA3' THEN 'CBT' ELSE NULL END,
    CASE WHEN v_assessment_type = 'CA4' THEN v_scaled_score ELSE NULL END,
    CASE WHEN v_assessment_type = 'CA4' THEN 'CBT' ELSE NULL END,
    CASE WHEN v_assessment_type = 'EXAM' THEN v_scaled_score ELSE NULL END,
    CASE WHEN v_assessment_type = 'EXAM' THEN 'CBT' ELSE NULL END
  )
  ON CONFLICT (student_id, subject_id, term_id)
  DO UPDATE SET
    test1 = CASE WHEN v_assessment_type = 'CA1' THEN v_scaled_score ELSE score_sheets.test1 END,
    test1_source = CASE WHEN v_assessment_type = 'CA1' THEN 'CBT' ELSE score_sheets.test1_source END,
    test2 = CASE WHEN v_assessment_type = 'CA2' THEN v_scaled_score ELSE score_sheets.test2 END,
    test2_source = CASE WHEN v_assessment_type = 'CA2' THEN 'CBT' ELSE score_sheets.test2_source END,
    test3 = CASE WHEN v_assessment_type = 'CA3' THEN v_scaled_score ELSE score_sheets.test3 END,
    test3_source = CASE WHEN v_assessment_type = 'CA3' THEN 'CBT' ELSE score_sheets.test3_source END,
    test4 = CASE WHEN v_assessment_type = 'CA4' THEN v_scaled_score ELSE score_sheets.test4 END,
    test4_source = CASE WHEN v_assessment_type = 'CA4' THEN 'CBT' ELSE score_sheets.test4_source END,
    exam = CASE WHEN v_assessment_type = 'EXAM' THEN v_scaled_score ELSE score_sheets.exam END,
    exam_source = CASE WHEN v_assessment_type = 'EXAM' THEN 'CBT' ELSE score_sheets.exam_source END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 5: Create or Replace Trigger for CBT Sync
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_sync_cbt_to_universal ON cbt_submissions;

CREATE TRIGGER trigger_sync_cbt_to_universal
AFTER UPDATE ON cbt_submissions
FOR EACH ROW
WHEN (NEW.status = 'GRADED')
EXECUTE FUNCTION sync_cbt_to_universal_scores();

-- ============================================================================
-- PART 6: Backfill from existing score_sheets to universal_scores
-- ============================================================================

INSERT INTO universal_scores (
  school_id, student_id, subject_id, class_id, term_id,
  test1_score, test1_source, test2_score, test2_source,
  test3_score, test3_source, test4_score, test4_source,
  exam_score, exam_source, status, synced_at, last_sync_source
)
SELECT
  ss.school_id, 
  ss.student_id, 
  ss.subject_id, 
  ss.class_arm_combo_id,
  ss.term_id,
  ss.test1, COALESCE(ss.test1_source, 'MANUAL'),
  ss.test2, COALESCE(ss.test2_source, 'MANUAL'),
  ss.test3, COALESCE(ss.test3_source, 'MANUAL'),
  ss.test4, COALESCE(ss.test4_source, 'MANUAL'),
  ss.exam, COALESCE(ss.exam_source, 'MANUAL'),
  'ACTIVE', NOW(), 'BACKFILL_SCORESHEET'
FROM score_sheets ss
WHERE ss.school_id IS NOT NULL 
  AND ss.student_id IS NOT NULL
  AND ss.subject_id IS NOT NULL
  AND ss.term_id IS NOT NULL
ON CONFLICT (student_id, subject_id, term_id) DO NOTHING;

-- ============================================================================
-- PART 7: Add Comments
-- ============================================================================

COMMENT ON TABLE universal_scores IS 'Universal single source of truth for all student scores (CBT + Manual) across all schools';
COMMENT ON COLUMN universal_scores.test1_source IS 'Source of test1 score: CBT, MANUAL, or NONE';
COMMENT ON COLUMN universal_scores.last_sync_source IS 'Origin of last sync: CBT_TRIGGER, MANUAL_ENTRY, SYNC_JOB, BACKFILL_*';
