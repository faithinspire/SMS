-- DIAGNOSTIC: Why Lucky Idudu has no students

-- ============================================================================
-- STEP 1: Confirm Lucky Idudu exists
-- ============================================================================

SELECT 'STEP 1: Lucky Idudu Profile' as step;
SELECT u.id, u.full_name, u.role, u.school_id, s.name as school_name
FROM users u
LEFT JOIN schools s ON u.school_id = s.id
WHERE (u.full_name ILIKE '%Lucky%' OR u.full_name ILIKE '%idudu%');

-- ============================================================================
-- STEP 2: Check if Lucky manages any classes (class_arm_combos)
-- ============================================================================

SELECT 'STEP 2: Classes managed by Lucky' as step;
SELECT cac.id, c.name as class_name, arm.name as arm_name, cac.class_teacher_id
FROM class_arm_combos cac
LEFT JOIN classes c ON cac.class_id = c.id
LEFT JOIN arms arm ON cac.arm_id = arm.id
WHERE cac.class_teacher_id IN (
  SELECT u.id FROM users u 
  WHERE (u.full_name ILIKE '%Lucky%' OR u.full_name ILIKE '%idudu%') AND u.role = 'TEACHER'
);

-- ============================================================================
-- STEP 3: Check all class_arm_combos and their teachers
-- ============================================================================

SELECT 'STEP 3: All class_arm_combos with teachers' as step;
SELECT 
  cac.id,
  c.name as class_name,
  arm.name as arm_name,
  u.full_name as class_teacher,
  COUNT(st.id) as student_count
FROM class_arm_combos cac
LEFT JOIN classes c ON cac.class_id = c.id
LEFT JOIN arms arm ON cac.arm_id = arm.id
LEFT JOIN users u ON cac.class_teacher_id = u.id
LEFT JOIN students st ON st.class_arm_combo_id = cac.id
GROUP BY cac.id, c.name, arm.name, u.full_name, cac.class_teacher_id
ORDER BY c.name, arm.name;

-- ============================================================================
-- STEP 4: Check if Lucky has subject assignments
-- ============================================================================

SELECT 'STEP 4: Lucky subject assignments' as step;
SELECT 
  sta.id,
  subj.name as subject_name,
  c.name || ' ' || arm.name as class_offering,
  u.full_name as teacher_name
FROM subject_teacher_assignments sta
LEFT JOIN subjects subj ON sta.subject_id = subj.id
LEFT JOIN class_arm_combos cac ON sta.class_arm_combo_id = cac.id
LEFT JOIN classes c ON cac.class_id = c.id
LEFT JOIN arms arm ON cac.arm_id = arm.id
LEFT JOIN users u ON sta.teacher_id = u.id
WHERE sta.teacher_id IN (
  SELECT u.id FROM users u 
  WHERE (u.full_name ILIKE '%Lucky%' OR u.full_name ILIKE '%idudu%') AND u.role = 'TEACHER'
);

-- ============================================================================
-- STEP 5: Find students in Ruachmodel School
-- ============================================================================

SELECT 'STEP 5: All students in Ruachmodel School' as step;
SELECT 
  st.id as student_id,
  u.full_name as student_name,
  st.admission_number,
  c.name as class_name,
  arm.name as arm_name,
  COUNT(ss.id) as subjects_enrolled
FROM students st
LEFT JOIN users u ON st.user_id = u.id
LEFT JOIN class_arm_combos cac ON st.class_arm_combo_id = cac.id
LEFT JOIN classes c ON cac.class_id = c.id
LEFT JOIN arms arm ON cac.arm_id = arm.id
LEFT JOIN student_subjects ss ON ss.student_id = st.id
WHERE st.school_id IN (
  SELECT id FROM schools WHERE name ILIKE '%Ruachmodel%'
)
GROUP BY st.id, u.full_name, st.admission_number, c.name, arm.name
ORDER BY c.name, arm.name, u.full_name;

-- ============================================================================
-- STEP 6: Find which students are enrolled under Lucky (via class_teacher_id)
-- ============================================================================

SELECT 'STEP 6: Students linked to Lucky via class_teacher_id' as step;
SELECT 
  st.id as student_id,
  u.full_name as student_name,
  st.admission_number,
  c.name as class_name,
  arm.name as arm_name,
  teacher.full_name as class_teacher
FROM students st
LEFT JOIN users u ON st.user_id = u.id
LEFT JOIN class_arm_combos cac ON st.class_arm_combo_id = cac.id
LEFT JOIN classes c ON cac.class_id = c.id
LEFT JOIN arms arm ON cac.arm_id = arm.id
LEFT JOIN users teacher ON cac.class_teacher_id = teacher.id
WHERE cac.class_teacher_id IN (
  SELECT u.id FROM users u 
  WHERE (u.full_name ILIKE '%Lucky%' OR u.full_name ILIKE '%idudu%') AND u.role = 'TEACHER'
);

-- ============================================================================
-- STEP 7: Show all schools and their student counts
-- ============================================================================

SELECT 'STEP 7: Schools with student counts' as step;
SELECT 
  s.id,
  s.name as school_name,
  COUNT(DISTINCT st.id) as total_students,
  COUNT(DISTINCT u.id) as total_teachers
FROM schools s
LEFT JOIN students st ON st.school_id = s.id
LEFT JOIN users u ON u.school_id = s.id AND u.role = 'TEACHER'
GROUP BY s.id, s.name
ORDER BY s.name;

-- ============================================================================
-- STEP 8: Summary - What's the actual problem?
-- ============================================================================

SELECT 'STEP 8: SUMMARY' as step;
SELECT 
  'Lucky Idudu user exists?' as check_type,
  CASE WHEN COUNT(*) > 0 THEN 'YES' ELSE 'NO' END as result
FROM users u
WHERE (u.full_name ILIKE '%Lucky%' OR u.full_name ILIKE '%idudu%') AND u.role = 'TEACHER'
UNION ALL
SELECT 
  'Lucky manages any classes?' as check_type,
  CASE WHEN COUNT(*) > 0 THEN 'YES' ELSE 'NO' END as result
FROM class_arm_combos cac
WHERE cac.class_teacher_id IN (
  SELECT u.id FROM users u 
  WHERE (u.full_name ILIKE '%Lucky%' OR u.full_name ILIKE '%idudu%') AND u.role = 'TEACHER'
)
UNION ALL
SELECT 
  'Lucky teaches any subjects?' as check_type,
  CASE WHEN COUNT(*) > 0 THEN 'YES' ELSE 'NO' END as result
FROM subject_teacher_assignments sta
WHERE sta.teacher_id IN (
  SELECT u.id FROM users u 
  WHERE (u.full_name ILIKE '%Lucky%' OR u.full_name ILIKE '%idudu%') AND u.role = 'TEACHER'
)
UNION ALL
SELECT 
  'Ruachmodel School has students?' as check_type,
  CASE WHEN COUNT(*) > 0 THEN 'YES' ELSE 'NO' END as result
FROM students st
WHERE st.school_id IN (
  SELECT id FROM schools WHERE name ILIKE '%Ruachmodel%'
);
