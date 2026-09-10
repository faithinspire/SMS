-- ============================================================================
-- SUPABASE DATA LINKING & VERIFICATION
-- Run this in Supabase SQL Editor to link registered teachers to classes/subjects
-- ============================================================================

-- ============================================================================
-- STEP 1: VERIFY TEACHERS EXIST
-- ============================================================================

-- List all registered teachers
SELECT 
  u.id,
  u.full_name,
  u.email,
  u.school_id,
  u.role,
  t.id as teacher_record_id
FROM users u
LEFT JOIN teachers t ON u.id = t.user_id
WHERE u.role = 'TEACHER'
ORDER BY u.created_at DESC;

-- ============================================================================
-- STEP 2: VERIFY CLASSES EXIST
-- ============================================================================

-- List all classes with arms
SELECT 
  c.id,
  c.name as class_name,
  c.level,
  c.school_id,
  a.id as arm_id,
  a.name as arm_name,
  cac.id as class_arm_combo_id,
  u.full_name as class_teacher_name
FROM class_arm_combos cac
JOIN classes c ON cac.class_id = c.id
JOIN arms a ON cac.arm_id = a.id
LEFT JOIN users u ON cac.class_teacher_id = u.id
ORDER BY c.name, a.name;

-- ============================================================================
-- STEP 3: VERIFY SUBJECTS EXIST
-- ============================================================================

-- List all subjects
SELECT 
  id,
  name,
  code,
  school_id,
  applicable_to_levels,
  created_at
FROM subjects
ORDER BY name;

-- ============================================================================
-- STEP 4: CHECK CURRENT ASSIGNMENTS
-- ============================================================================

-- List all subject-teacher assignments
SELECT 
  sta.id,
  u.full_name as teacher_name,
  s.name as subject_name,
  c.name as class_name,
  a.name as arm_name,
  sta.school_id
FROM subject_teacher_assignments sta
JOIN users u ON sta.teacher_id = u.id
JOIN subjects s ON sta.subject_id = s.id
JOIN class_arm_combos cac ON sta.class_arm_combo_id = cac.id
JOIN classes c ON cac.class_id = c.id
JOIN arms a ON cac.arm_id = a.id
ORDER BY u.full_name, s.name;

-- ============================================================================
-- STEP 5: IDENTIFY GAPS (Teachers with no assignments)
-- ============================================================================

-- Teachers with no class assignments
SELECT 
  u.id,
  u.full_name,
  u.email,
  COUNT(sta.id) as subject_count,
  COUNT(CASE WHEN cac.class_teacher_id = u.id THEN 1 END) as class_count
FROM users u
LEFT JOIN subject_teacher_assignments sta ON u.id = sta.teacher_id
LEFT JOIN class_arm_combos cac ON cac.class_teacher_id = u.id
WHERE u.role = 'TEACHER'
GROUP BY u.id, u.full_name, u.email
HAVING COUNT(sta.id) = 0 AND COUNT(CASE WHEN cac.class_teacher_id = u.id THEN 1 END) = 0;

-- ============================================================================
-- STEP 6: AUTO-LINK TEACHERS TO CLASSES & SUBJECTS
-- ============================================================================

-- Step 6a: If there are unassigned teachers and classes, auto-assign first teacher to first class
DO $$
DECLARE
  v_teacher_id UUID;
  v_class_arm_combo_id UUID;
  v_school_id UUID;
BEGIN
  -- Get first teacher with no class assignment
  SELECT u.id, u.school_id INTO v_teacher_id, v_school_id
  FROM users u
  WHERE u.role = 'TEACHER'
  AND NOT EXISTS (
    SELECT 1 FROM class_arm_combos cac 
    WHERE cac.class_teacher_id = u.id
  )
  LIMIT 1;
  
  IF v_teacher_id IS NOT NULL THEN
    -- Get first class-arm combo without a teacher
    SELECT cac.id INTO v_class_arm_combo_id
    FROM class_arm_combos cac
    WHERE cac.school_id = v_school_id
    AND cac.class_teacher_id IS NULL
    LIMIT 1;
    
    IF v_class_arm_combo_id IS NOT NULL THEN
      -- Assign teacher as class teacher
      UPDATE class_arm_combos
      SET class_teacher_id = v_teacher_id
      WHERE id = v_class_arm_combo_id;
      
      RAISE NOTICE 'Assigned teacher % to class %', v_teacher_id, v_class_arm_combo_id;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- STEP 7: AUTO-LINK TEACHERS TO SUBJECTS IN THEIR CLASSES
-- ============================================================================

-- Auto-assign unassigned subjects in a class to that class's teacher
INSERT INTO subject_teacher_assignments (
  school_id,
  subject_id,
  class_arm_combo_id,
  teacher_id
)
SELECT 
  s.school_id,
  s.id as subject_id,
  cac.id as class_arm_combo_id,
  cac.class_teacher_id as teacher_id
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
-- STEP 8: VERIFY LINKING WORKED
-- ============================================================================

-- Show final state - teachers with their assignments
SELECT 
  u.id,
  u.full_name as teacher_name,
  u.email,
  COUNT(DISTINCT CASE WHEN cac.class_teacher_id = u.id THEN cac.id END) as managed_classes,
  COUNT(DISTINCT sta.subject_id) as taught_subjects,
  STRING_AGG(DISTINCT s.name, ', ' ORDER BY s.name) as subjects_list
FROM users u
LEFT JOIN class_arm_combos cac ON cac.class_teacher_id = u.id
LEFT JOIN subject_teacher_assignments sta ON sta.teacher_id = u.id
LEFT JOIN subjects s ON sta.subject_id = s.id
WHERE u.role = 'TEACHER'
GROUP BY u.id, u.full_name, u.email
ORDER BY u.full_name;

-- ============================================================================
-- STEP 9: DEBUGGING - Show exact query teacher dashboard will run
-- ============================================================================

-- This is the EXACT query the teacher dashboard runs
-- Replace TEACHER_ID with actual teacher user ID
SELECT 
  id,
  class_id,
  arm_id,
  classes (id, name, level, type),
  arms (id, name)
FROM class_arm_combos
WHERE class_teacher_id = 'TEACHER_ID'::UUID
AND school_id = 'SCHOOL_ID'::UUID;

-- Subject query
SELECT 
  id,
  subject_id,
  class_arm_combo_id,
  subjects (id, name, code),
  class_arm_combos (
    id,
    classes (id, name, level, type),
    arms (id, name)
  )
FROM subject_teacher_assignments
WHERE teacher_id = 'TEACHER_ID'::UUID
AND school_id = 'SCHOOL_ID'::UUID;

-- ============================================================================
-- STEP 10: CHECK CBT EXAM VISIBILITY
-- ============================================================================

-- Show which subjects/classes teacher can see in CBT dropdown
SELECT DISTINCT
  s.id,
  s.name,
  COUNT(DISTINCT sta.class_arm_combo_id) as num_classes
FROM subject_teacher_assignments sta
JOIN subjects s ON sta.subject_id = s.id
WHERE sta.teacher_id = 'TEACHER_ID'::UUID
GROUP BY s.id, s.name;

-- ============================================================================
-- DONE!
-- ============================================================================
-- If all queries above show data, your linking is working correctly.
-- If not, review the results and run the auto-link steps above.
