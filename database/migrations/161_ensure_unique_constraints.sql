-- ============================================================================
-- Migration 161: ENSURE UNIQUE CONSTRAINTS FOR ACADEMIC TABLES
-- ============================================================================
-- After removing all ON CONFLICT statements, ensure UNIQUE constraints exist
-- ============================================================================

BEGIN TRANSACTION;

-- Step 1: Ensure academic_sessions table has the correct structure
ALTER TABLE IF EXISTS academic_sessions 
DROP CONSTRAINT IF EXISTS academic_sessions_school_id_session_year_key;

ALTER TABLE IF EXISTS academic_sessions 
ADD CONSTRAINT academic_sessions_school_id_session_year_key 
UNIQUE (school_id, session_year);

-- Step 2: Ensure academic_terms table has the correct structure
ALTER TABLE IF EXISTS academic_terms 
DROP CONSTRAINT IF EXISTS academic_terms_school_id_session_id_term_order_key;

ALTER TABLE IF EXISTS academic_terms 
ADD CONSTRAINT academic_terms_school_id_session_id_term_order_key 
UNIQUE (school_id, session_id, term_order);

-- Step 3: Disable RLS on these tables so seedSchoolCurriculum can INSERT
ALTER TABLE IF EXISTS academic_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS academic_terms DISABLE ROW LEVEL SECURITY;

-- Step 4: Success message
SELECT 'Migration 161: UNIQUE constraints verified and RLS disabled' as status;

COMMIT;
