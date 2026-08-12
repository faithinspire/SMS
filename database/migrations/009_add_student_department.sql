-- Add department field to students table for SCIENCE, COMMERCIAL, ART classification
-- Students in SS1-SS3 can be assigned to different departments

ALTER TABLE students
ADD COLUMN IF NOT EXISTS department VARCHAR(50) 
  CHECK (department IS NULL OR department IN ('SCIENCE', 'COMMERCIAL', 'HUMANITIES', 'TECHNICAL', 'VOCATIONAL')),
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Add index for faster filtering by department
CREATE INDEX IF NOT EXISTS idx_students_department ON students(school_id, department);
