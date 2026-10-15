/**
 * MIGRATION 175: Populate Subject Applicable Levels for ALL Schools
 * 
 * Problem: Subjects don't have applicable_to_levels populated, causing subjects
 * to not appear in student registration dropdowns for both old and new schools.
 * 
 * Solution: 
 * 1. Ensure all schools have canonical subjects with proper applicable_to_levels
 * 2. Use the same subject set for all schools (multi-tenant approach)
 * 3. Map each subject to the appropriate class levels
 * 
 * This ensures:
 * ✅ New schools immediately have all subjects available
 * ✅ Old schools with missing subjects get them populated
 * ✅ Student registration dropdowns show subjects by class level
 * ✅ All schools use consistent curriculum
 */

-- First, let's verify the current state of subjects for each school
-- SELECT school_id, COUNT(*) as subject_count, 
--        COUNT(CASE WHEN applicable_to_levels IS NOT NULL THEN 1 END) as with_levels
-- FROM subjects
-- GROUP BY school_id;

-- ============================================================================
-- STEP 1: Ensure all core subjects exist in each school
-- ============================================================================
-- Get the list of schools
WITH school_ids AS (
  SELECT DISTINCT school_id FROM schools WHERE is_active = true
),
-- Define canonical subjects with their applicable levels
canonical_subjects AS (
  SELECT 
    'English Language' as name,
    'ENG' as code,
    ARRAY[3,4,5,6,7,8,9,10,11,12,13,14] as applicable_to_levels,
    'LANGUAGE' as category,
    null::text as department
  UNION ALL SELECT 'Mathematics', 'MATH', ARRAY[3,4,5,6,7,8,9,10,11,12,13,14], 'GENERAL', null
  UNION ALL SELECT 'Science', 'SCI', ARRAY[3,4,5,6,7,8,9,10,11], 'GENERAL', null
  UNION ALL SELECT 'Social Studies', 'SS', ARRAY[3,4,5,6,7,8,9,10,11], 'SOCIAL', null
  UNION ALL SELECT 'Integrated Science', 'ISCI', ARRAY[3,4,5,6,7,8], 'GENERAL', null
  UNION ALL SELECT 'English Studies', 'ENGS', ARRAY[9,10,11,12,13,14], 'LANGUAGE', null
  UNION ALL SELECT 'Biology', 'BIO', ARRAY[9,10,11,12,13,14], 'SCIENCE', null
  UNION ALL SELECT 'Chemistry', 'CHEM', ARRAY[9,10,11,12,13,14], 'SCIENCE', null
  UNION ALL SELECT 'Physics', 'PHYS', ARRAY[9,10,11,12,13,14], 'SCIENCE', null
  UNION ALL SELECT 'Further Mathematics', 'FMATH', ARRAY[12,13,14], 'SCIENCE', 'SCIENCE'
  UNION ALL SELECT 'Accounting', 'ACC', ARRAY[12,13,14], 'COMMERCIAL', 'COMMERCIAL'
  UNION ALL SELECT 'Economics', 'ECON', ARRAY[12,13,14], 'SOCIAL', null
  UNION ALL SELECT 'Business Studies', 'BUS', ARRAY[12,13,14], 'COMMERCIAL', 'COMMERCIAL'
  UNION ALL SELECT 'Civic Education', 'CIVIC', ARRAY[9,10,11,12,13,14], 'SOCIAL', null
  UNION ALL SELECT 'History', 'HIST', ARRAY[9,10,11,12,13,14], 'HUMANITIES', 'HUMANITIES'
  UNION ALL SELECT 'Geography', 'GEOG', ARRAY[9,10,11,12,13,14], 'SOCIAL', null
  UNION ALL SELECT 'Literature in English', 'LIT', ARRAY[12,13,14], 'LANGUAGE', 'HUMANITIES'
  UNION ALL SELECT 'French', 'FREN', ARRAY[9,10,11,12,13,14], 'LANGUAGE', null
  UNION ALL SELECT 'Yoruba', 'YOR', ARRAY[9,10,11,12,13,14], 'LANGUAGE', null
  UNION ALL SELECT 'Islamic Studies', 'ISLAM', ARRAY[9,10,11,12,13,14], 'SOCIAL', null
  UNION ALL SELECT 'Christian Religious Studies', 'CRS', ARRAY[9,10,11,12,13,14], 'SOCIAL', null
  UNION ALL SELECT 'Physical Education', 'PE', ARRAY[3,4,5,6,7,8,9,10,11,12,13,14], 'TECHNICAL', null
  UNION ALL SELECT 'Visual Arts', 'VA', ARRAY[3,4,5,6,7,8,9,10,11,12,13,14], 'TECHNICAL', null
  UNION ALL SELECT 'Music', 'MUS', ARRAY[3,4,5,6,7,8,9,10,11,12,13,14], 'TECHNICAL', null
  UNION ALL SELECT 'Computer Science', 'CS', ARRAY[9,10,11,12,13,14], 'TECHNICAL', null
  UNION ALL SELECT 'Information Technology', 'IT', ARRAY[12,13,14], 'TECHNICAL', null
)
-- Insert or update subjects for all schools
INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, department, is_active, created_at, updated_at)
SELECT 
  gen_random_uuid() as id,
  si.school_id,
  cs.name,
  cs.code,
  cs.applicable_to_levels,
  cs.category,
  cs.department,
  true as is_active,
  NOW() as created_at,
  NOW() as updated_at
FROM school_ids si
CROSS JOIN canonical_subjects cs
WHERE NOT EXISTS (
  SELECT 1 FROM subjects s 
  WHERE s.school_id = si.school_id 
  AND s.code = cs.code
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 2: Update existing subjects to have applicable_to_levels if missing
-- ============================================================================
-- For subjects without levels, assign based on name patterns
UPDATE subjects s
SET applicable_to_levels = 
  CASE 
    -- Primary subjects (Class levels 3-8)
    WHEN name IN ('English Language', 'Mathematics', 'Science', 'Social Studies', 'Integrated Science', 'Physical Education', 'Visual Arts', 'Music') 
      THEN ARRAY[3,4,5,6,7,8]
    
    -- JSS subjects (Class levels 9-11)
    WHEN name IN ('English Studies', 'Biology', 'Chemistry', 'Physics', 'Civic Education', 'History', 'Geography', 'French', 'Yoruba', 'Islamic Studies', 'Christian Religious Studies', 'Computer Science')
      THEN ARRAY[9,10,11]
    
    -- SS subjects (Class levels 12-14)
    WHEN name IN ('Further Mathematics', 'Accounting', 'Economics', 'Business Studies', 'Literature in English', 'Information Technology')
      THEN ARRAY[12,13,14]
    
    -- All levels
    WHEN name IN ('Physical Education', 'Visual Arts', 'Music')
      THEN ARRAY[3,4,5,6,7,8,9,10,11,12,13,14]
    
    -- Default: assign all active subjects to all levels if no pattern matches
    ELSE ARRAY[3,4,5,6,7,8,9,10,11,12,13,14]
  END
WHERE applicable_to_levels IS NULL OR applicable_to_levels = '{}';

-- ============================================================================
-- STEP 3: Verify the population
-- ============================================================================
-- Run this query to verify all schools now have subjects with levels populated:
-- SELECT 
--   s.school_id,
--   sc.name as school_name,
--   COUNT(s.id) as total_subjects,
--   COUNT(CASE WHEN s.applicable_to_levels IS NOT NULL AND array_length(s.applicable_to_levels, 1) > 0 THEN 1 END) as subjects_with_levels,
--   COUNT(CASE WHEN s.is_active = true THEN 1 END) as active_subjects
-- FROM subjects s
-- JOIN schools sc ON s.school_id = sc.id
-- GROUP BY s.school_id, sc.name
-- ORDER BY sc.name;

-- ============================================================================
-- STEP 4: Verify student registration will work by checking a sample
-- ============================================================================
-- Sample: For JSS1 (level 9), show what subjects are available
-- SELECT 
--   s.name,
--   s.code,
--   array_length(s.applicable_to_levels, 1) as levels_count,
--   s.applicable_to_levels
-- FROM subjects s
-- WHERE s.is_active = true 
-- AND 9 = ANY(s.applicable_to_levels)
-- LIMIT 10;
