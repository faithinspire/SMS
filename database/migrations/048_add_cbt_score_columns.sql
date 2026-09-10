-- ============================================================================
-- MIGRATION 048: ADD CBT SCORE COLUMNS TO SCORE_SHEETS
-- ============================================================================
-- Allows CBT exam scores to be synced to the gradebook (score_sheets table)
-- without conflicting with the existing test1-4 and exam columns

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
-- NOTES
-- ============================================================================
-- 
-- CBT scores are now stored in score_sheets table with:
-- - assessment_type = 'CBT' (vs 'TRADITIONAL' for manual entries)
-- - marks_obtained = CBT score
-- - total_marks = Max possible score for the CBT
-- - percentage = Score as percentage (0-100)
-- - is_passed = Whether student passed (based on passing_percentage)
-- - cbt_submission_id = Reference to original submission
-- - cbt_exam_id = Reference to the exam
--
-- Traditional columns (test1-4, exam) remain for manual gradebook entry.
-- Both can coexist for same student/subject/term with different assessment_type.
--
-- Teachers can view CBT scores in the gradebook alongside traditional scores.
-- Students can see CBT scores in their results alongside regular scores.
-- ============================================================================
