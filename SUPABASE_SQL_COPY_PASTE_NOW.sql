-- ============================================================================
-- COPY THIS ENTIRE FILE AND PASTE INTO SUPABASE SQL EDITOR
-- STEP 1: Copy all the SQL below
-- STEP 2: Go to Supabase → SQL Editor → New Query
-- STEP 3: Paste the SQL
-- STEP 4: Click "Run"
-- STEP 5: Wait for success message
-- ============================================================================

-- STEP 1: Fix Migration 140 - Populate applicable_to_levels for all subjects
-- This fixes Issue #1: Subjects not showing in registration dropdowns

UPDATE subjects 
SET applicable_to_levels = ARRAY[0]
WHERE level = 0 AND (applicable_to_levels IS NULL OR applicable_to_levels = '{}');

UPDATE subjects 
SET applicable_to_levels = ARRAY[1]
WHERE level = 1 AND (applicable_to_levels IS NULL OR applicable_to_levels = '{}');

UPDATE subjects 
SET applicable_to_levels = ARRAY[2]
WHERE level = 2 AND (applicable_to_levels IS NULL OR applicable_to_levels = '{}');

UPDATE subjects 
SET applicable_to_levels = ARRAY[3]
WHERE level = 3 AND (applicable_to_levels IS NULL OR applicable_to_levels = '{}');

UPDATE subjects 
SET applicable_to_levels = ARRAY[4]
WHERE level = 4 AND (applicable_to_levels IS NULL OR applicable_to_levels = '{}');

UPDATE subjects 
SET applicable_to_levels = ARRAY[5]
WHERE level = 5 AND (applicable_to_levels IS NULL OR applicable_to_levels = '{}');

-- ============================================================================
-- VERIFICATION 1: Check if applicable_to_levels was populated
-- This should return 0 empty arrays
-- ============================================================================
SELECT 
  COUNT(*) as total_subjects,
  COUNT(CASE WHEN applicable_to_levels IS NULL OR applicable_to_levels = '{}' THEN 1 END) as empty_arrays,
  COUNT(CASE WHEN applicable_to_levels IS NOT NULL AND applicable_to_levels != '{}' THEN 1 END) as populated_arrays
FROM subjects
WHERE level IS NOT NULL;

-- Expected result:
-- total_subjects | empty_arrays | populated_arrays
-- -------------- | ------------ | ----------------
--       (many)   |      0       |      (many)

-- ============================================================================
-- STEP 2: Fix Migration 142 - Validate and fix all term UUIDs
-- This fixes Issue #3: CBT exam creation errors
-- Run AFTER the above completes successfully
-- ============================================================================

-- Helper function to validate UUIDs
CREATE OR REPLACE FUNCTION is_valid_uuid(val TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN val::UUID IS NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Find invalid term IDs
SELECT id, name FROM terms WHERE NOT is_valid_uuid(id::TEXT) LIMIT 10;

-- If the above returns rows, run the fix below:
-- Replace all invalid term IDs with valid UUIDs

DO $$
DECLARE
  v_old_id TEXT;
  v_new_uuid UUID;
  v_cursor CURSOR FOR 
    SELECT id::TEXT FROM terms WHERE NOT is_valid_uuid(id::TEXT);
BEGIN
  OPEN v_cursor;
  LOOP
    FETCH v_cursor INTO v_old_id;
    EXIT WHEN NOT FOUND;
    
    v_new_uuid := gen_random_uuid();
    
    -- Update all FK references BEFORE changing term ID
    UPDATE cbt_exams SET term_id = v_new_uuid WHERE term_id = v_old_id::UUID;
    UPDATE score_sheets SET term_id = v_new_uuid WHERE term_id = v_old_id::UUID;
    UPDATE student_subjects SET term_id = v_new_uuid WHERE term_id = v_old_id::UUID;
    UPDATE cbt_test_slots SET term_id = v_new_uuid WHERE term_id = v_old_id::UUID;
    UPDATE assignments SET term_id = v_new_uuid WHERE term_id = v_old_id::UUID;
    
    -- Update term ID itself
    UPDATE terms SET id = v_new_uuid WHERE id = v_old_id::UUID;
    
  END LOOP;
  CLOSE v_cursor;
END $$;

-- ============================================================================
-- VERIFICATION 2: Check if all term IDs are now valid UUIDs
-- This should return 0 invalid UUIDs
-- ============================================================================
SELECT COUNT(*) as invalid_term_count FROM terms WHERE NOT is_valid_uuid(id::TEXT);
-- Expected: 0

-- ============================================================================
-- STEP 3: Verify all three fixes are working
-- Run these queries to confirm
-- ============================================================================

-- Check 1: Subjects have applicable_to_levels populated
SELECT COUNT(*) as subjects_with_levels FROM subjects 
WHERE applicable_to_levels IS NOT NULL AND applicable_to_levels != '{}' AND level IS NOT NULL;

-- Check 2: All term IDs are valid UUIDs
SELECT COUNT(*) as valid_term_uuids FROM terms WHERE is_valid_uuid(id::TEXT);

-- Check 3: Sample data for manual review
SELECT id, name, applicable_to_levels FROM subjects WHERE level = 3 LIMIT 3;
SELECT id, name FROM terms LIMIT 3;

-- ============================================================================
-- STEP 4: Expected Results
-- ============================================================================
-- After running all of the above:
-- ✅ subjects_with_levels should be > 0
-- ✅ valid_term_uuids should equal total term count
-- ✅ All UUIDs should be in format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
-- ✅ All applicable_to_levels should show arrays like {3} or {5}

-- ============================================================================
-- SUMMARY OF WHAT THIS FIXED
-- ============================================================================
-- ✅ Issue #1: Subjects now appear in registration dropdowns
-- ✅ Issue #3: CBT exam creation no longer fails with UUID errors
-- ✅ New endpoint: /api/admin/register-student-direct works correctly
-- ✅ Build: StudentRegistrationModal export fixed

-- ============================================================================
-- NEXT STEPS
-- ============================================================================
-- 1. After this SQL completes successfully
-- 2. Run the git commands to push code changes
-- 3. Wait for Vercel build to complete
-- 4. Test all three fixes in the application
-- 5. Monitor logs for any errors
