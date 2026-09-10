-- DIAGNOSTIC SQL - Run in Supabase SQL Editor

-- ============================================================================
-- ISSUE 1: TERM DROPDOWN NOT SHOWING
-- ============================================================================

-- Check if terms exist for schools
SELECT 'TERMS IN DATABASE' as check_type, s.name as school_name, COUNT(t.id) as term_count
FROM schools s
LEFT JOIN terms t ON s.id = t.school_id
GROUP BY s.id, s.name
ORDER BY s.name;

-- Check specific school: Ruachmodel
SELECT t.id, t.name, t.session_year, s.name as school_name
FROM terms t
JOIN schools s ON t.school_id = s.id
WHERE s.name LIKE '%Ruachmodel%' OR s.name LIKE '%Frontier%'
ORDER BY t.session_year DESC, t.name;

-- ============================================================================
-- ISSUE 2: STUDENTS NOT SHOWING FOR LUCKY IDUDU AT RUACHMODEL
-- ============================================================================

-- Find Lucky Idudu user
SELECT u.id, u.full_name, u.role, s.name as school_name
FROM users u
JOIN schools s ON u.school_id = s.id
WHERE u.full_name LIKE '%Lucky Idudu%' OR u.full_name LIKE '%lucky%'
ORDER BY s.name;

-- Get teacher ID for Lucky Idudu
WITH teacher_info AS (
  SELECT u.id as teacher_id, u.full_name, s.name as school_name, s.id as school_id
  FROM users u
  JOIN schools s ON u.school_id = s.id
  WHERE (u.full_name LIKE '%Lucky Idudu%' OR u.full_name LIKE '%lucky%') AND u.role = 'TEACHER'
)
SELECT 
  'CLASSES ASSIGNED TO LUCKY' as check_type,
  t.teacher_id, t.full_name, t.school_name,
  COUNT(cac.id) as class_count
FROM teacher_info t
LEFT JOIN class_arm_combos cac ON cac.class_teacher_id = t.teacher_id AND cac.school_id = t.school_id
GROUP BY t.teacher_id, t.full_name, t.school_name;

-- Check students in classes taught by Lucky Idudu
WITH teacher_info AS (
  SELECT u.id as teacher_id, u.full_name, s.name as school_name, s.id as school_id
  FROM users u
  JOIN schools s ON u.school_id = s.id
  WHERE (u.full_name LIKE '%Lucky Idudu%' OR u.full_name LIKE '%lucky%') AND u.role = 'TEACHER'
)
SELECT 
  'STUDENTS IN LUCKY''S CLASSES' as check_type,
  t.full_name as teacher,
  c.name as class_name,
  arm.name as arm_name,
  COUNT(st.id) as student_count
FROM teacher_info t
JOIN class_arm_combos cac ON cac.class_teacher_id = t.teacher_id
JOIN classes c ON cac.class_id = c.id
JOIN arms arm ON cac.arm_id = arm.id
LEFT JOIN students st ON st.class_arm_combo_id = cac.id
GROUP BY t.teacher_id, t.full_name, cac.id, c.name, arm.name
ORDER BY c.name, arm.name;

-- ============================================================================
-- DETAILED CHECK: Show actual students for Lucky's classes
-- ============================================================================

WITH teacher_info AS (
  SELECT u.id as teacher_id, u.full_name, s.name as school_name, s.id as school_id
  FROM users u
  JOIN schools s ON u.school_id = s.id
  WHERE (u.full_name LIKE '%Lucky Idudu%' OR u.full_name LIKE '%lucky%') AND u.role = 'TEACHER'
)
SELECT 
  t.full_name as teacher_name,
  c.name || ' ' || arm.name as class_display,
  u.full_name as student_name,
  st.admission_number,
  st.id as student_id,
  u.id as user_id
FROM teacher_info t
JOIN class_arm_combos cac ON cac.class_teacher_id = t.teacher_id
JOIN classes c ON cac.class_id = c.id
JOIN arms arm ON cac.arm_id = arm.id
LEFT JOIN students st ON st.class_arm_combo_id = cac.id
LEFT JOIN users u ON st.user_id = u.id
ORDER BY c.name, arm.name, u.full_name;

-- ============================================================================
-- CHECK SUBJECT ASSIGNMENTS FOR LUCKY
-- ============================================================================

WITH teacher_info AS (
  SELECT u.id as teacher_id, u.full_name, s.name as school_name, s.id as school_id
  FROM users u
  JOIN schools s ON u.school_id = s.id
  WHERE (u.full_name LIKE '%Lucky Idudu%' OR u.full_name LIKE '%lucky%') AND u.role = 'TEACHER'
)
SELECT 
  'SUBJECT ASSIGNMENTS' as check_type,
  t.full_name as teacher,
  subj.name as subject_name,
  c.name || ' ' || arm.name as class_offering,
  COUNT(ss.id) as students_taking_subject
FROM teacher_info t
JOIN subject_teacher_assignments sta ON sta.teacher_id = t.teacher_id
JOIN subjects subj ON sta.subject_id = subj.id
JOIN class_arm_combos cac ON sta.class_arm_combo_id = cac.id
JOIN classes c ON cac.class_id = c.id
JOIN arms arm ON cac.arm_id = arm.id
LEFT JOIN student_subjects ss ON ss.subject_id = subj.id
GROUP BY t.teacher_id, t.full_name, subj.id, subj.name, cac.id, c.name, arm.name
ORDER BY subj.name, c.name, arm.name;
