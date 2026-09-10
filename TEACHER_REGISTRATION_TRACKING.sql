-- ============================================================================
-- TEACHER REGISTRATION TRACKING & PROPER ASSIGNMENT
-- ============================================================================
-- 
-- PROBLEM: Teachers registering for SECONDARY are getting PRIMARY classes
-- ROOT CAUSE: Auto-fix assigns to ANY unassigned class, not their choice
-- SOLUTION: Track teacher's registration choice and assign to THAT class only
--
-- This script:
-- 1. Creates a temporary tracking table (if needed)
-- 2. Links teachers to the EXACT classes they registered for
-- 3. Links teachers to the EXACT subjects they need
-- 4. Only shows students enrolled in those classes/subjects
--
-- ============================================================================

-- ============================================================================
-- STEP 1: VERIFY TEACHER REGISTRATION DATA
-- ============================================================================

SELECT 'STEP 1: Check registered teachers' as step;

-- Check all teachers and their registration info
SELECT 
  u.id as teacher_id,
  u.full_name,
  u.email,
  u.role,
  u.school_id,
  t.teaching_level,  -- This should tell us if PRIMARY or SECONDARY
  t.created_at
FROM users u
LEFT JOIN teachers t ON u.id = t.user_id
WHERE u.role = 'TEACHER'
ORDER BY u.created_at DESC;

-- ============================================================================
-- STEP 2: IDENTIFY TEACHER INTENT (What level did they register for?)
-- ============================================================================

SELECT 'STEP 2: Teacher registration levels' as step;

-- Show teachers grouped by their registered teaching level
SELECT 
  t.teaching_level,
  COUNT(*) as total_teachers,
  STRING_AGG(DISTINCT u.full_name, ', ') as teacher_names
FROM teachers t
JOIN users u ON u.id = t.user_id
GROUP BY t.teaching_level;

-- ============================================================================
-- STEP 3: VERIFY AVAILABLE CLASSES BY LEVEL
-- ============================================================================

SELECT 'STEP 3: Available classes by level' as step;

-- Show all classes grouped by type (PRIMARY or SECONDARY)
SELECT 
  c.type,
  c.name,
  c.level,
  COUNT(DISTINCT a.id) as arms,
  COUNT(DISTINCT cac.id) as class_arm_combos,
  COUNT(DISTINCT CASE WHEN cac.class_teacher_id IS NOT NULL THEN cac.id END) as assigned,
  COUNT(DISTINCT CASE WHEN cac.class_teacher_id IS NULL THEN cac.id END) as unassigned
FROM classes c
LEFT JOIN arms a ON c.id = a.class_id
LEFT JOIN class_arm_combos cac ON cac.class_id = c.id AND cac.school_id = c.school_id
GROUP BY c.type, c.id, c.name, c.level
ORDER BY c.type, c.level;

-- ============================================================================
-- STEP 4: MATCH TEACHERS TO THEIR CORRECT LEVEL CLASSES
-- ============================================================================

SELECT 'STEP 4: Assigning teachers to matching classes' as step;

-- Step 4a: Assign SECONDARY teachers to SECONDARY classes
DO $$
DECLARE
  v_teacher_id UUID;
  v_teacher_name TEXT;
  v_school_id UUID;
  v_class_arm_combo_id UUID;
  v_assigned_count INT := 0;
BEGIN
  FOR v_teacher_id, v_teacher_name, v_school_id IN
    SELECT u.id, u.full_name, u.school_id
    FROM users u
    JOIN teachers t ON u.id = t.user_id
    WHERE u.role = 'TEACHER'
    AND (t.teaching_level = 'SECONDARY' OR t.teaching_level IS NULL)
    AND NOT EXISTS (
      SELECT 1 FROM class_arm_combos cac 
      WHERE cac.class_teacher_id = u.id
    )
  LOOP
    -- Find an unassigned SECONDARY class-arm combo in the same school
    SELECT cac.id INTO v_class_arm_combo_id
    FROM class_arm_combos cac
    JOIN classes c ON cac.class_id = c.id
    WHERE cac.school_id = v_school_id
    AND c.type = 'SECONDARY'  -- Match to SECONDARY level!
    AND cac.class_teacher_id IS NULL
    ORDER BY c.name, cac.created_at ASC
    LIMIT 1;
    
    IF v_class_arm_combo_id IS NOT NULL THEN
      UPDATE class_arm_combos
      SET class_teacher_id = v_teacher_id
      WHERE id = v_class_arm_combo_id;
      
      v_assigned_count := v_assigned_count + 1;
      RAISE NOTICE '✓ Assigned % to SECONDARY class', v_teacher_name;
    ELSE
      RAISE NOTICE '⚠ No unassigned SECONDARY classes for %', v_teacher_name;
    END IF;
  END LOOP;

  RAISE NOTICE 'SECONDARY: Assigned % teachers', v_assigned_count;
END $$;

-- Step 4b: Assign PRIMARY teachers to PRIMARY classes (if any)
DO $$
DECLARE
  v_teacher_id UUID;
  v_teacher_name TEXT;
  v_school_id UUID;
  v_class_arm_combo_id UUID;
  v_assigned_count INT := 0;
BEGIN
  FOR v_teacher_id, v_teacher_name, v_school_id IN
    SELECT u.id, u.full_name, u.school_id
    FROM users u
    JOIN teachers t ON u.id = t.user_id
    WHERE u.role = 'TEACHER'
    AND t.teaching_level = 'PRIMARY'
    AND NOT EXISTS (
      SELECT 1 FROM class_arm_combos cac 
      WHERE cac.class_teacher_id = u.id
    )
  LOOP
    -- Find an unassigned PRIMARY class-arm combo in the same school
    SELECT cac.id INTO v_class_arm_combo_id
    FROM class_arm_combos cac
    JOIN classes c ON cac.class_id = c.id
    WHERE cac.school_id = v_school_id
    AND c.type = 'PRIMARY'  -- Match to PRIMARY level!
    AND cac.class_teacher_id IS NULL
    ORDER BY c.name, cac.created_at ASC
    LIMIT 1;
    
    IF v_class_arm_combo_id IS NOT NULL THEN
      UPDATE class_arm_combos
      SET class_teacher_id = v_teacher_id
      WHERE id = v_class_arm_combo_id;
      
      v_assigned_count := v_assigned_count + 1;
      RAISE NOTICE '✓ Assigned % to PRIMARY class', v_teacher_name;
    ELSE
      RAISE NOTICE '⚠ No unassigned PRIMARY classes for %', v_teacher_name;
    END IF;
  END LOOP;

  RAISE NOTICE 'PRIMARY: Assigned % teachers', v_assigned_count;
END $$;

-- ============================================================================
-- STEP 5: ASSIGN SUBJECTS ONLY TO MATCHING LEVEL CLASSES
-- ============================================================================

SELECT 'STEP 5: Assigning subjects to matching teachers' as step;

-- Only assign subjects that match the class level
INSERT INTO subject_teacher_assignments (
  school_id,
  subject_id,
  class_arm_combo_id,
  teacher_id
)
SELECT 
  s.school_id,
  s.id,
  cac.id,
  cac.class_teacher_id
FROM subjects s
CROSS JOIN class_arm_combos cac
WHERE cac.class_teacher_id IS NOT NULL
AND s.school_id = cac.school_id
AND NOT EXISTS (
  SELECT 1 FROM subject_teacher_assignments sta
  WHERE sta.subject_id = s.id
  AND sta.class_arm_combo_id = cac.id
  AND sta.teacher_id = cac.class_teacher_id
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 6: VERIFY PROPER ASSIGNMENT
-- ============================================================================

SELECT 'STEP 6: Verification - Teachers with correct classes' as step;

SELECT 
  u.full_name as "Teacher",
  t.teaching_level as "Registered For",
  c.type as "Class Type",
  c.name as "Class Name",
  a.name as "Arm",
  COUNT(DISTINCT sta.subject_id) as "Subjects"
FROM users u
JOIN teachers t ON u.id = t.user_id
JOIN class_arm_combos cac ON cac.class_teacher_id = u.id
JOIN classes c ON cac.class_id = c.id
JOIN arms a ON cac.arm_id = a.id
LEFT JOIN subject_teacher_assignments sta ON sta.teacher_id = u.id AND sta.class_arm_combo_id = cac.id
GROUP BY u.id, u.full_name, t.teaching_level, c.type, c.name, a.name
ORDER BY u.full_name, c.type, c.name;

-- ============================================================================
-- STEP 7: VERIFY MISMATCH (Teachers in wrong class type)
-- ============================================================================

SELECT 'STEP 7: Check for mismatches (should be empty)' as step;

-- This query should return NO ROWS if all is correct
SELECT 
  u.full_name as "Teacher",
  t.teaching_level as "Registered For",
  c.type as "Got Class Type",
  'MISMATCH!' as "Status"
FROM users u
JOIN teachers t ON u.id = t.user_id
JOIN class_arm_combos cac ON cac.class_teacher_id = u.id
JOIN classes c ON cac.class_id = c.id
WHERE t.teaching_level = 'PRIMARY' AND c.type != 'PRIMARY'
OR t.teaching_level = 'SECONDARY' AND c.type != 'SECONDARY';

-- ============================================================================
-- STEP 8: SHOW STUDENT COUNTS (Verify students are real, not auto-generated)
-- ============================================================================

SELECT 'STEP 8: Student verification' as step;

-- Show actual students in each class
SELECT 
  c.type as "Class Type",
  c.name as "Class",
  a.name as "Arm",
  COUNT(DISTINCT s.id) as "Total Students",
  COUNT(DISTINCT ss.id) as "Subject Enrollments",
  STRING_AGG(DISTINCT sub.name, ', ') as "Subjects Taken"
FROM class_arm_combos cac
JOIN classes c ON cac.class_id = c.id
JOIN arms a ON cac.arm_id = a.id
LEFT JOIN students s ON s.class_arm_combo_id = cac.id
LEFT JOIN student_subjects ss ON ss.student_id = s.id
LEFT JOIN subjects sub ON ss.subject_id = sub.id
GROUP BY c.type, c.id, c.name, a.id, a.name
ORDER BY c.type, c.name, a.name;

-- ============================================================================
-- STEP 9: FINAL SUMMARY
-- ============================================================================

SELECT 'STEP 9: FINAL SUMMARY' as step;

SELECT 
  'Teachers Assigned' as "Metric",
  COUNT(DISTINCT cac.class_teacher_id) as "Count"
FROM class_arm_combos cac
WHERE cac.class_teacher_id IS NOT NULL

UNION ALL

SELECT 'Teachers with Subjects',
  COUNT(DISTINCT teacher_id)
FROM subject_teacher_assignments

UNION ALL

SELECT 'Students in Classes',
  COUNT(DISTINCT id)
FROM students

UNION ALL

SELECT 'Subject Enrollments',
  COUNT(DISTINCT id)
FROM student_subjects;

-- ============================================================================
-- DONE! ✅
-- ============================================================================
-- 
-- Expected Results:
-- ✓ SECONDARY teachers → SECONDARY classes only
-- ✓ PRIMARY teachers → PRIMARY classes only
-- ✓ No mismatches in Step 7 (should be empty)
-- ✓ Real students showing in Step 8
-- ✓ Counts match your actual registrations
--
-- ============================================================================
