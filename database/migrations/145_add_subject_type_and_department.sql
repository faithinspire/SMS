-- ============================================================================
-- Migration 145: Add subject_type and department columns to subjects table
-- ============================================================================
-- Adds columns needed for the complete Nigerian curriculum
-- These columns support:
-- - subject_type: CORE, ELECTIVE, VOCATIONAL (for categorization)
-- - department: SCIENCE, HUMANITIES, BUSINESS, TRADE (for SS stream filtering)

BEGIN;

-- Add subject_type column (defaults to CORE for existing subjects)
ALTER TABLE subjects
ADD COLUMN IF NOT EXISTS subject_type VARCHAR(50) DEFAULT 'CORE';

-- Add department column (nullable, only used for SS classes)
ALTER TABLE subjects
ADD COLUMN IF NOT EXISTS department VARCHAR(50);

-- Add is_active column if it doesn't exist (defaults to TRUE for existing subjects)
ALTER TABLE subjects
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_subjects_school_levels_active 
ON subjects(school_id, is_active) 
USING GIN(applicable_to_levels);

CREATE INDEX IF NOT EXISTS idx_subjects_department 
ON subjects(school_id, department) 
WHERE department IS NOT NULL;

COMMIT;
