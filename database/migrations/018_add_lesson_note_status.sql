-- Add status column to lesson_notes table for principal review workflow
-- Migration: 018_add_lesson_note_status.sql
-- Purpose: Enable lesson note approval/rejection workflow

BEGIN;

-- Add status column if it doesn't exist
ALTER TABLE lesson_notes 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'RETURNED'));

-- Add review tracking columns
ALTER TABLE lesson_notes
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reviewer_comments TEXT;

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_lesson_notes_status_school ON lesson_notes(status, school_id);
CREATE INDEX IF NOT EXISTS idx_lesson_notes_created_by_school ON lesson_notes(created_by, school_id);

COMMIT;
