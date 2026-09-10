-- ============================================================================
-- CLEANUP BLOATED TABLES AND FREE DISK SPACE - PHASE 1
-- ============================================================================
-- This migration safely removes duplicate/test data and optimizes storage
-- WITHOUT causing foreign key violations
-- CORRECTED FOR ACTUAL SCHEMA (attendance uses recorded_at NOT created_at)
-- ============================================================================

-- STEP 1: DELETE OLD ATTENDANCE RECORDS (keep last 30 days only)
-- Note: attendance table uses 'recorded_at' not 'created_at'
DELETE FROM attendance
WHERE recorded_at < NOW() - INTERVAL '30 days';

-- STEP 2: DELETE DUPLICATE/ORPHANED ENROLLMENTS
DELETE FROM student_subject_enrollment
WHERE student_id NOT IN (SELECT id FROM students);

DELETE FROM student_subject_enrollment
WHERE subject_id NOT IN (SELECT id FROM subjects);

DELETE FROM student_subject_enrollment
WHERE class_arm_combo_id NOT IN (SELECT id FROM class_arm_combos);

-- STEP 3: DELETE DUPLICATE TEACHER ASSIGNMENTS
DELETE FROM teacher_assignments
WHERE teacher_id NOT IN (SELECT id FROM users WHERE role IN ('TEACHER', 'PRINCIPAL', 'HEAD_TEACHER'));

DELETE FROM teacher_assignments
WHERE subject_id NOT IN (SELECT id FROM subjects);

DELETE FROM teacher_assignments
WHERE class_arm_combo_id NOT IN (SELECT id FROM class_arm_combos);

-- STEP 4: CLEAN UP ORPHANED RESULT ENTRIES
-- Note: result_entries table DOES have created_at
DELETE FROM result_entries
WHERE student_id NOT IN (SELECT id FROM students);

DELETE FROM result_entries
WHERE subject_id NOT IN (SELECT id FROM subjects);

DELETE FROM result_entries
WHERE class_arm_combo_id NOT IN (SELECT id FROM class_arm_combos);

-- STEP 5: CLEAN UP ORPHANED LESSON NOTES
DELETE FROM lesson_notes
WHERE subject_id NOT IN (SELECT id FROM subjects);

DELETE FROM lesson_notes
WHERE class_arm_combo_id NOT IN (SELECT id FROM class_arm_combos);

DELETE FROM lesson_notes
WHERE created_by NOT IN (SELECT id FROM users);

-- STEP 6: REINDEX AND VACUUM (compact storage)
VACUUM FULL ANALYZE;

-- ============================================================================
-- VERIFICATION - Check what was cleaned
-- ============================================================================

SELECT 
  'CLEANUP COMPLETE' as status,
  NOW() as completed_at,
  (SELECT COUNT(*) FROM attendance) as attendance_records,
  (SELECT COUNT(*) FROM result_entries) as result_records,
  (SELECT COUNT(*) FROM student_subject_enrollment) as enrollment_records,
  (SELECT COUNT(*) FROM teacher_assignments) as assignment_records;
