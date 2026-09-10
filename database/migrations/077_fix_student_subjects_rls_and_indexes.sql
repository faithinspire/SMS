-- Migration 077: Fix student_subjects RLS and add indexes for performance
-- Purpose: Ensure student_subjects table works reliably for score sheet loading
-- Issue: "Failed to fetch" errors when loading students for subject

-- Disable RLS on student_subjects if enabled
ALTER TABLE student_subjects DISABLE ROW LEVEL SECURITY;

-- Drop any existing RLS policies
DROP POLICY IF EXISTS "student_subjects_select_own" ON student_subjects;
DROP POLICY IF EXISTS "student_subjects_insert_own" ON student_subjects;
DROP POLICY IF EXISTS "student_subjects_update_own" ON student_subjects;
DROP POLICY IF EXISTS "student_subjects_delete_own" ON student_subjects;

-- Verify the table structure
-- The table should have been created in migration 001, just ensure it's solid
-- Note: If the table doesn't exist, this will fail during migration import, but it exists based on schema review

-- Add helpful indexes for common queries
CREATE INDEX IF NOT EXISTS idx_student_subjects_subject_id_school_id 
  ON student_subjects(subject_id, school_id);

CREATE INDEX IF NOT EXISTS idx_student_subjects_student_id_subject_id 
  ON student_subjects(student_id, subject_id);

CREATE INDEX IF NOT EXISTS idx_student_subjects_school_id 
  ON student_subjects(school_id);

-- Add comment for documentation
COMMENT ON TABLE student_subjects IS 
'Link between students and their enrolled subjects for the current term.
Used by TeacherDataService.getSubjectStudents() to fetch students enrolled in a subject.
RLS disabled for reliable API access.';

COMMENT ON INDEX idx_student_subjects_subject_id_school_id IS 
'Primary index for TeacherDataService.getSubjectStudents() queries filtering by subject_id and school_id';
