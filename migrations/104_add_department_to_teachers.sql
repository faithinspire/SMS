-- Add department field to teachers table for SCIENCE, COMMERCIAL, ART classification
-- Teachers in SS1-SS3 can be assigned to different departments
-- Migration: 104_add_department_to_teachers.sql
-- Purpose: Support SS (Senior Secondary) stream/department assignment for teachers

BEGIN;

-- Add department field to teachers table
ALTER TABLE teachers
ADD COLUMN IF NOT EXISTS department VARCHAR(50) 
  CHECK (department IS NULL OR department IN ('SCIENCE', 'COMMERCIAL', 'HUMANITIES', 'TECHNICAL', 'VOCATIONAL')),
ADD COLUMN IF NOT EXISTS stream VARCHAR(50)
  CHECK (stream IS NULL OR stream IN ('A', 'B', 'C', 'MIXED'));

-- Add index for faster filtering by department
CREATE INDEX IF NOT EXISTS idx_teachers_department ON teachers(school_id, department);
CREATE INDEX IF NOT EXISTS idx_teachers_stream ON teachers(school_id, stream);

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 104: Added department and stream columns to teachers table';
END $$;

COMMIT;
