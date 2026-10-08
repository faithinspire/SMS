-- Migration 167: Fix production issues
-- 1. Ensure all columns exist in academic_terms
-- 2. Fix Students API 500 errors
-- 3. Ensure RLS is disabled for API access

BEGIN;

-- Ensure academic_terms has all required columns
ALTER TABLE academic_terms ADD COLUMN IF NOT EXISTS name VARCHAR(100);
ALTER TABLE academic_terms ADD COLUMN IF NOT EXISTS term_number INT;
ALTER TABLE academic_terms ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE academic_terms ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE academic_terms ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT FALSE;

-- Ensure academic_sessions has all required columns  
ALTER TABLE academic_sessions ADD COLUMN IF NOT EXISTS session_year VARCHAR(20);
ALTER TABLE academic_sessions ADD COLUMN IF NOT EXISTS start_year INT;
ALTER TABLE academic_sessions ADD COLUMN IF NOT EXISTS end_year INT;
ALTER TABLE academic_sessions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT FALSE;

-- Disable RLS on academic tables for API access
ALTER TABLE academic_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE academic_terms DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_academic_sessions_school_id ON academic_sessions(school_id);
CREATE INDEX IF NOT EXISTS idx_academic_sessions_active ON academic_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_academic_terms_school_id ON academic_terms(school_id);
CREATE INDEX IF NOT EXISTS idx_academic_terms_session_id ON academic_terms(session_id);
CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id);

COMMIT;
