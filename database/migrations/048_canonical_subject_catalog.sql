-- ============================================================================
-- MIGRATION 048: Insert Canonical Subject Catalog (Idempotent)
-- Date: August 31, 2026
-- This migration inserts the complete, authoritative subject catalog
-- Handles both new schools and existing schools
-- ============================================================================

-- Helper function to insert subjects safely (idempotent - no duplicates)
CREATE OR REPLACE FUNCTION upsert_canonical_subjects(p_school_id UUID)
RETURNS TABLE (
  action TEXT,
  subject_name TEXT,
  subject_code TEXT,
  applicable_levels INT[]
) AS $$
BEGIN
  -- Core subjects that apply across PRIMARY (3-8) and SECONDARY (9-14)
  INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
  VALUES 
    (p_school_id, 'English Language', 'ENG', '{3,4,5,6,7,8,9,10,11,12,13,14}')
  ON CONFLICT (school_id, name) DO NOTHING;
  
  INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
  VALUES 
    (p_school_id, 'Mathematics', 'MATH', '{3,4,5,6,7,8,9,10,11,12,13,14}')
  ON CONFLICT (school_id, name) DO NOTHING;

  INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
  VALUES 
    (p_school_id, 'Christian Religious Studies', 'CRS', '{3,4,5,6,7,8,9,10,11,12,13,14}')
  ON CONFLICT (school_id, name) DO NOTHING;

  INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
  VALUES 
    (p_school_id, 'Islamic Studies', 'ISS', '{3,4,5,6,7,8,9,10,11,12,13,14}')
  ON CONFLICT (school_id, name) DO NOTHING;

  INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
  VALUES 
    (p_school_id, 'Physical Education', 'PE', '{3,4,5,6,7,8,9,10,11,12,13,14}')
  ON CONFLICT (school_id, name) DO NOTHING;

  -- PRIMARY SPECIFIC (Levels 3-8)
  INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
  VALUES 
    (p_school_id, 'General Science', 'SCI', '{3,4,5,6,7,8}')
  ON CONFLICT (school_id, name) DO NOTHING;

  INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
  VALUES 
    (p_school_id, 'Social Studies', 'SS', '{3,4,5,6,7,8}')
  ON CONFLICT (school_id, name) DO NOTHING;

  INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
  VALUES 
    (p_school_id, 'Yoruba Language', 'YOR', '{3,4,5,6,7,8,9,10,11,12,13,14}')
  ON CONFLICT (school_id, name) DO NOTHING;

  INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
  VALUES 
    (p_school_id, 'Igbo Language', 'IGB', '{3,4,5,6,7,8,9,10,11,12,13,14}')
  ON CONFLICT (school_id, name) DO NOTHING;

  INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
  VALUES 
    (p_school_id, 'Hausa Language', 'HAU', '{3,4,5,6,7,8,9,10,11,12,13,14}')
  ON CONFLICT (school_id, name) DO NOTHING;

  INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
  VALUES 
    (p_school_id, 'Music', 'MUS', '{3,4,5,6,7,8,9,10,11,12,13,14}')
  ON CONFLICT (school_id, name) DO NOTHING;

  INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
  VALUES 
    (p_school_id, 'Visual Arts', 'VAR', '{3,4,5,6,7,8,9,10,11,12,13,14}')
  ON CONFLICT (school_id, name) DO NOTHING;

  INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
  VALUES 
    (p_school_id, 'Health Education', 'HEA', '{3,4,5,6,7,8,9,10,11,12,13,14}')
  ON CONFLICT (school_id, name) DO NOTHING;

  -- JUNIOR SECONDARY (Levels 9-11)
  INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
  VALUES 
    (p_school_id, 'Basic Science', 'BSC', '{9,10,11}')
  ON CONFLICT (school_id, name) DO NOTHING;

  INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
  VALUES 
    (p_school_id, 'Social Studies', 'SS', '{9,10,11}')
  ON CONFLICT (school_id, name) DO NOTHING;

  INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
  VALUES 
    (p_school_id, 'Civic Education', 'CIV', '{9,10,11}')
  ON CONFLICT (school_id, name) DO NOTHING;

  INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
  VALUES 
    (p_school_id, 'Computer Studies', 'CS', '{9,10,11,12,13,14}')
  ON CONFLICT (school_id, name) DO NOTHING;

  INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
  VALUES 
    (p_school_id, 'French Language', 'FRE', '{9,10,11,12,13,14}')
  ON CONFLICT (school_id, name) DO NOTHING;

  INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
  VALUES 
    (p_school_id, 'Home Economics', 'HEC', '{9,10,11,12,13,14}')
  ON CONFLICT (school_id, name) DO NOTHING;

  INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
  VALUES 
    (p_school_id, 'Geography', 'GEO', '{9,10,11,12,13,14}')
  ON CONFLICT (school_id, name) DO NOTHING;

  -- SENIOR SECONDARY - CORE (Levels 12-14)
  INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
  VALUES 
    (p_school_id, 'General Mathematics', 'GMAT', '{12,13,14}')
  ON CONFLICT (school_id, name) DO NOTHING;

  INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
  VALUES 
    (p_school_id, 'Citizenship and Heritage Studies', 'CHS', '{12,13,14}')
  ON CONFLICT (school_id, name) DO NOTHING;

  INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
  VALUES 
    (p_school_id, 'Digital Technologies', 'DTE', '{12,13,14}')
  ON CONFLICT (school_id, name) DO NOTHING;

  -- SENIOR SECONDARY - SCIENCE (Levels 12-14)
  INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
  VALUES 
    (p_school_id, 'Physics', 'PHY', '{12,13,14}')
  ON CONFLICT (school_id, name) DO NOTHING;

  INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
  VALUES 
    (p_school_id, 'Chemistry', 'CHE', '{12,13,14}')
  ON CONFLICT (school_id, name) DO NOTHING;

  INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
  VALUES 
    (p_school_id, 'Biology', 'BIO', '{12,13,14}')
  ON CONFLICT (school_id, name) DO NOTHING;

  INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
  VALUES 
    (p_school_id, 'Agricultural Science', 'AGR', '{12,13,14}')
  ON CONFLICT (school_id, name) DO NOTHING;

  INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
  VALUES 
    (p_school_id, 'Further Mathematics', 'FMATH', '{12,13,14}')
  ON CONFLICT (school_id, name) DO NOTHING;

  INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
  VALUES 
    (p_school_id, 'Technical Drawing', 'TD', '{12,13,14}')
  ON CONFLICT (school_id, name) DO NOTHING;

  -- SENIOR SECONDARY - COMMERCIAL (Levels 12-14)
  INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
  VALUES 
    (p_school_id, 'Accounting', 'ACC', '{12,13,14}')
  ON CONFLICT (school_id, name) DO NOTHING;

  INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
  VALUES 
    (p_school_id, 'Commerce', 'COM', '{12,13,14}')
  ON CONFLICT (school_id, name) DO NOTHING;

  INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
  VALUES 
    (p_school_id, 'Economics', 'ECO', '{12,13,14}')
  ON CONFLICT (school_id, name) DO NOTHING;

  INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
  VALUES 
    (p_school_id, 'Marketing', 'MKT', '{12,13,14}')
  ON CONFLICT (school_id, name) DO NOTHING;

  INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
  VALUES 
    (p_school_id, 'Business Studies', 'BUS', '{12,13,14}')
  ON CONFLICT (school_id, name) DO NOTHING;

  -- SENIOR SECONDARY - ARTS/HUMANITIES (Levels 12-14)
  INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
  VALUES 
    (p_school_id, 'Literature in English', 'LIT', '{12,13,14}')
  ON CONFLICT (school_id, name) DO NOTHING;

  INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
  VALUES 
    (p_school_id, 'Government', 'GOV', '{12,13,14}')
  ON CONFLICT (school_id, name) DO NOTHING;

  INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
  VALUES 
    (p_school_id, 'History', 'HIS', '{12,13,14}')
  ON CONFLICT (school_id, name) DO NOTHING;

  INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
  VALUES 
    (p_school_id, 'Arabic Language', 'ARB', '{12,13,14}')
  ON CONFLICT (school_id, name) DO NOTHING;

  RETURN QUERY SELECT 'inserted'::TEXT, name, code, applicable_to_levels 
  FROM subjects WHERE school_id = p_school_id ORDER BY name;
END;
$$ LANGUAGE plpgsql;

-- Execute for all active schools
DO $$
DECLARE
  v_school RECORD;
  v_count INT;
BEGIN
  FOR v_school IN SELECT id, name FROM schools WHERE status = 'ACTIVE' OR status IS NULL
  LOOP
    SELECT COUNT(*) INTO v_count FROM upsert_canonical_subjects(v_school.id);
    RAISE NOTICE 'Populated % subjects for school: %', v_count, v_school.name;
  END LOOP;
END $$;

-- VERIFICATION STEP 1: Count subjects per school
SELECT 
  s.name as school_name,
  COUNT(subj.id) as total_subjects,
  COUNT(DISTINCT (unnest(subj.applicable_to_levels))) as unique_levels
FROM schools s
LEFT JOIN subjects subj ON subj.school_id = s.id
WHERE s.status = 'ACTIVE' OR s.status IS NULL
GROUP BY s.name
ORDER BY s.name;

-- VERIFICATION STEP 2: Verify key subjects exist
SELECT 
  name,
  code,
  applicable_to_levels,
  COUNT(*) OVER (PARTITION BY name) as duplicate_count
FROM subjects
WHERE school_id IN (SELECT id FROM schools WHERE status = 'ACTIVE' OR status IS NULL)
ORDER BY name
LIMIT 20;

-- VERIFICATION STEP 3: Check for level coverage
SELECT 
  UNNEST(applicable_to_levels) as level,
  COUNT(DISTINCT name) as subject_count
FROM subjects
WHERE school_id IN (SELECT id FROM schools WHERE status = 'ACTIVE' OR status IS NULL)
GROUP BY level
ORDER BY level;
