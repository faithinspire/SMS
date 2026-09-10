-- ============================================================================
-- SAFE DATABASE CLEANUP - CORRECT SCHEMA VERSION
-- ============================================================================
-- Uses ACTUAL column names from the database schema
-- attendance: uses recorded_at (NOT created_at)
-- result_entries: uses created_at and updated_at
-- NOTE: VACUUM cannot run in a transaction, so we do it separately
-- ============================================================================

-- ============================================================================
-- PHASE 1: DELETE DUPLICATE/ORPHANED RECORDS (in transaction)
-- ============================================================================

-- Delete attendance records older than 45 days (keep recent data)
DELETE FROM attendance
WHERE recorded_at < NOW() - INTERVAL '45 days';

-- Delete student enrollments where student no longer exists
DELETE FROM student_subject_enrollment
WHERE student_id NOT IN (SELECT id FROM students);

-- Delete enrollments where subject doesn't exist
DELETE FROM student_subject_enrollment
WHERE subject_id NOT IN (SELECT id FROM subjects);

-- Delete enrollments where class/arm doesn't exist
DELETE FROM student_subject_enrollment
WHERE class_arm_combo_id NOT IN (SELECT id FROM class_arm_combos);

-- Delete teacher assignments where teacher doesn't exist
DELETE FROM teacher_assignments
WHERE teacher_id NOT IN (SELECT id FROM users WHERE role IN ('TEACHER', 'PRINCIPAL', 'HEAD_TEACHER'));

-- Delete assignments where subject doesn't exist
DELETE FROM teacher_assignments
WHERE subject_id NOT IN (SELECT id FROM subjects);

-- Delete assignments where class/arm doesn't exist
DELETE FROM teacher_assignments
WHERE class_arm_combo_id NOT IN (SELECT id FROM class_arm_combos);

-- Delete result entries where student doesn't exist
DELETE FROM result_entries
WHERE student_id NOT IN (SELECT id FROM students);

-- Delete result entries where subject doesn't exist
DELETE FROM result_entries
WHERE subject_id NOT IN (SELECT id FROM subjects);

-- Delete result entries where class doesn't exist
DELETE FROM result_entries
WHERE class_arm_combo_id NOT IN (SELECT id FROM class_arm_combos);

-- ============================================================================
-- PHASE 2: REMOVE INCOMPLETE TEST DATA
-- ============================================================================

-- Delete very old incomplete result entries (older than 90 days with no scores)
DELETE FROM result_entries
WHERE created_at < NOW() - INTERVAL '90 days'
  AND test1_score IS NULL 
  AND test2_score IS NULL 
  AND test3_score IS NULL 
  AND test4_score IS NULL 
  AND exam_score IS NULL;

-- Delete orphaned lesson notes
DELETE FROM lesson_notes
WHERE created_by NOT IN (SELECT id FROM users);

DELETE FROM lesson_notes
WHERE subject_id NOT IN (SELECT id FROM subjects);

DELETE FROM lesson_notes
WHERE class_arm_combo_id NOT IN (SELECT id FROM class_arm_combos);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

SELECT 
  'CLEANUP COMPLETE - Run VACUUM separately' as status,
  NOW() as completed_at;

SELECT 
  (SELECT COUNT(*) FROM attendance) as attendance_records,
  (SELECT COUNT(*) FROM result_entries) as result_records,
  (SELECT COUNT(*) FROM student_subject_enrollment) as enrollment_records,
  (SELECT COUNT(*) FROM teacher_assignments) as assignment_records,
  (SELECT COUNT(*) FROM lesson_notes) as lesson_records;

-- ============================================================================
-- NOTE FOR SUPABASE: Run this separately after the transaction completes:
-- VACUUM FULL ANALYZE;
-- ============================================================================
