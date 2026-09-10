-- Add missing columns to lesson_notes table for review workflow
ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'SUBMITTED' 
  CHECK (status IN ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'RETURNED'));

ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS reviewer_comments TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_lesson_notes_school_id ON lesson_notes(school_id);
CREATE INDEX IF NOT EXISTS idx_lesson_notes_status ON lesson_notes(status);
CREATE INDEX IF NOT EXISTS idx_lesson_notes_created_by ON lesson_notes(created_by);
CREATE INDEX IF NOT EXISTS idx_lesson_notes_school_status ON lesson_notes(school_id, status);

-- Ensure RLS is enabled
ALTER TABLE lesson_notes ENABLE ROW LEVEL SECURITY;

-- Create policy if not exists
DROP POLICY IF EXISTS "Allow all access to lesson_notes" ON lesson_notes;
CREATE POLICY "Allow all access to lesson_notes" ON lesson_notes FOR ALL USING (true);
