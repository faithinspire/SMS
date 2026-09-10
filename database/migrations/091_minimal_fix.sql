-- Migration 091: Minimal Database Schema Fix
-- Only adds absolutely necessary columns that don't exist

-- ============================================================================
-- ADD MISSING COLUMNS TO lesson_notes
-- ============================================================================
ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'SUBMITTED';
ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS reviewed_by UUID;
ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS reviewer_comments TEXT;

-- ============================================================================
-- ADD MISSING COLUMNS TO assignments
-- ============================================================================
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS max_marks NUMERIC(5,2);

-- ============================================================================
-- CREATE assignment_submissions TABLE (if it doesn't exist)
-- ============================================================================
CREATE TABLE IF NOT EXISTS assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  marks_awarded NUMERIC(5,2),
  feedback TEXT,
  UNIQUE(assignment_id, student_id)
);

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_lesson_notes_status ON lesson_notes(status);
CREATE INDEX IF NOT EXISTS idx_lesson_notes_reviewed_by ON lesson_notes(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment_id ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student_id ON assignment_submissions(student_id);

-- ============================================================================
-- DONE
-- ============================================================================
-- This minimal migration adds only essential columns needed for:
-- ✅ Teacher lesson note submission  
-- ✅ Headteacher review workflow
-- ✅ Assignment grading (max_marks)
-- ✅ Student submission tracking
-- ============================================================================
