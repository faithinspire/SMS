-- Migration 090: Fix Lesson Notes & Assignments Schema (SIMPLE)
-- PostgreSQL compatible - no IF NOT EXISTS on constraints

-- ============================================================================
-- STEP 1: Add columns to lesson_notes
-- ============================================================================
ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'SUBMITTED';
ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS reviewed_by UUID;
ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS reviewer_comments TEXT;
ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS content TEXT;

-- ============================================================================
-- STEP 2: Add columns to assignments
-- ============================================================================
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS max_marks NUMERIC(5,2);
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';

-- ============================================================================
-- STEP 3: Create assignment_submissions table
-- ============================================================================
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

-- ============================================================================
-- STEP 4: Create indexes for lesson_notes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_lesson_notes_status ON lesson_notes(status);
CREATE INDEX IF NOT EXISTS idx_lesson_notes_reviewed_by ON lesson_notes(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_lesson_notes_submitted_at ON lesson_notes(submitted_at DESC);

-- ============================================================================
-- STEP 5: Create indexes for assignments
-- ============================================================================
-- Only create indexes for columns that exist
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);

-- ============================================================================
-- STEP 6: Create indexes for assignment_submissions
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment_id ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student_id ON assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_school_id ON assignment_submissions(school_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_submitted_at ON assignment_submissions(submitted_at DESC);

-- ============================================================================
-- STEP 7: Data integrity fixes
-- ============================================================================
UPDATE lesson_notes SET created_at = NOW() WHERE created_at IS NULL;
UPDATE assignments SET created_at = NOW() WHERE created_at IS NULL;
UPDATE lesson_notes SET status = 'SUBMITTED' WHERE status IS NULL;
UPDATE assignments SET status = 'ACTIVE' WHERE status IS NULL;

-- ============================================================================
-- STEP 8: Foreign key constraint (with error handling)
-- ============================================================================
-- Try to add the constraint - if it already exists, it will fail silently in transaction
DO $$ 
BEGIN
  ALTER TABLE lesson_notes ADD CONSTRAINT fk_lesson_notes_reviewed_by 
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN
  NULL;  -- Constraint already exists, that's fine
END;
$$;

-- ============================================================================
-- End of Migration 090
-- ============================================================================
-- This migration ensures all necessary columns and tables exist for:
-- ✅ Teacher lesson note submission
-- ✅ Headteacher lesson note review and approval
-- ✅ Teacher assignment creation
-- ✅ Student assignment submission
-- ✅ Teacher assignment grading
-- ============================================================================
