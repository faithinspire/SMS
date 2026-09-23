-- Migration 139: Populate all subjects for Prep to SS3 (Nigerian Curriculum)
-- Purpose: Ensure every school has complete subject catalog across all levels
-- This creates master subjects and assigns them to all applicable class levels

BEGIN;

-- First, clear old subjects if they exist (optional - comment out if you want to keep existing)
-- DELETE FROM subject_applicable_levels WHERE subject_id NOT IN (SELECT id FROM subjects);
-- DELETE FROM subjects WHERE school_id IS NULL OR school_id = '00000000-0000-0000-0000-000000000000';

-- ============================================================================
-- PRIMARY SUBJECTS (Prep to Primary 6)
-- ============================================================================

-- English Language
INSERT INTO subjects (name, code, school_id, description, created_at)
SELECT 'English Language', 'ENG', NULL, 'English Language and Literature', NOW()
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE code = 'ENG' AND school_id IS NULL)
ON CONFLICT DO NOTHING;

-- Mathematics
INSERT INTO subjects (name, code, school_id, description, created_at)
SELECT 'Mathematics', 'MATH', NULL, 'Mathematics and Numeracy', NOW()
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE code = 'MATH' AND school_id IS NULL)
ON CONFLICT DO NOTHING;

-- Science
INSERT INTO subjects (name, code, school_id, description, created_at)
SELECT 'Science', 'SCI', NULL, 'Integrated Science', NOW()
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE code = 'SCI' AND school_id IS NULL)
ON CONFLICT DO NOTHING;

-- Social Studies
INSERT INTO subjects (name, code, school_id, description, created_at)
SELECT 'Social Studies', 'SS', NULL, 'Social Studies and Civic Education', NOW()
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE code = 'SS' AND school_id IS NULL)
ON CONFLICT DO NOTHING;

-- Basic Science
INSERT INTO subjects (name, code, school_id, description, created_at)
SELECT 'Basic Science', 'BS', NULL, 'Basic Science and Technology', NOW()
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE code = 'BS' AND school_id IS NULL)
ON CONFLICT DO NOTHING;

-- Basic Technology
INSERT INTO subjects (name, code, school_id, description, created_at)
SELECT 'Basic Technology', 'BT', NULL, 'Basic Technology and ICT', NOW()
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE code = 'BT' AND school_id IS NULL)
ON CONFLICT DO NOTHING;

-- Physical Education
INSERT INTO subjects (name, code, school_id, description, created_at)
SELECT 'Physical Education', 'PE', NULL, 'Physical Education and Sports', NOW()
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE code = 'PE' AND school_id IS NULL)
ON CONFLICT DO NOTHING;

-- Music
INSERT INTO subjects (name, code, school_id, description, created_at)
SELECT 'Music', 'MUS', NULL, 'Music and Performing Arts', NOW()
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE code = 'MUS' AND school_id IS NULL)
ON CONFLICT DO NOTHING;

-- Visual Arts
INSERT INTO subjects (name, code, school_id, description, created_at)
SELECT 'Visual Arts', 'ART', NULL, 'Visual and Applied Arts', NOW()
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE code = 'ART' AND school_id IS NULL)
ON CONFLICT DO NOTHING;

-- Yoruba
INSERT INTO subjects (name, code, school_id, description, created_at)
SELECT 'Yoruba', 'YOR', NULL, 'Yoruba Language', NOW()
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE code = 'YOR' AND school_id IS NULL)
ON CONFLICT DO NOTHING;

-- Igbo
INSERT INTO subjects (name, code, school_id, description, created_at)
SELECT 'Igbo', 'IGB', NULL, 'Igbo Language', NOW()
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE code = 'IGB' AND school_id IS NULL)
ON CONFLICT DO NOTHING;

-- Hausa
INSERT INTO subjects (name, code, school_id, description, created_at)
SELECT 'Hausa', 'HAU', NULL, 'Hausa Language', NOW()
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE code = 'HAU' AND school_id IS NULL)
ON CONFLICT DO NOTHING;

-- French
INSERT INTO subjects (name, code, school_id, description, created_at)
SELECT 'French', 'FRE', NULL, 'French Language', NOW()
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE code = 'FRE' AND school_id IS NULL)
ON CONFLICT DO NOTHING;

-- Arabic
INSERT INTO subjects (name, code, school_id, description, created_at)
SELECT 'Arabic', 'ARB', NULL, 'Arabic Language', NOW()
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE code = 'ARB' AND school_id IS NULL)
ON CONFLICT DO NOTHING;

-- Home Economics
INSERT INTO subjects (name, code, school_id, description, created_at)
SELECT 'Home Economics', 'HE', NULL, 'Home Economics and Family Living', NOW()
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE code = 'HE' AND school_id IS NULL)
ON CONFLICT DO NOTHING;

-- Agricultural Science
INSERT INTO subjects (name, code, school_id, description, created_at)
SELECT 'Agricultural Science', 'AGR', NULL, 'Agricultural Science', NOW()
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE code = 'AGR' AND school_id IS NULL)
ON CONFLICT DO NOTHING;

-- Religion/Moral
INSERT INTO subjects (name, code, school_id, description, created_at)
SELECT 'Religion/Moral', 'RM', NULL, 'Religious and Moral Studies', NOW()
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE code = 'RM' AND school_id IS NULL)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- JUNIOR SECONDARY SUBJECTS (JSS1-JSS3)
-- ============================================================================

-- Physics
INSERT INTO subjects (name, code, school_id, description, created_at)
SELECT 'Physics', 'PHY', NULL, 'Physics', NOW()
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE code = 'PHY' AND school_id IS NULL)
ON CONFLICT DO NOTHING;

-- Chemistry
INSERT INTO subjects (name, code, school_id, description, created_at)
SELECT 'Chemistry', 'CHM', NULL, 'Chemistry', NOW()
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE code = 'CHM' AND school_id IS NULL)
ON CONFLICT DO NOTHING;

-- Biology
INSERT INTO subjects (name, code, school_id, description, created_at)
SELECT 'Biology', 'BIO', NULL, 'Biology', NOW()
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE code = 'BIO' AND school_id IS NULL)
ON CONFLICT DO NOTHING;

-- Information and Communication Technology (ICT)
INSERT INTO subjects (name, code, school_id, description, created_at)
SELECT 'Information and Communication Technology', 'ICT', NULL, 'ICT', NOW()
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE code = 'ICT' AND school_id IS NULL)
ON CONFLICT DO NOTHING;

-- Civic Education
INSERT INTO subjects (name, code, school_id, description, created_at)
SELECT 'Civic Education', 'CIV', NULL, 'Civic Education', NOW()
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE code = 'CIV' AND school_id IS NULL)
ON CONFLICT DO NOTHING;

-- History
INSERT INTO subjects (name, code, school_id, description, created_at)
SELECT 'History', 'HIS', NULL, 'History', NOW()
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE code = 'HIS' AND school_id IS NULL)
ON CONFLICT DO NOTHING;

-- Geography
INSERT INTO subjects (name, code, school_id, description, created_at)
SELECT 'Geography', 'GEO', NULL, 'Geography', NOW()
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE code = 'GEO' AND school_id IS NULL)
ON CONFLICT DO NOTHING;

-- Economics
INSERT INTO subjects (name, code, school_id, description, created_at)
SELECT 'Economics', 'ECO', NULL, 'Economics', NOW()
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE code = 'ECO' AND school_id IS NULL)
ON CONFLICT DO NOTHING;

-- Business Studies
INSERT INTO subjects (name, code, school_id, description, created_at)
SELECT 'Business Studies', 'BUS', NULL, 'Business Studies', NOW()
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE code = 'BUS' AND school_id IS NULL)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SENIOR SECONDARY SUBJECTS (SSS1-SSS3)
-- ============================================================================

-- Literature in English
INSERT INTO subjects (name, code, school_id, description, created_at)
SELECT 'Literature in English', 'LIT', NULL, 'Literature in English', NOW()
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE code = 'LIT' AND school_id IS NULL)
ON CONFLICT DO NOTHING;

-- Further Mathematics
INSERT INTO subjects (name, code, school_id, description, created_at)
SELECT 'Further Mathematics', 'FM', NULL, 'Further Mathematics', NOW()
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE code = 'FM' AND school_id IS NULL)
ON CONFLICT DO NOTHING;

-- Accounting
INSERT INTO subjects (name, code, school_id, description, created_at)
SELECT 'Accounting', 'ACC', NULL, 'Accounting', NOW()
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE code = 'ACC' AND school_id IS NULL)
ON CONFLICT DO NOTHING;

-- Government
INSERT INTO subjects (name, code, school_id, description, created_at)
SELECT 'Government', 'GOV', NULL, 'Government', NOW()
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE code = 'GOV' AND school_id IS NULL)
ON CONFLICT DO NOTHING;

-- Philosophy
INSERT INTO subjects (name, code, school_id, description, created_at)
SELECT 'Philosophy', 'PHI', NULL, 'Philosophy', NOW()
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE code = 'PHI' AND school_id IS NULL)
ON CONFLICT DO NOTHING;

-- Nutrition Science
INSERT INTO subjects (name, code, school_id, description, created_at)
SELECT 'Nutrition Science', 'NUT', NULL, 'Nutrition Science', NOW()
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE code = 'NUT' AND school_id IS NULL)
ON CONFLICT DO NOTHING;

-- Data Processing
INSERT INTO subjects (name, code, school_id, description, created_at)
SELECT 'Data Processing', 'DP', NULL, 'Data Processing', NOW()
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE code = 'DP' AND school_id IS NULL)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- ASSIGN SUBJECTS TO CLASS LEVELS
-- ============================================================================

-- Prep/Primary subjects (Levels 0-6)
INSERT INTO subject_applicable_levels (subject_id, level, created_at)
SELECT s.id, level, NOW()
FROM subjects s
CROSS JOIN (SELECT UNNEST(ARRAY[0,1,2,3,4,5,6]) as level)
WHERE s.code IN ('ENG', 'MATH', 'SCI', 'SS', 'BS', 'BT', 'PE', 'MUS', 'ART', 'YOR', 'IGB', 'HAU', 'FRE', 'ARB', 'HE', 'AGR', 'RM')
  AND s.school_id IS NULL
ON CONFLICT (subject_id, level) DO NOTHING;

-- JSS subjects (Levels 7-9)
INSERT INTO subject_applicable_levels (subject_id, level, created_at)
SELECT s.id, level, NOW()
FROM subjects s
CROSS JOIN (SELECT UNNEST(ARRAY[7,8,9]) as level)
WHERE s.code IN ('ENG', 'MATH', 'SCI', 'PHY', 'CHM', 'BIO', 'SS', 'ICT', 'CIV', 'HIS', 'GEO', 'PE', 'MUS', 'ART', 'YOR', 'IGB', 'HAU', 'FRE', 'ARB', 'HE', 'AGR', 'RM', 'BUS')
  AND s.school_id IS NULL
ON CONFLICT (subject_id, level) DO NOTHING;

-- SSS subjects (Levels 10-12)
INSERT INTO subject_applicable_levels (subject_id, level, created_at)
SELECT s.id, level, NOW()
FROM subjects s
CROSS JOIN (SELECT UNNEST(ARRAY[10,11,12]) as level)
WHERE s.code IN ('ENG', 'MATH', 'PHY', 'CHM', 'BIO', 'LIT', 'FM', 'ACC', 'ECO', 'BUS', 'GOV', 'HIS', 'GEO', 'CIV', 'ICT', 'PE', 'MUS', 'ART', 'YOR', 'IGB', 'HAU', 'FRE', 'ARB', 'HE', 'AGR', 'RM', 'PHI', 'NUT', 'DP')
  AND s.school_id IS NULL
ON CONFLICT (subject_id, level) DO NOTHING;

-- ============================================================================
-- POPULATE SUBJECTS FOR EXISTING SCHOOLS
-- ============================================================================

-- For each school, create links to all master subjects (if not already present)
INSERT INTO subjects (school_id, name, code, description, created_at)
SELECT DISTINCT
  s.id as school_id,
  ms.name,
  ms.code,
  ms.description,
  NOW()
FROM schools s
CROSS JOIN subjects ms
WHERE ms.school_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM subjects
    WHERE school_id = s.id
      AND code = ms.code
  );

-- Link school subjects to applicable levels
INSERT INTO subject_applicable_levels (subject_id, level, created_at)
SELECT DISTINCT
  s.id,
  sal.level,
  NOW()
FROM subjects s
INNER JOIN subjects ms ON s.code = ms.code AND ms.school_id IS NULL
INNER JOIN subject_applicable_levels sal ON sal.subject_id = ms.id
WHERE s.school_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM subject_applicable_levels
    WHERE subject_id = s.id
      AND level = sal.level
  );

COMMIT;
