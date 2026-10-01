-- ============================================================================
-- COPY-PASTE THIS INTO SUPABASE SQL EDITOR
-- Run all 3 migrations in order: 161, 162, 163
-- ============================================================================

-- ============================================================================
-- MIGRATION 161: ENSURE UNIQUE CONSTRAINTS FOR ACADEMIC TABLES
-- ============================================================================
BEGIN TRANSACTION;

ALTER TABLE IF EXISTS academic_sessions 
DROP CONSTRAINT IF EXISTS academic_sessions_school_id_session_year_key;

ALTER TABLE IF EXISTS academic_sessions 
ADD CONSTRAINT academic_sessions_school_id_session_year_key 
UNIQUE (school_id, session_year);

ALTER TABLE IF EXISTS academic_terms 
DROP CONSTRAINT IF EXISTS academic_terms_school_id_session_id_term_order_key;

ALTER TABLE IF EXISTS academic_terms 
ADD CONSTRAINT academic_terms_school_id_session_id_term_order_key 
UNIQUE (school_id, session_id, term_order);

ALTER TABLE IF EXISTS academic_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS academic_terms DISABLE ROW LEVEL SECURITY;

SELECT 'Migration 161: UNIQUE constraints verified' as status;

COMMIT;

-- ============================================================================
-- MIGRATION 162: FIX ON CONFLICT ISSUES IN ACADEMIC TABLES
-- ============================================================================
BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS academic_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  session_year VARCHAR(20),
  start_year INT,
  end_year INT,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, session_year)
);

CREATE TABLE IF NOT EXISTS academic_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  session_id UUID REFERENCES academic_sessions(id) ON DELETE CASCADE,
  term_number INT,
  name VARCHAR(100),
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, session_id, term_number)
);

DROP TRIGGER IF EXISTS trigger_auto_seed_school_safe ON schools CASCADE;
DROP TRIGGER IF EXISTS trigger_auto_seed_school_old ON schools CASCADE;
DROP TRIGGER IF EXISTS trigger_create_default_school_data ON schools CASCADE;
DROP TRIGGER IF EXISTS auto_initialize_school_curriculum ON schools CASCADE;

DROP FUNCTION IF EXISTS auto_seed_school_safe(UUID) CASCADE;
DROP FUNCTION IF EXISTS trigger_auto_seed_school() CASCADE;
DROP FUNCTION IF EXISTS trigger_auto_seed_on_school_insert() CASCADE;
DROP FUNCTION IF EXISTS ensure_academic_session_exists(UUID) CASCADE;
DROP FUNCTION IF EXISTS safe_insert_academic_session(UUID, VARCHAR, INT, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS safe_insert_academic_term(UUID, UUID, VARCHAR, INT, DATE, DATE, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS create_default_school_data(UUID) CASCADE;

ALTER TABLE IF EXISTS academic_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS academic_terms DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_academic_sessions_school_id ON academic_sessions(school_id);
CREATE INDEX IF NOT EXISTS idx_academic_terms_school_id ON academic_terms(school_id);
CREATE INDEX IF NOT EXISTS idx_academic_terms_session_id ON academic_terms(session_id);

SELECT 'Migration 162: All problematic functions and triggers removed' as status;

COMMIT;

-- ============================================================================
-- MIGRATION 163: FIX ACADEMIC SESSIONS END_YEAR NOT NULL CONSTRAINT
-- ============================================================================
BEGIN TRANSACTION;

ALTER TABLE academic_sessions
ALTER COLUMN end_year SET DEFAULT (start_year + 1);

UPDATE academic_sessions 
SET end_year = start_year + 1 
WHERE end_year IS NULL AND start_year IS NOT NULL;

ALTER TABLE academic_sessions
ALTER COLUMN end_year SET NOT NULL;

SELECT 'Migration 163: end_year constraint fixed' as status;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES - Run these to confirm all migrations succeeded
-- ============================================================================

-- Check 1: Verify UNIQUE constraints exist
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name IN ('academic_sessions', 'academic_terms')
ORDER BY table_name;

-- Check 2: Verify end_year is NOT NULL
SELECT column_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'academic_sessions' AND column_name = 'end_year';

-- Check 3: Verify no triggers exist on schools table
SELECT trigger_name, trigger_schema
FROM information_schema.triggers
WHERE event_object_table = 'schools'
ORDER BY trigger_name;

-- Check 4: Verify functions are cleaned up
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name LIKE 'auto_seed_%' OR routine_name LIKE 'safe_insert_%'
ORDER BY routine_name;
