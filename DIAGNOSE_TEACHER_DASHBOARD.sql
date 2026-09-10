-- COMPREHENSIVE DIAGNOSTIC: Teacher Dashboard Issue
-- Run this in Supabase SQL Editor to identify why students aren't showing
-- ============================================================================

-- STEP 1: Get Frontier School ID and Primary 1A class info
SELECT 'STEP 1: FRONTIER SCHOOL & PRIMARY 1A CLASS' AS step;

SELECT 
  s.id as school_id,
  s.name as school_name,
  c.id as class_id,
  c.name as class_name,
  arm.id as arm_id,
  arm.name as arm_name,
  cac.id as class_arm_combo_id,
  u.id as teacher_id,
  u.full_name as teacher_name,
  u.email as teacher_email
FROM schools s
LEFT JOIN class_arm_combos cac ON cac.school_id = s.id
LEFT JOIN classes c ON c.id = cac.class_id
LEFT JOIN arms arm ON arm.id = cac.arm_id
LEFT JOIN users u ON u.id = cac.class_teacher_id
WHERE LOWER(s.name) LIKE '%frontier%'
  AND LOWER(c.name) LIKE '%primary%'
  AND (LOWER(c.name) LIKE '%1%' OR LOWER(arm.name) LIKE '%1a%' OR LOWER(arm.name) LIKE '%a%')
LIMIT 5;

-- STEP 2: Get all students registered in Frontier School
SELECT 'STEP 2: ALL STUDENTS IN FRONTIER SCHOOL' AS step;

SELECT 
  u.id as user_id,
  u.full_name as student_name,
  u.email as student_email,
  s.id as student_record_id,
  s.admission_number,
  s.class_arm_combo_id,
  COALESCE(cac.id::text, 'NULL') as actual_class_id,
  COALESCE(c.name || '-' || arm.name, 'NO CLASS ASSIGNED') as class_display,
  CASE WHEN s.class_arm_combo_id IS NULL THEN '❌ NULL' ELSE '✅ Set' END as class_status,
  u.created_at,
  s.created_at as student_created_at
FROM students s
LEFT JOIN users u ON u.id = s.user_id
LEFT JOIN class_arm_combos cac ON cac.id = s.class_arm_combo_id
LEFT JOIN classes c ON c.id = cac.class_id
LEFT JOIN arms arm ON arm.id = cac.arm_id
WHERE s.school_id IN (SELECT id FROM schools WHERE LOWER(name) LIKE '%frontier%')
ORDER BY u.created_at DESC;

-- STEP 3: Check specifically for Primary 1A students
SELECT 'STEP 3: STUDENTS IN PRIMARY 1A CLASS' AS step;

SELECT 
  u.id as user_id,
  u.full_name,
  u.email,
  s.admission_number,
  s.class_arm_combo_id,
  COUNT(ss.id) as subject_count
FROM students s
LEFT JOIN users u ON u.id = s.user_id
LEFT JOIN class_arm_combos cac ON cac.id = s.class_arm_combo_id
LEFT JOIN classes c ON c.id = cac.class_id
LEFT JOIN arms arm ON arm.id = cac.arm_id
LEFT JOIN student_subjects ss ON ss.student_id = s.id
WHERE s.school_id IN (SELECT id FROM schools WHERE LOWER(name) LIKE '%frontier%')
  AND s.class_arm_combo_id IN (
    SELECT cac.id FROM class_arm_combos cac
    LEFT JOIN classes c ON c.id = cac.class_id
    LEFT JOIN arms arm ON arm.id = cac.arm_id
    WHERE cac.school_id IN (SELECT id FROM schools WHERE LOWER(name) LIKE '%frontier%')
      AND LOWER(c.name) LIKE '%primary%'
      AND (LOWER(arm.name) LIKE '%1a%' OR LOWER(arm.name) LIKE '%a%' OR cac.arm_id IS NULL)
  )
GROUP BY u.id, u.full_name, u.email, s.admission_number, s.class_arm_combo_id;

-- STEP 4: Test the API query that teacher dashboard uses
SELECT 'STEP 4: SIMULATING /api/teacher/class-students QUERY' AS step;

-- This is the query the teacher dashboard API uses:
SELECT 
  s.id,
  s.user_id,
  s.admission_number,
  s.school_id,
  s.class_arm_combo_id,
  u.full_name,
  u.email,
  u.photo_url
FROM students s
LEFT JOIN users u ON u.id = s.user_id
WHERE s.class_arm_combo_id IN (
  SELECT id FROM class_arm_combos 
  WHERE school_id IN (SELECT id FROM schools WHERE LOWER(name) LIKE '%frontier%')
    AND class_id IN (
      SELECT id FROM classes WHERE LOWER(name) LIKE '%primary%'
    )
)
LIMIT 10;

-- STEP 5: Find the exact class_arm_combo_id for Primary 1A
SELECT 'STEP 5: EXACT PRIMARY 1A CLASS_ARM_COMBO_ID' AS step;

SELECT 
  cac.id as class_arm_combo_id,
  c.name as class_name,
  arm.name as arm_name,
  u.id as teacher_id,
  u.full_name as teacher_name,
  COUNT(DISTINCT s.id) as enrolled_students
FROM class_arm_combos cac
LEFT JOIN classes c ON c.id = cac.class_id
LEFT JOIN arms arm ON arm.id = cac.arm_id
LEFT JOIN users u ON u.id = cac.class_teacher_id
LEFT JOIN students s ON s.class_arm_combo_id = cac.id
WHERE cac.school_id IN (SELECT id FROM schools WHERE LOWER(name) LIKE '%frontier%')
  AND LOWER(c.name) LIKE '%primary%'
GROUP BY cac.id, c.name, arm.name, u.id, u.full_name
ORDER BY c.name, arm.name;

-- STEP 6: Check for NULL class_arm_combo_id in Frontier students
SELECT 'STEP 6: FRONTIER STUDENTS WITH NULL CLASS (THE PROBLEM)' AS step;

SELECT 
  COUNT(*) as students_with_null_class,
  COUNT(DISTINCT user_id) as unique_users
FROM students
WHERE school_id IN (SELECT id FROM schools WHERE LOWER(name) LIKE '%frontier%')
  AND class_arm_combo_id IS NULL;

-- Show them
SELECT 
  u.full_name,
  u.email,
  s.admission_number,
  s.class_arm_combo_id,
  u.created_at
FROM students s
LEFT JOIN users u ON u.id = s.user_id
WHERE s.school_id IN (SELECT id FROM schools WHERE LOWER(name) LIKE '%frontier%')
  AND s.class_arm_combo_id IS NULL
ORDER BY u.created_at DESC;

-- STEP 7: Check student_subjects linking for these students
SELECT 'STEP 7: SUBJECT ENROLLMENT FOR FRONTIER STUDENTS' AS step;

SELECT 
  u.full_name,
  sub.name as subject_name,
  ss.subject_teacher_id,
  t.full_name as teacher_name,
  CASE WHEN ss.subject_teacher_id IS NULL THEN '❌ NO TEACHER' ELSE '✅ Teacher linked' END as status
FROM students s
LEFT JOIN users u ON u.id = s.user_id
LEFT JOIN student_subjects ss ON ss.student_id = s.id
LEFT JOIN subjects sub ON sub.id = ss.subject_id
LEFT JOIN users t ON t.id = ss.subject_teacher_id
WHERE s.school_id IN (SELECT id FROM schools WHERE LOWER(name) LIKE '%frontier%')
  AND u.created_at > NOW() - INTERVAL '1 day'
ORDER BY u.created_at DESC, sub.name;

-- STEP 8: Get teacher IDs in Frontier for reference
SELECT 'STEP 8: ALL TEACHERS IN FRONTIER SCHOOL' AS step;

SELECT 
  u.id as teacher_id,
  u.full_name,
  u.email,
  u.role,
  COUNT(DISTINCT cac.id) as classes_assigned,
  COUNT(DISTINCT s.id) as students_via_class
FROM users u
LEFT JOIN class_arm_combos cac ON cac.class_teacher_id = u.id
LEFT JOIN students s ON s.class_arm_combo_id = cac.id
WHERE u.school_id IN (SELECT id FROM schools WHERE LOWER(name) LIKE '%frontier%')
  AND u.role = 'TEACHER'
GROUP BY u.id, u.full_name, u.email, u.role
ORDER BY u.full_name;

-- STEP 9: FINAL SUMMARY
SELECT 'STEP 9: SUMMARY - ROOT CAUSE ANALYSIS' AS analysis;

WITH frontier_school AS (
  SELECT id FROM schools WHERE LOWER(name) LIKE '%frontier%' LIMIT 1
),
primary_1a_class AS (
  SELECT cac.id FROM class_arm_combos cac
  LEFT JOIN classes c ON c.id = cac.class_id
  LEFT JOIN arms arm ON arm.id = cac.arm_id
  WHERE cac.school_id = (SELECT id FROM frontier_school)
    AND LOWER(c.name) LIKE '%primary%'
  LIMIT 1
)
SELECT 
  (SELECT COUNT(*) FROM students WHERE school_id = (SELECT id FROM frontier_school)) as total_students_in_frontier,
  (SELECT COUNT(*) FROM students WHERE school_id = (SELECT id FROM frontier_school) AND class_arm_combo_id IS NULL) as students_with_null_class,
  (SELECT COUNT(*) FROM students WHERE class_arm_combo_id = (SELECT id FROM primary_1a_class)) as students_in_primary_1a,
  (SELECT COUNT(*) FROM class_arm_combos WHERE school_id = (SELECT id FROM frontier_school)) as total_classes_in_frontier;
