-- ============================================================================
-- AUTO FIX: Assign classes to ALL students without any placeholders
-- Simply copy and paste the ENTIRE script and run it - NO MODIFICATIONS NEEDED
-- ============================================================================

-- AUTOMATIC FIX FOR ALL STUDENTS
-- Find Frontier School and Primary 1A class, then assign all students

DO $$
DECLARE
  v_frontier_id uuid;
  v_primary_1a_combo_id uuid;
  v_updated_count int;
BEGIN
  -- Step 1: Find Frontier School ID
  SELECT id INTO v_frontier_id 
  FROM schools 
  WHERE LOWER(name) LIKE '%frontier%' 
  LIMIT 1;

  IF v_frontier_id IS NULL THEN
    RAISE NOTICE 'ERROR: Frontier School not found!';
    RETURN;
  END IF;

  RAISE NOTICE '✅ Found Frontier School: %', v_frontier_id;

  -- Step 2: Find Primary 1A class combo ID
  SELECT cac.id INTO v_primary_1a_combo_id
  FROM class_arm_combos cac
  LEFT JOIN classes c ON c.id = cac.class_id
  LEFT JOIN arms arm ON arm.id = cac.arm_id
  WHERE cac.school_id = v_frontier_id
    AND LOWER(c.name) LIKE '%primary%'
    AND c.level = 1
  LIMIT 1;

  IF v_primary_1a_combo_id IS NULL THEN
    RAISE NOTICE 'ERROR: Primary 1 class combo not found in Frontier!';
    RETURN;
  END IF;

  RAISE NOTICE '✅ Found Primary 1A Class Combo: %', v_primary_1a_combo_id;

  -- Step 3: Count students WITHOUT a class
  SELECT COUNT(*) INTO v_updated_count
  FROM students
  WHERE school_id = v_frontier_id
    AND class_arm_combo_id IS NULL;

  RAISE NOTICE '📊 Found % students without a class', v_updated_count;

  -- Step 4: ASSIGN CLASS TO ALL STUDENTS
  UPDATE students
  SET class_arm_combo_id = v_primary_1a_combo_id
  WHERE school_id = v_frontier_id
    AND class_arm_combo_id IS NULL;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE '✅ FIXED % students - assigned to Primary 1A', v_updated_count;

  -- Step 5: VERIFY THE FIX
  SELECT COUNT(*) INTO v_updated_count
  FROM students
  WHERE school_id = v_frontier_id
    AND class_arm_combo_id = v_primary_1a_combo_id;

  RAISE NOTICE '✅ VERIFIED: % students now in Primary 1A class', v_updated_count;

END $$;

-- Display results
SELECT 
  u.full_name as student_name,
  s.admission_number,
  c.name as class_name,
  arm.name as arm_name,
  u.created_at,
  '✅ FIXED' as status
FROM students s
LEFT JOIN users u ON u.id = s.user_id
LEFT JOIN class_arm_combos cac ON cac.id = s.class_arm_combo_id
LEFT JOIN classes c ON c.id = cac.class_id
LEFT JOIN arms arm ON arm.id = cac.arm_id
WHERE s.school_id = (SELECT id FROM schools WHERE LOWER(name) LIKE '%frontier%')
  AND s.class_arm_combo_id IS NOT NULL
ORDER BY u.created_at DESC;

-- Count students per teacher
SELECT 
  u.full_name as teacher_name,
  c.name as class_name,
  COUNT(DISTINCT s.id) as visible_students,
  '✅ DASHBOARD COUNT' as status
FROM class_arm_combos cac
LEFT JOIN users u ON u.id = cac.class_teacher_id
LEFT JOIN classes c ON c.id = cac.class_id
LEFT JOIN students s ON s.class_arm_combo_id = cac.id
WHERE cac.school_id = (SELECT id FROM schools WHERE LOWER(name) LIKE '%frontier%')
GROUP BY u.full_name, c.name;
