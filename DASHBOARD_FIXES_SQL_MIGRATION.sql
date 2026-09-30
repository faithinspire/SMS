/**
 * SMS Dashboard Fixes - SQL Migration 147
 * 
 * This script adds missing columns to the users table that the student profile
 * editor expects but don't exist in the schema.
 * 
 * SAFE TO RUN: Uses IF NOT EXISTS so it won't fail if columns already exist
 * REVERSIBLE: Can be undone by dropping the columns
 * 
 * TO RUN:
 * 1. Go to Supabase Dashboard
 * 2. Click your project
 * 3. Go to SQL Editor
 * 4. Copy this entire script
 * 5. Paste into SQL Editor
 * 6. Click "Run"
 * 7. Verify: No errors, columns added
 */

-- ============================================================================
-- PART 1: Add Missing Profile Columns
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS lga VARCHAR(100);

-- ============================================================================
-- PART 2: Create Indexes for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_gender ON users(gender);
CREATE INDEX IF NOT EXISTS idx_users_state ON users(state);

-- ============================================================================
-- PART 3: Verification Queries
-- ============================================================================

-- Check that columns were added
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name='users' 
  AND column_name IN ('gender', 'address', 'state', 'lga')
ORDER BY ordinal_position;

-- Show all columns in users table
-- Uncomment to see full table structure:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name='users'
-- ORDER BY ordinal_position;

-- ============================================================================
-- EXPECTED OUTPUT
-- ============================================================================
-- 
-- If successful, you should see 4 rows:
-- 
-- column_name  | data_type | is_nullable | column_default
-- ─────────────┼───────────┼─────────────┼────────────────
-- gender       | character | YES         | NULL
-- address      | text      | YES         | NULL
-- state        | character | YES         | NULL
-- lga          | character | YES         | NULL
--
-- ============================================================================

-- ============================================================================
-- ROLLBACK (if needed - uncomment to run)
-- ============================================================================
-- ALTER TABLE users DROP COLUMN IF EXISTS gender;
-- ALTER TABLE users DROP COLUMN IF EXISTS address;
-- ALTER TABLE users DROP COLUMN IF EXISTS state;
-- ALTER TABLE users DROP COLUMN IF EXISTS lga;
--
-- DROP INDEX IF EXISTS idx_users_gender;
-- DROP INDEX IF EXISTS idx_users_state;
-- ============================================================================
