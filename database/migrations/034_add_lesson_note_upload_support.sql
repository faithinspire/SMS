-- Migration 034: Add Lesson Note Upload Support
-- This adds necessary columns and functionality for teachers to upload lesson notes

-- Ensure lesson_notes table has all required columns for submission workflow
ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT;
ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS file_mime_type TEXT;
ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS submission_notes TEXT;

-- Add school_level column to schools table if it doesn't exist
ALTER TABLE schools ADD COLUMN IF NOT EXISTS school_level TEXT CHECK (school_level IN ('PRIMARY', 'SECONDARY')) DEFAULT 'SECONDARY';

-- Add school_level column to users table for role-based access
ALTER TABLE users ADD COLUMN IF NOT EXISTS school_level TEXT CHECK (school_level IN ('PRIMARY', 'SECONDARY')) DEFAULT 'SECONDARY';

-- Create index for lesson notes by status and school for efficient queries
CREATE INDEX IF NOT EXISTS idx_lesson_notes_by_status_school ON lesson_notes(school_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lesson_notes_by_teacher ON lesson_notes(created_by, created_at DESC);

-- Add level column to classes table if it doesn't exist (for PREP, NURSERY, KG, PRIMARY 1-6, JSS 1-3, SSS 1-3)
ALTER TABLE classes ADD COLUMN IF NOT EXISTS level_number INT;

-- Create table for storing teacher-subject-class assignments
CREATE TABLE IF NOT EXISTS teacher_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_arm_combo_id UUID NOT NULL REFERENCES class_arm_combos(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(teacher_id, subject_id, class_arm_combo_id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher ON teacher_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_class ON teacher_assignments(class_arm_combo_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_school ON teacher_assignments(school_id);

-- Enable RLS
ALTER TABLE teacher_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to teacher_assignments" ON teacher_assignments;
CREATE POLICY "Allow all access to teacher_assignments" ON teacher_assignments FOR ALL USING (true);

-- Create storage bucket for lesson notes if it doesn't exist (done via storage policies)
-- Storage bucket: "lesson-notes" should be created in Supabase Storage

-- Add comment column for submission feedback
ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS submission_feedback TEXT;

-- Ensure proper defaults and constraints
ALTER TABLE lesson_notes ALTER COLUMN status SET DEFAULT 'SUBMITTED';
