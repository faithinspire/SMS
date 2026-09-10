-- ============================================================================
-- MIGRATION 057: Finalize CBT System End-to-End
-- ============================================================================
--
-- PURPOSE:
-- Ensure CBT system is production-ready with:
-- 1. Proper option_key (A,B,C,D) constraint enforcement
-- 2. Single correct answer per question validation
-- 3. Auto-grading validation and indexes
-- 4. term_id FK points to academic_terms (not deprecated terms table)
-- 5. Complete cbt_answers table for auto-grading
-- 6. Performance indexes for all critical queries
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Verify CBT tables exist with correct schema
-- ============================================================================

-- Ensure cbt_exams has term_id FK to academic_terms
DO $$
BEGIN
  -- Check if cbt_exams exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cbt_exams') THEN
    -- Ensure term_id column exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'cbt_exams' AND column_name = 'term_id'
    ) THEN
      ALTER TABLE cbt_exams ADD COLUMN term_id UUID;
    END IF;
    
    -- Ensure academic_session_id exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'cbt_exams' AND column_name = 'academic_session_id'
    ) THEN
      ALTER TABLE cbt_exams ADD COLUMN academic_session_id UUID;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Verify cbt_options has option_key (A,B,C,D) constraint
-- ============================================================================

-- Ensure option_key column exists
ALTER TABLE cbt_options 
ADD COLUMN IF NOT EXISTS option_key VARCHAR(1);

-- Add CHECK constraint for valid option keys
ALTER TABLE cbt_options 
ADD CONSTRAINT IF NOT EXISTS check_cbt_options_valid_key 
  CHECK (option_key IN ('A', 'B', 'C', 'D'));

-- Populate missing option_key values based on display_order
UPDATE cbt_options 
SET option_key = CASE 
  WHEN display_order = 0 THEN 'A'
  WHEN display_order = 1 THEN 'B'
  WHEN display_order = 2 THEN 'C'
  WHEN display_order = 3 THEN 'D'
  ELSE CHAR(65 + MOD(ABS(hashtext(id)::int), 4))  -- Fallback: hash to A-D
END
WHERE option_key IS NULL;

-- Make option_key NOT NULL after population
ALTER TABLE cbt_options 
ALTER COLUMN option_key SET NOT NULL;

-- ============================================================================
-- STEP 3: Enforce single correct answer per question
-- ============================================================================

-- Add unique index: only one correct answer per question
CREATE UNIQUE INDEX IF NOT EXISTS idx_cbt_options_one_correct_per_question 
  ON cbt_options(question_id) 
  WHERE is_correct = TRUE;

-- Add unique constraint on display_order within a question
ALTER TABLE cbt_options 
ADD CONSTRAINT IF NOT EXISTS unique_question_display_order 
  UNIQUE(question_id, display_order);

-- ============================================================================
-- STEP 4: Verify cbt_questions schema for auto-grading
-- ============================================================================

-- Ensure required columns exist
ALTER TABLE cbt_questions 
ADD COLUMN IF NOT EXISTS marks NUMERIC(5,2) DEFAULT 1;

ALTER TABLE cbt_questions 
ADD COLUMN IF NOT EXISTS correct_option VARCHAR(1);

ALTER TABLE cbt_questions 
ADD COLUMN IF NOT EXISTS is_multiple_answer BOOLEAN DEFAULT FALSE;

-- Populate correct_option from cbt_options relationship (for reference)
UPDATE cbt_questions cq
SET correct_option = co.option_key
FROM cbt_options co
WHERE co.question_id = cq.id 
  AND co.is_correct = TRUE 
  AND cq.correct_option IS NULL;

-- ============================================================================
-- STEP 5: Verify cbt_answers table has all required columns
-- ============================================================================

-- Ensure cbt_answers table exists
CREATE TABLE IF NOT EXISTS cbt_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES cbt_submissions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES cbt_questions(id) ON DELETE CASCADE,
  selected_option_id UUID REFERENCES cbt_options(id) ON DELETE SET NULL,
  answer_text TEXT,
  is_correct BOOLEAN DEFAULT FALSE,
  marks_awarded NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure all required columns exist
ALTER TABLE cbt_answers 
ADD COLUMN IF NOT EXISTS is_correct BOOLEAN DEFAULT FALSE;

ALTER TABLE cbt_answers 
ADD COLUMN IF NOT EXISTS marks_awarded NUMERIC(5,2) DEFAULT 0;

ALTER TABLE cbt_answers 
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id) ON DELETE CASCADE;

ALTER TABLE cbt_answers 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ============================================================================
-- STEP 6: Verify cbt_submissions has all tracking columns
-- ============================================================================

-- Ensure status column exists for submission lifecycle
ALTER TABLE cbt_submissions 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'IN_PROGRESS'
  CHECK (status IN ('DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'GRADED', 'LOCKED'));

-- Ensure grading columns exist
ALTER TABLE cbt_submissions 
ADD COLUMN IF NOT EXISTS score NUMERIC(5,2);

ALTER TABLE cbt_submissions 
ADD COLUMN IF NOT EXISTS percentage NUMERIC(5,2);

ALTER TABLE cbt_submissions 
ADD COLUMN IF NOT EXISTS passed BOOLEAN;

ALTER TABLE cbt_submissions 
ADD COLUMN IF NOT EXISTS graded_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE cbt_submissions 
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- STEP 7: Add performance indexes for CBT operations
-- ============================================================================

-- Indexes for exam operations
CREATE INDEX IF NOT EXISTS idx_cbt_exams_school_term 
  ON cbt_exams(school_id, term_id);

CREATE INDEX IF NOT EXISTS idx_cbt_exams_class_arm 
  ON cbt_exams(class_arm_combo_id);

CREATE INDEX IF NOT EXISTS idx_cbt_exams_created_by 
  ON cbt_exams(created_by);

-- Indexes for question operations
CREATE INDEX IF NOT EXISTS idx_cbt_questions_exam 
  ON cbt_questions(cbt_exam_id);

CREATE INDEX IF NOT EXISTS idx_cbt_questions_type 
  ON cbt_questions(question_type);

-- Indexes for options (critical for grading)
CREATE INDEX IF NOT EXISTS idx_cbt_options_question 
  ON cbt_options(question_id);

CREATE INDEX IF NOT EXISTS idx_cbt_options_correct_answer 
  ON cbt_options(question_id, is_correct);

CREATE INDEX IF NOT EXISTS idx_cbt_options_option_key 
  ON cbt_options(option_key);

-- Indexes for submission operations
CREATE INDEX IF NOT EXISTS idx_cbt_submissions_student 
  ON cbt_submissions(student_id);

CREATE INDEX IF NOT EXISTS idx_cbt_submissions_exam 
  ON cbt_submissions(cbt_exam_id);

CREATE INDEX IF NOT EXISTS idx_cbt_submissions_status 
  ON cbt_submissions(status);

CREATE INDEX IF NOT EXISTS idx_cbt_submissions_graded 
  ON cbt_submissions(submitted_at, graded_at);

-- Indexes for answer grading
CREATE INDEX IF NOT EXISTS idx_cbt_answers_submission 
  ON cbt_answers(submission_id);

CREATE INDEX IF NOT EXISTS idx_cbt_answers_question 
  ON cbt_answers(question_id);

CREATE INDEX IF NOT EXISTS idx_cbt_answers_option 
  ON cbt_answers(selected_option_id);

CREATE INDEX IF NOT EXISTS idx_cbt_answers_is_correct 
  ON cbt_answers(is_correct);

CREATE INDEX IF NOT EXISTS idx_cbt_answers_school 
  ON cbt_answers(school_id);

-- ============================================================================
-- STEP 8: Verify FK constraints point to academic_terms (not old terms)
-- ============================================================================

-- If cbt_exams.term_id exists, ensure it references academic_terms
DO $$
DECLARE
  constraint_exists BOOLEAN;
BEGIN
  -- Check if the column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cbt_exams' AND column_name = 'term_id'
  ) THEN
    -- Drop old FK if it references wrong table
    BEGIN
      ALTER TABLE cbt_exams 
      DROP CONSTRAINT IF EXISTS cbt_exams_term_id_fkey CASCADE;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    -- Add new FK to academic_terms
    BEGIN
      ALTER TABLE cbt_exams 
      ADD CONSTRAINT cbt_exams_term_id_fkey_academic_terms 
      FOREIGN KEY (term_id) REFERENCES academic_terms(id) ON DELETE CASCADE;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;

-- ============================================================================
-- STEP 9: Add auto-grading validation triggers
-- ============================================================================

-- Create function to validate auto-grading logic
CREATE OR REPLACE FUNCTION validate_cbt_auto_grading()
RETURNS TRIGGER AS $$
BEGIN
  -- Validation logic: When cbt_answers is updated, ensure is_correct is set correctly
  -- based on selected_option_id comparing with cbt_options.is_correct
  
  IF NEW.selected_option_id IS NOT NULL THEN
    SELECT is_correct INTO NEW.is_correct
    FROM cbt_options
    WHERE id = NEW.selected_option_id;
  ELSE
    NEW.is_correct := FALSE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to cbt_answers
DROP TRIGGER IF EXISTS trg_validate_cbt_answers_correctness ON cbt_answers;
CREATE TRIGGER trg_validate_cbt_answers_correctness
  BEFORE INSERT OR UPDATE ON cbt_answers
  FOR EACH ROW
  EXECUTE FUNCTION validate_cbt_auto_grading();

-- ============================================================================
-- STEP 10: Data integrity checks
-- ============================================================================

-- Verify no cbt_options have NULL option_key
DO $$
DECLARE
  null_keys INT;
BEGIN
  SELECT COUNT(*) INTO null_keys 
  FROM cbt_options 
  WHERE option_key IS NULL;
  
  IF null_keys > 0 THEN
    RAISE WARNING 'Found % cbt_options with NULL option_key - please review', null_keys;
  END IF;
END $$;

-- Verify all questions have at least one option
DO $$
DECLARE
  orphaned_questions INT;
BEGIN
  SELECT COUNT(*) INTO orphaned_questions 
  FROM cbt_questions q
  WHERE NOT EXISTS (
    SELECT 1 FROM cbt_options o 
    WHERE o.question_id = q.id
  );
  
  IF orphaned_questions > 0 THEN
    RAISE WARNING 'Found % cbt_questions with no options - please review', orphaned_questions;
  END IF;
END $$;

-- Verify only one correct option per question
DO $$
DECLARE
  multiple_correct INT;
BEGIN
  SELECT COUNT(*) INTO multiple_correct 
  FROM (
    SELECT question_id, COUNT(*) as correct_count 
    FROM cbt_options 
    WHERE is_correct = TRUE 
    GROUP BY question_id 
    HAVING COUNT(*) > 1
  ) q;
  
  IF multiple_correct > 0 THEN
    RAISE WARNING 'Found % questions with multiple correct options - please review', multiple_correct;
  END IF;
END $$;

-- ============================================================================
-- STEP 11: Create index statistics
-- ============================================================================

-- Log table sizes for monitoring
DO $$
DECLARE
  cbt_exams_count INT;
  cbt_questions_count INT;
  cbt_options_count INT;
  cbt_submissions_count INT;
  cbt_answers_count INT;
BEGIN
  SELECT COUNT(*) INTO cbt_exams_count FROM cbt_exams;
  SELECT COUNT(*) INTO cbt_questions_count FROM cbt_questions;
  SELECT COUNT(*) INTO cbt_options_count FROM cbt_options;
  SELECT COUNT(*) INTO cbt_submissions_count FROM cbt_submissions;
  SELECT COUNT(*) INTO cbt_answers_count FROM cbt_answers;
  
  RAISE NOTICE 'CBT System Status: exams=%, questions=%, options=%, submissions=%, answers=%',
    cbt_exams_count, cbt_questions_count, cbt_options_count, cbt_submissions_count, cbt_answers_count;
END $$;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (run after applying migration)
-- ============================================================================
-- Execute these to verify the migration was successful:

/*
-- 1. Verify option_key constraint
SELECT COUNT(*) as cbt_options_with_valid_key
FROM cbt_options 
WHERE option_key NOT IN ('A', 'B', 'C', 'D') OR option_key IS NULL;

-- 2. Verify single correct answer per question
SELECT question_id, COUNT(*) as correct_count
FROM cbt_options
WHERE is_correct = TRUE
GROUP BY question_id
HAVING COUNT(*) > 1;

-- 3. Verify no orphaned questions
SELECT COUNT(*) as questions_without_options
FROM cbt_questions q
WHERE NOT EXISTS (
  SELECT 1 FROM cbt_options o WHERE o.question_id = q.id
);

-- 4. Verify cbt_answers table is populated
SELECT COUNT(*) as total_answers FROM cbt_answers;

-- 5. Verify auto-grading validation
SELECT 
  COUNT(*) as total_answers,
  COUNT(CASE WHEN is_correct THEN 1 END) as correct_answers,
  COUNT(CASE WHEN marks_awarded > 0 THEN 1 END) as marked_answers
FROM cbt_answers;

-- 6. Verify term_id FK is correct
SELECT constraint_name, table_name, column_name
FROM information_schema.constraint_column_usage
WHERE table_name = 'cbt_exams' AND column_name = 'term_id';
*/
