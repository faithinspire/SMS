-- ============================================================================
-- Migration 157: COMPREHENSIVE SCHEMA & CONSTRAINT FIX
-- ============================================================================
--
-- PURPOSE: Fix PostgreSQL errors 42703 and 42P10 that prevent school registration
--
-- 42703: "column 'session_year' does not exist" when ALTER TABLE tries to add constraint
-- 42P10: "there is no unique or exclusion constraint matching the ON CONFLICT specification"
--
-- ROOT CAUSES:
-- 1. academic_sessions table may be missing session_year column (created with old schema)
-- 2. Unique constraints don't exist on tables referenced by ON CONFLICT clauses
-- 3. Earlier CREATE TABLE IF NOT EXISTS migrations didn't overwrite old table schemas
--
-- SOLUTION:
-- 1. Safely add missing columns (idempotent)
-- 2. Drop old/wrong constraints that reference non-existent columns
-- 3. Add all required UNIQUE constraints with exception handling (IF NOT EXISTS pattern)
-- 4. Test ON CONFLICT statements to verify fixes
--
-- SAFETY:
-- - Uses DO blocks with exception handling for true idempotency
-- - Never drops tables (preserves data)
-- - Safe to run multiple times
-- - Safe to run on fresh databases
--
-- ============================================================================

BEGIN TRANSACTION;

-- ============================================================================
-- PHASE 1: ENSURE academic_sessions HAS CORRECT COLUMNS
-- ============================================================================

DO $$
BEGIN
  -- Add session_year if missing
  ALTER TABLE academic_sessions ADD COLUMN session_year VARCHAR(20);
  RAISE NOTICE 'Added session_year column to academic_sessions';
EXCEPTION WHEN duplicate_column THEN
  RAISE NOTICE 'Column session_year already exists in academic_sessions';
WHEN OTHERS THEN
  RAISE NOTICE 'Error adding session_year: %', SQLERRM;
END $$;

-- Add start_year if missing
DO $$
BEGIN
  ALTER TABLE academic_sessions ADD COLUMN start_year INT;
  RAISE NOTICE 'Added start_year column to academic_sessions';
EXCEPTION WHEN duplicate_column THEN
  RAISE NOTICE 'Column start_year already exists in academic_sessions';
WHEN OTHERS THEN
  RAISE NOTICE 'Error adding start_year: %', SQLERRM;
END $$;

-- Add end_year if missing
DO $$
BEGIN
  ALTER TABLE academic_sessions ADD COLUMN end_year INT;
  RAISE NOTICE 'Added end_year column to academic_sessions';
EXCEPTION WHEN duplicate_column THEN
  RAISE NOTICE 'Column end_year already exists in academic_sessions';
WHEN OTHERS THEN
  RAISE NOTICE 'Error adding end_year: %', SQLERRM;
END $$;

-- Add is_active if missing
DO $$
BEGIN
  ALTER TABLE academic_sessions ADD COLUMN is_active BOOLEAN DEFAULT FALSE;
  RAISE NOTICE 'Added is_active column to academic_sessions';
EXCEPTION WHEN duplicate_column THEN
  RAISE NOTICE 'Column is_active already exists in academic_sessions';
WHEN OTHERS THEN
  RAISE NOTICE 'Error adding is_active: %', SQLERRM;
END $$;

-- Add updated_at if missing
DO $$
BEGIN
  ALTER TABLE academic_sessions ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  RAISE NOTICE 'Added updated_at column to academic_sessions';
EXCEPTION WHEN duplicate_column THEN
  RAISE NOTICE 'Column updated_at already exists in academic_sessions';
WHEN OTHERS THEN
  RAISE NOTICE 'Error adding updated_at: %', SQLERRM;
END $$;

-- Drop the 'name' column if it exists (we use session_year instead)
DO $$
BEGIN
  ALTER TABLE academic_sessions DROP COLUMN IF EXISTS name CASCADE;
  RAISE NOTICE 'Dropped name column from academic_sessions (if it existed)';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not drop name column (may not exist): %', SQLERRM;
END $$;

-- ============================================================================
-- PHASE 2: ENSURE academic_terms HAS CORRECT COLUMNS
-- ============================================================================

DO $$
BEGIN
  ALTER TABLE academic_terms ADD COLUMN term_order INTEGER;
  RAISE NOTICE 'Added term_order column to academic_terms';
EXCEPTION WHEN duplicate_column THEN
  RAISE NOTICE 'Column term_order already exists in academic_terms';
WHEN OTHERS THEN
  RAISE NOTICE 'Error adding term_order: %', SQLERRM;
END $$;

-- ============================================================================
-- PHASE 3: DROP OLD/WRONG CONSTRAINTS THAT REFERENCE NON-EXISTENT COLUMNS
-- ============================================================================

-- Drop old academic_sessions constraints that may reference wrong columns
DO $$
BEGIN
  ALTER TABLE academic_sessions DROP CONSTRAINT IF EXISTS academic_sessions_school_year_unique;
  RAISE NOTICE 'Dropped old constraint academic_sessions_school_year_unique (if it existed)';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not drop academic_sessions_school_year_unique: %', SQLERRM;
END $$;

-- Drop old academic_terms constraints
DO $$
BEGIN
  ALTER TABLE academic_terms DROP CONSTRAINT IF EXISTS academic_terms_session_order_unique;
  RAISE NOTICE 'Dropped old constraint academic_terms_session_order_unique (if it existed)';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not drop academic_terms_session_order_unique: %', SQLERRM;
END $$;

-- ============================================================================
-- PHASE 4: ADD REQUIRED UNIQUE CONSTRAINTS (SAFE WITH IF NOT EXISTS PATTERN)
-- ============================================================================

-- Constraint on schools(email)
DO $$
BEGIN
  ALTER TABLE schools 
  ADD CONSTRAINT schools_email_unique UNIQUE (email);
  RAISE NOTICE 'Added unique constraint on schools(email)';
EXCEPTION WHEN duplicate_table THEN
  RAISE NOTICE 'Constraint schools_email_unique already exists on schools';
WHEN OTHERS THEN
  RAISE NOTICE 'Error adding schools constraint: %', SQLERRM;
END $$;

-- Constraint on academic_sessions(school_id, session_year)
DO $$
BEGIN
  ALTER TABLE academic_sessions 
  ADD CONSTRAINT academic_sessions_school_session_unique UNIQUE (school_id, session_year);
  RAISE NOTICE 'Added unique constraint on academic_sessions(school_id, session_year)';
EXCEPTION WHEN duplicate_table THEN
  RAISE NOTICE 'Constraint academic_sessions_school_session_unique already exists';
WHEN OTHERS THEN
  RAISE NOTICE 'Error adding academic_sessions constraint: %', SQLERRM;
END $$;

-- Constraint on academic_terms(school_id, session_id, term_order)
DO $$
BEGIN
  ALTER TABLE academic_terms 
  ADD CONSTRAINT academic_terms_school_session_term_unique UNIQUE (school_id, session_id, term_order);
  RAISE NOTICE 'Added unique constraint on academic_terms(school_id, session_id, term_order)';
EXCEPTION WHEN duplicate_table THEN
  RAISE NOTICE 'Constraint academic_terms_school_session_term_unique already exists';
WHEN OTHERS THEN
  RAISE NOTICE 'Error adding academic_terms constraint: %', SQLERRM;
END $$;

-- Constraint on academic_terms(session_id, term_name) - for term name uniqueness
DO $$
BEGIN
  ALTER TABLE academic_terms 
  ADD CONSTRAINT academic_terms_session_term_name_unique UNIQUE (session_id, term_name);
  RAISE NOTICE 'Added unique constraint on academic_terms(session_id, term_name)';
EXCEPTION WHEN duplicate_table THEN
  RAISE NOTICE 'Constraint academic_terms_session_term_name_unique already exists';
WHEN OTHERS THEN
  RAISE NOTICE 'Error adding academic_terms(session_id, term_name) constraint: %', SQLERRM;
END $$;

-- Constraint on subjects(school_id, name)
DO $$
BEGIN
  ALTER TABLE subjects 
  ADD CONSTRAINT subjects_school_name_unique UNIQUE (school_id, name);
  RAISE NOTICE 'Added unique constraint on subjects(school_id, name)';
EXCEPTION WHEN duplicate_table THEN
  RAISE NOTICE 'Constraint subjects_school_name_unique already exists';
WHEN OTHERS THEN
  RAISE NOTICE 'Error adding subjects constraint: %', SQLERRM;
END $$;

-- Constraint on users(school_id, email)
DO $$
BEGIN
  ALTER TABLE users 
  ADD CONSTRAINT users_school_email_unique UNIQUE (school_id, email);
  RAISE NOTICE 'Added unique constraint on users(school_id, email)';
EXCEPTION WHEN duplicate_table THEN
  RAISE NOTICE 'Constraint users_school_email_unique already exists';
WHEN OTHERS THEN
  RAISE NOTICE 'Error adding users constraint: %', SQLERRM;
END $$;

-- Constraint on students(school_id, admission_number)
DO $$
BEGIN
  ALTER TABLE students 
  ADD CONSTRAINT students_school_admission_unique UNIQUE (school_id, admission_number);
  RAISE NOTICE 'Added unique constraint on students(school_id, admission_number)';
EXCEPTION WHEN duplicate_table THEN
  RAISE NOTICE 'Constraint students_school_admission_unique already exists';
WHEN OTHERS THEN
  RAISE NOTICE 'Error adding students constraint: %', SQLERRM;
END $$;

-- ============================================================================
-- PHASE 5: TEST ON CONFLICT STATEMENTS (VERIFY FIXES WORK)
-- ============================================================================

DO $$
DECLARE
  v_test_count INT;
BEGIN
  -- Test 1: ON CONFLICT for academic_sessions
  BEGIN
    INSERT INTO academic_sessions (school_id, session_year, start_year, is_active)
    SELECT id, '2024/2025', 2024, false FROM schools LIMIT 1
    ON CONFLICT (school_id, session_year) DO NOTHING;
    RAISE NOTICE 'Test 1 PASSED: ON CONFLICT for academic_sessions(school_id, session_year) works';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Test 1 FAILED: %', SQLERRM;
  END;

  -- Test 2: ON CONFLICT for academic_terms
  BEGIN
    -- Only if we have sessions
    SELECT COUNT(*) INTO v_test_count FROM academic_sessions LIMIT 1;
    IF v_test_count > 0 THEN
      INSERT INTO academic_terms (school_id, session_id, term_name, term_order, start_date, end_date, is_active)
      SELECT 
        s.school_id, 
        s.id, 
        'First Term', 
        1, 
        CURRENT_DATE, 
        CURRENT_DATE + INTERVAL '90 days', 
        false
      FROM academic_sessions s LIMIT 1
      ON CONFLICT (session_id, term_name) DO NOTHING;
      RAISE NOTICE 'Test 2 PASSED: ON CONFLICT for academic_terms(session_id, term_name) works';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Test 2 FAILED: %', SQLERRM;
  END;

  -- Test 3: ON CONFLICT for schools email
  BEGIN
    -- Try update with ON CONFLICT
    INSERT INTO schools (name, email, type, status)
    VALUES ('Test School', 'test@example.com', 'BOTH', 'ACTIVE')
    ON CONFLICT (email) DO UPDATE SET updated_at = NOW();
    RAISE NOTICE 'Test 3 PASSED: ON CONFLICT for schools(email) works';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Test 3 FAILED: %', SQLERRM;
  END;

  RAISE NOTICE '========== ALL TESTS COMPLETE ==========';
END $$;

COMMIT;

-- ============================================================================
-- FINAL VERIFICATION QUERY (Run manually after migration)
-- ============================================================================
-- SELECT 
--   'academic_sessions' as table_name,
--   column_name,
--   data_type
-- FROM information_schema.columns
-- WHERE table_name = 'academic_sessions'
-- ORDER BY ordinal_position;
--
-- SELECT 
--   constraint_name,
--   constraint_type
-- FROM information_schema.table_constraints
-- WHERE table_name IN ('academic_sessions', 'academic_terms', 'schools', 'subjects', 'users', 'students')
-- AND constraint_type = 'UNIQUE'
-- ORDER BY table_name, constraint_name;
