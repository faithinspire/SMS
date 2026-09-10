-- ============================================================================
-- MIGRATION 049: Insert Canonical Subject Catalog (FIXED - No Schema Assumptions)
-- Date: August 31, 2026
-- Fixed version that doesn't assume is_active column exists
-- ============================================================================

-- Step 1: Get all schools
DO $$
DECLARE
  v_school RECORD;
  v_inserted INT := 0;
  v_total INT := 0;
BEGIN
  FOR v_school IN 
    SELECT id, name FROM schools 
  LOOP
    RAISE NOTICE 'Processing school: %', v_school.name;

    -- Core subjects applicable across multiple levels
    INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
    VALUES (v_school.id, 'English Language', 'ENG', '{3,4,5,6,7,8,9,10,11,12,13,14}')
    ON CONFLICT (school_id, name) DO NOTHING;
    v_inserted := v_inserted + 1;

    INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
    VALUES (v_school.id, 'Mathematics', 'MATH', '{3,4,5,6,7,8,9,10,11,12,13,14}')
    ON CONFLICT (school_id, name) DO NOTHING;
    v_inserted := v_inserted + 1;

    INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
    VALUES (v_school.id, 'Physical Education', 'PE', '{3,4,5,6,7,8,9,10,11,12,13,14}')
    ON CONFLICT (school_id, name) DO NOTHING;
    v_inserted := v_inserted + 1;

    INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
    VALUES (v_school.id, 'Christian Religious Studies', 'CRS', '{3,4,5,6,7,8,9,10,11,12,13,14}')
    ON CONFLICT (school_id, name) DO NOTHING;
    v_inserted := v_inserted + 1;

    INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
    VALUES (v_school.id, 'Islamic Studies', 'ISS', '{3,4,5,6,7,8,9,10,11,12,13,14}')
    ON CONFLICT (school_id, name) DO NOTHING;
    v_inserted := v_inserted + 1;

    -- PRIMARY SPECIFIC
    INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
    VALUES (v_school.id, 'General Science', 'SCI', '{3,4,5,6,7,8}')
    ON CONFLICT (school_id, name) DO NOTHING;
    v_inserted := v_inserted + 1;

    INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
    VALUES (v_school.id, 'Social Studies', 'SS', '{3,4,5,6,7,8}')
    ON CONFLICT (school_id, name) DO NOTHING;
    v_inserted := v_inserted + 1;

    INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
    VALUES (v_school.id, 'Music', 'MUS', '{3,4,5,6,7,8,9,10,11,12,13,14}')
    ON CONFLICT (school_id, name) DO NOTHING;
    v_inserted := v_inserted + 1;

    INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
    VALUES (v_school.id, 'Visual Arts', 'VAR', '{3,4,5,6,7,8,9,10,11,12,13,14}')
    ON CONFLICT (school_id, name) DO NOTHING;
    v_inserted := v_inserted + 1;

    INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
    VALUES (v_school.id, 'Health Education', 'HEA', '{3,4,5,6,7,8,9,10,11,12,13,14}')
    ON CONFLICT (school_id, name) DO NOTHING;
    v_inserted := v_inserted + 1;

    -- LANGUAGES
    INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
    VALUES (v_school.id, 'Yoruba Language', 'YOR', '{3,4,5,6,7,8,9,10,11,12,13,14}')
    ON CONFLICT (school_id, name) DO NOTHING;
    v_inserted := v_inserted + 1;

    INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
    VALUES (v_school.id, 'Igbo Language', 'IGB', '{3,4,5,6,7,8,9,10,11,12,13,14}')
    ON CONFLICT (school_id, name) DO NOTHING;
    v_inserted := v_inserted + 1;

    INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
    VALUES (v_school.id, 'Hausa Language', 'HAU', '{3,4,5,6,7,8,9,10,11,12,13,14}')
    ON CONFLICT (school_id, name) DO NOTHING;
    v_inserted := v_inserted + 1;

    INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
    VALUES (v_school.id, 'French Language', 'FRE', '{9,10,11,12,13,14}')
    ON CONFLICT (school_id, name) DO NOTHING;
    v_inserted := v_inserted + 1;

    INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
    VALUES (v_school.id, 'Arabic Language', 'ARB', '{12,13,14}')
    ON CONFLICT (school_id, name) DO NOTHING;
    v_inserted := v_inserted + 1;

    -- JUNIOR SECONDARY
    INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
    VALUES (v_school.id, 'Basic Science', 'BSC', '{9,10,11}')
    ON CONFLICT (school_id, name) DO NOTHING;
    v_inserted := v_inserted + 1;

    INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
    VALUES (v_school.id, 'Civic Education', 'CIV', '{9,10,11}')
    ON CONFLICT (school_id, name) DO NOTHING;
    v_inserted := v_inserted + 1;

    INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
    VALUES (v_school.id, 'Computer Studies', 'CS', '{9,10,11,12,13,14}')
    ON CONFLICT (school_id, name) DO NOTHING;
    v_inserted := v_inserted + 1;

    INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
    VALUES (v_school.id, 'Home Economics', 'HEC', '{9,10,11,12,13,14}')
    ON CONFLICT (school_id, name) DO NOTHING;
    v_inserted := v_inserted + 1;

    INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
    VALUES (v_school.id, 'Geography', 'GEO', '{9,10,11,12,13,14}')
    ON CONFLICT (school_id, name) DO NOTHING;
    v_inserted := v_inserted + 1;

    -- SENIOR SECONDARY - SCIENCE
    INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
    VALUES (v_school.id, 'Physics', 'PHY', '{12,13,14}')
    ON CONFLICT (school_id, name) DO NOTHING;
    v_inserted := v_inserted + 1;

    INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
    VALUES (v_school.id, 'Chemistry', 'CHE', '{12,13,14}')
    ON CONFLICT (school_id, name) DO NOTHING;
    v_inserted := v_inserted + 1;

    INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
    VALUES (v_school.id, 'Biology', 'BIO', '{12,13,14}')
    ON CONFLICT (school_id, name) DO NOTHING;
    v_inserted := v_inserted + 1;

    INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
    VALUES (v_school.id, 'Further Mathematics', 'FMATH', '{12,13,14}')
    ON CONFLICT (school_id, name) DO NOTHING;
    v_inserted := v_inserted + 1;

    INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
    VALUES (v_school.id, 'Agricultural Science', 'AGR', '{12,13,14}')
    ON CONFLICT (school_id, name) DO NOTHING;
    v_inserted := v_inserted + 1;

    INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
    VALUES (v_school.id, 'Technical Drawing', 'TD', '{12,13,14}')
    ON CONFLICT (school_id, name) DO NOTHING;
    v_inserted := v_inserted + 1;

    -- SENIOR SECONDARY - COMMERCIAL
    INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
    VALUES (v_school.id, 'Accounting', 'ACC', '{12,13,14}')
    ON CONFLICT (school_id, name) DO NOTHING;
    v_inserted := v_inserted + 1;

    INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
    VALUES (v_school.id, 'Commerce', 'COM', '{12,13,14}')
    ON CONFLICT (school_id, name) DO NOTHING;
    v_inserted := v_inserted + 1;

    INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
    VALUES (v_school.id, 'Economics', 'ECO', '{12,13,14}')
    ON CONFLICT (school_id, name) DO NOTHING;
    v_inserted := v_inserted + 1;

    INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
    VALUES (v_school.id, 'Marketing', 'MKT', '{12,13,14}')
    ON CONFLICT (school_id, name) DO NOTHING;
    v_inserted := v_inserted + 1;

    INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
    VALUES (v_school.id, 'Business Studies', 'BUS', '{12,13,14}')
    ON CONFLICT (school_id, name) DO NOTHING;
    v_inserted := v_inserted + 1;

    -- SENIOR SECONDARY - ARTS
    INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
    VALUES (v_school.id, 'Literature in English', 'LIT', '{12,13,14}')
    ON CONFLICT (school_id, name) DO NOTHING;
    v_inserted := v_inserted + 1;

    INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
    VALUES (v_school.id, 'Government', 'GOV', '{12,13,14}')
    ON CONFLICT (school_id, name) DO NOTHING;
    v_inserted := v_inserted + 1;

    INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
    VALUES (v_school.id, 'History', 'HIS', '{12,13,14}')
    ON CONFLICT (school_id, name) DO NOTHING;
    v_inserted := v_inserted + 1;

    -- CORE SECONDARY
    INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
    VALUES (v_school.id, 'General Mathematics', 'GMAT', '{12,13,14}')
    ON CONFLICT (school_id, name) DO NOTHING;
    v_inserted := v_inserted + 1;

    INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
    VALUES (v_school.id, 'Citizenship and Heritage Studies', 'CHS', '{12,13,14}')
    ON CONFLICT (school_id, name) DO NOTHING;
    v_inserted := v_inserted + 1;

    INSERT INTO subjects (school_id, name, code, applicable_to_levels) 
    VALUES (v_school.id, 'Digital Technologies', 'DTE', '{12,13,14}')
    ON CONFLICT (school_id, name) DO NOTHING;
    v_inserted := v_inserted + 1;

    v_total := v_total + 1;
    RAISE NOTICE '✅ Processed school % - inserted % subjects', v_school.name, v_inserted;
  END LOOP;

  RAISE NOTICE '✅ COMPLETE: Processed % schools, total inserts: %', v_total, v_inserted;
END $$;

-- VERIFICATION: Count subjects per school
SELECT 
  s.name as school_name,
  COUNT(subj.id) as total_subjects
FROM schools s
LEFT JOIN subjects subj ON subj.school_id = s.id
GROUP BY s.name
ORDER BY s.name;

-- VERIFICATION: Show sample subjects
SELECT 
  name,
  code,
  applicable_to_levels
FROM subjects
ORDER BY name
LIMIT 15;

-- VERIFICATION: Check for duplicates (should be 0 rows)
SELECT name, COUNT(*) as duplicate_count
FROM subjects
GROUP BY name
HAVING COUNT(*) > 1;
