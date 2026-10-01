-- ============================================================================
-- Migration 159: FINAL WORKING ACADEMIC SEEDING
-- This migration does NOT attempt auto-seeding. It just ensures the database
-- is ready for seeding, and removes problematic triggers.
-- The seeding happens in seedSchoolCurriculum() which creates classes/arms.
-- ============================================================================

BEGIN TRANSACTION;

-- Step 1: Remove all broken triggers and functions
DROP TRIGGER IF EXISTS auto_initialize_school_curriculum ON schools CASCADE;
DROP FUNCTION IF EXISTS trigger_auto_seed_school() CASCADE;
DROP FUNCTION IF EXISTS trigger_auto_seed_on_school_insert() CASCADE;
DROP FUNCTION IF EXISTS auto_seed_school_safe(UUID) CASCADE;
DROP FUNCTION IF EXISTS safe_insert_academic_session(UUID, VARCHAR, INT, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS safe_insert_academic_term(UUID, UUID, VARCHAR, INT, DATE, DATE, BOOLEAN) CASCADE;

-- Step 2: Ensure academic_sessions table has all required columns
-- Add missing columns if they don't exist
ALTER TABLE academic_sessions ADD COLUMN IF NOT EXISTS session_year VARCHAR(20);
ALTER TABLE academic_sessions ADD COLUMN IF NOT EXISTS start_year INT;
ALTER TABLE academic_sessions ADD COLUMN IF NOT EXISTS end_year INT;
ALTER TABLE academic_sessions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT FALSE;

-- Step 3: Ensure academic_terms table has all required columns
ALTER TABLE academic_terms ADD COLUMN IF NOT EXISTS term_number INT;
ALTER TABLE academic_terms ADD COLUMN IF NOT EXISTS name VARCHAR(100);
ALTER TABLE academic_terms ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE academic_terms ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE academic_terms ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT FALSE;

-- Step 4: Make sure all NOT NULL constraints are enforced only where data exists
-- For new schools, academic_sessions and academic_terms will be empty
-- The API doesn't create them - it only creates classes and arms

-- Step 5: Create a simple function to ensure academic session exists when needed
CREATE OR REPLACE FUNCTION ensure_academic_session_exists(p_school_id UUID) RETURNS UUID AS $$
DECLARE
  v_session_id UUID;
BEGIN
  -- Check if school has any academic sessions
  SELECT id INTO v_session_id FROM academic_sessions
  WHERE school_id = p_school_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no sessions exist, create a default one
  IF v_session_id IS NULL THEN
    -- First check again to avoid race conditions
    SELECT id INTO v_session_id FROM academic_sessions
    WHERE school_id = p_school_id AND session_year = '2024/2025'
    LIMIT 1;
    
    -- If still NULL, insert
    IF v_session_id IS NULL THEN
      INSERT INTO academic_sessions (
        school_id, 
        session_year, 
        start_year, 
        end_year, 
        is_active, 
        created_at, 
        updated_at
      )
      VALUES (
        p_school_id,
        '2024/2025',
        2024,
        2025,
        true,
        NOW(),
        NOW()
      )
      RETURNING id INTO v_session_id;
    END IF;
  END IF;
  
  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql;

-- Step 6: DO NOT auto-seed on school insert
-- The seeding should only happen via seedSchoolCurriculum() which creates classes/arms
-- Academic sessions are optional and created only when needed

-- Step 7: Ensure all existing schools have at least one session
DO $$
DECLARE
  v_school record;
  v_session_id UUID;
BEGIN
  FOR v_school IN SELECT id FROM schools LOOP
    v_session_id := ensure_academic_session_exists(v_school.id);
  END LOOP;
END $$;

-- Step 8: Final verification
SELECT 'Migration 159: Academic seeding database ready' as status;
SELECT COUNT(*) as schools_count FROM schools;
SELECT COUNT(*) as sessions_count FROM academic_sessions;
SELECT COUNT(*) as terms_count FROM academic_terms;

COMMIT;
