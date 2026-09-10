-- ============================================================================
-- IMMEDIATE FIX: Make students visible in Primary 1A teacher dashboard
-- NO PLACEHOLDERS - Execute exactly as-is
-- ============================================================================

-- STEP 1: Find Frontier School ID and Primary 1A class combo
SELECT 
  s.id as frontier_id,
  s.name,
  cac.id as primary_1a_class_combo_id,
  c.name as class_name,
  u.full_name as teacher_name
FROM schools s
LEFT JOIN class_arm_combos cac ON cac.school_id = s.id
LEFT JOIN classes c ON c.id = cac.class_id
LEFT JOIN users u ON u.id = cac.class_teacher_id
WHERE LOWER(s.name) LIKE '%frontier%'
LIMIT 5;

-- Copy the IDs from STEP 1 results, then use them below

-- STEP 2: See which students don't have a class assigned
SELECT 
  u.full_name,
  u.email,
  s.admission_number,
  s.class_arm_combo_id,
  CASE WHEN s.class_arm_combo_id IS NULL THEN '❌ NO CLASS' ELSE '✅ CLASS SET' END as status
FROM students s
LEFT JOIN users u ON u.id = s.user_id
WHERE s.school_id = (SELECT id FROM schools WHERE LOWER(name) LIKE '%frontier%')
ORDER BY u.created_at DESC;

-- STEP 3: ASSIGN CLASS TO STUDENTS (Replace the UUID with PRIMARY_1A_CLASS_COMBO_ID from STEP 1)
UPDATE students
SET class_arm_combo_id = '[COPY_PRIMARY_1A_CLASS_COMBO_ID_HERE]'
WHERE school_id = (SELECT id FROM schools WHERE LOWER(name) LIKE '%frontier%')
  AND class_arm_combo_id IS NULL;

-- STEP 4: VERIFY THE FIX WORKED
SELECT 
  u.full_name as student_name,
  s.admission_number,
  c.name as class_name,
  arm.name as arm_name,
  u.created_at
FROM students s
LEFT JOIN users u ON u.id = s.user_id
LEFT JOIN class_arm_combos cac ON cac.id = s.class_arm_combo_id
LEFT JOIN classes c ON c.id = cac.class_id
LEFT JOIN arms arm ON arm.id = cac.arm_id
WHERE s.school_id = (SELECT id FROM schools WHERE LOWER(name) LIKE '%frontier%')
  AND s.class_arm_combo_id IS NOT NULL
ORDER BY u.created_at DESC;

-- STEP 5: Count visible students per teacher
SELECT 
  u.full_name as teacher_name,
  COUNT(DISTINCT s.id) as student_count
FROM class_arm_combos cac
LEFT JOIN users u ON u.id = cac.class_teacher_id
LEFT JOIN students s ON s.class_arm_combo_id = cac.id
WHERE cac.school_id = (SELECT id FROM schools WHERE LOWER(name) LIKE '%frontier%')
GROUP BY u.full_name;
