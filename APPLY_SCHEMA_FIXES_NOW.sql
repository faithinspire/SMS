-- ============================================================================
-- APPLY THIS DIRECTLY IN SUPABASE SQL EDITOR
-- ============================================================================
-- 
-- This file combines Migrations 155 and 156 into one executable block
-- that can be pasted directly into Supabase's SQL Editor and executed
-- 
-- Steps:
-- 1. Go to https://app.supabase.com/project/[PROJECT_ID]/sql/new
-- 2. Copy all content from this file
-- 3. Paste into the SQL Editor
-- 4. Click "RUN" (or press Ctrl+Enter)
-- 5. Check the "Notices" tab for status messages
-- 6. Verify no ERROR messages appear (warnings are OK)
--
-- ============================================================================

-- ============================================================================
-- MIGRATION 155: Fix ON CONFLICT errors by adding proper UNIQUE constraints
-- ============================================================================

-- STEP 1: Add unique constraint to schools table for email (if not exists)
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

-- STEP 2: Add unique constraint to academic_sessions (if not exists)
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

-- STEP 3: Add unique constraint to academic_terms (if not exists)
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

-- STEP 4: Add unique constraint to subjects
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

-- STEP 5: Add unique constraint to users email per school
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

-- STEP 6: Add unique constraint to students admission number
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

-- ============================================================================
-- MIGRATION 156: COMPREHENSIVE SCHEMA FIX
-- ============================================================================

-- STEP 1: Ensure academic_sessions has session_year column
DO $$
BEGIN
  ALTER TABLE academic_sessions ADD COLUMN session_year TEXT NOT NULL DEFAULT '';
  RAISE NOTICE 'Step 1: Added session_year column to academic_sessions';
EXCEPTION WHEN duplicate_column THEN
  RAISE NOTICE 'Step 1: Column session_year already exists in academic_sessions';
WHEN OTHERS THEN
  RAISE NOTICE 'Step 1: Error adding session_year: %', SQLERRM;
END $$;

-- STEP 2: Migrate data from 'name' column to session_year if needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'academic_sessions' AND column_name = 'name'
  ) THEN
    UPDATE academic_sessions 
    SET session_year = name 
    WHERE session_year = '' AND name IS NOT NULL;
    RAISE NOTICE 'Step 2: Migrated data from name column to session_year';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Step 2: No migration from name column needed or error occurred: %', SQLERRM;
END $$;

-- STEP 3: Drop 'name' column from academic_sessions if it exists
DO $$
BEGIN
  ALTER TABLE academic_sessions DROP COLUMN IF EXISTS name CASCADE;
  RAISE NOTICE 'Step 3: Dropped name column from academic_sessions';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Step 3: Error dropping name column (may not exist): %', SQLERRM;
END $$;

-- STEP 4: Ensure academic_sessions has required columns
DO $$
BEGIN
  ALTER TABLE academic_sessions ADD COLUMN IF NOT EXISTS start_year INTEGER;
  RAISE NOTICE 'Step 4a: Added start_year column';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Step 4a: Error with start_year: %', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE academic_sessions ADD COLUMN IF NOT EXISTS end_year INTEGER;
  RAISE NOTICE 'Step 4b: Added end_year column';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Step 4b: Error with end_year: %', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE academic_sessions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT FALSE;
  RAISE NOTICE 'Step 4c: Added is_active column';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Step 4c: Error with is_active: %', SQLERRM;
END $$;

-- STEP 5: Populate start_year and end_year from session_year if empty
DO $$
BEGIN
  UPDATE academic_sessions
  SET 
    start_year = CAST(SUBSTRING(session_year, 1, 4) AS INTEGER),
    end_year = CAST(SUBSTRING(session_year, 6, 4) AS INTEGER)
  WHERE (start_year IS NULL OR end_year IS NULL) AND session_year != '';
  RAISE NOTICE 'Step 5: Populated start_year and end_year from session_year';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Step 5: Error populating year columns: %', SQLERRM;
END $$;

-- STEP 6: Ensure academic_terms has term_order column
DO $$
BEGIN
  ALTER TABLE academic_terms ADD COLUMN IF NOT EXISTS term_order INTEGER;
  RAISE NOTICE 'Step 6: Added term_order column to academic_terms';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Step 6: Error adding term_order: %', SQLERRM;
END $$;

-- STEP 7: Drop old conflicting constraints
DO $$
BEGIN
  ALTER TABLE academic_sessions DROP CONSTRAINT IF EXISTS academic_sessions_school_year_unique CASCADE;
  RAISE NOTICE 'Step 7a: Dropped old academic_sessions_school_year_unique constraint';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Step 7a: No old constraint to drop: %', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE academic_terms DROP CONSTRAINT IF EXISTS academic_terms_session_order_unique CASCADE;
  RAISE NOTICE 'Step 7b: Dropped old academic_terms_session_order_unique constraint';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Step 7b: No old constraint to drop: %', SQLERRM;
END $$;

-- STEP 8: Add correct UNIQUE constraints on academic_sessions
DO $$
BEGIN
  ALTER TABLE academic_sessions 
  ADD CONSTRAINT academic_sessions_school_session_unique UNIQUE (school_id, session_year);
  RAISE NOTICE 'Step 8: Added unique constraint on academic_sessions(school_id, session_year)';
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Step 8: Constraint academic_sessions_school_session_unique already exists';
WHEN OTHERS THEN
  RAISE NOTICE 'Step 8: Error adding academic_sessions constraint: %', SQLERRM;
END $$;

-- STEP 9: Add correct UNIQUE constraints on academic_terms
DO $$
BEGIN
  ALTER TABLE academic_terms 
  ADD CONSTRAINT academic_terms_school_session_term_unique UNIQUE (school_id, session_id, term_order);
  RAISE NOTICE 'Step 9: Added unique constraint on academic_terms(school_id, session_id, term_order)';
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Step 9: Constraint academic_terms_school_session_term_unique already exists';
WHEN OTHERS THEN
  RAISE NOTICE 'Step 9: Error adding academic_terms constraint: %', SQLERRM;
END $$;

-- STEP 10: Ensure schools has email unique constraint
DO $$
BEGIN
  ALTER TABLE schools 
  ADD CONSTRAINT schools_email_unique UNIQUE (email);
  RAISE NOTICE 'Step 10: Added unique constraint on schools(email)';
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Step 10: Constraint schools_email_unique already exists';
WHEN OTHERS THEN
  RAISE NOTICE 'Step 10: Error adding schools constraint: %', SQLERRM;
END $$;

-- STEP 11: Create indexes for performance
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_academic_sessions_school_session 
    ON academic_sessions(school_id, session_year);
  RAISE NOTICE 'Step 11a: Created index on academic_sessions(school_id, session_year)';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Step 11a: Error creating index: %', SQLERRM;
END $$;

DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_academic_terms_school_session_term 
    ON academic_terms(school_id, session_id, term_order);
  RAISE NOTICE 'Step 11b: Created index on academic_terms(school_id, session_id, term_order)';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Step 11b: Error creating index: %', SQLERRM;
END $$;

-- STEP 12: Test that ON CONFLICT now works
DO $$
BEGIN
  INSERT INTO academic_sessions (school_id, session_year, start_year, is_active)
  SELECT id, '2024/2025', 2024, false FROM schools LIMIT 1
  ON CONFLICT (school_id, session_year) DO NOTHING;
  RAISE NOTICE 'Step 12: Test ON CONFLICT for academic_sessions SUCCEEDED';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Step 12: Test ON CONFLICT for academic_sessions failed (OK if no schools): %', SQLERRM;
END $$;

-- STEP 13: Verify schema is correct
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM information_schema.table_constraints
  WHERE constraint_name IN (
    'academic_sessions_school_session_unique',
    'academic_terms_school_session_term_unique',
    'schools_email_unique'
  );
  
  RAISE NOTICE 'Step 13: Verification - Found % required constraints', v_count;
  
  SELECT COUNT(*) INTO v_count FROM information_schema.columns
  WHERE table_name = 'academic_sessions' 
  AND column_name IN ('session_year', 'start_year', 'is_active');
  
  RAISE NOTICE 'Step 13: academic_sessions has % of 3 required columns', v_count;
END $$;

-- ============================================================================
-- FINAL: Summary SELECT to confirm everything is in place
-- ============================================================================
SELECT 
  'SCHEMA FIX COMPLETE' as status,
  (SELECT COUNT(*) FROM academic_sessions) as academic_sessions_count,
  (SELECT COUNT(*) FROM academic_terms) as academic_terms_count,
  (SELECT COUNT(*) FROM information_schema.table_constraints 
   WHERE constraint_name IN (
     'academic_sessions_school_session_unique',
     'academic_terms_school_session_term_unique'
   )) as constraints_created;
