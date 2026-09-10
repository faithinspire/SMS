-- Migration 051: Expand students table schema
-- Purpose: Add demographic and personal information fields
-- Date: 2026-08-28

-- Add new columns to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS gender VARCHAR(10); -- MALE, FEMALE, OTHER
ALTER TABLE students ADD COLUMN IF NOT EXISTS section VARCHAR(50); -- GENERAL, SCIENCE, HUMANITIES, COMMERCIAL, TECHNICAL (for secondary)
ALTER TABLE students ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS passport_photo_url TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_name VARCHAR(255);
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_phone VARCHAR(20);
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_email VARCHAR(255);
ALTER TABLE students ADD COLUMN IF NOT EXISTS residential_address TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS date_registered TIMESTAMP DEFAULT NOW();
ALTER TABLE students ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE'; -- ACTIVE, GRADUATED, WITHDRAWN, SUSPENDED

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_students_school_class_active 
  ON students(school_id, class_arm_combo_id)
  WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_students_school_section 
  ON students(school_id, section);

CREATE INDEX IF NOT EXISTS idx_students_admission_number 
  ON students(school_id, admission_number);

-- Add comment explaining the schema
COMMENT ON COLUMN students.gender IS 'Student gender: MALE, FEMALE, OTHER';
COMMENT ON COLUMN students.section IS 'Subject section for secondary students (SCIENCE, HUMANITIES, COMMERCIAL, TECHNICAL)';
COMMENT ON COLUMN students.photo_url IS 'URL to student passport photo';
COMMENT ON COLUMN students.passport_photo_url IS 'URL to official passport photo for documents';
COMMENT ON COLUMN students.status IS 'Student status: ACTIVE, GRADUATED, WITHDRAWN, SUSPENDED';

-- Confirm migration
SELECT 'Migration 051 completed - students schema expanded' AS status;
