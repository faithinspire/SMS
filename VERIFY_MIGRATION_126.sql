-- ============================================================================
-- VERIFY MIGRATION 126 - CBT Results Pipeline Fix
-- ============================================================================
-- Run these queries in Supabase SQL Editor to verify the migration executed
-- successfully and the trigger is working.
-- ============================================================================

-- ============================================================================
-- VERIFICATION 1: Check if Trigger Exists
-- ============================================================================
-- This query verifies the corrected trigger is in place on cbt_submissions table
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE '%cbt_auto_populate%'
ORDER BY trigger_name;

-- EXPECTED RESULT:
-- trigger_name                             | event_object_table | action_timing
-- trigger_cbt_auto_populate_score_sheets_v2 | cbt_submissions   | AFTER
-- (If you see trigger on cbt_results, the old broken trigger still exists)

---

-- ============================================================================
-- VERIFICATION 2: Check Old Broken Trigger is Deleted
-- ============================================================================
SELECT 
  trigger_name,
  event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'cbt_results' 
  AND trigger_name LIKE '%auto_populate%';

-- EXPECTED RESULT: (empty - no rows)
-- If you see results here, the old trigger wasn't deleted properly

---

-- ============================================================================
-- VERIFICATION 3: Count Backfilled Score Sheets from CBT
-- ============================================================================
-- Shows how many score_sheets entries were created from CBT submissions
SELECT 
  COUNT(*) as total_backfilled,
  COUNT(CASE WHEN exam_source = 'CBT' THEN 1 END) as exam_scores,
  COUNT(CASE WHEN test1_source = 'CBT' THEN 1 END) as ca1_scores,
  COUNT(CASE WHEN test2_source = 'CBT' THEN 1 END) as ca2_scores,
  COUNT(CASE WHEN test3_source = 'CBT' THEN 1 END) as ca3_scores,
  COUNT(CASE WHEN test4_source = 'CBT' THEN 1 END) as ca4_scores
FROM score_sheets
WHERE exam_source = 'CBT' 
   OR test1_source = 'CBT' 
   OR test2_source = 'CBT' 
   OR test3_source = 'CBT' 
   OR test4_source = 'CBT';

-- EXPECTED RESULT:
-- total_backfilled | exam_scores | ca1_scores | ca2_scores | ca3_scores | ca4_scores
--       12         |      5      |      3     |      2     |      1     |      1
-- (Numbers depend on how many graded submissions exist)
-- If all are 0, backfill didn't complete or no graded submissions exist

---

-- ============================================================================
-- VERIFICATION 4: Sample CBT Score Entries
-- ============================================================================
-- Shows 5 sample score_sheets entries created from CBT
SELECT 
  ss.id,
  ss.student_id,
  st.admission_number,
  ss.subject_id,
  s.name as subject_name,
  ss.test1, ss.test1_source, ss.test1_cbt_source,
  ss.test2, ss.test2_source,
  ss.exam, ss.exam_source, ss.exam_cbt_source,
  ss.created_at
FROM score_sheets ss
LEFT JOIN students st ON st.id = ss.student_id
LEFT JOIN subjects s ON s.id = ss.subject_id
WHERE ss.exam_source = 'CBT' OR ss.test1_source = 'CBT' OR ss.test2_source = 'CBT' OR ss.test3_source = 'CBT' OR ss.test4_source = 'CBT'
ORDER BY ss.created_at DESC
LIMIT 5;

-- EXPECTED RESULT:
-- Shows actual CBT scores synced to score_sheets with source tracking
-- Each row should have:
--   - test1/test2/test3/test4/exam: numeric score (0-10 for CA, 0-60 for exam)
--   - test1_source/exam_source: 'CBT'
--   - test1_cbt_source/exam_cbt_source: UUID of the cbt_submission

---

-- ============================================================================
-- VERIFICATION 5: Check Total Graded Submissions vs Synced to Score Sheets
-- ============================================================================
SELECT 
  (SELECT COUNT(*) FROM cbt_submissions WHERE status = 'GRADED' AND score IS NOT NULL) as total_graded_submissions,
  (SELECT COUNT(*) FROM cbt_submissions cs 
   WHERE status = 'GRADED' 
     AND score IS NOT NULL
     AND EXISTS (SELECT 1 FROM cbt_exams WHERE id = cs.cbt_exam_id AND subject_id IS NOT NULL)
     AND EXISTS (SELECT 1 FROM academic_terms WHERE id = cs.term_id)
  ) as eligible_submissions,
  (SELECT COUNT(*) FROM score_sheets WHERE exam_source = 'CBT' OR test1_source = 'CBT' OR test2_source = 'CBT' OR test3_source = 'CBT' OR test4_source = 'CBT') as backfilled_count;

-- EXPECTED RESULT:
-- The "backfilled_count" should be close to "eligible_submissions"
-- If much lower, some submissions may be missing data (subject_id, term_id, etc.)

---

-- ============================================================================
-- VERIFICATION 6: Check for Data Integrity Issues
-- ============================================================================
-- Shows graded submissions that were NOT synced (due to missing data)
SELECT 
  cs.id,
  cs.student_id,
  cs.score,
  ce.id as exam_id,
  ce.subject_id,
  at.id as term_id,
  CASE WHEN ce.subject_id IS NULL THEN 'Missing exam.subject_id' 
       WHEN at.id IS NULL THEN 'Missing academic_term'
       WHEN st.class_arm_combo_id IS NULL THEN 'Missing student.class_arm_combo_id'
       ELSE 'Unknown'
  END as reason
FROM cbt_submissions cs
LEFT JOIN cbt_exams ce ON ce.id = cs.cbt_exam_id
LEFT JOIN students st ON st.id = cs.student_id
LEFT JOIN academic_terms at ON at.id = cs.term_id
WHERE cs.status = 'GRADED' 
  AND cs.score IS NOT NULL
  AND (ce.subject_id IS NULL OR at.id IS NULL OR st.class_arm_combo_id IS NULL)
LIMIT 10;

-- EXPECTED RESULT: (empty - no rows)
-- If you see results, these submissions couldn't be synced due to missing data
-- These need to be fixed manually or migration needs to populate missing data

---

-- ============================================================================
-- VERIFICATION 7: Academic Session Linkage
-- ============================================================================
-- Verifies academic_session_id is properly populated in score_sheets from CBT
SELECT 
  COUNT(*) as total_cbt_scores,
  COUNT(CASE WHEN academic_session_id IS NOT NULL THEN 1 END) as with_session_id,
  COUNT(CASE WHEN session_year IS NOT NULL THEN 1 END) as with_session_year,
  COUNT(CASE WHEN academic_session_id IS NULL THEN 1 END) as missing_session_id
FROM score_sheets
WHERE exam_source = 'CBT' OR test1_source = 'CBT' OR test2_source = 'CBT' OR test3_source = 'CBT' OR test4_source = 'CBT';

-- EXPECTED RESULT:
-- total_cbt_scores | with_session_id | with_session_year | missing_session_id
--       12         |       12        |        12         |         0
-- All CBT scores should have session_id linked for proper results display

---

-- ============================================================================
-- FINAL SUMMARY
-- ============================================================================
-- Run this to get a complete overview of migration success
WITH verification AS (
  SELECT 
    (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_name = 'trigger_cbt_auto_populate_score_sheets_v2') > 0 as trigger_exists,
    (SELECT COUNT(*) FROM information_schema.triggers WHERE event_object_table = 'cbt_results' AND trigger_name LIKE '%auto_populate%') = 0 as old_trigger_deleted,
    (SELECT COUNT(*) FROM score_sheets WHERE exam_source = 'CBT' OR test1_source = 'CBT' OR test2_source = 'CBT' OR test3_source = 'CBT' OR test4_source = 'CBT') as backfilled_count,
    (SELECT COUNT(*) FROM cbt_submissions WHERE status = 'GRADED' AND score IS NOT NULL) as total_graded_submissions
)
SELECT 
  CASE WHEN trigger_exists THEN '✅' ELSE '❌' END || ' Trigger Created' as check_1,
  CASE WHEN old_trigger_deleted THEN '✅' ELSE '❌' END || ' Old Trigger Deleted' as check_2,
  backfilled_count::text || ' CBT scores synced to score_sheets' as check_3,
  total_graded_submissions::text || ' total graded submissions' as check_4,
  CASE 
    WHEN trigger_exists AND old_trigger_deleted AND backfilled_count > 0 THEN '✅ MIGRATION SUCCESSFUL'
    WHEN trigger_exists AND old_trigger_deleted AND backfilled_count = 0 THEN '⚠️  MIGRATION OK BUT NO SUBMISSIONS TO BACKFILL'
    ELSE '❌ MIGRATION FAILED - CHECK ABOVE'
  END as overall_status
FROM verification;

-- EXPECTED RESULT:
-- check_1                     | ✅ Trigger Created
-- check_2                     | ✅ Old Trigger Deleted
-- check_3                     | 12 CBT scores synced to score_sheets
-- check_4                     | 15 total graded submissions
-- overall_status              | ✅ MIGRATION SUCCESSFUL
