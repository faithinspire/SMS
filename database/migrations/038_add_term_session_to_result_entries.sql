-- Migration 038: Add term and academic_session to result_entries
-- Allows tracking of results across multiple terms and academic sessions

-- Add term and academic_session columns to result_entries
ALTER TABLE result_entries ADD COLUMN IF NOT EXISTS term VARCHAR(50) DEFAULT 'First Term';
ALTER TABLE result_entries ADD COLUMN IF NOT EXISTS academic_session VARCHAR(20) DEFAULT '2026/2027';

-- Add indices for faster queries
CREATE INDEX IF NOT EXISTS idx_result_entries_term ON result_entries(term);
CREATE INDEX IF NOT EXISTS idx_result_entries_session ON result_entries(academic_session);
CREATE INDEX IF NOT EXISTS idx_result_entries_student_term ON result_entries(student_id, term, academic_session);

-- Add percentage column for storing calculated percentage
ALTER TABLE result_entries ADD COLUMN IF NOT EXISTS percentage NUMERIC(5,2) DEFAULT 0 CHECK (percentage >= 0 AND percentage <= 100);

-- Add teacher_comment column for teacher remarks
ALTER TABLE result_entries ADD COLUMN IF NOT EXISTS teacher_comment TEXT;

-- Create index for faster lookups by student, term, and session
CREATE INDEX IF NOT EXISTS idx_result_entries_student_term_session ON result_entries(student_id, term, academic_session);
CREATE INDEX IF NOT EXISTS idx_result_entries_class_term_session ON result_entries(class_arm_combo_id, term, academic_session);
