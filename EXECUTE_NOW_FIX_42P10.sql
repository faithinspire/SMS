-- EXECUTE THIS IMMEDIATELY IN SUPABASE SQL EDITOR
-- This fixes the 42P10 error: there is no unique or exclusion constraint matching the ON CONFLICT specification
-- After running this, school registration will work!

BEGIN;

-- Add unique constraint to schools table for email
ALTER TABLE schools ADD CONSTRAINT schools_email_unique UNIQUE (email);

-- Add unique constraint to academic_sessions
ALTER TABLE academic_sessions ADD CONSTRAINT academic_sessions_school_year_unique UNIQUE (school_id, session_year);

-- Add unique constraint to academic_terms
ALTER TABLE academic_terms ADD CONSTRAINT academic_terms_session_order_unique UNIQUE (school_id, session_id, term_order);

-- Add unique constraint to subjects
ALTER TABLE subjects ADD CONSTRAINT subjects_school_name_unique UNIQUE (school_id, name);

-- Add unique constraint to users email per school
ALTER TABLE users ADD CONSTRAINT users_school_email_unique UNIQUE (school_id, email);

-- Add unique constraint to students admission number
ALTER TABLE students ADD CONSTRAINT students_admission_unique UNIQUE (school_id, admission_number);

COMMIT;

-- After running this, try registering a school again - it should work!
