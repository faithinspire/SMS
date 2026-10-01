-- ============================================================================
-- Migration 163: Fix academic_sessions end_year NOT NULL constraint
-- ============================================================================
-- Set DEFAULT value for end_year and backfill any NULLs
-- ============================================================================

BEGIN TRANSACTION;

-- Step 1: Set default value for end_year
ALTER TABLE academic_sessions
ALTER COLUMN end_year SET DEFAULT (start_year + 1);

-- Step 2: Backfill any existing NULL end_year values
UPDATE academic_sessions 
SET end_year = start_year + 1 
WHERE end_year IS NULL AND start_year IS NOT NULL;

-- Step 3: Make sure end_year is NOT NULL
ALTER TABLE academic_sessions
ALTER COLUMN end_year SET NOT NULL;

-- Step 4: Verify
SELECT 'Migration 163: end_year constraint fixed. All sessions now have end_year populated.' as status;

COMMIT;
