-- PHASE 6: Verify Complete CBT Pipeline
-- This script verifies all connections from question creation → options → grading → score sheet

-- ============================================================================
-- SETUP: Create test data representing a complete flow
-- ============================================================================

SELECT 'PHASE 6: COMPLETE CBT PIPELINE VERIFICATION' as phase;
SELECT 'This verifies: Question → Options → Correct Answer → Grading → Score Sheet' as description;

-- ============================================================================
-- STEP 1: Verify Tables and Schema
-- ============================================================================

SELECT 'STEP 1: Table Schema Verification' as step;

SELECT 
  'cbt_exams columns' as check_type,
  COUNT(*) as critical_columns
FROM information_schema.columns
WHERE table_name = 'cbt_exams'
  AND column_name IN ('id', 'school_id', 'subject_id', 'term_id', 'assessment_type', 'total_marks', 'academic_session_id');

UNION ALL

SELECT 
  'cbt_questions columns' as check_type,
  COUNT(*) as critical_columns
FROM information_schema.columns
WHERE table_name = 'cbt_questions'
  AND column_name IN ('id', 'school_id', 'cbt_exam_id', 'marks', 'correct_option', 'question_text');

UNION ALL

SELECT 
  'cbt_options columns' as check_type,
  COUNT(*) as critical_columns
FROM information_schema.columns
WHERE table_name = 'cbt_options'
  AND column_name IN ('id', 'question_id', 'option_text', 'is_correct', 'option_key');

UNION ALL

SELECT 
  'cbt_answers columns' as check_type,
  COUNT(*) as critical_columns
FROM information_schema.columns
WHERE table_name = 'cbt_answers'
  AND column_name IN ('id', 'submission_id', 'question_id', 'selected_option_id', 'is_correct', 'marks_awarded');

UNION ALL

SELECT 
  'score_sheets integration' as check_type,
  COUNT(*) as critical_columns
FROM information_schema.columns
WHERE table_name = 'score_sheets'
  AND column_name IN ('test1', 'test1_source', 'test1_cbt_source', 'exam', 'exam_source', 'exam_cbt_source', 'academic_session_id');

-- ============================================================================
-- STEP 2: Verify Data Relationships
-- ============================================================================

SELECT 'STEP 2: Data Relationship Verification' as step;

-- Check if any CBT exams exist
SELECT 
  'CBT exams in system' as check_type,
  COUNT(*) as count
FROM cbt_exams;

UNION ALL

-- Check exam → terms relationship
SELECT 
  'CBT exams with term_id' as check_type,
  COUNT(*) as count
FROM cbt_exams
WHERE term_id IS NOT NULL;

UNION ALL

-- Check exam → academic_session relationship
SELECT 
  'CBT exams with academic_session_id' as check_type,
  COUNT(*) as count
FROM cbt_exams
WHERE academic_session_id IS NOT NULL;

UNION ALL

-- Check questions for exams
SELECT 
  'CBT questions' as check_type,
  COUNT(*) as count
FROM cbt_questions;

UNION ALL

-- Check options for questions
SELECT 
  'CBT options' as check_type,
  COUNT(*) as count
FROM cbt_options;

UNION ALL

-- Check option correctness
SELECT 
  'CBT options marked as correct' as check_type,
  COUNT(*) as count
FROM cbt_options
WHERE is_correct = TRUE;

UNION ALL

-- Check submissions
SELECT 
  'CBT submissions' as check_type,
  COUNT(*) as count
FROM cbt_submissions;

UNION ALL

-- Check graded submissions
SELECT 
  'CBT submissions with score' as check_type,
  COUNT(*) as count
FROM cbt_submissions
WHERE score IS NOT NULL;

UNION ALL

-- Check answers
SELECT 
  'CBT answers' as check_type,
  COUNT(*) as count
FROM cbt_answers;

UNION ALL

-- Check auto-graded answers
SELECT 
  'CBT answers marked as correct' as check_type,
  COUNT(*) as count
FROM cbt_answers
WHERE is_correct = TRUE;

UNION ALL

-- Check score_sheets integration
SELECT 
  'Score sheet entries with CBT scores' as check_type,
  COUNT(*) as count
FROM score_sheets
WHERE test1_source = 'CBT' OR test2_source = 'CBT' OR test3_source = 'CBT' OR test4_source = 'CBT' OR exam_source = 'CBT';

-- ============================================================================
-- STEP 3: Pipeline Integrity Check
-- ============================================================================

SELECT 'STEP 3: Pipeline Integrity' as step;

-- For each submission with answers, verify the complete chain
WITH submission_chain AS (
  SELECT 
    sub.id as submission_id,
    sub.cbt_exam_id,
    sub.student_id,
    sub.score,
    sub.status,
    COUNT(DISTINCT ans.id) as answer_count,
    COUNT(DISTINCT CASE WHEN ans.is_correct THEN 1 END) as correct_count,
    SUM(CASE WHEN ans.is_correct THEN ans.marks_awarded ELSE 0 END) as calculated_score
  FROM cbt_submissions sub
  LEFT JOIN cbt_answers ans ON sub.id = ans.submission_id
  WHERE sub.status = 'GRADED'
  GROUP BY sub.id, sub.cbt_exam_id, sub.student_id, sub.score, sub.status
)
SELECT 
  'Submissions where calculated score matches submission score' as integrity_check,
  COUNT(*) as matching_count
FROM submission_chain
WHERE calculated_score = score OR (calculated_score IS NULL AND score IS NULL);

-- ============================================================================
-- STEP 4: Question → Options Chain
-- ============================================================================

SELECT 'STEP 4: Question to Options Integrity' as step;

-- Verify each question has exactly 4 options (for MCQ)
WITH question_options AS (
  SELECT 
    q.id as question_id,
    q.question_text,
    COUNT(o.id) as option_count,
    COUNT(CASE WHEN o.is_correct THEN 1 END) as correct_count,
    STRING_AGG(o.option_key || ':' || CASE WHEN o.is_correct THEN 'CORRECT' ELSE 'WRONG' END, ', ') as option_summary
  FROM cbt_questions q
  LEFT JOIN cbt_options o ON q.id = o.question_id
  WHERE q.question_type = 'MULTIPLE_CHOICE'
  GROUP BY q.id, q.question_text
)
SELECT 
  'Questions with all 4 options' as check,
  COUNT(*) as count
FROM question_options
WHERE option_count = 4

UNION ALL

SELECT 
  'Questions with exactly 1 correct option' as check,
  COUNT(*) as count
FROM question_options
WHERE correct_count = 1;

-- ============================================================================
-- STEP 5: Answer → Grading Chain
-- ============================================================================

SELECT 'STEP 5: Answer Verification Integrity' as step;

-- For answers to MCQ, verify selected_option_id matches an option
WITH answer_verification AS (
  SELECT 
    ans.id as answer_id,
    ans.selected_option_id,
    ans.is_correct,
    opt.is_correct as option_is_correct,
    ans.marks_awarded
  FROM cbt_answers ans
  LEFT JOIN cbt_options opt ON ans.selected_option_id = opt.id
  WHERE ans.selected_option_id IS NOT NULL
)
SELECT 
  'Answers where is_correct matches option.is_correct' as check,
  COUNT(*) as count
FROM answer_verification
WHERE is_correct = option_is_correct

UNION ALL

SELECT 
  'Answers where marks_awarded matches when correct' as check,
  COUNT(*) as count
FROM answer_verification
WHERE (is_correct = TRUE AND marks_awarded > 0) OR (is_correct = FALSE AND marks_awarded = 0);

-- ============================================================================
-- STEP 6: Score Sheet Integration
-- ============================================================================

SELECT 'STEP 6: Score Sheet Integration' as step;

-- For submissions linked to score sheets, verify score mapping
WITH submission_score_mapping AS (
  SELECT 
    sub.id as submission_id,
    sub.score as submission_score,
    sub.cbt_exam_id,
    exam.assessment_type,
    exam.total_marks,
    ss.test1,
    ss.test2,
    ss.test3,
    ss.test4,
    ss.exam,
    ss.test1_source,
    ss.exam_source
  FROM cbt_submissions sub
  JOIN cbt_exams exam ON sub.cbt_exam_id = exam.id
  LEFT JOIN score_sheets ss ON ss.school_id = sub.school_id
    AND ss.student_id = sub.student_id
    AND ss.subject_id = exam.subject_id
    AND ss.term_id = exam.term_id
  WHERE sub.status = 'GRADED'
)
SELECT 
  'Submissions linked to score_sheets' as check,
  COUNT(*) as count
FROM submission_score_mapping
WHERE test1 IS NOT NULL OR test2 IS NOT NULL OR test3 IS NOT NULL OR test4 IS NOT NULL OR exam IS NOT NULL

UNION ALL

SELECT 
  'Score sheet entries with CBT source marked' as check,
  COUNT(*) as count
FROM submission_score_mapping
WHERE test1_source = 'CBT' OR exam_source = 'CBT';

-- ============================================================================
-- STEP 7: Example Complete Flow
-- ============================================================================

SELECT 'STEP 7: Example Complete Flow' as step;

-- Show one example of complete pipeline (if data exists)
WITH example_submission AS (
  SELECT 
    sub.id as submission_id,
    sub.student_id,
    exam.id as exam_id,
    exam.title,
    exam.assessment_type,
    exam.total_marks,
    sub.score,
    sub.percentage,
    sub.status
  FROM cbt_submissions sub
  JOIN cbt_exams exam ON sub.cbt_exam_id = exam.id
  WHERE sub.status = 'GRADED'
  LIMIT 1
)
SELECT 
  es.submission_id,
  es.exam_id,
  es.title as exam_title,
  es.assessment_type,
  es.total_marks,
  es.score,
  es.percentage,
  (SELECT COUNT(*) FROM cbt_answers WHERE submission_id = es.submission_id) as answer_count,
  (SELECT COUNT(*) FROM cbt_answers WHERE submission_id = es.submission_id AND is_correct = TRUE) as correct_count
FROM example_submission es;

-- ============================================================================
-- STEP 8: Missing Links Check
-- ============================================================================

SELECT 'STEP 8: Missing Links (Potential Issues)' as step;

-- Questions without correct_option set
SELECT 
  'Questions missing correct_option' as issue,
  COUNT(*) as count
FROM cbt_questions
WHERE correct_option IS NULL

UNION ALL

-- Options without option_key
SELECT 
  'Options without option_key' as issue,
  COUNT(*) as count
FROM cbt_options
WHERE option_key IS NULL

UNION ALL

-- Answers without grading info
SELECT 
  'Answers not yet graded' as issue,
  COUNT(*) as count
FROM cbt_answers
WHERE is_correct IS NULL

UNION ALL

-- Submissions not linked to academic_session
SELECT 
  'Submissions without academic_session_id' as issue,
  COUNT(*) as count
FROM cbt_submissions
WHERE academic_session_id IS NULL AND status = 'GRADED'

UNION ALL

-- Exams without assessment_type
SELECT 
  'Exams without assessment_type' as issue,
  COUNT(*) as count
FROM cbt_exams
WHERE assessment_type IS NULL;

-- ============================================================================
-- FINAL REPORT
-- ============================================================================

SELECT '✅ PHASE 6: Pipeline Verification Complete' as final_status;
