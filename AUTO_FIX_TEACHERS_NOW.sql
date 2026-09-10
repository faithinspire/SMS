-- ============================================================================
-- AUTO-FIX: LINK TEACHERS TO CLASSES & SUBJECTS - COPY & PASTE THIS
-- FIXED VERSION: Proper PostgreSQL variable naming (v_ prefix)
-- ============================================================================
-- 
-- ⏱️ TIME: 30 seconds
-- 📝 WHERE: Supabase SQL Editor
-- 🎯 WHAT: Automatically links all registered teachers to classes and subjects
--
-- HOW TO USE:
-- 1. Go to https://egdreueuspmuxhezdpqm.supabase.co
-- 2. Click SQL Editor → New Query
-- 3. Copy this ENTIRE file
-- 4. Paste into the SQL Editor
-- 5. Click RUN
-- 6. Wait for completion
-- 7. Refresh teacher dashboard
-- 8. DONE! ✅
--
-- ============================================================================

-- PART 1: AUTO-ASSIGN UNASSIGNED TEACHERS TO CLASSES
-- ============================================================================
-- Fixed: Use v_ prefix for variables to avoid column name conflicts

DO $$
DECLARE
  v_teacher_id UUID;
  v_school_id UUID;
  v_class_arm_combo_id UUID;
  v_count INT := 0;
BEGIN
  -- Find all teachers without class assignments and assign them
  FOR v_teacher_id, v_school_id IN
    SELECT u.id, u.school_id
    FROM users u
    WHERE u.role = 'TEACHER'
    AND NOT EXISTS (
      SELECT 1 FROM class_arm_combos cac 
      WHERE cac.class_teacher_id = u.id
    )
  LOOP
    -- Find an unassigned class in the same school
    SELECT cac.id INTO v_class_arm_combo_id
    FROM class_arm_combos cac
    WHERE cac.school_id = v_school_id
    AND cac.class_teacher_id IS NULL
    LIMIT 1;
    
    -- Assign teacher to class
    IF v_class_arm_combo_id IS NOT NULL THEN
      UPDATE class_arm_combos
      SET class_teacher_id = v_teacher_id
      WHERE id = v_class_arm_combo_id;
      
      v_count := v_count + 1;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Assigned % teachers to classes', v_count;
END $$;

-- ============================================================================
-- PART 2: AUTO-ASSIGN ALL SUBJECTS TO TEACHERS IN THEIR CLASSES
-- ============================================================================

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
-- PART 3: VERIFY ALL ASSIGNMENTS
-- ============================================================================

SELECT 
  u.full_name as "Teacher Name",
  u.email as "Email",
  COUNT(DISTINCT CASE WHEN cac.class_teacher_id = u.id THEN cac.id END) as "Classes",
  COUNT(DISTINCT sta.subject_id) as "Subjects",
  STRING_AGG(DISTINCT s.name, ', ' ORDER BY s.name) as "Teaching"
FROM users u
LEFT JOIN class_arm_combos cac ON cac.class_teacher_id = u.id
LEFT JOIN subject_teacher_assignments sta ON sta.teacher_id = u.id
LEFT JOIN subjects s ON sta.subject_id = s.id
WHERE u.role = 'TEACHER'
GROUP BY u.id, u.full_name, u.email
ORDER BY u.full_name;

-- ============================================================================
-- DONE! ✅
-- 
-- If the query above shows:
-- ✅ Teachers: Listed with names
-- ✅ Classes: Number > 0
-- ✅ Subjects: Number > 0
-- 
-- Then linking is COMPLETE!
--
-- Next: Refresh teacher dashboard at http://localhost:3000/teacher/dashboard
-- 
-- ============================================================================
