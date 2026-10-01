-- ============================================================================
-- Migration 162: Fix ON CONFLICT Issues in Academic Tables
-- ============================================================================
-- Remove all problematic ON CONFLICT clauses
-- Replace with safe INSERT-SELECT logic using WHERE NOT EXISTS
-- ============================================================================

BEGIN TRANSACTION;

-- Step 1: Drop any problematic triggers (they won't be used - API handles seeding)
DROP TRIGGER IF EXISTS trigger_auto_seed_school_safe ON schools CASCADE;
DROP TRIGGER IF EXISTS trigger_auto_seed_school_old ON schools CASCADE;
DROP TRIGGER IF EXISTS trigger_create_default_school_data ON schools CASCADE;
DROP TRIGGER IF EXISTS auto_initialize_school_curriculum ON schools CASCADE;

-- Step 2: Drop problematic functions
DROP FUNCTION IF EXISTS auto_seed_school_safe(UUID) CASCADE;
DROP FUNCTION IF EXISTS trigger_auto_seed_school() CASCADE;
DROP FUNCTION IF EXISTS trigger_auto_seed_on_school_insert() CASCADE;
DROP FUNCTION IF EXISTS ensure_academic_session_exists(UUID) CASCADE;
DROP FUNCTION IF EXISTS safe_insert_academic_session(UUID, VARCHAR, INT, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS safe_insert_academic_term(UUID, UUID, VARCHAR, INT, DATE, DATE, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS create_default_school_data(UUID) CASCADE;
DROP FUNCTION IF EXISTS trigger_create_default_school_data_fn() CASCADE;

-- Step 3: Ensure RLS is disabled on academic tables (for API access)
ALTER TABLE IF EXISTS academic_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS academic_terms DISABLE ROW LEVEL SECURITY;

-- Step 4: Ensure indices exist for performance
CREATE INDEX IF NOT EXISTS idx_academic_sessions_school_id ON academic_sessions(school_id);
CREATE INDEX IF NOT EXISTS idx_academic_sessions_is_active ON academic_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_academic_terms_school_id ON academic_terms(school_id);
CREATE INDEX IF NOT EXISTS idx_academic_terms_session_id ON academic_terms(session_id);
CREATE INDEX IF NOT EXISTS idx_academic_terms_is_active ON academic_terms(is_active);

-- Step 5: Success message
SELECT 'Migration 162: All problematic functions and triggers removed. School registration now uses API-level seeding with safe INSERT logic.' as status;

COMMIT;
