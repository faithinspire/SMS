-- RUN MIGRATIONS 048 & 049
-- Copy this ENTIRE script into Supabase SQL Editor and run
-- This will apply both migrations and verify they work

-- ============================================================================
-- MIGRATION 048: Consolidate CBT Schema
-- ============================================================================

-- Ensure cbt_answers table exists
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

CREATE INDEX IF NOT EXISTS idx_cbt_answers_submission ON cbt_answers(submission_id);
CREATE INDEX IF NOT EXISTS idx_cbt_answers_question ON cbt_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_cbt_answers_school ON cbt_answers(school_id);

-- Add option_key to cbt_options
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

UPDATE cbt_options SET option_key = 'A' WHERE option_key IS NULL;
ALTER TABLE cbt_options ALTER COLUMN option_key SET NOT NULL;

-- Add correct_option to cbt_questions
ALTER TABLE cbt_questions ADD COLUMN IF NOT EXISTS correct_option VARCHAR(1);

-- Add columns to cbt_exams
ALTER TABLE cbt_exams ADD COLUMN IF NOT EXISTS session_year INT;
ALTER TABLE cbt_exams ADD COLUMN IF NOT EXISTS academic_session_id UUID;
ALTER TABLE cbt_exams ADD COLUMN IF NOT EXISTS assessment_type VARCHAR(50);
ALTER TABLE cbt_exams ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'DRAFT';
ALTER TABLE cbt_exams ADD COLUMN IF NOT EXISTS teacher_id UUID;

-- Add columns to cbt_submissions
ALTER TABLE cbt_submissions ADD COLUMN IF NOT EXISTS academic_session_id UUID;
ALTER TABLE cbt_submissions ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'SUBMITTED';
ALTER TABLE cbt_submissions ADD COLUMN IF NOT EXISTS percentage NUMERIC(5,2);
ALTER TABLE cbt_submissions ADD COLUMN IF NOT EXISTS passed BOOLEAN;

SELECT '✅ MIGRATION 048 APPLIED' as status;

-- ============================================================================
-- MIGRATION 049: Populate Terms and Sessions
-- ============================================================================

-- Ensure academic_sessions exists with correct schema
CREATE TABLE IF NOT EXISTS academic_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  session_year VARCHAR(20) NOT NULL,
  name TEXT NOT NULL,
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, session_year)
);

CREATE INDEX IF NOT EXISTS idx_academic_sessions_school ON academic_sessions(school_id);

-- Populate academic sessions
INSERT INTO academic_sessions (school_id, session_year, name, is_current)
SELECT 
  s.id,
  '2026/2027',
  '2026/2027 Academic Session',
  TRUE
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM academic_sessions as2
  WHERE as2.school_id = s.id AND as2.session_year = '2026/2027'
)
ON CONFLICT (school_id, session_year) DO NOTHING;

-- Populate terms
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

SELECT '✅ MIGRATION 049 APPLIED' as status;

-- ============================================================================
-- VERIFICATION: Target School
-- ============================================================================

SELECT 'TARGET SCHOOL VERIFICATION' as section, '' as data;

SELECT 'School' as item, name as value FROM schools WHERE id = 'dc4ecc86-a983-4cf0-a8fd-b43bfa5d5877'
UNION ALL
SELECT 'First Term Exists' as item, CASE WHEN COUNT(*) > 0 THEN 'YES' ELSE 'NO' END as value FROM terms WHERE school_id = 'dc4ecc86-a983-4cf0-a8fd-b43bfa5d5877' AND name = 'First Term'
UNION ALL
SELECT 'Second Term Exists' as item, CASE WHEN COUNT(*) > 0 THEN 'YES' ELSE 'NO' END as value FROM terms WHERE school_id = 'dc4ecc86-a983-4cf0-a8fd-b43bfa5d5877' AND name = 'Second Term'
UNION ALL
SELECT 'Third Term Exists' as item, CASE WHEN COUNT(*) > 0 THEN 'YES' ELSE 'NO' END as value FROM terms WHERE school_id = 'dc4ecc86-a983-4cf0-a8fd-b43bfa5d5877' AND name = 'Third Term'
UNION ALL
SELECT 'Academic Session Exists' as item, CASE WHEN COUNT(*) > 0 THEN 'YES' ELSE 'NO' END as value FROM academic_sessions WHERE school_id = 'dc4ecc86-a983-4cf0-a8fd-b43bfa5d5877';

-- ============================================================================
-- FINAL RESULT
-- ============================================================================

SELECT '✅ MIGRATIONS 048 & 049 COMPLETE' as final_status;
