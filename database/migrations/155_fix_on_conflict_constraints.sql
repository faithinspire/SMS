-- Migration 155: Fix ON CONFLICT errors by adding proper UNIQUE constraints
-- Error Code: 42P10 - there is no unique or exclusion constraint matching the ON CONFLICT specification
-- This migration adds missing unique constraints to tables used with ON CONFLICT

BEGIN;

-- Add unique constraint to schools table for email
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'schools' AND constraint_name = 'schools_email_unique'
  ) THEN
    ALTER TABLE schools ADD CONSTRAINT schools_email_unique UNIQUE (email);
    RAISE NOTICE 'Added unique constraint on schools.email';
  END IF;
END $$;

-- Add unique constraint to academic_sessions
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'academic_sessions' AND constraint_name = 'academic_sessions_school_year_unique'
  ) THEN
    ALTER TABLE academic_sessions ADD CONSTRAINT academic_sessions_school_year_unique UNIQUE (school_id, session_year);
    RAISE NOTICE 'Added unique constraint on academic_sessions(school_id, session_year)';
  END IF;
END $$;

-- Add unique constraint to academic_terms
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'academic_terms' AND constraint_name = 'academic_terms_session_order_unique'
  ) THEN
    ALTER TABLE academic_terms ADD CONSTRAINT academic_terms_session_order_unique UNIQUE (school_id, session_id, term_order);
    RAISE NOTICE 'Added unique constraint on academic_terms(school_id, session_id, term_order)';
  END IF;
END $$;

-- Add unique constraint to subjects
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'subjects' AND constraint_name = 'subjects_school_name_unique'
  ) THEN
    ALTER TABLE subjects ADD CONSTRAINT subjects_school_name_unique UNIQUE (school_id, name);
    RAISE NOTICE 'Added unique constraint on subjects(school_id, name)';
  END IF;
END $$;

-- Add unique constraint to users email per school
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'users' AND constraint_name = 'users_school_email_unique'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_school_email_unique UNIQUE (school_id, email);
    RAISE NOTICE 'Added unique constraint on users(school_id, email)';
  END IF;
END $$;

-- Add unique constraint to students admission number
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'students' AND constraint_name = 'students_admission_unique'
  ) THEN
    ALTER TABLE students ADD CONSTRAINT students_admission_unique UNIQUE (school_id, admission_number);
    RAISE NOTICE 'Added unique constraint on students(school_id, admission_number)';
  END IF;
END $$;

COMMIT;
