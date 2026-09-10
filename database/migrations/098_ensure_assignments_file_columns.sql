-- Migration 098: Ensure Assignments Has File Columns
-- Safely adds file-related columns to assignments table
-- Handles both 'assignments' and 'student_assignment_submissions' tables

BEGIN;

-- ============================================================================
-- Add file columns to assignments table (for teacher-uploaded files)
-- ============================================================================

ALTER TABLE assignments ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS file_size BIGINT;

-- ============================================================================
-- Add file columns to student_assignment_submissions (for student submissions)
-- ============================================================================

ALTER TABLE student_assignment_submissions ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE student_assignment_submissions ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE student_assignment_submissions ADD COLUMN IF NOT EXISTS file_size BIGINT;

-- ============================================================================
-- Ensure max_marks column exists (alternative to max_score)
-- ============================================================================

ALTER TABLE assignments ADD COLUMN IF NOT EXISTS max_marks NUMERIC(5,2) DEFAULT 10;

-- If max_score doesn't exist, use max_marks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assignments' AND column_name = 'max_score'
  ) THEN
    -- max_score doesn't exist, that's OK - we have max_marks
    NULL;
  END IF;
END $$;

-- ============================================================================
-- Add created_at if missing
-- ============================================================================

ALTER TABLE assignments ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ============================================================================
-- Summary: All file columns ensured to exist
-- ============================================================================
-- Columns added to assignments:
-- ✅ file_path TEXT
-- ✅ file_name TEXT  
-- ✅ file_size BIGINT
-- ✅ max_marks NUMERIC
-- ✅ created_at TIMESTAMP
--
-- Columns added to student_assignment_submissions:
-- ✅ file_path TEXT
-- ✅ file_name TEXT
-- ✅ file_size BIGINT
--
-- These columns are now available for use in application code
-- ============================================================================

COMMIT;
