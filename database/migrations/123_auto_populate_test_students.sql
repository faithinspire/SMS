-- ============================================================================
-- Migration 123: Auto-Populate Test Students for All Classes
-- ============================================================================
-- PURPOSE: Automatically create test student records for all class_arm_combos
-- in all schools. This ensures that:
-- 1. Each class has students appearing in results pages
-- 2. Students are properly linked to their class_arm_combo_id
-- 3. Test data exists for school admins, principals, and headteachers
--
-- Creates 10 test students per class with proper enrollment
-- ============================================================================

BEGIN;

-- Function to generate test students for a specific class_arm_combo
CREATE OR REPLACE FUNCTION populate_test_students_for_class(
  class_combo_id_param UUID,
  school_id_param UUID,
  class_name_param TEXT,
  arm_name_param TEXT
) RETURNS INT AS $$
DECLARE
  student_count INT := 10;
  i INT;
  admission_num TEXT;
  student_id UUID;
  user_id UUID;
  student_name TEXT;
  base_year INT;
BEGIN
  -- Determine base year from current date
  base_year := EXTRACT(YEAR FROM NOW())::INT;

  FOR i IN 1..student_count LOOP
    -- Generate admission number: CLASS_ARM_SEQUENCE (e.g., "P1A001", "P1A002")
    admission_num := REPLACE(UPPER(class_name_param), ' ', '') || UPPER(arm_name_param) || 
                     LPAD(i::TEXT, 3, '0');
    
    -- Generate test student name
    student_name := 'Test Student ' || i || ' (' || class_name_param || ' ' || arm_name_param || ')';

    -- Create auth user record (simulate user creation)
    user_id := gen_random_uuid();

    -- Insert student record with class_arm_combo_id set
    -- Using ON CONFLICT to skip if student already exists
    INSERT INTO students (
      id,
      user_id,
      school_id,
      admission_number,
      class_arm_combo_id,
      date_of_birth,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      user_id,
      school_id_param,
      admission_num,
      class_combo_id_param,
      MAKE_DATE(base_year - 10, RANDOM() * 11 + 1, RANDOM() * 28 + 1),
      NOW(),
      NOW()
    )
    ON CONFLICT (school_id, admission_number) DO NOTHING;

  END LOOP;

  RETURN student_count;
END;
$$ LANGUAGE plpgsql;

-- Main loop: Generate students for all class_arm_combos that don't have enough students
DO $$
DECLARE
  class_record RECORD;
  student_count INT;
  total_created INT := 0;
  total_classes INT := 0;
BEGIN
  -- For each class_arm_combo, check if it has students
  FOR class_record IN 
    SELECT 
      cac.id as class_combo_id,
      cac.school_id,
      c.name as class_name,
      a.name as arm_name,
      COUNT(s.id) as existing_student_count
    FROM class_arm_combos cac
    JOIN classes c ON cac.class_id = c.id
    JOIN arms a ON cac.arm_id = a.id
    LEFT JOIN students s ON s.class_arm_combo_id = cac.id
    GROUP BY cac.id, cac.school_id, c.name, a.name
    ORDER BY cac.school_id, c.name, a.name
  LOOP
    total_classes := total_classes + 1;

    -- If class has 0 or very few students, populate test students
    IF class_record.existing_student_count < 5 THEN
      RAISE NOTICE 'Populating % % with 10 test students (currently has %)', 
        class_record.class_name, 
        class_record.arm_name,
        class_record.existing_student_count;

      student_count := populate_test_students_for_class(
        class_record.class_combo_id,
        class_record.school_id,
        class_record.class_name,
        class_record.arm_name
      );

      total_created := total_created + student_count;
    ELSE
      RAISE NOTICE 'Skipping % % - already has % students', 
        class_record.class_name,
        class_record.arm_name,
        class_record.existing_student_count;
    END IF;
  END LOOP;

  RAISE NOTICE '========================================================';
  RAISE NOTICE 'AUTO-POPULATION COMPLETE';
  RAISE NOTICE 'Total classes processed: %', total_classes;
  RAISE NOTICE 'Approximate students created: %', total_created;
  RAISE NOTICE '========================================================';
END $$;

-- Create indexes for student queries (if not exist)
CREATE INDEX IF NOT EXISTS idx_students_class_arm_combo 
  ON students(class_arm_combo_id) 
  WHERE class_arm_combo_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_students_school_active
  ON students(school_id) 
  WHERE deleted_at IS NULL;

-- Verify the population
SELECT 
  'Student Population Verification' as status,
  COUNT(DISTINCT school_id) as schools,
  COUNT(DISTINCT class_arm_combo_id) as classes_with_students,
  COUNT(*) as total_students,
  COUNT(CASE WHEN class_arm_combo_id IS NULL THEN 1 END) as students_without_class,
  MIN(created_at) as oldest_student,
  MAX(created_at) as newest_student
FROM students;

-- Show sample data
SELECT 
  s.id,
  s.admission_number,
  s.class_arm_combo_id,
  c.name as class_name,
  a.name as arm_name,
  sc.name as school_name,
  COUNT(*) OVER (PARTITION BY s.class_arm_combo_id) as students_in_class
FROM students s
LEFT JOIN class_arm_combos cac ON s.class_arm_combo_id = cac.id
LEFT JOIN classes c ON cac.class_id = c.id
LEFT JOIN arms a ON cac.arm_id = a.id
LEFT JOIN schools sc ON s.school_id = sc.id
ORDER BY sc.name, c.name, a.name, s.admission_number
LIMIT 30;

COMMIT;

-- ============================================================================
-- End of Migration 123
-- ============================================================================
