-- ============================================================================
-- MIGRATION 050: Rebuild Academic Sessions Schema
-- ============================================================================
-- 
-- PURPOSE: Restructure academic_sessions table to support unlimited future
-- sessions with proper relational hierarchy (School → Session → Terms).
--
-- KEY CHANGES:
-- 1. Ensure academic_sessions has start_year, end_year integers (not just VARCHAR)
-- 2. Add is_active column for marking current active session
-- 3. Ensure UNIQUE constraint prevents duplicate sessions per school
-- 4. Create proper indexes for performance
--
-- STRUCTURE:
-- academic_sessions
--   id (UUID) - Primary Key
--   school_id (UUID) - Foreign Key to schools
--   session_year (VARCHAR) - Display name e.g. "2026/2027"
--   start_year (INT) - Start year e.g. 2026
--   end_year (INT) - End year e.g. 2027
--   is_active (BOOLEAN) - True if this is the current active session
--   created_at (TIMESTAMP)
--   updated_at (TIMESTAMP)
--   UNIQUE(school_id, session_year)
--
-- ============================================================================

-- Step 1: Ensure academic_sessions table exists with full schema
CREATE TABLE IF NOT EXISTS academic_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  session_year VARCHAR(20) NOT NULL,  -- e.g., "2026/2027"
  start_year INT NOT NULL,             -- e.g., 2026
  end_year INT NOT NULL,               -- e.g., 2027
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, session_year)
);

-- Step 2: Add missing columns if they don't exist
ALTER TABLE academic_sessions
  ADD COLUMN IF NOT EXISTS start_year INT;

ALTER TABLE academic_sessions
  ADD COLUMN IF NOT EXISTS end_year INT;

ALTER TABLE academic_sessions
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT FALSE;

ALTER TABLE academic_sessions
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 3: Populate missing start_year and end_year for existing sessions
-- Parse session_year "2026/2027" and extract start/end years
UPDATE academic_sessions
SET 
  start_year = CAST(SUBSTRING(session_year, 1, 4) AS INT),
  end_year = CAST(SUBSTRING(session_year, 6, 4) AS INT)
WHERE start_year IS NULL OR end_year IS NULL;

-- Step 4: Add check constraint to ensure end_year = start_year + 1
ALTER TABLE academic_sessions
  ADD CONSTRAINT check_academic_session_years
  CHECK (end_year = start_year + 1);

-- Step 5: Ensure only one session per school is active
-- Disable other sessions if any are marked active
DO $$
DECLARE
  school_record RECORD;
BEGIN
  FOR school_record IN 
    SELECT school_id FROM academic_sessions 
    GROUP BY school_id 
    HAVING COUNT(CASE WHEN is_active THEN 1 END) > 1 
  LOOP
    -- Keep the most recent active session, deactivate others
    UPDATE academic_sessions
    SET is_active = FALSE
    WHERE school_id = school_record.school_id
      AND is_active = TRUE
      AND id != (
        SELECT id FROM academic_sessions 
        WHERE school_id = school_record.school_id 
          AND is_active = TRUE 
        ORDER BY created_at DESC 
        LIMIT 1
      );
  END LOOP;
END $$;

-- Step 6: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_academic_sessions_school 
  ON academic_sessions(school_id);

CREATE INDEX IF NOT EXISTS idx_academic_sessions_active 
  ON academic_sessions(school_id, is_active);

CREATE INDEX IF NOT EXISTS idx_academic_sessions_start_year 
  ON academic_sessions(school_id, start_year DESC);

-- Step 7: Verify migration
SELECT 
  'ACADEMIC SESSIONS SCHEMA REBUILT' as status,
  COUNT(*) as total_sessions,
  COUNT(CASE WHEN is_active THEN 1 END) as active_sessions
FROM academic_sessions;
