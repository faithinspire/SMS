-- Migration 022: Populate test data for teacher and student registration
-- This adds classes, arms, subjects and combinations for testing

-- Get the first school ID (assuming LEADWAY SCHOOLS exists)
DO $$
DECLARE
  v_school_id UUID;
  v_class_primary_id UUID;
  v_class_secondary_id UUID;
  v_arm_a_id UUID;
  v_arm_b_id UUID;
  v_subject_math_id UUID;
  v_subject_english_id UUID;
  v_subject_science_id UUID;
BEGIN
  -- Get first school
  SELECT id INTO v_school_id FROM schools LIMIT 1;
  
  IF v_school_id IS NULL THEN
    RAISE NOTICE 'No schools found, creating test data skipped';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Using school: %', v_school_id;
  
  -- Delete existing test data for this school (if any)
  DELETE FROM class_arm_combos WHERE school_id = v_school_id;
  DELETE FROM classes WHERE school_id = v_school_id;
  DELETE FROM arms WHERE school_id = v_school_id;
  DELETE FROM subjects WHERE school_id = v_school_id;
  
  -- Insert Arms
  INSERT INTO arms (school_id, name, created_at) VALUES
    (v_school_id, 'A', NOW()),
    (v_school_id, 'B', NOW())
  RETURNING id INTO v_arm_a_id, v_arm_b_id;
  
  -- Insert Classes
  INSERT INTO classes (school_id, name, level, type, created_at) VALUES
    (v_school_id, 'Class 1', '1', 'PRIMARY', NOW()),
    (v_school_id, 'Class 2', '2', 'PRIMARY', NOW()),
    (v_school_id, 'Class 3', '3', 'PRIMARY', NOW()),
    (v_school_id, 'Class 4', '4', 'SECONDARY', NOW()),
    (v_school_id, 'Class 5', '5', 'SECONDARY', NOW()),
    (v_school_id, 'Class 6', '6', 'SECONDARY', NOW())
  RETURNING id INTO v_class_primary_id, v_class_secondary_id;
  
  -- Insert Subjects
  INSERT INTO subjects (school_id, name, code, applicable_to_levels, created_at) VALUES
    (v_school_id, 'Mathematics', 'MATH', '[1, 2, 3, 4, 5, 6]', NOW()),
    (v_school_id, 'English Language', 'ENG', '[1, 2, 3, 4, 5, 6]', NOW()),
    (v_school_id, 'Science', 'SCI', '[1, 2, 3, 4, 5, 6]', NOW()),
    (v_school_id, 'Social Studies', 'SS', '[1, 2, 3, 4, 5, 6]', NOW()),
    (v_school_id, 'Physical Education', 'PE', '[1, 2, 3, 4, 5, 6]', NOW()),
    (v_school_id, 'Arts', 'ART', '[1, 2, 3, 4, 5, 6]', NOW()),
    (v_school_id, 'Computer Science', 'CS', '[4, 5, 6]', NOW()),
    (v_school_id, 'History', 'HIST', '[4, 5, 6]', NOW()),
    (v_school_id, 'Literature', 'LIT', '[4, 5, 6]', NOW())
  RETURNING id INTO v_subject_math_id, v_subject_english_id, v_subject_science_id;
  
  -- Insert Class-Arm Combinations for all classes
  INSERT INTO class_arm_combos (school_id, class_id, arm_id, created_at)
  SELECT v_school_id, c.id, a.id, NOW()
  FROM classes c
  CROSS JOIN arms a
  WHERE c.school_id = v_school_id;
  
  RAISE NOTICE 'Test data created successfully!';
  RAISE NOTICE 'Created classes, arms, and subjects for school: %', v_school_id;
  
END $$;
