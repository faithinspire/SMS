-- ==============================================================================
-- HARD FIX: DIAGNOSTIC QUERIES FOR RUACH MODEL SCHOOL
-- ==============================================================================
-- Purpose: Verify complete data chain for students under Teacher Lucky Idudu
-- ==============================================================================

-- ============================================================================
-- PART 1: VERIFY TEACHER RECORD EXISTS
-- ============================================================================

-- Check if Ruach Model School exists
SELECT 
  id as school_id,
  name as school_name,
  type as school_type,
  status,
  created_at
FROM schools 
WHERE name ILIKE 'Ruach%Model%School%'
LIMIT 1;

-- Find Teacher Lucky Idudu in users table
SELECT 
  u.id as user_id,
  u.email,
  u.full_name,
  u.role,
  u.school_id,
  s.name as school_name
FROM users u
LEFT JOIN schools s ON u.school_id = s.id
WHERE u.full_name ILIKE '%Lucky%Idudu%'
  OR u.email ILIKE '%lucky%idudu%'
LIMIT 10;

-- Find teacher record for Lucky Idudu
SELECT 
  t.id as teacher_id,
  t.user_id,
  t.school_id,
  t.first_name,
  t.last_name,
  t.teaching_level,
  t.department,
  u.full_name as user_full_name,
  s.name as school_name
FROM teachers t
LEFT JOIN users u ON t.user_id = u.id
LEFT JOIN schools s ON t.school_id = s.id
WHERE u.full_name ILIKE '%Lucky%Idudu%'
  OR t.first_name ILIKE '%Lucky%'
LIMIT 10;

-- ============================================================================
-- PART 2: VERIFY CLASS TEACHER ASSIGNMENT
-- ============================================================================

-- Get all classes in Ruach Model School
SELECT 
  c.id,
  c.name as class_name,
  c.level,
  c.type,
  c.school_id
FROM classes c
WHERE c.school_id IN (
  SELECT id FROM schools WHERE name ILIKE 'Ruach%Model%School%'
)
ORDER BY c.level, c.name;

-- Get all class_arm_combos in Ruach Model School
SELECT 
  cac.id as class_arm_combo_id,
  c.name as class_name,
  a.name as arm_name,
  cac.class_teacher_id,
  u.full_name as teacher_name,
  cac.school_id
FROM class_arm_combos cac
LEFT JOIN classes c ON cac.class_id = c.id
LEFT JOIN arms a ON cac.arm_id = a.id
LEFT JOIN users u ON cac.class_teacher_id = u.id
WHERE cac.school_id IN (
  SELECT id FROM schools WHERE name ILIKE 'Ruach%Model%School%'
)
ORDER BY c.name, a.name;

-- Check which classes are assigned to Lucky Idudu as class_teacher
SELECT 
  cac.id as class_arm_combo_id,
  c.name as class_name,
  a.name as arm_name,
  cac.class_teacher_id,
  u.full_name as teacher_name,
  s.name as school_name
FROM class_arm_combos cac
LEFT JOIN classes c ON cac.class_id = c.id
LEFT JOIN arms a ON cac.arm_id = a.id
LEFT JOIN users u ON cac.class_teacher_id = u.id
LEFT JOIN schools s ON cac.school_id = s.id
WHERE u.full_name ILIKE '%Lucky%Idudu%'
  AND s.name ILIKE 'Ruach%Model%School%';

-- ============================================================================
-- PART 3: VERIFY STUDENT RECORDS IN CLASSES
-- ============================================================================

-- Count students in each class_arm_combo in Ruach Model School
SELECT 
  s.class_arm_combo_id,
  CONCAT(c.name, ' - ', a.name) as class_display,
  COUNT(s.id) as student_count,
  COUNT(DISTINCT s.user_id) as user_count
FROM students s
LEFT JOIN class_arm_combos cac ON s.class_arm_combo_id = cac.id
LEFT JOIN classes c ON cac.class_id = c.id
LEFT JOIN arms a ON cac.arm_id = a.id
WHERE s.school_id IN (
  SELECT id FROM schools WHERE name ILIKE 'Ruach%Model%School%'
)
GROUP BY s.class_arm_combo_id, c.name, a.name
ORDER BY c.name, a.name;

-- Get ALL students in Ruach Model School
SELECT 
  s.id as student_id,
  s.admission_number,
  u.full_name as student_name,
  u.email as student_email,
  s.class_arm_combo_id,
  c.name as class_name,
  a.name as arm_name,
  cac.class_teacher_id,
  u2.full_name as class_teacher_name,
  s.school_id
FROM students s
LEFT JOIN users u ON s.user_id = u.id
LEFT JOIN class_arm_combos cac ON s.class_arm_combo_id = cac.id
LEFT JOIN classes c ON cac.class_id = c.id
LEFT JOIN arms a ON cac.arm_id = a.id
LEFT JOIN users u2 ON cac.class_teacher_id = u2.id
WHERE s.school_id IN (
  SELECT id FROM schools WHERE name ILIKE 'Ruach%Model%School%'
)
ORDER BY c.name, a.name, u.full_name;

-- Get students in classes taught by Lucky Idudu
SELECT 
  s.id as student_id,
  s.admission_number,
  u.full_name as student_name,
  u.email as student_email,
  c.name as class_name,
  a.name as arm_name,
  u2.full_name as class_teacher_name
FROM students s
LEFT JOIN users u ON s.user_id = u.id
LEFT JOIN class_arm_combos cac ON s.class_arm_combo_id = cac.id
LEFT JOIN classes c ON cac.class_id = c.id
LEFT JOIN arms a ON cac.arm_id = a.id
LEFT JOIN users u2 ON cac.class_teacher_id = u2.id
WHERE cac.class_teacher_id IN (
  SELECT u.id FROM users u 
  WHERE u.full_name ILIKE '%Lucky%Idudu%'
    AND u.school_id IN (
      SELECT id FROM schools WHERE name ILIKE 'Ruach%Model%School%'
    )
)
ORDER BY c.name, a.name, u.full_name;

-- ============================================================================
-- PART 4: VERIFY SUBJECT ENROLLMENT
-- ============================================================================

-- Check if student_subjects records exist for Ruach students
SELECT 
  COUNT(ss.id) as total_subject_enrollments
FROM student_subjects ss
WHERE ss.school_id IN (
  SELECT id FROM schools WHERE name ILIKE 'Ruach%Model%School%'
);

-- Get subject enrollments for Ruach students
SELECT 
  ss.id as student_subject_id,
  u.full_name as student_name,
  subj.name as subject_name,
  subj.code as subject_code,
  u2.full_name as subject_teacher_name,
  ss.created_at
FROM student_subjects ss
LEFT JOIN students st ON ss.student_id = st.id
LEFT JOIN users u ON st.user_id = u.id
LEFT JOIN subjects subj ON ss.subject_id = subj.id
LEFT JOIN users u2 ON ss.subject_teacher_id = u2.id
WHERE ss.school_id IN (
  SELECT id FROM schools WHERE name ILIKE 'Ruach%Model%School%'
)
ORDER BY u.full_name, subj.name;

-- ============================================================================
-- PART 5: VERIFY SUBJECT TEACHER ASSIGNMENTS
-- ============================================================================

-- Check subject_teacher_assignments for Lucky Idudu
SELECT 
  sta.id,
  subj.name as subject_name,
  c.name as class_name,
  a.name as arm_name,
  u.full_name as teacher_name
FROM subject_teacher_assignments sta
LEFT JOIN subjects subj ON sta.subject_id = subj.id
LEFT JOIN class_arm_combos cac ON sta.class_arm_combo_id = cac.id
LEFT JOIN classes c ON cac.class_id = c.id
LEFT JOIN arms a ON cac.arm_id = a.id
LEFT JOIN users u ON sta.teacher_id = u.id
WHERE sta.teacher_id IN (
  SELECT u.id FROM users u 
  WHERE u.full_name ILIKE '%Lucky%Idudu%'
    AND u.school_id IN (
      SELECT id FROM schools WHERE name ILIKE 'Ruach%Model%School%'
    )
)
ORDER BY c.name, subj.name;

-- ============================================================================
-- PART 6: DATA INTEGRITY CHECKS
-- ============================================================================

-- Find students with missing class_arm_combo_id
SELECT COUNT(*) as students_with_missing_class
FROM students s
WHERE s.school_id IN (
  SELECT id FROM schools WHERE name ILIKE 'Ruach%Model%School%'
)
AND s.class_arm_combo_id IS NULL;

-- Find students pointing to nonexistent class_arm_combo
SELECT COUNT(*) as students_with_invalid_class
FROM students s
LEFT JOIN class_arm_combos cac ON s.class_arm_combo_id = cac.id
WHERE s.school_id IN (
  SELECT id FROM schools WHERE name ILIKE 'Ruach%Model%School%'
)
AND cac.id IS NULL;

-- Find class_arm_combos with no students
SELECT 
  cac.id,
  c.name,
  a.name,
  COUNT(s.id) as student_count
FROM class_arm_combos cac
LEFT JOIN classes c ON cac.class_id = c.id
LEFT JOIN arms a ON cac.arm_id = a.id
LEFT JOIN students s ON cac.id = s.class_arm_combo_id
WHERE cac.school_id IN (
  SELECT id FROM schools WHERE name ILIKE 'Ruach%Model%School%'
)
GROUP BY cac.id, c.name, a.name
HAVING COUNT(s.id) = 0;

-- ============================================================================
-- PART 7: COMPLETE VIEW - RUACH MODEL SCHOOL DATA STRUCTURE
-- ============================================================================

-- Summary view
WITH school_data AS (
  SELECT id as school_id, name as school_name FROM schools 
  WHERE name ILIKE 'Ruach%Model%School%'
),
teacher_data AS (
  SELECT u.id as teacher_id, u.full_name as teacher_name, u.school_id
  FROM users u
  WHERE u.full_name ILIKE '%Lucky%Idudu%'
    AND u.school_id IN (SELECT school_id FROM school_data)
),
class_data AS (
  SELECT 
    cac.id,
    c.name as class_name,
    a.name as arm_name,
    cac.class_teacher_id,
    cac.school_id
  FROM class_arm_combos cac
  LEFT JOIN classes c ON cac.class_id = c.id
  LEFT JOIN arms a ON cac.arm_id = a.id
  WHERE cac.school_id IN (SELECT school_id FROM school_data)
),
student_data AS (
  SELECT 
    s.id as student_id,
    s.admission_number,
    u.full_name as student_name,
    s.class_arm_combo_id,
    s.school_id
  FROM students s
  LEFT JOIN users u ON s.user_id = u.id
  WHERE s.school_id IN (SELECT school_id FROM school_data)
)
SELECT 
  'SCHOOL' as type,
  sd.school_name as description,
  COUNT(*) as count
FROM school_data sd
GROUP BY sd.school_id, sd.school_name

UNION ALL

SELECT 
  'TEACHERS',
  td.teacher_name,
  1
FROM teacher_data td

UNION ALL

SELECT 
  'CLASSES',
  CONCAT(cd.class_name, ' - ', cd.arm_name),
  COUNT(sd.student_id)
FROM class_data cd
LEFT JOIN student_data sd ON cd.id = sd.class_arm_combo_id
GROUP BY cd.id, cd.class_name, cd.arm_name;

-- ============================================================================
-- PART 8: IF STUDENTS ARE MISSING - POSSIBLE CAUSES
-- ============================================================================

-- Check if students exist but are in wrong school
SELECT 
  s.id,
  s.admission_number,
  u.full_name,
  s.school_id,
  sch.name as student_school_name,
  s.class_arm_combo_id
FROM students s
LEFT JOIN users u ON s.user_id = u.id
LEFT JOIN schools sch ON s.school_id = sch.id
WHERE s.school_id NOT IN (
  SELECT id FROM schools WHERE name ILIKE 'Ruach%Model%School%'
)
AND u.full_name ILIKE '%ruach%' OR s.admission_number ILIKE '%ruach%'
LIMIT 20;

-- Check if Lucky Idudu has no class assignments
SELECT 
  u.id,
  u.full_name,
  COUNT(cac.id) as assigned_classes
FROM users u
LEFT JOIN class_arm_combos cac ON u.id = cac.class_teacher_id
WHERE u.full_name ILIKE '%Lucky%Idudu%'
GROUP BY u.id, u.full_name;

-- ============================================================================
-- END OF DIAGNOSTIC QUERIES
-- ============================================================================
