-- Migration 039: Auto-populate Score Sheet Test Data
-- Automatically creates teacher assignments and student enrollments
-- so Score Sheet page shows data immediately after login

-- ============================================================================
-- 1. CREATE TEACHER ASSIGNMENTS (Teacher → Class → Subjects)
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
-- 2. CREATE STUDENT SUBJECT ENROLLMENTS (Student → Subject)
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
-- 3. CREATE TEST ATTENDANCE RECORDS
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
-- 4. VERIFY DATA WAS CREATED
-- ============================================================================
SELECT 
  (SELECT COUNT(*) FROM teacher_assignments) as teacher_assignments_created,
  (SELECT COUNT(*) FROM student_subject_enrollment) as student_enrollments_created,
  (SELECT COUNT(*) FROM attendance) as attendance_records_created;
