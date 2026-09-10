-- Migration 089: Fix Lesson Notes & Assignments Schema
-- Align database schema with application code
-- Ensures all required columns exist

-- ============================================================================
-- LESSON NOTES TABLE FIXES
-- ============================================================================

-- Step 1: Add missing columns to lesson_notes if they don't exist
ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'SUBMITTED';
ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS reviewed_by UUID;
ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS reviewer_comments TEXT;
ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 2: Ensure content column exists for backward compatibility
ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS content TEXT;

-- Step 3: Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_lesson_notes_status ON lesson_notes(status);
CREATE INDEX IF NOT EXISTS idx_lesson_notes_reviewed_by ON lesson_notes(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_lesson_notes_submitted_at ON lesson_notes(submitted_at DESC);

-- ============================================================================
-- ASSIGNMENTS TABLE FIXES
-- ============================================================================

-- Step 1: Verify max_marks column exists (it should from migration 001)
-- No changes needed if column exists

-- Step 2: Ensure other required columns exist
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS max_marks NUMERIC(5,2);
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_assignments_created_by ON assignments(created_by);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);

-- ============================================================================
-- ASSIGNMENT SUBMISSIONS TABLE FIXES
-- ============================================================================

-- Ensure assignment_submissions exists with all columns
CREATE TABLE IF NOT EXISTS assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  submission_text TEXT,
  submission_files JSONB,
  file_path TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_late BOOLEAN DEFAULT FALSE,
  marks_awarded NUMERIC(5,2),
  feedback TEXT,
  graded_at TIMESTAMP WITH TIME ZONE,
  graded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment_id ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student_id ON assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_school_id ON assignment_submissions(school_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_submitted_at ON assignment_submissions(submitted_at DESC);

-- ============================================================================
-- HEADTEACHER REVIEW WORKFLOW SUPPORT
-- ============================================================================

-- Add foreign key constraint for reviewed_by using PL/pgSQL to handle duplicates
DO $$ 
BEGIN
  ALTER TABLE lesson_notes ADD CONSTRAINT fk_lesson_notes_reviewed_by 
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN
  NULL;  -- Constraint already exists, that's OK
END;
$$;

-- Status values for lesson_notes workflow
-- Valid values: SUBMITTED, UNDER_REVIEW, APPROVED, RETURNED

-- ============================================================================
-- DATA INTEGRITY
-- ============================================================================

-- Verify all records have created_at timestamp
UPDATE lesson_notes SET created_at = NOW() WHERE created_at IS NULL;
UPDATE assignments SET created_at = NOW() WHERE created_at IS NULL;

-- Set default status for records without status
UPDATE lesson_notes SET status = 'SUBMITTED' WHERE status IS NULL;
UPDATE assignments SET status = 'ACTIVE' WHERE status IS NULL;

-- ============================================================================
-- END MIGRATION 089
-- ============================================================================
-- Summary of changes:
-- 1. Added status, reviewed_by, reviewed_at, reviewer_comments to lesson_notes
-- 2. Ensured max_marks exists in assignments table
-- 3. Created assignment_submissions table with all required columns
-- 4. Added foreign key constraint for lesson_notes.reviewed_by
-- 5. Created indexes for better query performance
-- 6. Added data integrity fixes
--
-- Result: Schema now supports:
-- - Teacher lesson note submission
-- - Headteacher review and approval workflow
-- - Student assignment uploads
-- - Teacher grading functionality
-- ============================================================================
