-- ============================================================================
-- Migration 033: Add Lesson Notes Status Columns
-- ============================================================================
-- Purpose: Fix the Principal Dashboard by adding missing columns to track
--         lesson note review workflow (status, reviewed_by, reviewed_at, comments)
--
-- Error Fixed: "column lesson_notes.status does not exist"
-- ============================================================================

-- Step 1: Add missing columns to lesson_notes table
-- These columns are required for the lesson note review workflow
ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'SUBMITTED' 
  CHECK (status IN ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'RETURNED'));

ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS reviewer_comments TEXT;

-- Step 2: Create indexes for better query performance
-- These will speed up the dashboard queries
CREATE INDEX IF NOT EXISTS idx_lesson_notes_school_id ON lesson_notes(school_id);
CREATE INDEX IF NOT EXISTS idx_lesson_notes_status ON lesson_notes(status);
CREATE INDEX IF NOT EXISTS idx_lesson_notes_created_by ON lesson_notes(created_by);
CREATE INDEX IF NOT EXISTS idx_lesson_notes_school_status ON lesson_notes(school_id, status);
CREATE INDEX IF NOT EXISTS idx_lesson_notes_created_at ON lesson_notes(created_at DESC);

-- Step 3: Ensure RLS is enabled (Row Level Security)
ALTER TABLE lesson_notes ENABLE ROW LEVEL SECURITY;

-- Step 4: Create a permissive policy to allow all access
DROP POLICY IF EXISTS "Allow all access to lesson_notes" ON lesson_notes;
CREATE POLICY "Allow all access to lesson_notes" ON lesson_notes FOR ALL USING (true);

-- ============================================================================
-- Verification Query (run this after to confirm changes)
-- ============================================================================
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'lesson_notes' 
-- ORDER BY ordinal_position;
--
-- You should see these new columns:
-- - status (TEXT, NOT NULL)
-- - reviewed_by (UUID, YES)
-- - reviewed_at (TIMESTAMP WITH TIME ZONE, YES)
-- - reviewer_comments (TEXT, YES)
-- ============================================================================
