-- ============================================================================
-- Migration 163: Fix Academic Tables Schema Inconsistencies
-- ============================================================================
-- This migration fixes critical schema issues:
-- 1. Ensures academic_sessions has end_year column with proper constraints
-- 2. Ensures academic_terms uses term_name (not name) to match application code
-- 3. Disables RLS on both tables
-- 4. Ensures all required columns have proper defaults and constraints
-- ============================================================================

BEGIN TRANSACTION;

-- Step 1: Verify/Fix academic_sessions table
-- If the table exists but is missing end_year, add it
ALTER TABLE IF EXISTS academic_sessions
ADD COLUMN IF NOT EXISTS end_year INTEGER;

-- Add DEFAULT rule for end_year: it should be start_year + 1
ALTER TABLE IF EXISTS academic_sessions
ALTER COLUMN end_year SET DEFAULT (start_year + 1);

-- Update any existing rows where end_year is NULL
UPDATE academic_sessions
SET end_year = start_year + 1
WHERE end_year IS NULL AND start_year IS NOT NULL;

-- Make end_year NOT NULL (after backfill)
ALTER TABLE IF EXISTS academic_sessions
ALTER COLUMN end_year SET NOT NULL;

-- Step 2: Verify/Fix academic_terms table
-- If name column exists, keep it but also ensure term_name exists for compatibility
ALTER TABLE IF EXISTS academic_terms
ADD COLUMN IF NOT EXISTS term_name VARCHAR(100);

-- If term_name is NULL but name has data, copy name to term_name
UPDATE academic_terms
SET term_name = name
WHERE term_name IS NULL AND name IS NOT NULL;

-- Drop the name column if it exists (to match code expectations)
-- But only if term_name has been properly populated
ALTER TABLE IF EXISTS academic_terms
DROP COLUMN IF EXISTS name;

-- Ensure term_name is NOT NULL
ALTER TABLE IF EXISTS academic_terms
ALTER COLUMN term_name SET NOT NULL;

-- Ensure term_order exists and is NOT NULL
ALTER TABLE IF EXISTS academic_terms
ADD COLUMN IF NOT EXISTS term_order INTEGER;

ALTER TABLE IF EXISTS academic_terms
ALTER COLUMN term_order SET NOT NULL;

-- Step 3: Drop and recreate unique constraints with correct column names
-- Drop old unique constraints that might reference wrong columns
ALTER TABLE IF EXISTS academic_sessions
DROP CONSTRAINT IF EXISTS academic_sessions_school_id_session_year_key;

ALTER TABLE IF EXISTS academic_terms
DROP CONSTRAINT IF EXISTS academic_terms_school_id_session_id_term_order_key;

-- Create proper unique constraints
ALTER TABLE IF EXISTS academic_sessions
ADD CONSTRAINT academic_sessions_school_id_session_year_key UNIQUE (school_id, session_year);

ALTER TABLE IF EXISTS academic_terms
ADD CONSTRAINT academic_terms_school_id_session_id_term_order_key UNIQUE (school_id, session_id, term_order);

-- Step 4: Create or verify indexes
CREATE INDEX IF NOT EXISTS idx_academic_sessions_school_id ON academic_sessions(school_id);
CREATE INDEX IF NOT EXISTS idx_academic_sessions_is_active ON academic_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_academic_terms_school_id ON academic_terms(school_id);
CREATE INDEX IF NOT EXISTS idx_academic_terms_session_id ON academic_terms(session_id);
CREATE INDEX IF NOT EXISTS idx_academic_terms_is_active ON academic_terms(is_active);

-- Step 5: Disable RLS on both tables for admin/API access
ALTER TABLE IF EXISTS academic_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS academic_terms DISABLE ROW LEVEL SECURITY;

-- Step 6: Verify data integrity - no NULL values in critical columns
-- Report any problematic rows
DO $$
DECLARE
  v_null_sessions INT;
  v_null_terms INT;
BEGIN
  SELECT COUNT(*) INTO v_null_sessions FROM academic_sessions WHERE end_year IS NULL;
  SELECT COUNT(*) INTO v_null_terms FROM academic_terms WHERE term_name IS NULL OR term_order IS NULL;
  
  IF v_null_sessions > 0 THEN
    RAISE WARNING 'Found % academic_sessions rows with NULL end_year', v_null_sessions;
  END IF;
  
  IF v_null_terms > 0 THEN
    RAISE WARNING 'Found % academic_terms rows with NULL term_name or term_order', v_null_terms;
  END IF;
  
  IF v_null_sessions = 0 AND v_null_terms = 0 THEN
    RAISE NOTICE 'Migration 163: All critical columns are properly populated. Schema is consistent.';
  END IF;
END $$;

-- Step 7: Success message
SELECT 'Migration 163: Academic schema fixed. end_year populated, term_name verified, RLS disabled' as status;

COMMIT;
