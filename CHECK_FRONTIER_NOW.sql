-- QUICK CHECK: Frontier School Student-Teacher Setup
-- Copy and paste this ENTIRE script into Supabase SQL Editor
-- Select all and Execute

-- Get Frontier School ID
SELECT 
  id,
  name,
  email,
  created_at
FROM schools 
WHERE LOWER(name) LIKE '%frontier%';

-- Get all teachers in Frontier
SELECT 
  u.id,
  u.full_name,
  u.email,
  u.role,
  u.created_at,
  COUNT(DISTINCT cac.id) as classes_assigned
FROM users u
LEFT JOIN class_arm_combos cac ON cac.class_teacher_id = u.id
WHERE u.school_id IN (SELECT id FROM schools WHERE LOWER(name) LIKE '%frontier%')
  AND u.role = 'TEACHER'
GROUP BY u.id, u.full_name, u.email, u.role, u.created_at;

-- Get class setup
SELECT 
  cac.id as class_arm_combo_id,
  c.name as class_name,
  arm.name as arm_name,
  u.full_name as teacher_name,
  COUNT(DISTINCT s.id) as student_count
FROM class_arm_combos cac
LEFT JOIN classes c ON c.id = cac.class_id
LEFT JOIN arms arm ON arm.id = cac.arm_id
LEFT JOIN users u ON u.id = cac.class_teacher_id
LEFT JOIN students s ON s.class_arm_combo_id = cac.id
WHERE cac.school_id IN (SELECT id FROM schools WHERE LOWER(name) LIKE '%frontier%')
GROUP BY cac.id, c.name, arm.name, u.full_name;

-- Get all students in Frontier with their class assignments
SELECT 
  s.id as student_id,
  u.full_name as student_name,
  s.admission_number,
  s.class_arm_combo_id,
  COALESCE(c.name || '-' || arm.name, '❌ NO CLASS ASSIGNED') as class_assignment,
  u.email,
  u.created_at as registered_at,
  s.created_at as student_record_created_at
FROM students s
LEFT JOIN users u ON u.id = s.user_id
LEFT JOIN class_arm_combos cac ON cac.id = s.class_arm_combo_id
LEFT JOIN classes c ON c.id = cac.class_id
LEFT JOIN arms arm ON arm.id = cac.arm_id
WHERE s.school_id IN (SELECT id FROM schools WHERE LOWER(name) LIKE '%frontier%')
ORDER BY u.created_at DESC;

-- Check for NULL class_arm_combo_id (THE ISSUE)
SELECT 
  'Students with NO class assigned:' as issue,
  COUNT(*) as count
FROM students
WHERE school_id IN (SELECT id FROM schools WHERE LOWER(name) LIKE '%frontier%')
  AND class_arm_combo_id IS NULL;

-- If there are students with NULL class, show them
SELECT 
  s.id,
  u.full_name,
  u.email,
  s.admission_number,
  '❌ CLASS_ARM_COMBO_ID IS NULL' as problem
FROM students s
LEFT JOIN users u ON u.id = s.user_id
WHERE s.school_id IN (SELECT id FROM schools WHERE LOWER(name) LIKE '%frontier%')
  AND s.class_arm_combo_id IS NULL;
