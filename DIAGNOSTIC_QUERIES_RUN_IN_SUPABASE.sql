-- ============================================================================
-- DIAGNOSTIC QUERIES - Run in Supabase SQL Editor to diagnose score issues
-- ============================================================================

-- ===========================================================================
-- 1. CHECK IF score_sheets TABLE EXISTS AND HAS DATA
-- ===========================================================================

SELECT 'STEP 1: Check score_sheets table' as step;

-- Count total scores in database
SELECT COUNT(*) as total_scores_in_database FROM score_sheets;

-- Show first 10 scores
SELECT 
  id,
  school_id,
  student_id,
  subject_id,
  term_id,
  test1, test2, test3, test4, exam,
  total,
  created_at
FROM score_sheets 
LIMIT 10;

-- ===========================================================================
-- 2. CHECK IF academic_terms TABLE EXISTS AND HAS DATA
-- ===========================================================================

SELECT 'STEP 2: Check academic_terms table' as step;

-- Count terms
SELECT COUNT(*) as total_terms FROM academic_terms;

-- Show all terms
SELECT 
  id,
  school_id,
  session_id,
  term_name,
  term_order,
  is_active,
  created_at
FROM academic_terms
LIMIT 20;

-- ===========================================================================
-- 3. VERIFY FK CONSTRAINT IS CORRECT
-- ===========================================================================

SELECT 'STEP 3: Check FK constraints' as step;

-- Check what FK constraints exist on score_sheets.term_id
SELECT 
  constraint_name,
  table_name,
  column_name,
  referenced_table_name
FROM information_schema.key_column_usage
WHERE table_name = 'score_sheets'
  AND column_name = 'term_id';

-- ===========================================================================
-- 4. TEST THE RESULTS QUERY - Simulate what the results page does
-- ===========================================================================

SELECT 'STEP 4: Test results query' as step;

-- Get a sample student to test with
WITH sample_student AS (
  SELECT DISTINCT school_id, student_id, term_id
  FROM score_sheets
  LIMIT 1
)
SELECT 
  'Testing with values:',
  school_id,
  student_id,
  term_id
FROM sample_student;

-- Run the EXACT query that the results page uses
-- (Replace the UUIDs below with values from the sample above)
WITH query_test AS (
  SELECT 
    ss.student_id,
    ss.subject_id,
    ss.test1, ss.test2, ss.test3, ss.test4, ss.exam,
    ss.total,
    ss.grade,
    ss.test1_source,
    ss.test2_source,
    ss.test3_source,
    ss.test4_source,
    ss.exam_source
  FROM score_sheets ss
  WHERE ss.school_id = (SELECT school_id FROM score_sheets LIMIT 1)
    AND ss.student_id = (SELECT student_id FROM score_sheets LIMIT 1)
    AND ss.term_id = (SELECT term_id FROM score_sheets LIMIT 1)
)
SELECT COUNT(*) as scores_found FROM query_test;

-- ===========================================================================
-- 5. CHECK IF THERE'S A TERM_ID MISMATCH
-- ===========================================================================

SELECT 'STEP 5: Check for term_id mismatch' as step;

-- Show scores grouped by term_id
SELECT 
  term_id,
  COUNT(*) as score_count,
  COUNT(DISTINCT student_id) as unique_students,
  COUNT(DISTINCT subject_id) as unique_subjects
FROM score_sheets
GROUP BY term_id
LIMIT 20;

-- Show if any score_sheets has term_id that doesn't exist in academic_terms
SELECT 
  COUNT(*) as orphaned_scores
FROM score_sheets ss
LEFT JOIN academic_terms at ON ss.term_id = at.id
WHERE at.id IS NULL;

-- ===========================================================================
-- 6. VERIFY student_subjects ENROLLMENT
-- ===========================================================================

SELECT 'STEP 6: Check student enrollment' as step;

-- For a student with scores, check if they're enrolled in those subjects
WITH student_with_scores AS (
  SELECT DISTINCT school_id, student_id
  FROM score_sheets
  LIMIT 1
)
SELECT 
  sws.student_id,
  COUNT(DISTINCT ss.subject_id) as subjects_with_scores,
  COUNT(DISTINCT sus.subject_id) as enrolled_subjects
FROM student_with_scores sws
LEFT JOIN score_sheets ss ON sws.school_id = ss.school_id AND sws.student_id = ss.student_id
LEFT JOIN student_subjects sus ON sws.school_id = sus.school_id AND sws.student_id = sus.student_id
GROUP BY sws.student_id;

-- ===========================================================================
-- 7. MANUAL TEST - Check specific values
-- ===========================================================================

SELECT 'STEP 7: Manual verification' as step;

-- Show one complete record with all details
SELECT * FROM score_sheets LIMIT 1;

-- Show the corresponding academic_term
SELECT 
  at.*
FROM score_sheets ss
LEFT JOIN academic_terms at ON ss.term_id = at.id
LIMIT 1;

-- ===========================================================================
-- 8. IF SCORES ARE SHOWING - Verify aggregation
-- ===========================================================================

SELECT 'STEP 8: Verify score aggregation logic' as step;

-- Check if total is calculated correctly
SELECT 
  id,
  test1, test2, test3, test4, exam,
  (COALESCE(test1,0) + COALESCE(test2,0) + COALESCE(test3,0) + COALESCE(test4,0) + COALESCE(exam,0)) as calculated_total,
  total as stored_total,
  CASE WHEN (COALESCE(test1,0) + COALESCE(test2,0) + COALESCE(test3,0) + COALESCE(test4,0) + COALESCE(exam,0)) = total THEN 'OK' ELSE 'MISMATCH' END as total_status
FROM score_sheets
LIMIT 10;

-- ===========================================================================
-- SUMMARY - Run this to get a quick overview
-- ===========================================================================

SELECT 'SUMMARY' as report;
SELECT COUNT(*) as total_scores FROM score_sheets;
SELECT COUNT(*) as total_terms FROM academic_terms;
SELECT COUNT(*) as orphaned_scores FROM score_sheets ss LEFT JOIN academic_terms at ON ss.term_id = at.id WHERE at.id IS NULL;
