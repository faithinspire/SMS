/**
 * MIGRATION 175: Populate Subject Applicable Levels for ALL Schools
 * 
 * Simple approach: Just populate applicable_to_levels for existing subjects
 * and create canonical subjects for any school that doesn't have them
 */

-- ============================================================================
-- STEP 1: Update existing subjects to have applicable_to_levels if missing
-- ============================================================================
-- For subjects without levels, assign based on name patterns
UPDATE subjects s
SET applicable_to_levels = 
  CASE 
    -- Core subjects for all levels
    WHEN LOWER(name) IN (LOWER('English Language'), LOWER('Mathematics'), LOWER('Physical Education'), LOWER('Visual Arts'), LOWER('Music')) 
      THEN ARRAY[3,4,5,6,7,8,9,10,11,12,13,14]
    
    -- Primary subjects (Class levels 3-8)
    WHEN LOWER(name) IN (LOWER('Science'), LOWER('Social Studies'), LOWER('Integrated Science')) 
      THEN ARRAY[3,4,5,6,7,8]
    
    -- JSS subjects (Class levels 9-11) 
    WHEN LOWER(name) IN (LOWER('English Studies'), LOWER('Biology'), LOWER('Chemistry'), LOWER('Physics'), LOWER('Civic Education'), LOWER('History'), LOWER('Geography'), LOWER('French'), LOWER('Yoruba'), LOWER('Islamic Studies'), LOWER('Christian Religious Studies'), LOWER('Computer Science'))
      THEN ARRAY[9,10,11]
    
    -- SS subjects (Class levels 12-14)
    WHEN LOWER(name) IN (LOWER('Further Mathematics'), LOWER('Accounting'), LOWER('Economics'), LOWER('Business Studies'), LOWER('Literature in English'), LOWER('Information Technology'))
      THEN ARRAY[12,13,14]
    
    -- Science subjects for JSS and SS
    WHEN LOWER(name) IN (LOWER('Biology'), LOWER('Chemistry'), LOWER('Physics'))
      THEN ARRAY[9,10,11,12,13,14]
    
    -- Default: assign to all levels if no pattern matches
    ELSE ARRAY[3,4,5,6,7,8,9,10,11,12,13,14]
  END
WHERE applicable_to_levels IS NULL OR applicable_to_levels = '{}';

-- ============================================================================
-- STEP 2: Ensure canonical subjects exist for each school
-- ============================================================================
-- Insert subjects that don't already exist
-- For each school that has subjects table records, ensure they have all canonical subjects

-- English Language
INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, is_active, created_at)
SELECT gen_random_uuid(), s.school_id, 'English Language', 'ENG', ARRAY[3,4,5,6,7,8,9,10,11,12,13,14], 'LANGUAGE', true, NOW()
FROM (SELECT DISTINCT school_id FROM subjects) s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.school_id AND code = 'ENG'
)
ON CONFLICT DO NOTHING;

-- Mathematics
INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, is_active, created_at)
SELECT gen_random_uuid(), s.school_id, 'Mathematics', 'MATH', ARRAY[3,4,5,6,7,8,9,10,11,12,13,14], 'GENERAL', true, NOW()
FROM (SELECT DISTINCT school_id FROM subjects) s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.school_id AND code = 'MATH'
)
ON CONFLICT DO NOTHING;

-- Science
INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, is_active, created_at)
SELECT gen_random_uuid(), s.school_id, 'Science', 'SCI', ARRAY[3,4,5,6,7,8,9,10,11], 'GENERAL', true, NOW()
FROM (SELECT DISTINCT school_id FROM subjects) s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.school_id AND code = 'SCI'
)
ON CONFLICT DO NOTHING;

-- Social Studies
INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, is_active, created_at)
SELECT gen_random_uuid(), s.school_id, 'Social Studies', 'SS', ARRAY[3,4,5,6,7,8,9,10,11], 'SOCIAL', true, NOW()
FROM (SELECT DISTINCT school_id FROM subjects) s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.school_id AND code = 'SS'
)
ON CONFLICT DO NOTHING;

-- Biology
INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, is_active, created_at)
SELECT gen_random_uuid(), s.school_id, 'Biology', 'BIO', ARRAY[9,10,11,12,13,14], 'SCIENCE', true, NOW()
FROM (SELECT DISTINCT school_id FROM subjects) s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.school_id AND code = 'BIO'
)
ON CONFLICT DO NOTHING;

-- Chemistry
INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, is_active, created_at)
SELECT gen_random_uuid(), s.school_id, 'Chemistry', 'CHEM', ARRAY[9,10,11,12,13,14], 'SCIENCE', true, NOW()
FROM (SELECT DISTINCT school_id FROM subjects) s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.school_id AND code = 'CHEM'
)
ON CONFLICT DO NOTHING;

-- Physics
INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, is_active, created_at)
SELECT gen_random_uuid(), s.school_id, 'Physics', 'PHYS', ARRAY[9,10,11,12,13,14], 'SCIENCE', true, NOW()
FROM (SELECT DISTINCT school_id FROM subjects) s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.school_id AND code = 'PHYS'
)
ON CONFLICT DO NOTHING;

-- English Studies
INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, is_active, created_at)
SELECT gen_random_uuid(), s.school_id, 'English Studies', 'ENGS', ARRAY[9,10,11,12,13,14], 'LANGUAGE', true, NOW()
FROM (SELECT DISTINCT school_id FROM subjects) s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.school_id AND code = 'ENGS'
)
ON CONFLICT DO NOTHING;

-- Further Mathematics
INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, department, is_active, created_at)
SELECT gen_random_uuid(), s.school_id, 'Further Mathematics', 'FMATH', ARRAY[12,13,14], 'SCIENCE', 'SCIENCE', true, NOW()
FROM (SELECT DISTINCT school_id FROM subjects) s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.school_id AND code = 'FMATH'
)
ON CONFLICT DO NOTHING;

-- Accounting
INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, department, is_active, created_at)
SELECT gen_random_uuid(), s.school_id, 'Accounting', 'ACC', ARRAY[12,13,14], 'COMMERCIAL', 'COMMERCIAL', true, NOW()
FROM (SELECT DISTINCT school_id FROM subjects) s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.school_id AND code = 'ACC'
)
ON CONFLICT DO NOTHING;

-- Business Studies
INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, department, is_active, created_at)
SELECT gen_random_uuid(), s.school_id, 'Business Studies', 'BUS', ARRAY[12,13,14], 'COMMERCIAL', 'COMMERCIAL', true, NOW()
FROM (SELECT DISTINCT school_id FROM subjects) s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.school_id AND code = 'BUS'
)
ON CONFLICT DO NOTHING;

-- Economics
INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, is_active, created_at)
SELECT gen_random_uuid(), s.school_id, 'Economics', 'ECON', ARRAY[12,13,14], 'SOCIAL', true, NOW()
FROM (SELECT DISTINCT school_id FROM subjects) s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.school_id AND code = 'ECON'
)
ON CONFLICT DO NOTHING;

-- Civic Education
INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, is_active, created_at)
SELECT gen_random_uuid(), s.school_id, 'Civic Education', 'CIVIC', ARRAY[9,10,11,12,13,14], 'SOCIAL', true, NOW()
FROM (SELECT DISTINCT school_id FROM subjects) s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.school_id AND code = 'CIVIC'
)
ON CONFLICT DO NOTHING;

-- History
INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, department, is_active, created_at)
SELECT gen_random_uuid(), s.school_id, 'History', 'HIST', ARRAY[9,10,11,12,13,14], 'HUMANITIES', 'HUMANITIES', true, NOW()
FROM (SELECT DISTINCT school_id FROM subjects) s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.school_id AND code = 'HIST'
)
ON CONFLICT DO NOTHING;

-- Geography
INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, is_active, created_at)
SELECT gen_random_uuid(), s.school_id, 'Geography', 'GEOG', ARRAY[9,10,11,12,13,14], 'SOCIAL', true, NOW()
FROM (SELECT DISTINCT school_id FROM subjects) s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.school_id AND code = 'GEOG'
)
ON CONFLICT DO NOTHING;

-- French
INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, is_active, created_at)
SELECT gen_random_uuid(), s.school_id, 'French', 'FREN', ARRAY[9,10,11,12,13,14], 'LANGUAGE', true, NOW()
FROM (SELECT DISTINCT school_id FROM subjects) s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.school_id AND code = 'FREN'
)
ON CONFLICT DO NOTHING;

-- Yoruba
INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, is_active, created_at)
SELECT gen_random_uuid(), s.school_id, 'Yoruba', 'YOR', ARRAY[9,10,11,12,13,14], 'LANGUAGE', true, NOW()
FROM (SELECT DISTINCT school_id FROM subjects) s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.school_id AND code = 'YOR'
)
ON CONFLICT DO NOTHING;

-- Islamic Studies
INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, is_active, created_at)
SELECT gen_random_uuid(), s.school_id, 'Islamic Studies', 'ISLAM', ARRAY[9,10,11,12,13,14], 'SOCIAL', true, NOW()
FROM (SELECT DISTINCT school_id FROM subjects) s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.school_id AND code = 'ISLAM'
)
ON CONFLICT DO NOTHING;

-- Christian Religious Studies
INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, is_active, created_at)
SELECT gen_random_uuid(), s.school_id, 'Christian Religious Studies', 'CRS', ARRAY[9,10,11,12,13,14], 'SOCIAL', true, NOW()
FROM (SELECT DISTINCT school_id FROM subjects) s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.school_id AND code = 'CRS'
)
ON CONFLICT DO NOTHING;

-- Computer Science
INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, is_active, created_at)
SELECT gen_random_uuid(), s.school_id, 'Computer Science', 'CS', ARRAY[9,10,11,12,13,14], 'TECHNICAL', true, NOW()
FROM (SELECT DISTINCT school_id FROM subjects) s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.school_id AND code = 'CS'
)
ON CONFLICT DO NOTHING;

-- Physical Education
INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, is_active, created_at)
SELECT gen_random_uuid(), s.school_id, 'Physical Education', 'PE', ARRAY[3,4,5,6,7,8,9,10,11,12,13,14], 'TECHNICAL', true, NOW()
FROM (SELECT DISTINCT school_id FROM subjects) s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.school_id AND code = 'PE'
)
ON CONFLICT DO NOTHING;

-- Visual Arts
INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, is_active, created_at)
SELECT gen_random_uuid(), s.school_id, 'Visual Arts', 'VA', ARRAY[3,4,5,6,7,8,9,10,11,12,13,14], 'TECHNICAL', true, NOW()
FROM (SELECT DISTINCT school_id FROM subjects) s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.school_id AND code = 'VA'
)
ON CONFLICT DO NOTHING;

-- Music
INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, is_active, created_at)
SELECT gen_random_uuid(), s.school_id, 'Music', 'MUS', ARRAY[3,4,5,6,7,8,9,10,11,12,13,14], 'TECHNICAL', true, NOW()
FROM (SELECT DISTINCT school_id FROM subjects) s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.school_id AND code = 'MUS'
)
ON CONFLICT DO NOTHING;

-- Literature in English
INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, department, is_active, created_at)
SELECT gen_random_uuid(), s.school_id, 'Literature in English', 'LIT', ARRAY[12,13,14], 'LANGUAGE', 'HUMANITIES', true, NOW()
FROM (SELECT DISTINCT school_id FROM subjects) s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.school_id AND code = 'LIT'
)
ON CONFLICT DO NOTHING;

-- Information Technology
INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, is_active, created_at)
SELECT gen_random_uuid(), s.school_id, 'Information Technology', 'IT', ARRAY[12,13,14], 'TECHNICAL', true, NOW()
FROM (SELECT DISTINCT school_id FROM subjects) s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.school_id AND code = 'IT'
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Verification queries (run these to verify)
-- ============================================================================
-- Check total subjects with levels populated
-- SELECT COUNT(*) as total_subjects, 
--        COUNT(CASE WHEN applicable_to_levels IS NOT NULL AND array_length(applicable_to_levels, 1) > 0 THEN 1 END) as with_levels
-- FROM subjects WHERE is_active = true;

-- Check JSS1 subjects exist
-- SELECT COUNT(*) FROM subjects WHERE is_active = true AND 9 = ANY(applicable_to_levels);

-- Check by school
-- SELECT school_id, COUNT(*) as subject_count 
-- FROM subjects WHERE is_active = true
-- GROUP BY school_id
-- ORDER BY subject_count DESC;
