-- ============================================================================
-- DIAGNOSTIC SCRIPT: Why Student Not Appearing in Teacher Dashboard
-- ============================================================================
-- Run this in Supabase SQL Editor to trace the student visibility issue
-- ============================================================================

-- Step 1: Find the Frontier School
SELECT 'STEP 1: FIND FRONTIER SCHOOL' AS step;
SELECT 
  s.id as school_id,
  s.name as school_name,
  s.email as school_email,
  COUNT(DISTINCT u.id) as total_users,
  COUNT(DISTINCT t.id) as total_teachers,
  COUNT(DISTINCT st.id) as total_students
FROM schools s
LEFT JOIN users u ON u.school_id = s.id
LEFT JOIN users t ON t.school_id = s.id AND t.role = 'TEACHER'
LEFT JOIN students st ON st.school_id = s.id
WHERE LOWER(s.name) LIKE '%frontier%'
GROUP BY s.id, s.name, s.email;

-- Store school ID for reference (update the value below based on results above)
-- SCHOOL_ID = [from results above]

-- Step 2: Find the Primary Teacher in Frontier School
SELECT 'STEP 2: FIND PRIMARY TEACHERS IN FRONTIER SCHOOL' AS step;
SELECT 
  u.id as teacher_id,
  u.full_name as teacher_name,
  u.email as teacher_email,
  u.role,
  cac.id as class_id,
  c.name as class_name,
  arm.name as arm_name
FROM users u
LEFT JOIN class_arm_combos cac ON cac.class_teacher_id = u.id
LEFT JOIN classes c ON c.id = cac.class_id
LEFT JOIN arms arm ON arm.id = cac.arm_id
WHERE u.school_id IN (SELECT id FROM schools WHERE LOWER(name) LIKE '%frontier%')
  AND u.role = 'TEACHER'
ORDER BY u.full_name;

-- Store TEACHER_ID and CLASS_ARM_COMBO_ID from results above

-- Step 3: Find Students Registered in Frontier School
SELECT 'STEP 3: FIND STUDENTS IN FRONTIER SCHOOL' AS step;
SELECT 
  s.id as student_id,
  s.user_id,
  u.full_name as student_name,
  u.email as student_email,
  s.admission_number,
  s.class_arm_combo_id,
  cac.id as actual_class_id,
  c.name as class_name,
  arm.name as arm_name,
  s.created_at
FROM students s
LEFT JOIN users u ON u.id = s.user_id
LEFT JOIN class_arm_combos cac ON cac.id = s.class_arm_combo_id
LEFT JOIN classes c ON c.id = cac.class_id
LEFT JOIN arms arm ON arm.id = cac.arm_id
WHERE s.school_id IN (SELECT id FROM schools WHERE LOWER(name) LIKE '%frontier%')
ORDER BY u.full_name;

-- Step 4: Check class_arm_combos assignments
SELECT 'STEP 4: CLASS ARM COMBOS SETUP' AS step;
SELECT 
  cac.id,
  c.name as class_name,
  arm.name as arm_name,
  u.full_name as class_teacher_name,
  COUNT(DISTINCT s.id) as student_count
FROM class_arm_combos cac
LEFT JOIN classes c ON c.id = cac.class_id
LEFT JOIN arms arm ON arm.id = cac.arm_id
LEFT JOIN users u ON u.id = cac.class_teacher_id
LEFT JOIN students s ON s.class_arm_combo_id = cac.id
WHERE cac.school_id IN (SELECT id FROM schools WHERE LOWER(name) LIKE '%frontier%')
GROUP BY cac.id, c.name, arm.name, u.full_name;

-- Step 5: Check student_subjects linking
SELECT 'STEP 5: STUDENT SUBJECT ENROLLMENT' AS step;
SELECT 
  u.full_name as student_name,
  s.admission_number,
  sub.name as subject_name,
  ss.subject_teacher_id as linked_teacher_id,
  t.full_name as linked_teacher_name
FROM students s
LEFT JOIN users u ON u.id = s.user_id
LEFT JOIN student_subjects ss ON ss.student_id = s.id
LEFT JOIN subjects sub ON sub.id = ss.subject_id
LEFT JOIN users t ON t.id = ss.subject_teacher_id
WHERE s.school_id IN (SELECT id FROM schools WHERE LOWER(name) LIKE '%frontier%')
ORDER BY u.full_name, sub.name;

-- Step 6: Check for NULL class_arm_combo_id (THE LIKELY ISSUE)
SELECT 'STEP 6: STUDENTS WITH NULL CLASS_ARM_COMBO_ID (BLOCKER!)' AS step;
SELECT 
  s.id as student_id,
  u.full_name as student_name,
  u.email,
  s.admission_number,
  s.class_arm_combo_id,
  s.created_at,
  CASE 
    WHEN s.class_arm_combo_id IS NULL THEN '❌ NO CLASS ASSIGNED'
    ELSE '✅ Class assigned'
  END as status
FROM students s
LEFT JOIN users u ON u.id = s.user_id
WHERE s.school_id IN (SELECT id FROM schools WHERE LOWER(name) LIKE '%frontier%')
  AND s.class_arm_combo_id IS NULL;

-- Step 7: Verify API query that teacher dashboard uses
SELECT 'STEP 7: SIMULATING TEACHER DASHBOARD QUERY' AS step;
SELECT 
  u.full_name as student_name,
  s.admission_number,
  c.name as class_name,
  arm.name as arm_name,
  COUNT(DISTINCT ss.id) as subject_count
FROM students s
LEFT JOIN users u ON u.id = s.user_id
LEFT JOIN class_arm_combos cac ON cac.id = s.class_arm_combo_id
LEFT JOIN classes c ON c.id = cac.class_id
LEFT JOIN arms arm ON arm.id = cac.arm_id
LEFT JOIN student_subjects ss ON ss.student_id = s.id
WHERE s.class_arm_combo_id IN (
  SELECT cac.id 
  FROM class_arm_combos cac
  WHERE cac.class_teacher_id IN (
    SELECT u.id FROM users u 
    WHERE u.school_id IN (SELECT id FROM schools WHERE LOWER(name) LIKE '%frontier%')
      AND u.role = 'TEACHER'
  )
)
GROUP BY s.id, u.full_name, s.admission_number, c.name, arm.name;

-- Step 8: Check if student was actually created in auth
SELECT 'STEP 8: VERIFY STUDENT AUTH CREATION' AS step;
SELECT 
  u.id as user_id,
  u.email,
  u.full_name,
  u.role,
  u.status,
  s.id as student_id,
  s.admission_number,
  CASE 
    WHEN s.id IS NOT NULL THEN '✅ Auth + Student created'
    ELSE '❌ Auth created but NO student record'
  END as creation_status
FROM users u
LEFT JOIN students s ON s.user_id = u.id
WHERE u.school_id IN (SELECT id FROM schools WHERE LOWER(name) LIKE '%frontier%')
  AND u.role = 'STUDENT'
ORDER BY u.created_at DESC;

-- Step 9: Full diagnostic - Recent registrations
SELECT 'STEP 9: RECENT STUDENT REGISTRATIONS (Last 10)' AS step;
SELECT 
  u.id,
  u.full_name as student_name,
  u.email,
  s.admission_number,
  s.class_arm_combo_id,
  COALESCE(c.name || '-' || arm.name, 'NO CLASS') as assigned_class,
  COUNT(ss.id) as subjects_enrolled,
  u.created_at,
  u.status
FROM users u
LEFT JOIN students s ON s.user_id = u.id
LEFT JOIN class_arm_combos cac ON cac.id = s.class_arm_combo_id
LEFT JOIN classes c ON c.id = cac.class_id
LEFT JOIN arms arm ON arm.id = cac.arm_id
LEFT JOIN student_subjects ss ON ss.student_id = s.id
WHERE u.school_id IN (SELECT id FROM schools WHERE LOWER(name) LIKE '%frontier%')
  AND u.role = 'STUDENT'
GROUP BY u.id, u.full_name, u.email, s.admission_number, s.class_arm_combo_id, c.name, arm.name, u.created_at, u.status
ORDER BY u.created_at DESC
LIMIT 10;

-- ============================================================================
-- SUMMARY
-- ============================================================================
SELECT '✅ DIAGNOSTIC COMPLETE - REVIEW RESULTS ABOVE' AS final_status;
