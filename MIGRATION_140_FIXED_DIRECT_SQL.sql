-- ============================================================================
-- DIRECT SQL FIX FOR MIGRATION 140
-- Run this directly in Supabase SQL Editor (NOT in a migration)
-- ============================================================================

-- Step 1: Update subjects with level 0
UPDATE subjects 
SET applicable_to_levels = ARRAY[0]
WHERE level = 0 AND (applicable_to_levels IS NULL OR applicable_to_levels = '{}');

-- Step 2: Update subjects with level 1
UPDATE subjects 
SET applicable_to_levels = ARRAY[1]
WHERE level = 1 AND (applicable_to_levels IS NULL OR applicable_to_levels = '{}');

-- Step 3: Update subjects with level 2
UPDATE subjects 
SET applicable_to_levels = ARRAY[2]
WHERE level = 2 AND (applicable_to_levels IS NULL OR applicable_to_levels = '{}');

-- Step 4: Update subjects with level 3
UPDATE subjects 
SET applicable_to_levels = ARRAY[3]
WHERE level = 3 AND (applicable_to_levels IS NULL OR applicable_to_levels = '{}');

-- Step 5: Update subjects with level 4
UPDATE subjects 
SET applicable_to_levels = ARRAY[4]
WHERE level = 4 AND (applicable_to_levels IS NULL OR applicable_to_levels = '{}');

-- Step 6: Update subjects with level 5
UPDATE subjects 
SET applicable_to_levels = ARRAY[5]
WHERE level = 5 AND (applicable_to_levels IS NULL OR applicable_to_levels = '{}');

-- Step 7: Verify the fix worked
SELECT COUNT(*) as total_subjects,
       COUNT(CASE WHEN applicable_to_levels IS NULL OR applicable_to_levels = '{}' THEN 1 END) as empty_arrays
FROM subjects
WHERE level IS NOT NULL;

-- Expected result: empty_arrays should be 0 (all subjects have populated arrays)
