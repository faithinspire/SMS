-- Migration 078: Universal Student Enrollment Recovery
-- PURPOSE: Fix student loading issues across ALL schools by:
-- 1. Ensuring all schools have proper class/subject structure
-- 2. Auto-assigning teachers to all subjects in their classes
-- 3. Retroactively enrolling all students in their applicable subjects
-- 4. Verifying complete enrollment chain for all schools

-- ============================================================================
-- PART 1: Ensure all schools have default classes/subjects
-- ============================================================================

-- This re-runs the setup for any school that might be missing it
DO $$
DECLARE
  school_rec RECORD;
BEGIN
  -- Find all schools that exist but have no classes
  FOR school_rec IN 
    SELECT s.id, s.name 
    FROM schools s
    WHERE NOT EXISTS (
      SELECT 1 FROM classes WHERE school_id = s.id LIMIT 1
    )
    AND s.status = 'ACTIVE'
  LOOP
    RAISE NOTICE 'Populating default data for school: % (%)', school_rec.name, school_rec.id;
    PERFORM create_default_school_data(school_rec.id);
  END LOOP;
END $$;

-- ============================================================================
-- PART 2: Ensure all subjects have applicable_to_levels set
-- ============================================================================

-- For any subject missing applicable_to_levels, set based on common patterns
UPDATE subjects
SET applicable_to_levels = ARRAY[1,2,3,4,5,6]
WHERE school_id IN (SELECT id FROM schools WHERE type IN ('PRIMARY', 'BOTH'))
  AND applicable_to_levels IS NULL OR applicable_to_levels = '{}'
  AND LOWER(name) NOT IN ('biology', 'chemistry', 'physics', 'history', 'geography', 'economics', 'accounting', 'government', 'literature in english', 'further mathematics', 'agricultural science', 'technical drawing', 'computer science');

UPDATE subjects
SET applicable_to_levels = ARRAY[9,10,11,12,13,14]
WHERE school_id IN (SELECT id FROM schools WHERE type IN ('SECONDARY', 'BOTH'))
  AND applicable_to_levels IS NULL OR applicable_to_levels = '{}';

-- ============================================================================
-- PART 3: Auto-assign all teachers to subjects in their classes
-- ============================================================================

-- Find teachers assigned to classes, then assign them to teach all subjects in those classes
INSERT INTO subject_teacher_assignments (id, school_id, subject_id, class_arm_combo_id, teacher_id)
SELECT 
  gen_random_uuid(),
  cac.school_id,
  s.id,
  cac.id,
  cac.class_teacher_id
FROM class_arm_combos cac
JOIN classes c ON cac.class_id = c.id
JOIN subjects s ON s.school_id = cac.school_id
  AND s.applicable_to_levels && ARRAY[c.level]
WHERE cac.class_teacher_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM subject_teacher_assignments sta
    WHERE sta.subject_id = s.id
      AND sta.class_arm_combo_id = cac.id
      AND sta.teacher_id = cac.class_teacher_id
      AND sta.school_id = cac.school_id
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PART 4: Retroactively enroll all students in their applicable subjects
-- ============================================================================

INSERT INTO student_subjects (id, student_id, subject_id, school_id)
SELECT 
  gen_random_uuid(),
  st.id,
  s.id,
  st.school_id
FROM students st
JOIN class_arm_combos cac ON st.class_arm_combo_id = cac.id
JOIN classes c ON cac.class_id = c.id
JOIN subjects s ON s.school_id = st.school_id
  AND s.applicable_to_levels && ARRAY[c.level]
WHERE NOT EXISTS (
  SELECT 1 FROM student_subjects ss
  WHERE ss.student_id = st.id 
    AND ss.subject_id = s.id
    AND ss.school_id = st.school_id
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PART 5: Verification - Show enrollment status by school
-- ============================================================================

-- Show comprehensive enrollment status
SELECT 
  s.name as school_name,
  COUNT(DISTINCT st.id) as total_students,
  COUNT(DISTINCT ss.student_id) as enrolled_students,
  COUNT(DISTINCT ss.id) as total_enrollments,
  COUNT(DISTINCT c.id) as total_classes,
  COUNT(DISTINCT sb.id) as total_subjects,
  COUNT(DISTINCT cac.class_teacher_id) as teachers_assigned_to_classes,
  COUNT(DISTINCT sta.teacher_id) as teachers_with_subject_assignments
FROM schools s
LEFT JOIN students st ON st.school_id = s.id AND st.school_id IS NOT NULL
LEFT JOIN student_subjects ss ON ss.school_id = s.id
LEFT JOIN classes c ON c.school_id = s.id
LEFT JOIN subjects sb ON sb.school_id = s.id
LEFT JOIN class_arm_combos cac ON cac.school_id = s.id
LEFT JOIN subject_teacher_assignments sta ON sta.school_id = s.id
WHERE s.status = 'ACTIVE'
GROUP BY s.id, s.name
ORDER BY s.created_at DESC;

-- ============================================================================
-- PART 6: Show any schools with incomplete setup (data quality check)
-- ============================================================================

-- Identify schools with students but no enrollments (DATA BUG)
SELECT 
  s.id,
  s.name,
  COUNT(DISTINCT st.id) as students_without_enrollments
FROM schools s
JOIN students st ON st.school_id = s.id
LEFT JOIN student_subjects ss ON ss.student_id = st.id
WHERE ss.id IS NULL
GROUP BY s.id, s.name
HAVING COUNT(DISTINCT st.id) > 0;

-- Identify schools with subjects but missing applicable_to_levels
SELECT 
  s.id,
  s.name,
  COUNT(*) as subjects_without_applicability
FROM schools s
JOIN subjects sb ON sb.school_id = s.id
WHERE sb.applicable_to_levels IS NULL OR sb.applicable_to_levels = '{}'
GROUP BY s.id, s.name
HAVING COUNT(*) > 0;

-- Identify teachers not assigned to any subjects
SELECT 
  s.name as school_name,
  u.full_name as teacher_name,
  cac.id as class_id,
  CONCAT(c.name, ' ', a.name) as class_display,
  COUNT(DISTINCT sta.subject_id) as subject_assignments
FROM schools s
JOIN class_arm_combos cac ON cac.school_id = s.id
JOIN classes c ON c.id = cac.class_id
JOIN arms a ON a.id = cac.arm_id
JOIN users u ON u.id = cac.class_teacher_id
LEFT JOIN subject_teacher_assignments sta ON sta.class_arm_combo_id = cac.id 
  AND sta.teacher_id = cac.class_teacher_id 
  AND sta.school_id = s.id
WHERE cac.class_teacher_id IS NOT NULL
GROUP BY s.id, s.name, u.id, u.full_name, cac.id, c.name, a.name
HAVING COUNT(DISTINCT sta.subject_id) = 0;
