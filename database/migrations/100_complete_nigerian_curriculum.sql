-- Migration: Complete Nigerian Curriculum System (NERDC Aligned)
-- Purpose: Implement comprehensive JSS1-3 and SS1-3 subject catalogue
-- Based on current NERDC curriculum structure
-- Levels: JSS1=9, JSS2=10, JSS3=11, SS1=12, SS2=13, SS3=14

BEGIN;

-- ============================================================================
-- ENSURE SUBJECTS TABLE HAS REQUIRED COLUMNS
-- ============================================================================

ALTER TABLE IF EXISTS subjects ADD COLUMN IF NOT EXISTS section VARCHAR(50) DEFAULT 'GENERAL';
ALTER TABLE IF EXISTS subjects ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE IF EXISTS subjects ADD COLUMN IF NOT EXISTS compulsory BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS subjects ADD COLUMN IF NOT EXISTS subject_category VARCHAR(100);

-- ============================================================================
-- PART 1: JSS SUBJECTS (Levels 9, 10, 11)
-- ============================================================================

-- Core Compulsory Subjects for All JSS Levels
INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, subject_category)
SELECT 
  s.id,
  'English Language',
  'ENG',
  ARRAY[9, 10, 11],
  'LANGUAGE',
  TRUE,
  TRUE,
  'CORE'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.id AND code = 'ENG' AND 9 = ANY(applicable_to_levels)
)
ON CONFLICT DO NOTHING;

INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, subject_category)
SELECT 
  s.id,
  'Mathematics',
  'MATH',
  ARRAY[9, 10, 11],
  'SCIENCE',
  TRUE,
  TRUE,
  'CORE'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.id AND code = 'MATH' AND 9 = ANY(applicable_to_levels)
)
ON CONFLICT DO NOTHING;

INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, subject_category)
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
  SELECT 1 FROM subjects WHERE school_id = s.id AND code = 'BSCI' AND 9 = ANY(applicable_to_levels)
)
ON CONFLICT DO NOTHING;

INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, subject_category)
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
  SELECT 1 FROM subjects WHERE school_id = s.id AND code = 'BTECH' AND 9 = ANY(applicable_to_levels)
)
ON CONFLICT DO NOTHING;

INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, subject_category)
SELECT 
  s.id,
  'Physical and Health Education',
  'PHE',
  ARRAY[9, 10, 11],
  'HUMANITIES',
  TRUE,
  TRUE,
  'CORE'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.id AND code = 'PHE' AND 9 = ANY(applicable_to_levels)
)
ON CONFLICT DO NOTHING;

INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, subject_category)
SELECT 
  s.id,
  'Civic Education',
  'CIVIC',
  ARRAY[9, 10, 11],
  'HUMANITIES',
  TRUE,
  TRUE,
  'CORE'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.id AND code = 'CIVIC' AND 9 = ANY(applicable_to_levels)
)
ON CONFLICT DO NOTHING;

-- JSS Optional/Elective Subjects
INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, subject_category)
SELECT 
  s.id,
  'Computer Studies',
  'CS',
  ARRAY[9, 10, 11],
  'TECHNOLOGY',
  TRUE,
  FALSE,
  'OPTIONAL'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.id AND code = 'CS' AND 9 = ANY(applicable_to_levels)
)
ON CONFLICT DO NOTHING;

INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, subject_category)
SELECT 
  s.id,
  'Business Studies',
  'BUS',
  ARRAY[9, 10, 11],
  'HUMANITIES',
  TRUE,
  FALSE,
  'OPTIONAL'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.id AND code = 'BUS' AND 9 = ANY(applicable_to_levels)
)
ON CONFLICT DO NOTHING;

INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, subject_category)
SELECT 
  s.id,
  'Cultural and Creative Arts',
  'CCA',
  ARRAY[9, 10, 11],
  'ARTS',
  TRUE,
  FALSE,
  'OPTIONAL'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.id AND code = 'CCA' AND 9 = ANY(applicable_to_levels)
)
ON CONFLICT DO NOTHING;

INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, subject_category)
SELECT 
  s.id,
  'Pre-Vocational Studies',
  'PVS',
  ARRAY[9, 10, 11],
  'VOCATIONAL',
  TRUE,
  FALSE,
  'OPTIONAL'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.id AND code = 'PVS' AND 9 = ANY(applicable_to_levels)
)
ON CONFLICT DO NOTHING;

-- Language Options for JSS
INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, subject_category)
SELECT 
  s.id,
  'Yoruba',
  'YOR',
  ARRAY[9, 10, 11],
  'LANGUAGE',
  TRUE,
  FALSE,
  'LANGUAGE_OPTION'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.id AND code = 'YOR' AND 9 = ANY(applicable_to_levels)
)
ON CONFLICT DO NOTHING;

INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, subject_category)
SELECT 
  s.id,
  'Igbo',
  'IGB',
  ARRAY[9, 10, 11],
  'LANGUAGE',
  TRUE,
  FALSE,
  'LANGUAGE_OPTION'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.id AND code = 'IGB' AND 9 = ANY(applicable_to_levels)
)
ON CONFLICT DO NOTHING;

INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, subject_category)
SELECT 
  s.id,
  'Hausa',
  'HAU',
  ARRAY[9, 10, 11],
  'LANGUAGE',
  TRUE,
  FALSE,
  'LANGUAGE_OPTION'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.id AND code = 'HAU' AND 9 = ANY(applicable_to_levels)
)
ON CONFLICT DO NOTHING;

INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, subject_category)
SELECT 
  s.id,
  'French',
  'FRE',
  ARRAY[9, 10, 11],
  'LANGUAGE',
  TRUE,
  FALSE,
  'LANGUAGE_OPTION'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.id AND code = 'FRE' AND 9 = ANY(applicable_to_levels)
)
ON CONFLICT DO NOTHING;

INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, subject_category)
SELECT 
  s.id,
  'Arabic',
  'ARB',
  ARRAY[9, 10, 11],
  'LANGUAGE',
  TRUE,
  FALSE,
  'LANGUAGE_OPTION'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.id AND code = 'ARB' AND 9 = ANY(applicable_to_levels)
)
ON CONFLICT DO NOTHING;

-- Religious Studies
INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, subject_category)
SELECT 
  s.id,
  'Christian Religious Studies',
  'CRS',
  ARRAY[9, 10, 11],
  'RELIGIOUS',
  TRUE,
  FALSE,
  'RELIGIOUS_OPTION'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.id AND code = 'CRS' AND 9 = ANY(applicable_to_levels)
)
ON CONFLICT DO NOTHING;

INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, subject_category)
SELECT 
  s.id,
  'Islamic Studies',
  'ISL',
  ARRAY[9, 10, 11],
  'RELIGIOUS',
  TRUE,
  FALSE,
  'RELIGIOUS_OPTION'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.id AND code = 'ISL' AND 9 = ANY(applicable_to_levels)
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PART 2: SENIOR SECONDARY SUBJECTS (Levels 12, 13, 14 = SS1, SS2, SS3)
-- ============================================================================

-- Core Compulsory Subjects for All SS Levels
INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, subject_category)
SELECT 
  s.id,
  'English Language',
  'ENG_SS',
  ARRAY[12, 13, 14],
  'LANGUAGE',
  TRUE,
  TRUE,
  'CORE'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.id AND code = 'ENG_SS' AND 12 = ANY(applicable_to_levels)
)
ON CONFLICT DO NOTHING;

INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, subject_category)
SELECT 
  s.id,
  'General Mathematics',
  'GMATH',
  ARRAY[12, 13, 14],
  'SCIENCE',
  TRUE,
  TRUE,
  'CORE'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.id AND code = 'GMATH' AND 12 = ANY(applicable_to_levels)
)
ON CONFLICT DO NOTHING;

INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, subject_category)
SELECT 
  s.id,
  'Digital Technologies',
  'DTECH',
  ARRAY[12, 13, 14],
  'TECHNOLOGY',
  TRUE,
  TRUE,
  'CORE'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.id AND code = 'DTECH' AND 12 = ANY(applicable_to_levels)
)
ON CONFLICT DO NOTHING;

INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, subject_category)
SELECT 
  s.id,
  'Citizenship and Heritage Studies',
  'CHS',
  ARRAY[12, 13, 14],
  'HUMANITIES',
  TRUE,
  TRUE,
  'CORE'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.id AND code = 'CHS' AND 12 = ANY(applicable_to_levels)
)
ON CONFLICT DO NOTHING;

-- SCIENCE STREAM SUBJECTS (SS)
INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, subject_category)
SELECT 
  s.id,
  'Biology',
  'BIO',
  ARRAY[12, 13, 14],
  'SCIENCE',
  TRUE,
  FALSE,
  'SCIENCE_STREAM'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.id AND code = 'BIO' AND 12 = ANY(applicable_to_levels)
)
ON CONFLICT DO NOTHING;

INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, subject_category)
SELECT 
  s.id,
  'Chemistry',
  'CHEM',
  ARRAY[12, 13, 14],
  'SCIENCE',
  TRUE,
  FALSE,
  'SCIENCE_STREAM'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.id AND code = 'CHEM' AND 12 = ANY(applicable_to_levels)
)
ON CONFLICT DO NOTHING;

INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, subject_category)
SELECT 
  s.id,
  'Physics',
  'PHYS',
  ARRAY[12, 13, 14],
  'SCIENCE',
  TRUE,
  FALSE,
  'SCIENCE_STREAM'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.id AND code = 'PHYS' AND 12 = ANY(applicable_to_levels)
)
ON CONFLICT DO NOTHING;

INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, subject_category)
SELECT 
  s.id,
  'Further Mathematics',
  'FMATH',
  ARRAY[12, 13, 14],
  'SCIENCE',
  TRUE,
  FALSE,
  'SCIENCE_STREAM'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.id AND code = 'FMATH' AND 12 = ANY(applicable_to_levels)
)
ON CONFLICT DO NOTHING;

INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, subject_category)
SELECT 
  s.id,
  'Agriculture',
  'AGR',
  ARRAY[12, 13, 14],
  'SCIENCE',
  TRUE,
  FALSE,
  'SCIENCE_STREAM'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.id AND code = 'AGR' AND 12 = ANY(applicable_to_levels)
)
ON CONFLICT DO NOTHING;

INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, subject_category)
SELECT 
  s.id,
  'Physical Education',
  'PE',
  ARRAY[12, 13, 14],
  'SCIENCE',
  TRUE,
  FALSE,
  'SCIENCE_STREAM'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.id AND code = 'PE' AND 12 = ANY(applicable_to_levels)
)
ON CONFLICT DO NOTHING;

-- HUMANITIES STREAM SUBJECTS
INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, subject_category)
SELECT 
  s.id,
  'Government',
  'GOV',
  ARRAY[12, 13, 14],
  'HUMANITIES',
  TRUE,
  FALSE,
  'HUMANITIES_STREAM'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.id AND code = 'GOV' AND 12 = ANY(applicable_to_levels)
)
ON CONFLICT DO NOTHING;

INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, subject_category)
SELECT 
  s.id,
  'Nigerian History',
  'HIST',
  ARRAY[12, 13, 14],
  'HUMANITIES',
  TRUE,
  FALSE,
  'HUMANITIES_STREAM'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.id AND code = 'HIST' AND 12 = ANY(applicable_to_levels)
)
ON CONFLICT DO NOTHING;

INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, subject_category)
SELECT 
  s.id,
  'Literature in English',
  'LIT',
  ARRAY[12, 13, 14],
  'HUMANITIES',
  TRUE,
  FALSE,
  'HUMANITIES_STREAM'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.id AND code = 'LIT' AND 12 = ANY(applicable_to_levels)
)
ON CONFLICT DO NOTHING;

INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, subject_category)
SELECT 
  s.id,
  'Geography',
  'GEOG',
  ARRAY[12, 13, 14],
  'HUMANITIES',
  TRUE,
  FALSE,
  'HUMANITIES_STREAM'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.id AND code = 'GEOG' AND 12 = ANY(applicable_to_levels)
)
ON CONFLICT DO NOTHING;

INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, subject_category)
SELECT 
  s.id,
  'Visual Arts',
  'ARTS',
  ARRAY[12, 13, 14],
  'ARTS',
  TRUE,
  FALSE,
  'HUMANITIES_STREAM'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.id AND code = 'ARTS' AND 12 = ANY(applicable_to_levels)
)
ON CONFLICT DO NOTHING;

-- BUSINESS STREAM SUBJECTS
INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, subject_category)
SELECT 
  s.id,
  'Accounting',
  'ACC',
  ARRAY[12, 13, 14],
  'BUSINESS',
  TRUE,
  FALSE,
  'BUSINESS_STREAM'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.id AND code = 'ACC' AND 12 = ANY(applicable_to_levels)
)
ON CONFLICT DO NOTHING;

INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, subject_category)
SELECT 
  s.id,
  'Economics',
  'ECON',
  ARRAY[12, 13, 14],
  'BUSINESS',
  TRUE,
  FALSE,
  'BUSINESS_STREAM'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.id AND code = 'ECON' AND 12 = ANY(applicable_to_levels)
)
ON CONFLICT DO NOTHING;

INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, subject_category)
SELECT 
  s.id,
  'Commerce',
  'COM',
  ARRAY[12, 13, 14],
  'BUSINESS',
  TRUE,
  FALSE,
  'BUSINESS_STREAM'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.id AND code = 'COM' AND 12 = ANY(applicable_to_levels)
)
ON CONFLICT DO NOTHING;

INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, subject_category)
SELECT 
  s.id,
  'Marketing',
  'MARK',
  ARRAY[12, 13, 14],
  'BUSINESS',
  TRUE,
  FALSE,
  'BUSINESS_STREAM'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.id AND code = 'MARK' AND 12 = ANY(applicable_to_levels)
)
ON CONFLICT DO NOTHING;

-- Religious Studies for SS
INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, subject_category)
SELECT 
  s.id,
  'Christian Religious Studies',
  'CRS_SS',
  ARRAY[12, 13, 14],
  'RELIGIOUS',
  TRUE,
  FALSE,
  'RELIGIOUS_OPTION'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.id AND code = 'CRS_SS' AND 12 = ANY(applicable_to_levels)
)
ON CONFLICT DO NOTHING;

INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, subject_category)
SELECT 
  s.id,
  'Islamic Studies',
  'ISL_SS',
  ARRAY[12, 13, 14],
  'RELIGIOUS',
  TRUE,
  FALSE,
  'RELIGIOUS_OPTION'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.id AND code = 'ISL_SS' AND 12 = ANY(applicable_to_levels)
)
ON CONFLICT DO NOTHING;

-- Language Options for SS
INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, subject_category)
SELECT 
  s.id,
  'French',
  'FRE_SS',
  ARRAY[12, 13, 14],
  'LANGUAGE',
  TRUE,
  FALSE,
  'LANGUAGE_OPTION'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.id AND code = 'FRE_SS' AND 12 = ANY(applicable_to_levels)
)
ON CONFLICT DO NOTHING;

INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, subject_category)
SELECT 
  s.id,
  'Arabic',
  'ARB_SS',
  ARRAY[12, 13, 14],
  'LANGUAGE',
  TRUE,
  FALSE,
  'LANGUAGE_OPTION'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.id AND code = 'ARB_SS' AND 12 = ANY(applicable_to_levels)
)
ON CONFLICT DO NOTHING;

-- Trade/Vocational Subjects for SS
INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, subject_category)
SELECT 
  s.id,
  'Solar Photovoltaic Installation and Maintenance',
  'SOLAR',
  ARRAY[12, 13, 14],
  'VOCATIONAL',
  TRUE,
  FALSE,
  'TRADE_SUBJECT'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.id AND code = 'SOLAR' AND 12 = ANY(applicable_to_levels)
)
ON CONFLICT DO NOTHING;

INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, subject_category)
SELECT 
  s.id,
  'Fashion Design and Garment Making',
  'FASHION',
  ARRAY[12, 13, 14],
  'VOCATIONAL',
  TRUE,
  FALSE,
  'TRADE_SUBJECT'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.id AND code = 'FASHION' AND 12 = ANY(applicable_to_levels)
)
ON CONFLICT DO NOTHING;

INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, subject_category)
SELECT 
  s.id,
  'Computer Hardware and GSM Repairs',
  'HARDWARE',
  ARRAY[12, 13, 14],
  'VOCATIONAL',
  TRUE,
  FALSE,
  'TRADE_SUBJECT'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.id AND code = 'HARDWARE' AND 12 = ANY(applicable_to_levels)
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

SELECT 'JSS Subjects (Level 9-11):' as category, COUNT(*) as count
FROM subjects 
WHERE is_active = TRUE 
  AND (9 = ANY(applicable_to_levels) OR 10 = ANY(applicable_to_levels) OR 11 = ANY(applicable_to_levels));

SELECT 'SS Subjects (Level 12-14):' as category, COUNT(*) as count
FROM subjects 
WHERE is_active = TRUE 
  AND (12 = ANY(applicable_to_levels) OR 13 = ANY(applicable_to_levels) OR 14 = ANY(applicable_to_levels));

COMMIT;
