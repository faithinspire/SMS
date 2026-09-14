-- Migration 107: Comprehensive Subject Master List and Level Mapping
-- Purpose: Create authoritative subject catalog for ALL class levels
-- Levels: 0-2 (Nursery/Prep/KG), 3-8 (Primary 1-6), 9-11 (JSS), 12-14 (SS)
-- This migration ensures applicable_to_levels is properly populated

BEGIN;

-- ============================================================================
-- PART 1: VERIFY SCHEMA
-- ============================================================================

-- Ensure subjects table has the required columns and correct defaults
ALTER TABLE IF EXISTS subjects 
  ADD COLUMN IF NOT EXISTS section VARCHAR(50) DEFAULT 'GENERAL',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS compulsory BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS department VARCHAR(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'GENERAL';

-- Drop any conflicting constraints on subjects table that might prevent updates
-- The UNIQUE constraint should be on (school_id, name), not (school_id, name, level)
-- This is handled by the schema but we verify here

-- ============================================================================
-- PART 2: CLEAN UP - Remove incorrect data from migration 105
-- ============================================================================

-- Migration 105 attempted to use a 'level' column that doesn't exist
-- and created empty/broken records. We need to delete them first.
DELETE FROM subjects 
WHERE school_id IS NULL 
  OR (applicable_to_levels = '{}' AND name IN (
    'English Language', 'Mathematics', 'Science', 'Social Studies',
    'Religious Studies', 'Yoruba Language', 'Igbo Language', 'Hausa Language',
    'French Language', 'Arts & Crafts', 'Physical Education', 'Computer Studies',
    'Pre-Vocational Studies', 'Music', 'Agricultural Science'
  ));

-- ============================================================================
-- PART 3: EARLY YEARS SUBJECTS (Levels 0-2: Nursery, Prep, KG)
-- ============================================================================

-- English Language (All Early Years + Primary)
INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, category)
SELECT 
  s.id,
  'English Language',
  'ENG',
  ARRAY[0, 1, 2, 3, 4, 5, 6, 7, 8],
  'LANGUAGE',
  TRUE,
  TRUE,
  'CORE'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE school_id = s.id 
    AND name = 'English Language' 
    AND applicable_to_levels @> ARRAY[0]
)
ON CONFLICT (school_id, name) DO UPDATE 
SET applicable_to_levels = ARRAY[0, 1, 2, 3, 4, 5, 6, 7, 8],
    section = 'LANGUAGE',
    compulsory = TRUE,
    category = 'CORE';

-- Mathematics (All Early Years + Primary)
INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, category)
SELECT 
  s.id,
  'Mathematics',
  'MATH',
  ARRAY[0, 1, 2, 3, 4, 5, 6, 7, 8],
  'SCIENCE',
  TRUE,
  TRUE,
  'CORE'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE school_id = s.id 
    AND name = 'Mathematics' 
    AND applicable_to_levels @> ARRAY[0]
)
ON CONFLICT (school_id, name) DO UPDATE 
SET applicable_to_levels = ARRAY[0, 1, 2, 3, 4, 5, 6, 7, 8],
    section = 'SCIENCE',
    compulsory = TRUE,
    category = 'CORE';

-- Science (KG onwards: Levels 2-8)
INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, category)
SELECT 
  s.id,
  'Science',
  'SCI',
  ARRAY[2, 3, 4, 5, 6, 7, 8],
  'SCIENCE',
  TRUE,
  TRUE,
  'CORE'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE school_id = s.id 
    AND name = 'Science' 
    AND applicable_to_levels @> ARRAY[2]
)
ON CONFLICT (school_id, name) DO UPDATE 
SET applicable_to_levels = ARRAY[2, 3, 4, 5, 6, 7, 8],
    section = 'SCIENCE',
    compulsory = TRUE,
    category = 'CORE';

-- Social Studies (Prep onwards: Levels 1-8)
INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, category)
SELECT 
  s.id,
  'Social Studies',
  'SS',
  ARRAY[1, 2, 3, 4, 5, 6, 7, 8],
  'HUMANITIES',
  TRUE,
  TRUE,
  'CORE'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE school_id = s.id 
    AND name = 'Social Studies' 
    AND applicable_to_levels @> ARRAY[1]
)
ON CONFLICT (school_id, name) DO UPDATE 
SET applicable_to_levels = ARRAY[1, 2, 3, 4, 5, 6, 7, 8],
    section = 'HUMANITIES',
    compulsory = TRUE,
    category = 'CORE';

-- Physical Education (All Early Years + Primary)
INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, category)
SELECT 
  s.id,
  'Physical Education',
  'PE',
  ARRAY[0, 1, 2, 3, 4, 5, 6, 7, 8],
  'GENERAL',
  TRUE,
  FALSE,
  'GENERAL'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE school_id = s.id 
    AND name = 'Physical Education' 
    AND applicable_to_levels @> ARRAY[0]
)
ON CONFLICT (school_id, name) DO UPDATE 
SET applicable_to_levels = ARRAY[0, 1, 2, 3, 4, 5, 6, 7, 8];

-- Arts & Crafts / Visual Arts (All Early Years + Primary)
INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, category)
SELECT 
  s.id,
  'Arts & Crafts',
  'ART',
  ARRAY[0, 1, 2, 3, 4, 5, 6, 7, 8],
  'GENERAL',
  TRUE,
  FALSE,
  'GENERAL'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE school_id = s.id 
    AND name = 'Arts & Crafts' 
    AND applicable_to_levels @> ARRAY[0]
)
ON CONFLICT (school_id, name) DO UPDATE 
SET applicable_to_levels = ARRAY[0, 1, 2, 3, 4, 5, 6, 7, 8];

-- Music (All Early Years + Primary)
INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, category)
SELECT 
  s.id,
  'Music',
  'MUS',
  ARRAY[0, 1, 2, 3, 4, 5, 6, 7, 8],
  'GENERAL',
  TRUE,
  FALSE,
  'GENERAL'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE school_id = s.id 
    AND name = 'Music' 
    AND applicable_to_levels @> ARRAY[0]
)
ON CONFLICT (school_id, name) DO UPDATE 
SET applicable_to_levels = ARRAY[0, 1, 2, 3, 4, 5, 6, 7, 8];

-- Home Economics (Primary 4-6: Levels 6-8)
INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, category)
SELECT 
  s.id,
  'Home Economics',
  'HEC',
  ARRAY[6, 7, 8],
  'GENERAL',
  TRUE,
  FALSE,
  'GENERAL'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE school_id = s.id 
    AND name = 'Home Economics' 
    AND applicable_to_levels @> ARRAY[6]
)
ON CONFLICT (school_id, name) DO UPDATE 
SET applicable_to_levels = ARRAY[6, 7, 8];

-- Computer Studies / ICT (Primary 3-6: Levels 5-8)
INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, category)
SELECT 
  s.id,
  'Computer Studies',
  'CST',
  ARRAY[5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
  'TECHNICAL',
  TRUE,
  FALSE,
  'TECHNICAL'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE school_id = s.id 
    AND name = 'Computer Studies' 
    AND applicable_to_levels @> ARRAY[5]
)
ON CONFLICT (school_id, name) DO UPDATE 
SET applicable_to_levels = ARRAY[5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

-- Agricultural Science (Primary 5-6 + Secondary: Levels 7-14)
INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, category)
SELECT 
  s.id,
  'Agricultural Science',
  'AGR',
  ARRAY[7, 8, 9, 10, 11, 12, 13, 14],
  'TECHNICAL',
  TRUE,
  FALSE,
  'TECHNICAL'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE school_id = s.id 
    AND name = 'Agricultural Science' 
    AND applicable_to_levels @> ARRAY[7]
)
ON CONFLICT (school_id, name) DO UPDATE 
SET applicable_to_levels = ARRAY[7, 8, 9, 10, 11, 12, 13, 14];

-- ============================================================================
-- PART 4: JSS SUBJECTS (Levels 9-11: JSS1, JSS2, JSS3)
-- ============================================================================

-- Basic Science (JSS only: 9-11)
INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, category)
SELECT 
  s.id,
  'Basic Science',
  'BSCI',
  ARRAY[9, 10, 11],
  'SCIENCE',
  TRUE,
  TRUE,
  'CORE'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE school_id = s.id 
    AND name = 'Basic Science' 
    AND applicable_to_levels @> ARRAY[9]
)
ON CONFLICT (school_id, name) DO UPDATE 
SET applicable_to_levels = ARRAY[9, 10, 11],
    section = 'SCIENCE',
    compulsory = TRUE;

-- Basic Technology (JSS only: 9-11)
INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, category)
SELECT 
  s.id,
  'Basic Technology',
  'BTECH',
  ARRAY[9, 10, 11],
  'TECHNOLOGY',
  TRUE,
  TRUE,
  'CORE'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE school_id = s.id 
    AND name = 'Basic Technology' 
    AND applicable_to_levels @> ARRAY[9]
)
ON CONFLICT (school_id, name) DO UPDATE 
SET applicable_to_levels = ARRAY[9, 10, 11],
    section = 'TECHNOLOGY',
    compulsory = TRUE;

-- Civic Education (All Secondary: 9-14)
INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, category)
SELECT 
  s.id,
  'Civic Education',
  'CIVIC',
  ARRAY[9, 10, 11, 12, 13, 14],
  'HUMANITIES',
  TRUE,
  FALSE,
  'GENERAL'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE school_id = s.id 
    AND name = 'Civic Education' 
    AND applicable_to_levels @> ARRAY[9]
)
ON CONFLICT (school_id, name) DO UPDATE 
SET applicable_to_levels = ARRAY[9, 10, 11, 12, 13, 14];

-- Biology (All Secondary: 9-14)
INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, category)
SELECT 
  s.id,
  'Biology',
  'BIO',
  ARRAY[9, 10, 11, 12, 13, 14],
  'SCIENCE',
  TRUE,
  FALSE,
  'SCIENCE'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE school_id = s.id 
    AND name = 'Biology' 
    AND applicable_to_levels @> ARRAY[9]
)
ON CONFLICT (school_id, name) DO UPDATE 
SET applicable_to_levels = ARRAY[9, 10, 11, 12, 13, 14];

-- Chemistry (All Secondary: 9-14)
INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, category)
SELECT 
  s.id,
  'Chemistry',
  'CHEM',
  ARRAY[9, 10, 11, 12, 13, 14],
  'SCIENCE',
  TRUE,
  FALSE,
  'SCIENCE'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE school_id = s.id 
    AND name = 'Chemistry' 
    AND applicable_to_levels @> ARRAY[9]
)
ON CONFLICT (school_id, name) DO UPDATE 
SET applicable_to_levels = ARRAY[9, 10, 11, 12, 13, 14];

-- Physics (All Secondary: 9-14)
INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, category)
SELECT 
  s.id,
  'Physics',
  'PHY',
  ARRAY[9, 10, 11, 12, 13, 14],
  'SCIENCE',
  TRUE,
  FALSE,
  'SCIENCE'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE school_id = s.id 
    AND name = 'Physics' 
    AND applicable_to_levels @> ARRAY[9]
)
ON CONFLICT (school_id, name) DO UPDATE 
SET applicable_to_levels = ARRAY[9, 10, 11, 12, 13, 14];

-- History & Geography (All Secondary: 9-14)
INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, category)
SELECT 
  s.id,
  'History',
  'HIST',
  ARRAY[9, 10, 11, 12, 13, 14],
  'HUMANITIES',
  TRUE,
  FALSE,
  'HUMANITIES'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE school_id = s.id 
    AND name = 'History' 
    AND applicable_to_levels @> ARRAY[9]
)
ON CONFLICT (school_id, name) DO UPDATE 
SET applicable_to_levels = ARRAY[9, 10, 11, 12, 13, 14];

INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, category)
SELECT 
  s.id,
  'Geography',
  'GEOG',
  ARRAY[9, 10, 11, 12, 13, 14],
  'HUMANITIES',
  TRUE,
  FALSE,
  'HUMANITIES'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE school_id = s.id 
    AND name = 'Geography' 
    AND applicable_to_levels @> ARRAY[9]
)
ON CONFLICT (school_id, name) DO UPDATE 
SET applicable_to_levels = ARRAY[9, 10, 11, 12, 13, 14];

-- French Language (All Secondary: 9-14)
INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, category)
SELECT 
  s.id,
  'French Language',
  'FRE',
  ARRAY[9, 10, 11, 12, 13, 14],
  'LANGUAGE',
  TRUE,
  FALSE,
  'LANGUAGE'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE school_id = s.id 
    AND name = 'French Language' 
    AND applicable_to_levels @> ARRAY[9]
)
ON CONFLICT (school_id, name) DO UPDATE 
SET applicable_to_levels = ARRAY[9, 10, 11, 12, 13, 14];

-- ============================================================================
-- PART 5: SS-SPECIFIC SUBJECTS (Levels 12-14: SS1, SS2, SS3)
-- ============================================================================

-- Further Mathematics (SS only: 12-14, typically Science stream)
INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, category, department)
SELECT 
  s.id,
  'Further Mathematics',
  'FMATH',
  ARRAY[12, 13, 14],
  'SCIENCE',
  TRUE,
  FALSE,
  'SCIENCE',
  'SCIENCE'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE school_id = s.id 
    AND name = 'Further Mathematics' 
    AND applicable_to_levels @> ARRAY[12]
)
ON CONFLICT (school_id, name) DO UPDATE 
SET applicable_to_levels = ARRAY[12, 13, 14],
    department = 'SCIENCE';

-- Economics (SS only: 12-14, typically Commercial stream)
INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, category, department)
SELECT 
  s.id,
  'Economics',
  'ECON',
  ARRAY[12, 13, 14],
  'SOCIAL',
  TRUE,
  FALSE,
  'COMMERCIAL',
  'COMMERCIAL'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE school_id = s.id 
    AND name = 'Economics' 
    AND applicable_to_levels @> ARRAY[12]
)
ON CONFLICT (school_id, name) DO UPDATE 
SET applicable_to_levels = ARRAY[12, 13, 14],
    department = 'COMMERCIAL';

-- Accounting (SS only: 12-14, Commercial stream)
INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, category, department)
SELECT 
  s.id,
  'Accounting',
  'ACC',
  ARRAY[12, 13, 14],
  'SOCIAL',
  TRUE,
  FALSE,
  'COMMERCIAL',
  'COMMERCIAL'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE school_id = s.id 
    AND name = 'Accounting' 
    AND applicable_to_levels @> ARRAY[12]
)
ON CONFLICT (school_id, name) DO UPDATE 
SET applicable_to_levels = ARRAY[12, 13, 14],
    department = 'COMMERCIAL';

-- Business Studies (SS only: 12-14, Commercial stream)
INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, category, department)
SELECT 
  s.id,
  'Business Studies',
  'BUS',
  ARRAY[12, 13, 14],
  'SOCIAL',
  TRUE,
  FALSE,
  'COMMERCIAL',
  'COMMERCIAL'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE school_id = s.id 
    AND name = 'Business Studies' 
    AND applicable_to_levels @> ARRAY[12]
)
ON CONFLICT (school_id, name) DO UPDATE 
SET applicable_to_levels = ARRAY[12, 13, 14],
    department = 'COMMERCIAL';

-- Government (SS only: 12-14, Humanities stream)
INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, category, department)
SELECT 
  s.id,
  'Government',
  'GOV',
  ARRAY[12, 13, 14],
  'HUMANITIES',
  TRUE,
  FALSE,
  'HUMANITIES',
  'HUMANITIES'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE school_id = s.id 
    AND name = 'Government' 
    AND applicable_to_levels @> ARRAY[12]
)
ON CONFLICT (school_id, name) DO UPDATE 
SET applicable_to_levels = ARRAY[12, 13, 14],
    department = 'HUMANITIES';

-- Literature in English (SS only: 12-14, Humanities stream)
INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, category, department)
SELECT 
  s.id,
  'Literature in English',
  'LIT',
  ARRAY[12, 13, 14],
  'HUMANITIES',
  TRUE,
  FALSE,
  'HUMANITIES',
  'HUMANITIES'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE school_id = s.id 
    AND name = 'Literature in English' 
    AND applicable_to_levels @> ARRAY[12]
)
ON CONFLICT (school_id, name) DO UPDATE 
SET applicable_to_levels = ARRAY[12, 13, 14],
    department = 'HUMANITIES';

-- ============================================================================
-- PART 6: FIX ANY BROKEN/EMPTY SUBJECT RECORDS
-- ============================================================================

-- Update any subjects that still have empty applicable_to_levels
UPDATE subjects
SET applicable_to_levels = ARRAY[9, 10, 11, 12, 13, 14]
WHERE applicable_to_levels = '{}' 
  AND name IN (
    'English Language', 'Mathematics', 'Biology', 'Chemistry', 'Physics',
    'History', 'Geography', 'Civic Education', 'Computer Studies'
  );

-- ============================================================================
-- PART 7: VERIFICATION & LOGGING
-- ============================================================================

-- Create a summary report
SELECT 
  'SUBJECT CATALOG VERIFICATION' as report_type,
  COUNT(*) as total_subjects,
  COUNT(DISTINCT school_id) as schools,
  COUNT(CASE WHEN applicable_to_levels = '{}' THEN 1 END) as broken_subjects,
  COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_subjects
FROM subjects;

-- Show subject distribution by level
SELECT 
  'LEVEL DISTRIBUTION' as report_type,
  level,
  level_name,
  subject_count
FROM (
  SELECT DISTINCT 
    unnest(ARRAY[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]) as level,
    CASE 
      WHEN unnest(ARRAY[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]) = 0 THEN 'Nursery'
      WHEN unnest(ARRAY[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]) = 1 THEN 'Prep'
      WHEN unnest(ARRAY[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]) = 2 THEN 'KG'
      WHEN unnest(ARRAY[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]) BETWEEN 3 AND 8 THEN 'Primary ' || (unnest(ARRAY[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]) - 2)
      WHEN unnest(ARRAY[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]) BETWEEN 9 AND 11 THEN 'JSS' || (unnest(ARRAY[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]) - 8)
      WHEN unnest(ARRAY[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]) BETWEEN 12 AND 14 THEN 'SS' || (unnest(ARRAY[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]) - 11)
    END as level_name,
    (SELECT COUNT(*) FROM subjects WHERE applicable_to_levels @> ARRAY[unnest(ARRAY[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14])]) as subject_count
) level_dist
ORDER BY level;

COMMIT;
