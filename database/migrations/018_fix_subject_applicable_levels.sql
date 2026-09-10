-- ============================================================================
-- Migration 018: Fix Subject Applicable Levels
-- ============================================================================
-- This migration fixes the root cause of "No subject available" errors
-- by ensuring applicable_to_levels is properly populated for all subjects
-- ============================================================================

-- Step 1: Verify current state (diagnostic queries)
-- Run these manually to check:
-- SELECT id, school_id, name, level, type FROM classes WHERE applicable_to_levels IS NULL;
-- SELECT id, school_id, name, code, applicable_to_levels FROM subjects WHERE applicable_to_levels = '{}' OR applicable_to_levels IS NULL;

-- Step 2: For any subjects with empty applicable_to_levels, populate based on common Nigerian curriculum

UPDATE subjects 
SET applicable_to_levels = ARRAY[1,2,3,4,5,6]
WHERE school_id IN (SELECT id FROM schools)
  AND applicable_to_levels = '{}'::integer[]
  AND name IN (
    'English Language', 'English',
    'Mathematics', 'Math',
    'Science',
    'Social Studies', 'Social Science',
    'Civic Education', 'Civics',
    'Physical Education', 'PE', 'Physical Educ',
    'Art & Craft', 'Art',
    'Music',
    'Home Economics',
    'Information Technology', 'ICT', 'Computer Studies'
  );

-- Step 3: Populate secondary subjects (levels 9-14 for JSS/SSS)
UPDATE subjects
SET applicable_to_levels = ARRAY[9,10,11,12,13,14]
WHERE school_id IN (SELECT id FROM schools)
  AND applicable_to_levels = '{}'::integer[]
  AND name IN (
    'English', 'English Language',
    'Mathematics', 'Math',
    'Biology', 'Chemistry', 'Physics',
    'History', 'Geography',
    'Civic Education', 'Civics',
    'Physical Education', 'PE',
    'Agricultural Science', 'Agriculture',
    'Technical Drawing',
    'Computer Science', 'Computing', 'Computer Studies'
  );

-- Step 4: Populate SSS-only subjects (levels 12-14)
UPDATE subjects
SET applicable_to_levels = ARRAY[12,13,14]
WHERE school_id IN (SELECT id FROM schools)
  AND applicable_to_levels = '{}'::integer[]
  AND name IN (
    'Economics', 'Accounting', 'Government',
    'Literature In English', 'Literature',
    'Further Mathematics'
  );

-- Step 5: For any STILL-EMPTY subjects, make them available to all secondary levels as fallback
UPDATE subjects
SET applicable_to_levels = ARRAY[9,10,11,12,13,14]
WHERE school_id IN (SELECT id FROM schools)
  AND (applicable_to_levels = '{}'::integer[] OR applicable_to_levels IS NULL)
  AND id NOT IN (
    SELECT id FROM subjects 
    WHERE school_id IN (SELECT id FROM schools) 
      AND applicable_to_levels != '{}'::integer[] 
      AND applicable_to_levels IS NOT NULL
  );

-- Step 6: Verify the fix
-- Run this to check if all subjects now have applicable_to_levels populated:
-- SELECT 
--   school_id,
--   COUNT(*) as total_subjects,
--   COUNT(CASE WHEN applicable_to_levels IS NULL OR applicable_to_levels = '{}'::integer[] THEN 1 END) as empty_levels,
--   COUNT(CASE WHEN applicable_to_levels != '{}'::integer[] AND applicable_to_levels IS NOT NULL THEN 1 END) as populated
-- FROM subjects
-- GROUP BY school_id;

-- ============================================================================
-- Verification queries for manual review:
-- ============================================================================

-- Check subjects per school with their applicable levels:
-- SELECT 
--   name, 
--   code, 
--   applicable_to_levels,
--   array_length(applicable_to_levels, 1) as num_levels
-- FROM subjects 
-- WHERE school_id = 'YOUR_SCHOOL_ID'
-- ORDER BY name;

-- Check classes and verify level consistency:
-- SELECT 
--   c.name as class_name,
--   c.level,
--   c.type,
--   COUNT(s.id) as subject_count
-- FROM classes c
-- LEFT JOIN subjects s ON s.school_id = c.school_id 
--   AND s.applicable_to_levels @> ARRAY[c.level]::integer[]
-- WHERE c.school_id = 'YOUR_SCHOOL_ID'
-- GROUP BY c.id, c.name, c.level, c.type
-- ORDER BY c.level;
