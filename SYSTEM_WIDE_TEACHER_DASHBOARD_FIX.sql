-- SYSTEM-WIDE FIX: For students already registered WITHOUT class_arm_combo_id
-- Run this to fix existing students so they appear in teacher dashboards
-- ============================================================================

-- STEP 1: Check how many students in Frontier have NULL class_arm_combo_id
SELECT 
  s.school_id,
  sc.name as school_name,
  COUNT(*) as students_with_null_class
FROM students s
LEFT JOIN schools sc ON sc.id = s.school_id
WHERE s.class_arm_combo_id IS NULL
GROUP BY s.school_id, sc.name;

-- STEP 2: Get the PRIMARY 1A class_arm_combo_id for Frontier
SELECT 
  cac.id,
  sc.name as school_name,
  c.name as class_name,
  arm.name as arm_name,
  u.full_name as teacher_name,
  COUNT(DISTINCT s.id) as current_students
FROM class_arm_combos cac
LEFT JOIN schools sc ON sc.id = cac.school_id
LEFT JOIN classes c ON c.id = cac.class_id
LEFT JOIN arms arm ON arm.id = cac.arm_id
LEFT JOIN users u ON u.id = cac.class_teacher_id
LEFT JOIN students s ON s.class_arm_combo_id = cac.id
WHERE LOWER(sc.name) LIKE '%frontier%'
  AND LOWER(c.name) LIKE '%primary%'
GROUP BY cac.id, sc.name, c.name, arm.name, u.full_name;

-- STEP 3: MANUAL FIX - Update students to assign them to the correct class
-- Replace FRONTIER_SCHOOL_ID and PRIMARY_1A_CLASS_COMBO_ID with actual UUIDs from STEP 2
UPDATE students
SET class_arm_combo_id = '[PRIMARY_1A_CLASS_COMBO_ID]'
WHERE school_id = '[FRONTIER_SCHOOL_ID]'
  AND class_arm_combo_id IS NULL
  AND admission_number LIKE 'P1%';  -- Only Primary 1 students

-- STEP 4: Verify the fix
SELECT 
  u.full_name as student_name,
  s.admission_number,
  cac.id as class_arm_combo_id,
  c.name as class_name,
  arm.name as arm_name,
  u.created_at
FROM students s
LEFT JOIN users u ON u.id = s.user_id
LEFT JOIN class_arm_combos cac ON cac.id = s.class_arm_combo_id
LEFT JOIN classes c ON c.id = cac.class_id
LEFT JOIN arms arm ON arm.id = cac.arm_id
WHERE s.school_id IN (SELECT id FROM schools WHERE LOWER(name) LIKE '%frontier%')
  AND cac.id IS NOT NULL
ORDER BY u.created_at DESC;

-- STEP 5: Verify teacher can now see students
SELECT 
  u.full_name as teacher_name,
  c.name as class_name,
  COUNT(DISTINCT s.id) as visible_students
FROM class_arm_combos cac
LEFT JOIN users u ON u.id = cac.class_teacher_id
LEFT JOIN classes c ON c.id = cac.class_id
LEFT JOIN students s ON s.class_arm_combo_id = cac.id
WHERE cac.school_id IN (SELECT id FROM schools WHERE LOWER(name) LIKE '%frontier%')
GROUP BY u.full_name, c.name;
