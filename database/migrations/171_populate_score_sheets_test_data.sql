-- Migration 171: Populate score_sheets with test data
-- Creates score records for test students across multiple terms and subjects

BEGIN;

-- ============================================================================
-- STEP 1: Get first school (most likely to have data)
-- ============================================================================
WITH school_data AS (
  SELECT id, name FROM schools WHERE status = 'ACTIVE' LIMIT 1
),

-- ============================================================================
-- STEP 2: Get students from that school
-- ============================================================================
available_students AS (
  SELECT DISTINCT s.id, s.admission_number, s.school_id
  FROM students s
  INNER JOIN school_data sd ON s.school_id = sd.id
  WHERE s.status = 'ACTIVE'
  LIMIT 10
),

-- ============================================================================
-- STEP 3: Get available terms (should have at least First Term from migration 170)
-- ============================================================================
available_terms AS (
  SELECT t.id, t.school_id, t.term_number, t.name
  FROM academic_terms t
  INNER JOIN school_data sd ON t.school_id = sd.id
  WHERE t.is_active = FALSE OR t.is_active = TRUE
  LIMIT 3
),

-- ============================================================================
-- STEP 4: Get subjects from student_subjects enrollment
-- ============================================================================
available_subjects AS (
  SELECT DISTINCT su.subject_id, s.school_id
  FROM student_subjects su
  INNER JOIN students s ON su.student_id = s.id
  INNER JOIN school_data sd ON s.school_id = sd.id
  LIMIT 10
)

-- ============================================================================
-- STEP 5: Insert test score data
-- Cross-join students × terms × subjects and create realistic scores
-- ============================================================================
INSERT INTO score_sheets (
  school_id,
  student_id,
  subject_id,
  term_id,
  test1,
  test2,
  test3,
  test4,
  exam,
  test1_source,
  test2_source,
  test3_source,
  test4_source,
  exam_source
)
SELECT
  s.school_id,
  s.id,
  su.subject_id,
  t.id,
  -- Generate realistic test scores (0-10 each)
  (RANDOM() * 10)::NUMERIC(5,2),
  (RANDOM() * 10)::NUMERIC(5,2),
  (RANDOM() * 10)::NUMERIC(5,2),
  (RANDOM() * 10)::NUMERIC(5,2),
  -- Exam scores (0-60)
  (RANDOM() * 60)::NUMERIC(5,2),
  'TEACHER_ENTRY',
  'TEACHER_ENTRY',
  'TEACHER_ENTRY',
  'TEACHER_ENTRY',
  'TEACHER_ENTRY'
FROM available_students s
CROSS JOIN available_terms t
CROSS JOIN available_subjects su
WHERE s.school_id = su.school_id
  AND s.school_id = t.school_id
ON CONFLICT (school_id, student_id, subject_id, term_id) DO NOTHING;

-- ============================================================================
-- STEP 6: Verify insertion
-- ============================================================================
SELECT 
  'Score Sheets Created' as status,
  COUNT(*) as total_records,
  COUNT(DISTINCT student_id) as unique_students,
  COUNT(DISTINCT subject_id) as unique_subjects,
  COUNT(DISTINCT term_id) as unique_terms
FROM score_sheets
WHERE updated_at > NOW() - INTERVAL '1 minute';

COMMIT;
