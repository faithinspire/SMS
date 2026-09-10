-- ============================================================================
-- AUTO-CREATE CLASSES AND SUBJECTS FOR NEW SCHOOLS
-- This migration creates a PostgreSQL trigger that automatically populates
-- default classes and subjects when a new school is registered
-- ============================================================================

-- ============================================================================
-- Step 1: Create a function that populates default data for a school
-- ============================================================================

CREATE OR REPLACE FUNCTION create_default_school_data(p_school_id UUID)
RETURNS void AS $$
DECLARE
  class_id UUID;
  class_name TEXT;
  level_num INTEGER;
  class_type TEXT;
  arm_names TEXT[] := ARRAY['A', 'B', 'C'];
  arm_name TEXT;
  arm_id UUID;
  subject_rec RECORD;
BEGIN
  -- ====================================================================
  -- Create PRIMARY Classes (Prep, Nursery, KG, Primary 1-6)
  -- ====================================================================
  -- Prep
  INSERT INTO classes (id, school_id, name, level, type)
  VALUES (gen_random_uuid(), p_school_id, 'Prep', 0, 'PRIMARY')
  RETURNING id INTO class_id;
  
  FOREACH arm_name IN ARRAY arm_names LOOP
    arm_id := gen_random_uuid();
    INSERT INTO arms (id, class_id, school_id, name, capacity)
    VALUES (arm_id, class_id, p_school_id, arm_name, 40);
    INSERT INTO class_arm_combos (id, school_id, class_id, arm_id)
    VALUES (gen_random_uuid(), p_school_id, class_id, arm_id);
  END LOOP;

  -- Nursery
  INSERT INTO classes (id, school_id, name, level, type)
  VALUES (gen_random_uuid(), p_school_id, 'Nursery', 1, 'PRIMARY')
  RETURNING id INTO class_id;
  
  FOREACH arm_name IN ARRAY arm_names LOOP
    arm_id := gen_random_uuid();
    INSERT INTO arms (id, class_id, school_id, name, capacity)
    VALUES (arm_id, class_id, p_school_id, arm_name, 40);
    INSERT INTO class_arm_combos (id, school_id, class_id, arm_id)
    VALUES (gen_random_uuid(), p_school_id, class_id, arm_id);
  END LOOP;

  -- Kindergarten
  INSERT INTO classes (id, school_id, name, level, type)
  VALUES (gen_random_uuid(), p_school_id, 'Kindergarten', 2, 'PRIMARY')
  RETURNING id INTO class_id;
  
  FOREACH arm_name IN ARRAY arm_names LOOP
    arm_id := gen_random_uuid();
    INSERT INTO arms (id, class_id, school_id, name, capacity)
    VALUES (arm_id, class_id, p_school_id, arm_name, 40);
    INSERT INTO class_arm_combos (id, school_id, class_id, arm_id)
    VALUES (gen_random_uuid(), p_school_id, class_id, arm_id);
  END LOOP;

  -- Primary 1-6
  FOR level_num IN 3..8 LOOP
    INSERT INTO classes (id, school_id, name, level, type)
    VALUES (gen_random_uuid(), p_school_id, 'Primary ' || (level_num - 2), level_num, 'PRIMARY')
    RETURNING id INTO class_id;

    -- Create arms for each primary class (A, B, C)
    FOREACH arm_name IN ARRAY arm_names LOOP
      arm_id := gen_random_uuid();
      INSERT INTO arms (id, class_id, school_id, name, capacity)
      VALUES (arm_id, class_id, p_school_id, arm_name, 40);

      -- Create class_arm_combo
      INSERT INTO class_arm_combos (id, school_id, class_id, arm_id)
      VALUES (gen_random_uuid(), p_school_id, class_id, arm_id);
    END LOOP;
  END LOOP;

  -- ====================================================================
  -- Create SECONDARY Classes (JSS 1-3, SSS 1-3)
  -- ====================================================================
  -- JSS 1-3 (levels 9-11)
  FOR level_num IN 9..11 LOOP
    class_name := 'JSS ' || (level_num - 8);
    INSERT INTO classes (id, school_id, name, level, type)
    VALUES (gen_random_uuid(), p_school_id, class_name, level_num, 'SECONDARY')
    RETURNING id INTO class_id;

    -- Create arms for each secondary class (A, B, C)
    FOREACH arm_name IN ARRAY arm_names LOOP
      arm_id := gen_random_uuid();
      INSERT INTO arms (id, class_id, school_id, name, capacity)
      VALUES (arm_id, class_id, p_school_id, arm_name, 40);

      -- Create class_arm_combo
      INSERT INTO class_arm_combos (id, school_id, class_id, arm_id)
      VALUES (gen_random_uuid(), p_school_id, class_id, arm_id);
    END LOOP;
  END LOOP;

  -- SSS 1-3 (levels 12-14)
  FOR level_num IN 12..14 LOOP
    class_name := 'SSS ' || (level_num - 11);
    INSERT INTO classes (id, school_id, name, level, type)
    VALUES (gen_random_uuid(), p_school_id, class_name, level_num, 'SECONDARY')
    RETURNING id INTO class_id;

    -- Create arms for each secondary class (A, B, C)
    FOREACH arm_name IN ARRAY arm_names LOOP
      arm_id := gen_random_uuid();
      INSERT INTO arms (id, class_id, school_id, name, capacity)
      VALUES (arm_id, class_id, p_school_id, arm_name, 40);

      -- Create class_arm_combo
      INSERT INTO class_arm_combos (id, school_id, class_id, arm_id)
      VALUES (gen_random_uuid(), p_school_id, class_id, arm_id);
    END LOOP;
  END LOOP;

  -- ====================================================================
  -- Create STREAMS (for SS1-SS3 classes)
  -- NOTE: Only create if streams table exists (it's created in migration 016)
  -- ====================================================================
  BEGIN
    INSERT INTO streams (id, school_id, name)
    VALUES 
      (gen_random_uuid(), p_school_id, 'Science'),
      (gen_random_uuid(), p_school_id, 'Commercial'),
      (gen_random_uuid(), p_school_id, 'Humanities'),
      (gen_random_uuid(), p_school_id, 'Technical')
    ON CONFLICT (school_id, name) DO NOTHING;
  EXCEPTION WHEN undefined_table THEN
    -- Table doesn't exist yet, skip silently
    NULL;
  END;

  -- ====================================================================
  -- Create PRIMARY SUBJECTS (Levels 1-6)
  -- ====================================================================
  INSERT INTO subjects (id, school_id, name, code, applicable_to_levels)
  VALUES
    (gen_random_uuid(), p_school_id, 'English Language', 'ENG', ARRAY[1,2,3,4,5,6]),
    (gen_random_uuid(), p_school_id, 'Mathematics', 'MATH', ARRAY[1,2,3,4,5,6]),
    (gen_random_uuid(), p_school_id, 'Science', 'SCI', ARRAY[1,2,3,4,5,6]),
    (gen_random_uuid(), p_school_id, 'Social Studies', 'SS', ARRAY[1,2,3,4,5,6]),
    (gen_random_uuid(), p_school_id, 'Civic Education', 'CIV', ARRAY[1,2,3,4,5,6]),
    (gen_random_uuid(), p_school_id, 'Physical Education', 'PE', ARRAY[1,2,3,4,5,6]),
    (gen_random_uuid(), p_school_id, 'Art & Craft', 'ART', ARRAY[1,2,3,4,5,6]),
    (gen_random_uuid(), p_school_id, 'Music', 'MUS', ARRAY[1,2,3,4,5,6]),
    (gen_random_uuid(), p_school_id, 'Home Economics', 'HE', ARRAY[1,2,3,4,5,6]),
    (gen_random_uuid(), p_school_id, 'Information Technology', 'ICT', ARRAY[3,4,5,6])
  ON CONFLICT (school_id, name) DO NOTHING;

  -- ====================================================================
  -- Create SECONDARY SUBJECTS
  -- ====================================================================
  -- For all secondary levels (7-12)
  INSERT INTO subjects (id, school_id, name, code, applicable_to_levels)
  VALUES
    (gen_random_uuid(), p_school_id, 'English', 'ENG', ARRAY[9,10,11,12,13,14]),
    (gen_random_uuid(), p_school_id, 'Mathematics', 'MATH', ARRAY[9,10,11,12,13,14]),
    (gen_random_uuid(), p_school_id, 'Biology', 'BIO', ARRAY[9,10,11,12,13,14]),
    (gen_random_uuid(), p_school_id, 'Chemistry', 'CHEM', ARRAY[9,10,11,12,13,14]),
    (gen_random_uuid(), p_school_id, 'Physics', 'PHY', ARRAY[9,10,11,12,13,14]),
    (gen_random_uuid(), p_school_id, 'History', 'HIST', ARRAY[9,10,11,12,13,14]),
    (gen_random_uuid(), p_school_id, 'Geography', 'GEO', ARRAY[9,10,11,12,13,14]),
    (gen_random_uuid(), p_school_id, 'Civic Education', 'CIV', ARRAY[9,10,11,12,13,14]),
    (gen_random_uuid(), p_school_id, 'Physical Education', 'PE', ARRAY[9,10,11,12,13,14]),
    (gen_random_uuid(), p_school_id, 'Agricultural Science', 'AGR', ARRAY[9,10,11,12,13,14]),
    (gen_random_uuid(), p_school_id, 'Technical Drawing', 'TD', ARRAY[9,10,11,12,13,14]),
    (gen_random_uuid(), p_school_id, 'Computer Science', 'CS', ARRAY[9,10,11,12,13,14])
  ON CONFLICT (school_id, name) DO NOTHING;

  -- For SSS only (12-14)
  INSERT INTO subjects (id, school_id, name, code, applicable_to_levels)
  VALUES
    (gen_random_uuid(), p_school_id, 'Economics', 'ECON', ARRAY[12,13,14]),
    (gen_random_uuid(), p_school_id, 'Accounting', 'ACC', ARRAY[12,13,14]),
    (gen_random_uuid(), p_school_id, 'Government', 'GOV', ARRAY[12,13,14]),
    (gen_random_uuid(), p_school_id, 'Literature In English', 'LIT', ARRAY[12,13,14]),
    (gen_random_uuid(), p_school_id, 'Further Mathematics', 'FM', ARRAY[12,13,14])
  ON CONFLICT (school_id, name) DO NOTHING;

  -- Log success
  RAISE NOTICE 'Default data created for school: %', p_school_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Step 2: Create a trigger to call the function when a school is created
-- ============================================================================

-- First, drop the old trigger if it exists
DROP TRIGGER IF EXISTS trigger_create_default_school_data ON schools;

-- Create the trigger function
CREATE OR REPLACE FUNCTION trigger_create_default_school_data_fn()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the function to create default data
  PERFORM create_default_school_data(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach the trigger to the schools table
CREATE TRIGGER trigger_create_default_school_data
  AFTER INSERT ON schools
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_default_school_data_fn();

-- ============================================================================
-- Step 3: Populate existing schools that don't have data yet
-- ============================================================================

-- For any existing schools without classes, create default data
DO $$
DECLARE
  school_rec RECORD;
BEGIN
  FOR school_rec IN SELECT id FROM schools WHERE id NOT IN (SELECT DISTINCT school_id FROM classes WHERE school_id IS NOT NULL) LOOP
    PERFORM create_default_school_data(school_rec.id);
  END LOOP;
END $$;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check if data was created for schools:
-- SELECT 
--   s.id,
--   s.name,
--   COUNT(DISTINCT c.id) as class_count,
--   COUNT(DISTINCT sb.id) as subject_count
-- FROM schools s
-- LEFT JOIN classes c ON c.school_id = s.id
-- LEFT JOIN subjects sb ON sb.school_id = s.id
-- GROUP BY s.id, s.name
-- ORDER BY s.created_at DESC;

-- Check classes for a specific school:
-- SELECT name, level, type FROM classes WHERE school_id = 'YOUR_SCHOOL_UUID' ORDER BY level;

-- Check subjects for a specific school:
-- SELECT name, code, applicable_to_levels FROM subjects WHERE school_id = 'YOUR_SCHOOL_UUID' ORDER BY name;
