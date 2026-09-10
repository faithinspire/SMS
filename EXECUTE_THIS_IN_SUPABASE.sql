-- ============================================================================
-- SCORE SHEET TEST DATA - SIMPLE BYPASS (NO TYPE CASTING ERRORS)
-- ============================================================================
-- Copy-paste this into Supabase SQL Editor and click RUN
-- This creates teacher assignments, student enrollments, and attendance
-- ============================================================================

-- ============================================================================
-- STEP 1: Create Teacher Assignments
-- ============================================================================
INSERT INTO teacher_assignments (school_id, teacher_id, subject_id, class_arm_combo_id)
SELECT DISTINCT
  u.school_id,
  u.id,
  s.id,
  cac.id
FROM users u
CROSS JOIN subjects s
CROSS JOIN class_arm_combos cac
WHERE u.role = 'TEACHER'
  AND u.school_id IS NOT NULL
  AND s.id IS NOT NULL
  AND cac.id IS NOT NULL
ON CONFLICT (teacher_id, subject_id, class_arm_combo_id) DO NOTHING;

-- ============================================================================
-- STEP 2: Create Student Subject Enrollments
-- ============================================================================
INSERT INTO student_subject_enrollment (school_id, student_id, subject_id, class_arm_combo_id)
SELECT DISTINCT
  st.school_id,
  st.id,
  s.id,
  st.class_arm_combo_id
FROM students st
CROSS JOIN subjects s
WHERE st.school_id IS NOT NULL
  AND st.class_arm_combo_id IS NOT NULL
  AND s.id IS NOT NULL
ON CONFLICT (student_id, subject_id, class_arm_combo_id) DO NOTHING;

-- ============================================================================
-- STEP 3: Create Attendance Records (Simple Date Calculation)
-- ============================================================================
INSERT INTO attendance (school_id, student_id, class_arm_combo_id, date, status, recorded_by)
SELECT 
  st.school_id,
  st.id,
  st.class_arm_combo_id,
  (CURRENT_DATE::date - (n || ' days')::interval)::date,
  CASE 
    WHEN n % 10 = 0 THEN 'ABSENT'
    WHEN n % 15 = 0 THEN 'LATE'
    ELSE 'PRESENT'
  END,
  (SELECT id FROM users WHERE role = 'TEACHER' LIMIT 1)
FROM students st
CROSS JOIN generate_series(0, 60) AS n
WHERE st.school_id IS NOT NULL
  AND st.class_arm_combo_id IS NOT NULL
  AND (SELECT id FROM users WHERE role = 'TEACHER' LIMIT 1) IS NOT NULL
ON CONFLICT (school_id, student_id, date) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES (Run these to check if data was created)
-- ============================================================================

SELECT 'TEACHER ASSIGNMENTS' as check_item, COUNT(*) as total FROM teacher_assignments;

SELECT 'STUDENT ENROLLMENTS' as check_item, COUNT(*) as total FROM student_subject_enrollment;

SELECT 'ATTENDANCE RECORDS' as check_item, COUNT(*) as total FROM attendance;

-- Show sample data
SELECT 
  COUNT(DISTINCT ta.teacher_id) as teachers_assigned,
  COUNT(DISTINCT ta.class_arm_combo_id) as classes_assigned,
  COUNT(DISTINCT sse.student_id) as students_enrolled,
  COUNT(DISTINCT att.student_id) as students_with_attendance
FROM teacher_assignments ta
CROSS JOIN student_subject_enrollment sse
CROSS JOIN attendance att;
