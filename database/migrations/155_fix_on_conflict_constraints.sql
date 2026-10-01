-- Migration 155: Fix ON CONFLICT errors by adding proper UNIQUE constraints
-- Error Code: 42P10 - there is no unique or exclusion constraint matching the ON CONFLICT specification
-- This migration adds missing unique constraints to tables used with ON CONFLICT
-- All statements are wrapped in DO/EXCEPTION blocks for idempotency

-- ============================================================================
-- STEP 1: Add unique constraint to schools table for email (if not exists)
-- ============================================================================
DO $$
BEGIN
  ALTER TABLE schools 
  ADD CONSTRAINT schools_email_unique UNIQUE (email);
  RAISE NOTICE 'Migration 155 - Step 1: Added unique constraint on schools(email)';
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Migration 155 - Step 1: Constraint schools_email_unique already exists';
WHEN OTHERS THEN
  RAISE NOTICE 'Migration 155 - Step 1: Error adding schools constraint: %', SQLERRM;
END $$;

-- ============================================================================
-- STEP 2: Add unique constraint to academic_sessions (if not exists)
-- ============================================================================
DO $$
BEGIN
  ALTER TABLE academic_sessions 
  ADD CONSTRAINT academic_sessions_school_session_unique UNIQUE (school_id, session_year);
  RAISE NOTICE 'Migration 155 - Step 2: Added unique constraint on academic_sessions(school_id, session_year)';
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Migration 155 - Step 2: Constraint academic_sessions_school_session_unique already exists';
WHEN OTHERS THEN
  RAISE NOTICE 'Migration 155 - Step 2: Error adding academic_sessions constraint: %', SQLERRM;
END $$;

-- ============================================================================
-- STEP 3: Add unique constraint to academic_terms (if not exists)
-- ============================================================================
DO $$
BEGIN
  ALTER TABLE academic_terms 
  ADD CONSTRAINT academic_terms_school_session_term_unique UNIQUE (school_id, session_id, term_order);
  RAISE NOTICE 'Migration 155 - Step 3: Added unique constraint on academic_terms(school_id, session_id, term_order)';
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Migration 155 - Step 3: Constraint academic_terms_school_session_term_unique already exists';
WHEN OTHERS THEN
  RAISE NOTICE 'Migration 155 - Step 3: Error adding academic_terms constraint: %', SQLERRM;
END $$;

-- ============================================================================
-- STEP 4: Add unique constraint to subjects
-- ============================================================================
DO $$
BEGIN
  ALTER TABLE subjects 
  ADD CONSTRAINT subjects_school_name_unique UNIQUE (school_id, name);
  RAISE NOTICE 'Migration 155 - Step 4: Added unique constraint on subjects(school_id, name)';
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Migration 155 - Step 4: Constraint subjects_school_name_unique already exists';
WHEN OTHERS THEN
  RAISE NOTICE 'Migration 155 - Step 4: Error adding subjects constraint: %', SQLERRM;
END $$;

-- ============================================================================
-- STEP 5: Add unique constraint to users email per school
-- ============================================================================
DO $$
BEGIN
  ALTER TABLE users 
  ADD CONSTRAINT users_school_email_unique UNIQUE (school_id, email);
  RAISE NOTICE 'Migration 155 - Step 5: Added unique constraint on users(school_id, email)';
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Migration 155 - Step 5: Constraint users_school_email_unique already exists';
WHEN OTHERS THEN
  RAISE NOTICE 'Migration 155 - Step 5: Error adding users constraint: %', SQLERRM;
END $$;

-- ============================================================================
-- STEP 6: Add unique constraint to students admission number
-- ============================================================================
DO $$
BEGIN
  ALTER TABLE students 
  ADD CONSTRAINT students_school_admission_unique UNIQUE (school_id, admission_number);
  RAISE NOTICE 'Migration 155 - Step 6: Added unique constraint on students(school_id, admission_number)';
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Migration 155 - Step 6: Constraint students_school_admission_unique already exists';
WHEN OTHERS THEN
  RAISE NOTICE 'Migration 155 - Step 6: Error adding students constraint: %', SQLERRM;
END $$;
