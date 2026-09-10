-- MIGRATION 048: Consolidate CBT Schema
-- PURPOSE: Ensure all CBT tables have correct columns, constraints, and relationships
-- DEPENDENCIES: Must run after migration 030 (cbt_answers creation)

-- ============================================================================
-- STEP 1: Ensure cbt_answers table exists and has all required columns
-- ============================================================================

CREATE TABLE IF NOT EXISTS cbt_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL,
  submission_id UUID NOT NULL REFERENCES cbt_submissions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES cbt_questions(id) ON DELETE CASCADE,
  selected_option_id UUID REFERENCES cbt_options(id) ON DELETE SET NULL,
  answer_text TEXT,
  marks_awarded NUMERIC(5,2) DEFAULT 0,
  is_correct BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(submission_id, question_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cbt_answers_submission ON cbt_answers(submission_id);
CREATE INDEX IF NOT EXISTS idx_cbt_answers_question ON cbt_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_cbt_answers_school ON cbt_answers(school_id);
CREATE INDEX IF NOT EXISTS idx_cbt_answers_is_correct ON cbt_answers(is_correct);

-- ============================================================================
-- STEP 2: Add missing columns to cbt_options if they don't exist
-- ============================================================================

-- Ensure option_key column exists (for A, B, C, D mapping)
ALTER TABLE cbt_options ADD COLUMN IF NOT EXISTS option_key VARCHAR(1);

-- Update existing options to have option keys based on display_order
UPDATE cbt_options 
SET option_key = CASE 
  WHEN display_order = 1 THEN 'A'
  WHEN display_order = 2 THEN 'B'
  WHEN display_order = 3 THEN 'C'
  WHEN display_order = 4 THEN 'D'
  ELSE 'A'
END
WHERE option_key IS NULL AND display_order IS NOT NULL;

-- Set option_key to 'A' for any remaining null values
UPDATE cbt_options 
SET option_key = 'A' 
WHERE option_key IS NULL;

-- Add NOT NULL constraint after populating
ALTER TABLE cbt_options 
ALTER COLUMN option_key SET NOT NULL;

-- ============================================================================
-- STEP 3: Ensure cbt_questions has required columns
-- ============================================================================

ALTER TABLE cbt_questions ADD COLUMN IF NOT EXISTS correct_option VARCHAR(1);

-- Populate correct_option from cbt_options relationship
UPDATE cbt_questions cq
SET correct_option = co.option_key
FROM cbt_options co
WHERE co.question_id = cq.id 
  AND co.is_correct = TRUE 
  AND cq.correct_option IS NULL;

-- Create index on school_id for filtering
CREATE INDEX IF NOT EXISTS idx_cbt_questions_school ON cbt_questions(school_id);

-- ============================================================================
-- STEP 4: Ensure cbt_exams has all required columns
-- ============================================================================

ALTER TABLE cbt_exams ADD COLUMN IF NOT EXISTS session_year INT;
ALTER TABLE cbt_exams ADD COLUMN IF NOT EXISTS academic_session_id UUID;
ALTER TABLE cbt_exams ADD COLUMN IF NOT EXISTS assessment_type VARCHAR(50);
ALTER TABLE cbt_exams ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'DRAFT';
ALTER TABLE cbt_exams ADD COLUMN IF NOT EXISTS teacher_id UUID;

-- Set status values based on exam timing
UPDATE cbt_exams 
SET status = CASE
  WHEN NOW() < start_time THEN 'UPCOMING'
  WHEN NOW() >= start_time AND NOW() <= end_time THEN 'ACTIVE'
  WHEN NOW() > end_time THEN 'CLOSED'
  ELSE 'DRAFT'
END
WHERE status = 'DRAFT';

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_cbt_exams_status ON cbt_exams(status);
CREATE INDEX IF NOT EXISTS idx_cbt_exams_teacher ON cbt_exams(teacher_id);
CREATE INDEX IF NOT EXISTS idx_cbt_exams_session ON cbt_exams(academic_session_id);

-- ============================================================================
-- STEP 5: Ensure cbt_submissions has all required columns
-- ============================================================================

ALTER TABLE cbt_submissions ADD COLUMN IF NOT EXISTS academic_session_id UUID;
ALTER TABLE cbt_submissions ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'SUBMITTED';
ALTER TABLE cbt_submissions ADD COLUMN IF NOT EXISTS percentage NUMERIC(5,2);
ALTER TABLE cbt_submissions ADD COLUMN IF NOT EXISTS passed BOOLEAN;
ALTER TABLE cbt_submissions ADD COLUMN IF NOT EXISTS attempt_number INT DEFAULT 1;

-- Set percentage from score
UPDATE cbt_submissions
SET percentage = (score / (
  SELECT total_marks FROM cbt_exams WHERE id = cbt_submissions.cbt_exam_id
)) * 100
WHERE score IS NOT NULL AND percentage IS NULL;

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_cbt_submissions_status ON cbt_submissions(status);
CREATE INDEX IF NOT EXISTS idx_cbt_submissions_academic_session ON cbt_submissions(academic_session_id);
CREATE INDEX IF NOT EXISTS idx_cbt_submissions_student ON cbt_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_cbt_submissions_exam ON cbt_submissions(cbt_exam_id);

-- ============================================================================
-- STEP 6: Add unique constraint on cbt_options to prevent duplicates
-- ============================================================================

-- First remove duplicate options (keep the first one)
DELETE FROM cbt_options 
WHERE id NOT IN (
  SELECT DISTINCT ON (question_id, display_order) id 
  FROM cbt_options 
  ORDER BY question_id, display_order, created_at
);

-- Then add constraint if it doesn't exist
ALTER TABLE cbt_options 
ADD CONSTRAINT unique_question_option UNIQUE(question_id, display_order);

-- ============================================================================
-- STEP 7: Fix foreign key relationships
-- ============================================================================

-- Ensure all foreign keys are set up correctly
ALTER TABLE cbt_exams 
ADD CONSTRAINT fk_cbt_exams_term FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE SET NULL;

ALTER TABLE cbt_exams 
ADD CONSTRAINT fk_cbt_exams_academic_session FOREIGN KEY (academic_session_id) REFERENCES academic_sessions(id) ON DELETE SET NULL;

-- ============================================================================
-- STEP 8: Verification - Show current schema state
-- ============================================================================

SELECT 'CBT SCHEMA CONSOLIDATION COMPLETE' as status;

-- Show table row counts
SELECT 
  'Table Statistics' as metric,
  (SELECT COUNT(*) FROM cbt_exams)::text as cbt_exams,
  (SELECT COUNT(*) FROM cbt_questions)::text as cbt_questions,
  (SELECT COUNT(*) FROM cbt_options)::text as cbt_options,
  (SELECT COUNT(*) FROM cbt_submissions)::text as cbt_submissions,
  (SELECT COUNT(*) FROM cbt_answers)::text as cbt_answers;

-- Show missing data scenarios
SELECT 
  'Questions without options' as check_type,
  COUNT(*) as count
FROM cbt_questions q
WHERE NOT EXISTS (SELECT 1 FROM cbt_options o WHERE o.question_id = q.id);

UNION ALL

SELECT 
  'Questions without correct_option set' as check_type,
  COUNT(*) as count
FROM cbt_questions
WHERE correct_option IS NULL;

UNION ALL

SELECT 
  'Options without option_key' as check_type,
  COUNT(*) as count
FROM cbt_options
WHERE option_key IS NULL;

UNION ALL

SELECT 
  'Submissions without academic_session_id' as check_type,
  COUNT(*) as count
FROM cbt_submissions
WHERE academic_session_id IS NULL;

UNION ALL

SELECT 
  'Answers with both selected_option_id and answer_text' as check_type,
  COUNT(*) as count
FROM cbt_answers
WHERE selected_option_id IS NOT NULL AND answer_text IS NOT NULL;
