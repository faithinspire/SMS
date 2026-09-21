-- Migration: Add Missing Secondary School Subjects
-- Purpose: Add Christian Religious Studies (CRS), Yoruba Language, and Marketing to SS1-3
-- Based on Nigerian Curriculum (SS only, not JSS)

BEGIN;

-- ============================================================================
-- ADD MISSING SECONDARY SCHOOL SUBJECTS (SS ONLY)
-- ============================================================================

-- Christian Religious Studies for SS (SS1=12, SS2=13, SS3=14)
INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, subject_category)
SELECT 
  s.id,
  'Christian Religious Studies',
  'CRS',
  ARRAY[12, 13, 14],
  'RELIGIOUS',
  TRUE,
  TRUE,
  'CORE'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.id AND code = 'CRS' AND 12 = ANY(applicable_to_levels)
)
ON CONFLICT DO NOTHING;

-- Yoruba Language for SS (SS1=12, SS2=13, SS3=14)
-- This is for schools that teach Nigerian languages
INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, subject_category)
SELECT 
  s.id,
  'Yoruba Language',
  'YOR',
  ARRAY[12, 13, 14],
  'LANGUAGE',
  TRUE,
  FALSE,
  'ELECTIVE'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.id AND code = 'YOR' AND 12 = ANY(applicable_to_levels)
)
ON CONFLICT DO NOTHING;

-- Marketing for SS (SS1=12, SS2=13, SS3=14)
-- Business/Commercial stream subject
INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active, compulsory, subject_category)
SELECT 
  s.id,
  'Marketing',
  'MKT',
  ARRAY[12, 13, 14],
  'BUSINESS',
  TRUE,
  FALSE,
  'BUSINESS_STREAM'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.id AND code = 'MKT' AND 12 = ANY(applicable_to_levels)
)
ON CONFLICT DO NOTHING;

COMMIT;
