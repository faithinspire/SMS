-- ============================================================================
-- Migration 070: Fix CBT Exams Schema
-- Add missing columns that the API expects
-- ============================================================================

-- Add missing columns to cbt_exams table if they don't exist
ALTER TABLE cbt_exams
ADD COLUMN IF NOT EXISTS assessment_type VARCHAR(20) CHECK (assessment_type IN ('CA1', 'CA2', 'CA3', 'CA4', 'MIDTERM', 'EXAM'));

ALTER TABLE cbt_exams
ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE cbt_exams
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED'));

ALTER TABLE cbt_exams
ADD COLUMN IF NOT EXISTS academic_session_id UUID REFERENCES academic_sessions(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_cbt_exams_teacher_id ON cbt_exams(teacher_id);
CREATE INDEX IF NOT EXISTS idx_cbt_exams_academic_session_id ON cbt_exams(academic_session_id);
CREATE INDEX IF NOT EXISTS idx_cbt_exams_assessment_type ON cbt_exams(assessment_type);
CREATE INDEX IF NOT EXISTS idx_cbt_exams_status ON cbt_exams(status);

-- Add composite index for common queries
CREATE INDEX IF NOT EXISTS idx_cbt_exams_school_term ON cbt_exams(school_id, term_id);
CREATE INDEX IF NOT EXISTS idx_cbt_exams_teacher_subject_class ON cbt_exams(teacher_id, subject_id, class_arm_combo_id);

COMMIT;
