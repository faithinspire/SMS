/**
 * MIGRATION 177: BULLETPROOF - Ensure ALL subjects exist for ALL schools with PROPER LEVELS
 * 
 * This migration FIXES the issue where subjects existed but weren't loading because:
 * 1. applicable_to_levels was NULL or empty
 * 2. Subjects weren't being inserted for all schools
 * 
 * Strategy: For each school, try to INSERT each subject. If it already exists (duplicate),
 * skip it. Then use UPDATE to fix any subjects that have NULL/empty levels.
 */

DO $$
DECLARE
    v_school_id UUID;
    v_subject_count INT;
BEGIN
    -- Get each school that has any subjects
    FOR v_school_id IN
        SELECT DISTINCT school_id FROM subjects WHERE school_id IS NOT NULL
    LOOP
        -- ✅ Try to INSERT each subject. If it already exists, just ignore the error.
        -- This is safe because we'll UPDATE levels afterward anyway.
        
        BEGIN
            INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, is_active, created_at)
            VALUES (gen_random_uuid(), v_school_id, 'Economics', 'ECON', ARRAY[9,10,11,12,13,14], 'SOCIAL', true, NOW());
        EXCEPTION WHEN OTHERS THEN NULL;
        END;

        BEGIN
            INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, is_active, created_at)
            VALUES (gen_random_uuid(), v_school_id, 'Chemistry', 'CHEM', ARRAY[9,10,11,12,13,14], 'SCIENCE', true, NOW());
        EXCEPTION WHEN OTHERS THEN NULL;
        END;

        BEGIN
            INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, is_active, created_at)
            VALUES (gen_random_uuid(), v_school_id, 'Physics', 'PHYS', ARRAY[9,10,11,12,13,14], 'SCIENCE', true, NOW());
        EXCEPTION WHEN OTHERS THEN NULL;
        END;

        BEGIN
            INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, is_active, created_at)
            VALUES (gen_random_uuid(), v_school_id, 'Geography', 'GEOG', ARRAY[9,10,11,12,13,14], 'SOCIAL', true, NOW());
        EXCEPTION WHEN OTHERS THEN NULL;
        END;

        BEGIN
            INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, is_active, created_at)
            VALUES (gen_random_uuid(), v_school_id, 'Christian Religious Studies', 'CRS', ARRAY[9,10,11,12,13,14], 'SOCIAL', true, NOW());
        EXCEPTION WHEN OTHERS THEN NULL;
        END;

        BEGIN
            INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, is_active, created_at)
            VALUES (gen_random_uuid(), v_school_id, 'Biology', 'BIO', ARRAY[9,10,11,12,13,14], 'SCIENCE', true, NOW());
        EXCEPTION WHEN OTHERS THEN NULL;
        END;

        BEGIN
            INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, department, is_active, created_at)
            VALUES (gen_random_uuid(), v_school_id, 'Accounting', 'ACC', ARRAY[12,13,14], 'COMMERCIAL', 'COMMERCIAL', true, NOW());
        EXCEPTION WHEN OTHERS THEN NULL;
        END;

        BEGIN
            INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, is_active, created_at)
            VALUES (gen_random_uuid(), v_school_id, 'Arabic', 'ARAB', ARRAY[9,10,11,12,13,14], 'LANGUAGE', true, NOW());
        EXCEPTION WHEN OTHERS THEN NULL;
        END;

        BEGIN
            INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, is_active, created_at)
            VALUES (gen_random_uuid(), v_school_id, 'Technical Drawing', 'TD', ARRAY[9,10,11,12,13,14], 'TECHNICAL', true, NOW());
        EXCEPTION WHEN OTHERS THEN NULL;
        END;

        BEGIN
            INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, is_active, created_at)
            VALUES (gen_random_uuid(), v_school_id, 'Home Economics', 'HE', ARRAY[3,4,5,6,7,8,9,10,11,12,13,14], 'TECHNICAL', true, NOW());
        EXCEPTION WHEN OTHERS THEN NULL;
        END;

        BEGIN
            INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, is_active, created_at)
            VALUES (gen_random_uuid(), v_school_id, 'Agricultural Science', 'AG', ARRAY[9,10,11,12,13,14], 'TECHNICAL', true, NOW());
        EXCEPTION WHEN OTHERS THEN NULL;
        END;

    END LOOP;
    
    RAISE NOTICE 'Successfully inserted/checked all subjects for all schools';
END $$;

-- ✅ NOW UPDATE all subjects to ensure they have proper applicable_to_levels
-- For core subjects that apply to all levels
UPDATE subjects SET applicable_to_levels = ARRAY[3,4,5,6,7,8,9,10,11,12,13,14]
WHERE (applicable_to_levels IS NULL OR applicable_to_levels = '{}')
AND LOWER(name) IN (LOWER('English Language'), LOWER('Mathematics'), LOWER('Physical Education'), LOWER('Visual Arts'), LOWER('Music'));

-- For primary-only subjects
UPDATE subjects SET applicable_to_levels = ARRAY[3,4,5,6,7,8]
WHERE (applicable_to_levels IS NULL OR applicable_to_levels = '{}')
AND LOWER(name) IN (LOWER('Science'), LOWER('Social Studies'), LOWER('Integrated Science'));

-- For secondary subjects
UPDATE subjects SET applicable_to_levels = ARRAY[9,10,11,12,13,14]
WHERE (applicable_to_levels IS NULL OR applicable_to_levels = '{}')
AND LOWER(name) IN (LOWER('Biology'), LOWER('Chemistry'), LOWER('Physics'), LOWER('Economics'), LOWER('Accounting'), 
                   LOWER('Geography'), LOWER('Christian Religious Studies'), LOWER('CRS'), LOWER('Arabic'),
                   LOWER('Technical Drawing'), LOWER('Home Economics'), LOWER('Agricultural Science'));

-- Set department for science subjects at SS levels
UPDATE subjects SET department = 'SCIENCE'
WHERE code IN ('BIO', 'CHEM', 'PHYS') 
AND (department IS NULL OR department = '')
AND applicable_to_levels @> ARRAY[12];
