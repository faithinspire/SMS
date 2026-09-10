-- VERIFICATION & APPLICATION SCRIPT
-- Run this in Supabase SQL Editor to verify migrations 048 and 049 can be applied

-- ============================================================================
-- STEP 1: Check current state BEFORE applying migrations
-- ============================================================================

SELECT 'BEFORE MIGRATION: Current State' as phase;

-- Check if academic_sessions table exists
SELECT 
  'academic_sessions table exists' as check_type,
  CASE WHEN EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'academic_sessions'
  ) THEN 'YES' ELSE 'NO' END as result;

-- Check if cbt_answers table exists
SELECT 
  'cbt_answers table exists' as check_type,
  CASE WHEN EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'cbt_answers'
  ) THEN 'YES' ELSE 'NO' END as result;

-- Count current terms
SELECT 
  'Total terms in database' as check_type,
  COUNT(*)::text as count
FROM terms;

-- Count terms for target school BEFORE migration
SELECT 
  'Terms for target school (BEFORE)' as check_type,
  COUNT(*)::text as count
FROM terms
WHERE school_id = 'dc4ecc86-a983-4cf0-a8fd-b43bfa5d5877';

-- ============================================================================
-- STEP 2: Apply Migration 048 (CBT Schema Consolidation)
-- ============================================================================

SELECT 'APPLYING MIGRATION 048' as phase;

-- Ensure cbt_answers table exists and has all required columns
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

-- Add missing columns to cbt_options
ALTER TABLE cbt_options ADD COLUMN IF NOT EXISTS option_key VARCHAR(1);

UPDATE cbt_options 
SET option_key = CASE 
  WHEN display_order = 1 THEN 'A'
  WHEN display_order = 2 THEN 'B'
  WHEN display_order = 3 THEN 'C'
  WHEN display_order = 4 THEN 'D'
  ELSE 'A'
END
WHERE option_key IS NULL AND display_order IS NOT NULL;

UPDATE cbt_options 
SET option_key = 'A' 
WHERE option_key IS NULL;

ALTER TABLE cbt_options 
ALTER COLUMN option_key SET NOT NULL;

-- Add columns to cbt_questions
ALTER TABLE cbt_questions ADD COLUMN IF NOT EXISTS correct_option VARCHAR(1);

UPDATE cbt_questions cq
SET correct_option = co.option_key
FROM cbt_options co
WHERE co.question_id = cq.id 
  AND co.is_correct = TRUE 
  AND cq.correct_option IS NULL;

CREATE INDEX IF NOT EXISTS idx_cbt_questions_school ON cbt_questions(school_id);

-- Add columns to cbt_exams
ALTER TABLE cbt_exams ADD COLUMN IF NOT EXISTS session_year INT;
ALTER TABLE cbt_exams ADD COLUMN IF NOT EXISTS academic_session_id UUID;
ALTER TABLE cbt_exams ADD COLUMN IF NOT EXISTS assessment_type VARCHAR(50);
ALTER TABLE cbt_exams ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'DRAFT';
ALTER TABLE cbt_exams ADD COLUMN IF NOT EXISTS teacher_id UUID;

UPDATE cbt_exams 
SET status = CASE
  WHEN NOW() < start_time THEN 'UPCOMING'
  WHEN NOW() >= start_time AND NOW() <= end_time THEN 'ACTIVE'
  WHEN NOW() > end_time THEN 'CLOSED'
  ELSE 'DRAFT'
END
WHERE status = 'DRAFT';

CREATE INDEX IF NOT EXISTS idx_cbt_exams_status ON cbt_exams(status);
CREATE INDEX IF NOT EXISTS idx_cbt_exams_teacher ON cbt_exams(teacher_id);
CREATE INDEX IF NOT EXISTS idx_cbt_exams_session ON cbt_exams(academic_session_id);

-- Add columns to cbt_submissions
ALTER TABLE cbt_submissions ADD COLUMN IF NOT EXISTS academic_session_id UUID;
ALTER TABLE cbt_submissions ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'SUBMITTED';
ALTER TABLE cbt_submissions ADD COLUMN IF NOT EXISTS percentage NUMERIC(5,2);
ALTER TABLE cbt_submissions ADD COLUMN IF NOT EXISTS passed BOOLEAN;
ALTER TABLE cbt_submissions ADD COLUMN IF NOT EXISTS attempt_number INT DEFAULT 1;

UPDATE cbt_submissions
SET percentage = (score / (
  SELECT total_marks FROM cbt_exams WHERE id = cbt_submissions.cbt_exam_id
)) * 100
WHERE score IS NOT NULL AND percentage IS NULL;

CREATE INDEX IF NOT EXISTS idx_cbt_submissions_status ON cbt_submissions(status);
CREATE INDEX IF NOT EXISTS idx_cbt_submissions_academic_session ON cbt_submissions(academic_session_id);
CREATE INDEX IF NOT EXISTS idx_cbt_submissions_student ON cbt_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_cbt_submissions_exam ON cbt_submissions(cbt_exam_id);

SELECT 'MIGRATION 048 APPLIED SUCCESSFULLY' as status;

-- ============================================================================
-- STEP 3: Apply Migration 049 (Terms and Sessions Population)
-- ============================================================================

SELECT 'APPLYING MIGRATION 049' as phase;

-- Create academic_sessions if table doesn't exist
CREATE TABLE IF NOT EXISTS academic_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  session_string TEXT NOT NULL,
  start_year INT NOT NULL,
  end_year INT NOT NULL,
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(school_id, session_string)
);

CREATE INDEX IF NOT EXISTS idx_academic_sessions_school ON academic_sessions(school_id);
CREATE INDEX IF NOT EXISTS idx_academic_sessions_is_current ON academic_sessions(is_current);

-- Populate academic_sessions for all schools
INSERT INTO academic_sessions (school_id, session_string, start_year, end_year, start_date, end_date, is_current)
SELECT 
  s.id,
  '2026/2027',
  2026,
  2027,
  '2026-09-01'::date,
  '2027-08-31'::date,
  TRUE
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM academic_sessions as2
  WHERE as2.school_id = s.id 
    AND as2.session_string = '2026/2027'
)
ON CONFLICT (school_id, session_string) DO NOTHING;

-- Populate terms for all schools
INSERT INTO terms (school_id, name, session_year, start_date, end_date, is_current)
SELECT 
  s.id AS school_id,
  term_data.name,
  term_data.session_year,
  term_data.start_date,
  term_data.end_date,
  term_data.is_current
FROM schools s
CROSS JOIN (
  VALUES 
    ('First Term', 2026, '2026-09-01'::date, '2026-11-30'::date, TRUE),
    ('Second Term', 2026, '2026-12-01'::date, '2027-02-28'::date, FALSE),
    ('Third Term', 2026, '2027-03-01'::date, '2027-05-31'::date, FALSE)
) AS term_data(name, session_year, start_date, end_date, is_current)
WHERE NOT EXISTS (
  SELECT 1 FROM terms t 
  WHERE t.school_id = s.id 
    AND t.name = term_data.name
    AND t.session_year = term_data.session_year
)
ON CONFLICT (school_id, session_year, name) DO NOTHING;

SELECT 'MIGRATION 049 APPLIED SUCCESSFULLY' as status;

-- ============================================================================
-- STEP 4: VERIFY - Check state AFTER migrations
-- ============================================================================

SELECT 'AFTER MIGRATIONS: Verification' as phase;

-- Verify academic_sessions exists and is populated
SELECT 
  'academic_sessions created' as check_type,
  CASE WHEN COUNT(*) > 0 THEN 'YES' ELSE 'NO' END as result
FROM academic_sessions;

-- Verify terms count increased
SELECT 
  'Total terms AFTER population' as check_type,
  COUNT(*)::text as count
FROM terms;

-- Verify target school has terms
SELECT 
  'Terms for target school (AFTER)' as check_type,
  COUNT(*)::text as count
FROM terms
WHERE school_id = 'dc4ecc86-a983-4cf0-a8fd-b43bfa5d5877';

-- ============================================================================
-- STEP 5: TARGET SCHOOL VERIFICATION
-- ============================================================================

SELECT 'TARGET SCHOOL: dc4ecc86-a983-4cf0-a8fd-b43bfa5d5877' as section;

SELECT 
  t.name as term_name,
  t.session_year,
  t.start_date,
  t.end_date,
  t.is_current
FROM terms t
WHERE t.school_id = 'dc4ecc86-a983-4cf0-a8fd-b43bfa5d5877'
ORDER BY t.name;

-- ============================================================================
-- STEP 6: DETAILED VERIFICATION REPORT
-- ============================================================================

SELECT 'DETAILED VERIFICATION REPORT' as section;

SELECT 
  'Schools with academic sessions' as check_type,
  COUNT(DISTINCT school_id)::text as count
FROM academic_sessions;

UNION ALL

SELECT 
  'Schools with terms' as check_type,
  COUNT(DISTINCT school_id)::text as count
FROM terms;

UNION ALL

SELECT 
  'CBT exams in system' as check_type,
  COUNT(*)::text as count
FROM cbt_exams;

UNION ALL

SELECT 
  'CBT questions in system' as check_type,
  COUNT(*)::text as count
FROM cbt_questions;

UNION ALL

SELECT 
  'CBT options in system' as check_type,
  COUNT(*)::text as count
FROM cbt_options;

UNION ALL

SELECT 
  'CBT submissions in system' as check_type,
  COUNT(*)::text as count
FROM cbt_submissions;

UNION ALL

SELECT 
  'CBT answers in system' as check_type,
  COUNT(*)::text as count
FROM cbt_answers;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

SELECT '✅ MIGRATIONS 048 & 049 VERIFICATION COMPLETE' as final_status;
