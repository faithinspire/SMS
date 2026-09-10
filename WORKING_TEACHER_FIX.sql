-- ============================================================================
-- TEACHER LINKING FIX - COMPLETE WORKING VERSION
-- ============================================================================
-- This SQL has been tested and FIXED for PostgreSQL compatibility
-- Issue: Variable name conflicts with column names - SOLVED with v_ prefix
--
-- Copy and paste this ENTIRE file into Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- STEP 1: CHECK IF TEACHERS EXIST
-- ============================================================================

SELECT 'CHECKING TEACHERS' as step;

SELECT 
  COUNT(*) as total_teachers,
  COUNT(DISTINCT school_id) as schools
FROM users
WHERE role = 'TEACHER';

-- ============================================================================
-- STEP 2: CHECK IF CLASSES EXIST
-- ============================================================================

SELECT 'CHECKING CLASSES' as step;

SELECT 
  COUNT(DISTINCT c.id) as total_classes,
  COUNT(DISTINCT a.id) as total_arms,
  COUNT(DISTINCT cac.id) as total_class_arm_combos,
  COUNT(DISTINCT CASE WHEN cac.class_teacher_id IS NOT NULL THEN cac.id END) as assigned_classes
FROM class_arm_combos cac
JOIN classes c ON cac.class_id = c.id
JOIN arms a ON cac.arm_id = a.id;

-- ============================================================================
-- STEP 3: CHECK IF SUBJECTS EXIST
-- ============================================================================

SELECT 'CHECKING SUBJECTS' as step;

SELECT 
  COUNT(*) as total_subjects
FROM subjects;

-- ============================================================================
-- STEP 4: MAIN FIX - AUTO-ASSIGN TEACHERS TO CLASSES
-- ============================================================================

SELECT 'ASSIGNING TEACHERS TO CLASSES' as step;

DO $$
DECLARE
  v_teacher_id UUID;
  v_school_id UUID;
  v_class_arm_combo_id UUID;
  v_assigned_count INT := 0;
  v_total_teachers INT := 0;
BEGIN
  -- Count total teachers
  SELECT COUNT(*) INTO v_total_teachers
  FROM users
  WHERE role = 'TEACHER';

  RAISE NOTICE 'Found % teachers to process', v_total_teachers;

  -- For each teacher without a class assignment
  FOR v_teacher_id, v_school_id IN
    SELECT u.id, u.school_id
    FROM users u
    WHERE u.role = 'TEACHER'
    AND NOT EXISTS (
      SELECT 1 FROM class_arm_combos cac 
      WHERE cac.class_teacher_id = u.id
    )
  LOOP
    -- Find an unassigned class-arm combo in the same school
    SELECT cac.id INTO v_class_arm_combo_id
    FROM class_arm_combos cac
    WHERE cac.school_id = v_school_id
    AND cac.class_teacher_id IS NULL
    ORDER BY cac.created_at ASC
    LIMIT 1;
    
    -- If we found an unassigned class, assign this teacher to it
    IF v_class_arm_combo_id IS NOT NULL THEN
      UPDATE class_arm_combos
      SET class_teacher_id = v_teacher_id
      WHERE id = v_class_arm_combo_id;
      
      v_assigned_count := v_assigned_count + 1;
      RAISE NOTICE '  → Assigned teacher to class-arm-combo %', v_class_arm_combo_id;
    ELSE
      RAISE NOTICE '  ⚠ No unassigned classes found for school %', v_school_id;
    END IF;
  END LOOP;

  RAISE NOTICE 'Successfully assigned % teachers to classes', v_assigned_count;
END $$;

-- ============================================================================
-- STEP 5: AUTO-ASSIGN ALL SUBJECTS TO TEACHERS IN THEIR CLASSES
-- ============================================================================

SELECT 'ASSIGNING SUBJECTS TO TEACHERS' as step;

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

SELECT 'Subjects assigned' as result;

-- ============================================================================
-- STEP 6: VERIFY ALL ASSIGNMENTS WERE CREATED
-- ============================================================================

SELECT 'FINAL VERIFICATION' as step;

SELECT 
  u.full_name as "Teacher Name",
  u.email as "Email",
  u.school_id as "School ID",
  COUNT(DISTINCT CASE WHEN cac.class_teacher_id = u.id THEN cac.id END) as "Classes Managed",
  COUNT(DISTINCT sta.id) as "Subject Assignments",
  COUNT(DISTINCT sta.subject_id) as "Unique Subjects",
  STRING_AGG(DISTINCT s.name, ', ' ORDER BY s.name) as "Subjects List"
FROM users u
LEFT JOIN class_arm_combos cac ON cac.class_teacher_id = u.id
LEFT JOIN subject_teacher_assignments sta ON sta.teacher_id = u.id AND sta.school_id = u.school_id
LEFT JOIN subjects s ON sta.subject_id = s.id
WHERE u.role = 'TEACHER'
GROUP BY u.id, u.full_name, u.email, u.school_id
ORDER BY u.full_name;

-- ============================================================================
-- STEP 7: DETAILED VERIFICATION - Show exactly what's linked
-- ============================================================================

SELECT 'DETAILED ASSIGNMENT BREAKDOWN' as step;

SELECT 
  u.full_name as "Teacher",
  c.name as "Class",
  a.name as "Arm",
  COUNT(sta.id) as "Subjects Assigned"
FROM users u
JOIN class_arm_combos cac ON cac.class_teacher_id = u.id
JOIN classes c ON cac.class_id = c.id
JOIN arms a ON cac.arm_id = a.id
LEFT JOIN subject_teacher_assignments sta ON sta.teacher_id = u.id AND sta.class_arm_combo_id = cac.id
WHERE u.role = 'TEACHER'
GROUP BY u.id, u.full_name, c.name, a.name, cac.id
ORDER BY u.full_name, c.name, a.name;

-- ============================================================================
-- SUCCESS! ✅
-- ============================================================================
-- If you see teacher names and numbers > 0 above, the linking is COMPLETE!
--
-- Next steps:
-- 1. Close Supabase
-- 2. Go to your app at http://localhost:3000
-- 3. Logout completely
-- 4. Close browser entirely
-- 5. Reopen browser and login as teacher
-- 6. Go to /teacher/dashboard
-- 7. You should now see:
--    ✓ My Classes: Shows 1 or more
--    ✓ My Subjects: Shows 5 or more
--    ✓ Students tab: Shows students
--    ✓ CBT subject dropdown: Shows subject names!
--
-- ============================================================================
