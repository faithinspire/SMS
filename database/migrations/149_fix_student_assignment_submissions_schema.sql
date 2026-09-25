-- ============================================================================
-- Migration 149: Fix Student Assignment Submissions Schema
-- ============================================================================
-- CRITICAL FIX: Ensure student_assignment_submissions table has all required columns
-- Error: PGRST204 "Could not find the 'file_name' column"
-- Root Cause: Columns added to wrong table (assignment_submissions instead of student_assignment_submissions)
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Verify student_assignment_submissions table exists
-- ============================================================================

-- Create student_assignment_submissions if it doesn't exist
CREATE TABLE IF NOT EXISTS student_assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  submitted_at TIMESTAMP WITH TIME ZONE,
  marks_awarded NUMERIC(5,2),
  feedback TEXT,
  is_late BOOLEAN DEFAULT FALSE,
  UNIQUE(assignment_id, student_id)
);

-- ============================================================================
-- STEP 2: Add all required file-related columns
-- ============================================================================

ALTER TABLE student_assignment_submissions ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE student_assignment_submissions ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE student_assignment_submissions ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE student_assignment_submissions ADD COLUMN IF NOT EXISTS submission_status VARCHAR(50) DEFAULT 'SUBMITTED';
ALTER TABLE student_assignment_submissions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE student_assignment_submissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ============================================================================
-- STEP 3: Verify all columns now exist
-- ============================================================================

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'student_assignment_submissions'
ORDER BY ordinal_position;

-- ============================================================================
-- STEP 4: Grant permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON student_assignment_submissions TO anon;
GRANT SELECT, INSERT, UPDATE ON student_assignment_submissions TO authenticated;

-- ============================================================================
-- STEP 5: Verify data integrity - no conflicts with assignment_submissions
-- ============================================================================

-- Show which table has more records (for verification)
SELECT 
  'student_assignment_submissions' as table_name,
  COUNT(*) as record_count
FROM student_assignment_submissions
UNION ALL
SELECT 
  'assignment_submissions' as table_name,
  COUNT(*) as record_count
FROM assignment_submissions;

-- ============================================================================
-- Completion
-- ============================================================================

COMMIT;

SELECT 'Migration 149 completed: Fixed student_assignment_submissions schema' as status;
