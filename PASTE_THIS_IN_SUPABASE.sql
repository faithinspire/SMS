-- ============================================================================
-- PASTE THIS ENTIRE CONTENT INTO SUPABASE SQL EDITOR
-- ============================================================================
-- This adds CBT score columns to the score_sheets table
-- Required for CBT exam results to appear in teacher's gradebook
-- ============================================================================

-- Add CBT-specific columns if they don't exist
ALTER TABLE score_sheets
ADD COLUMN IF NOT EXISTS cbt_exam_id UUID REFERENCES cbt_exams(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS cbt_submission_id UUID REFERENCES cbt_submissions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assessment_type VARCHAR(50) DEFAULT 'TRADITIONAL'
  CHECK (assessment_type IN ('TRADITIONAL', 'CBT', 'ASSIGNMENT', 'PROJECT')),
ADD COLUMN IF NOT EXISTS marks_obtained NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS total_marks NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS percentage NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS is_passed BOOLEAN,
ADD COLUMN IF NOT EXISTS class_arm_combo_id UUID REFERENCES class_arm_combos(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS entered_by VARCHAR(100),
ADD COLUMN IF NOT EXISTS entered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS comment TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for faster CBT submission lookups
CREATE INDEX IF NOT EXISTS idx_score_sheets_cbt_submission_id 
ON score_sheets(cbt_submission_id);

-- Create index for assessment type filtering
CREATE INDEX IF NOT EXISTS idx_score_sheets_assessment_type 
ON score_sheets(school_id, assessment_type, term_id);

-- Add composite index for CBT queries
CREATE INDEX IF NOT EXISTS idx_score_sheets_cbt_lookup 
ON score_sheets(school_id, student_id, cbt_exam_id)
WHERE assessment_type = 'CBT';

-- ============================================================================
-- INSTRUCTIONS:
-- ============================================================================
-- 1. Go to https://app.supabase.com
-- 2. Click on your project
-- 3. Go to SQL Editor (left sidebar)
-- 4. Click "New Query"
-- 5. Copy this entire file
-- 6. Paste into the SQL editor window
-- 7. Click the "Run" button (or press Ctrl+Enter)
-- 8. Wait for "Success" message at bottom
-- ============================================================================
