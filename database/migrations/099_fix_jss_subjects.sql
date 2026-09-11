-- Migration: Fix JSS1-JSS3 Subjects Configuration
-- Purpose: Ensures all JSS subjects are properly configured with correct levels (9-11)
-- This migration removes any non-JSS subjects from JSS levels
-- And populates JSS curriculum for all schools

-- Ensure subjects table has required columns
ALTER TABLE IF EXISTS subjects ADD COLUMN IF NOT EXISTS section VARCHAR(50) DEFAULT 'GENERAL';
ALTER TABLE IF EXISTS subjects ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- JSS Core Subjects (must be in 9-11 range)
INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active)
SELECT 
  s.id,
  'English Language',
  'ENG',
  ARRAY[9, 10, 11],
  'LANGUAGE',
  TRUE
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE name = 'English Language' AND school_id = s.id AND applicable_to_levels @> ARRAY[9]
)
ON CONFLICT (school_id, code) DO UPDATE SET applicable_to_levels = ARRAY[9, 10, 11];

INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active)
SELECT 
  s.id,
  'Mathematics',
  'MATH',
  ARRAY[9, 10, 11],
  'SCIENCE',
  TRUE
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE name = 'Mathematics' AND school_id = s.id AND applicable_to_levels @> ARRAY[9]
)
ON CONFLICT (school_id, code) DO UPDATE SET applicable_to_levels = ARRAY[9, 10, 11];

INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active)
SELECT 
  s.id,
  'Science',
  'SCI',
  ARRAY[9, 10, 11],
  'SCIENCE',
  TRUE
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE name = 'Science' AND school_id = s.id AND applicable_to_levels @> ARRAY[9]
)
ON CONFLICT (school_id, code) DO UPDATE SET applicable_to_levels = ARRAY[9, 10, 11];

INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active)
SELECT 
  s.id,
  'Social Studies',
  'SS',
  ARRAY[9, 10, 11],
  'HUMANITIES',
  TRUE
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE name = 'Social Studies' AND school_id = s.id AND applicable_to_levels @> ARRAY[9]
)
ON CONFLICT (school_id, code) DO UPDATE SET applicable_to_levels = ARRAY[9, 10, 11];

INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active)
SELECT 
  s.id,
  'Geography',
  'GEOG',
  ARRAY[9, 10, 11],
  'HUMANITIES',
  TRUE
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE name = 'Geography' AND school_id = s.id AND applicable_to_levels @> ARRAY[9]
)
ON CONFLICT (school_id, code) DO UPDATE SET applicable_to_levels = ARRAY[9, 10, 11];

INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active)
SELECT 
  s.id,
  'History',
  'HIST',
  ARRAY[9, 10, 11],
  'HUMANITIES',
  TRUE
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE name = 'History' AND school_id = s.id AND applicable_to_levels @> ARRAY[9]
)
ON CONFLICT (school_id, code) DO UPDATE SET applicable_to_levels = ARRAY[9, 10, 11];

INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active)
SELECT 
  s.id,
  'Civic Education',
  'CIVIC',
  ARRAY[9, 10, 11],
  'HUMANITIES',
  TRUE
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE name = 'Civic Education' AND school_id = s.id AND applicable_to_levels @> ARRAY[9]
)
ON CONFLICT (school_id, code) DO UPDATE SET applicable_to_levels = ARRAY[9, 10, 11];

INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active)
SELECT 
  s.id,
  'Biology',
  'BIO',
  ARRAY[9, 10, 11],
  'SCIENCE',
  TRUE
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE name = 'Biology' AND school_id = s.id AND applicable_to_levels @> ARRAY[9]
)
ON CONFLICT (school_id, code) DO UPDATE SET applicable_to_levels = ARRAY[9, 10, 11];

INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active)
SELECT 
  s.id,
  'Chemistry',
  'CHEM',
  ARRAY[9, 10, 11],
  'SCIENCE',
  TRUE
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE name = 'Chemistry' AND school_id = s.id AND applicable_to_levels @> ARRAY[9]
)
ON CONFLICT (school_id, code) DO UPDATE SET applicable_to_levels = ARRAY[9, 10, 11];

INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active)
SELECT 
  s.id,
  'Physics',
  'PHY',
  ARRAY[9, 10, 11],
  'SCIENCE',
  TRUE
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE name = 'Physics' AND school_id = s.id AND applicable_to_levels @> ARRAY[9]
)
ON CONFLICT (school_id, code) DO UPDATE SET applicable_to_levels = ARRAY[9, 10, 11];

INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active)
SELECT 
  s.id,
  'Computer Studies',
  'CS',
  ARRAY[9, 10, 11],
  'TECHNICAL',
  TRUE
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE name = 'Computer Studies' AND school_id = s.id AND applicable_to_levels @> ARRAY[9]
)
ON CONFLICT (school_id, code) DO UPDATE SET applicable_to_levels = ARRAY[9, 10, 11];

INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active)
SELECT 
  s.id,
  'Physical Education',
  'PE',
  ARRAY[9, 10, 11],
  'GENERAL',
  TRUE
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE name = 'Physical Education' AND school_id = s.id AND applicable_to_levels @> ARRAY[9]
)
ON CONFLICT (school_id, code) DO UPDATE SET applicable_to_levels = ARRAY[9, 10, 11];

INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active)
SELECT 
  s.id,
  'Agricultural Science',
  'AGR',
  ARRAY[9, 10, 11],
  'TECHNICAL',
  TRUE
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE name = 'Agricultural Science' AND school_id = s.id AND applicable_to_levels @> ARRAY[9]
)
ON CONFLICT (school_id, code) DO UPDATE SET applicable_to_levels = ARRAY[9, 10, 11];

-- Remove any subjects that shouldn't be in JSS range (9-11) but are mistakenly there
UPDATE subjects 
SET is_active = FALSE 
WHERE school_id IN (SELECT id FROM schools)
  AND applicable_to_levels @> ARRAY[9, 10, 11]
  AND name IN (
    'Further Mathematics', 'Accounting', 'Economics', 'Business Studies',
    'Law', 'Literature in English', 'Government', 'French'
  )
  AND applicable_to_levels && ARRAY[12, 13, 14, 15, 16];

-- Verify JSS subjects exist
SELECT COUNT(*) as jss_subjects_count
FROM subjects
WHERE applicable_to_levels @> ARRAY[9]
  AND is_active = TRUE
  AND school_id IN (SELECT id FROM schools LIMIT 1);
