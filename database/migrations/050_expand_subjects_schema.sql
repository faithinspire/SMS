-- Migration 050: Expand subjects table schema
-- Purpose: Add metadata for proper subject categorization and filtering
-- Date: 2026-08-28

-- Add new columns to subjects table
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS section VARCHAR(50) DEFAULT 'GENERAL'; -- GENERAL, SCIENCE, HUMANITIES, COMMERCIAL, TECHNICAL
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS level INT; -- 1-6 for primary, 7-9 for JSS, 10-12 for SSS
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS department VARCHAR(100); -- ENGLISH, SCIENCE, MATHEMATICS, SOCIAL_STUDIES, etc.
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS subject_type VARCHAR(50) DEFAULT 'CORE'; -- CORE, ELECTIVE, PRACTICAL, VOCATIONAL
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_subjects_school_active 
  ON subjects(school_id, is_active);

CREATE INDEX IF NOT EXISTS idx_subjects_school_level 
  ON subjects(school_id, level);

CREATE INDEX IF NOT EXISTS idx_subjects_school_section 
  ON subjects(school_id, section);

CREATE INDEX IF NOT EXISTS idx_subjects_school_department 
  ON subjects(school_id, department);

-- Add comment explaining the schema
COMMENT ON COLUMN subjects.section IS 'Subject grouping: GENERAL, SCIENCE, HUMANITIES, COMMERCIAL, TECHNICAL';
COMMENT ON COLUMN subjects.level IS 'Grade level (1-6 primary, 7-9 JSS, 10-12 SSS)';
COMMENT ON COLUMN subjects.department IS 'Subject department for organizational purposes';
COMMENT ON COLUMN subjects.is_active IS 'Whether this subject is currently offered';
COMMENT ON COLUMN subjects.subject_type IS 'Type of subject: CORE (required), ELECTIVE (optional), PRACTICAL, VOCATIONAL';

-- Confirm migration
SELECT 'Migration 050 completed - subjects schema expanded' AS status;
