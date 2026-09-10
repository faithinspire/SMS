-- ============================================================================
-- FINAL STORAGE OPTIMIZATION - PHASE 2
-- ============================================================================
-- Run this AFTER migration 040 completes successfully
-- This removes temporary/test data that won't be needed
-- CORRECTED FOR ACTUAL SCHEMA: attendance uses recorded_at, not created_at
-- ============================================================================

-- Remove old result entries (keep only 1 year, or incomplete entries)
-- result_entries has created_at and updated_at columns
DELETE FROM result_entries
WHERE (exam_score IS NULL AND cbt_exam_score IS NULL AND test_total = 0)
  AND created_at < NOW() - INTERVAL '30 days';

-- Remove very old result entries (older than 2 years)
DELETE FROM result_entries
WHERE created_at < NOW() - INTERVAL '730 days';

-- Remove orphaned lesson notes that don't link to valid teachers
DELETE FROM lesson_notes
WHERE created_by NOT IN (SELECT id FROM users);

-- Remove very old lesson notes (older than 1 year), but keep approved ones
DELETE FROM lesson_notes
WHERE created_at < NOW() - INTERVAL '365 days'
  AND status != 'APPROVED';

-- ============================================================================
-- FINAL OPTIMIZATION: ANALYZE AND VACUUM
-- ============================================================================

VACUUM FULL ANALYZE;

-- ============================================================================
-- GET FINAL STATS
-- ============================================================================

SELECT 
  'Storage Optimization Complete' as status,
  NOW() as completed_at,
  (SELECT COUNT(*) FROM attendance) as total_attendance_records,
  (SELECT COUNT(*) FROM result_entries) as total_result_entries,
  (SELECT COUNT(*) FROM student_subject_enrollment) as total_enrollments,
  (SELECT COUNT(*) FROM teacher_assignments) as total_assignments,
  (SELECT COUNT(*) FROM lesson_notes) as total_lesson_notes;
