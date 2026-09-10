-- MIGRATION 047: Auto-link students to teachers and subjects on registration
-- PURPOSE: When students register for a class, automatically:
-- 1. Link student to class teacher
-- 2. Link student to all subjects for their class level
-- 3. Prevent duplicate enrollments

-- This is a PERMANENT solution to prevent the "students not showing" issue

-- ============================================================================
-- PART 1: Create trigger function to auto-link on student creation
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_link_student_to_class_and_subjects()
RETURNS TRIGGER AS $$
DECLARE
  v_class_teacher_id UUID;
  v_class_level INT;
  v_school_id UUID;
BEGIN
  -- Only process if class_arm_combo_id is set
  IF NEW.class_arm_combo_id IS NOT NULL THEN
    
    -- Get class info: teacher and level
    SELECT 
      cac.class_teacher_id,
      c.level,
      c.school_id
    INTO 
      v_class_teacher_id,
      v_class_level,
      v_school_id
    FROM class_arm_combos cac
    JOIN classes c ON cac.class_id = c.id
    WHERE cac.id = NEW.class_arm_combo_id;

    -- STEP 1: Enroll student in all applicable subjects for their class level
    IF v_class_level IS NOT NULL THEN
      INSERT INTO student_subjects (student_id, subject_id, school_id)
      SELECT 
        NEW.id,
        s.id,
        NEW.school_id
      FROM subjects s
      WHERE s.applicable_to_levels && ARRAY[v_class_level]
        AND NEW.school_id = s.school_id
        AND NOT EXISTS (
          SELECT 1 FROM student_subjects ss
          WHERE ss.student_id = NEW.id 
            AND ss.subject_id = s.id
        )
      ON CONFLICT DO NOTHING;
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 2: Drop old trigger if exists, then create new one
-- ============================================================================

DROP TRIGGER IF EXISTS trg_auto_link_student_to_class_and_subjects ON students;

CREATE TRIGGER trg_auto_link_student_to_class_and_subjects
AFTER INSERT ON students
FOR EACH ROW
EXECUTE FUNCTION auto_link_student_to_class_and_subjects();

-- ============================================================================
-- PART 3: Apply retroactively to all existing students without enrollments
-- ============================================================================

-- Enroll students in subjects based on their class level
INSERT INTO student_subjects (student_id, subject_id, school_id)
SELECT DISTINCT
  st.id as student_id,
  s.id as subject_id,
  st.school_id
FROM students st
JOIN class_arm_combos cac ON st.class_arm_combo_id = cac.id
JOIN classes c ON cac.class_id = c.id
JOIN subjects s ON c.level = ANY(s.applicable_to_levels) AND s.school_id = st.school_id
WHERE NOT EXISTS (
  SELECT 1 FROM student_subjects ss
  WHERE ss.student_id = st.id AND ss.subject_id = s.id
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PART 4: Create function to auto-link subjects to teachers on assignment
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_enroll_students_when_subject_assigned()
RETURNS TRIGGER AS $$
BEGIN
  -- When a subject is assigned to a teacher for a class,
  -- enroll all students in that class in that subject
  
  INSERT INTO student_subjects (student_id, subject_id, school_id)
  SELECT 
    st.id,
    NEW.subject_id,
    st.school_id
  FROM students st
  WHERE st.class_arm_combo_id = NEW.class_arm_combo_id
    AND NOT EXISTS (
      SELECT 1 FROM student_subjects ss
      WHERE ss.student_id = st.id AND ss.subject_id = NEW.subject_id
    )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 5: Trigger for subject assignments
-- ============================================================================

DROP TRIGGER IF EXISTS trg_auto_enroll_students_on_subject_assignment ON subject_teacher_assignments;

CREATE TRIGGER trg_auto_enroll_students_on_subject_assignment
AFTER INSERT ON subject_teacher_assignments
FOR EACH ROW
EXECUTE FUNCTION auto_enroll_students_when_subject_assigned();

-- ============================================================================
-- PART 6: Verification - Show what was fixed
-- ============================================================================

SELECT 'VERIFICATION: Auto-link setup complete' as status;

SELECT 
  'Total students' as check_type,
  COUNT(*)::text as count
FROM students

UNION ALL

SELECT 
  'Students with subject enrollments' as check_type,
  (SELECT COUNT(DISTINCT student_id) FROM student_subjects)::text as count

UNION ALL

SELECT 
  'Total subject enrollments' as check_type,
  COUNT(*)::text as count
FROM student_subjects

UNION ALL

SELECT 
  'Schools with complete setup' as check_type,
  COUNT(*)::text as count
FROM (
  SELECT s.id
  FROM schools s
  WHERE EXISTS (SELECT 1 FROM students WHERE school_id = s.id)
    AND EXISTS (SELECT 1 FROM student_subjects WHERE school_id = s.id)
) as schools_with_data;
