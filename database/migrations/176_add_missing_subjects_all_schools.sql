/**
 * MIGRATION 176: Add Missing Subjects (Economics, Chemistry, Physics, Geography, CRK, Biology, Accounting)
 * 
 * These subjects were not created in migration 175. This migration ensures they are added
 * to all schools with proper level mappings.
 */

-- Integrated Science (if missing)
INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, is_active, created_at)
SELECT gen_random_uuid(), s.school_id, 'Integrated Science', 'ISCI', ARRAY[3,4,5,6,7,8], 'GENERAL', true, NOW()
FROM (SELECT DISTINCT school_id FROM subjects) s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.school_id AND code = 'ISCI'
)
ON CONFLICT DO NOTHING;

-- Social Studies (if missing)
INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, is_active, created_at)
SELECT gen_random_uuid(), s.school_id, 'Social Studies', 'SS', ARRAY[3,4,5,6,7,8,9,10,11], 'SOCIAL', true, NOW()
FROM (SELECT DISTINCT school_id FROM subjects) s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.school_id AND code = 'SS'
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Add the MISSING subjects that weren't in migration 175
-- ============================================================================

-- Economics (for JSS and SS)
INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, is_active, created_at)
SELECT gen_random_uuid(), s.school_id, 'Economics', 'ECON', ARRAY[9,10,11,12,13,14], 'SOCIAL', true, NOW()
FROM (SELECT DISTINCT school_id FROM subjects) s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.school_id AND code = 'ECON'
)
ON CONFLICT DO NOTHING;

-- Chemistry (for JSS and SS)
INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, is_active, created_at)
SELECT gen_random_uuid(), s.school_id, 'Chemistry', 'CHEM', ARRAY[9,10,11,12,13,14], 'SCIENCE', true, NOW()
FROM (SELECT DISTINCT school_id FROM subjects) s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.school_id AND code = 'CHEM'
)
ON CONFLICT DO NOTHING;

-- Physics (for JSS and SS)
INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, is_active, created_at)
SELECT gen_random_uuid(), s.school_id, 'Physics', 'PHYS', ARRAY[9,10,11,12,13,14], 'SCIENCE', true, NOW()
FROM (SELECT DISTINCT school_id FROM subjects) s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.school_id AND code = 'PHYS'
)
ON CONFLICT DO NOTHING;

-- Geography (for JSS and SS)
INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, is_active, created_at)
SELECT gen_random_uuid(), s.school_id, 'Geography', 'GEOG', ARRAY[9,10,11,12,13,14], 'SOCIAL', true, NOW()
FROM (SELECT DISTINCT school_id FROM subjects) s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.school_id AND code = 'GEOG'
)
ON CONFLICT DO NOTHING;

-- Christian Religious Studies / CRK (for JSS and SS)
INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, is_active, created_at)
SELECT gen_random_uuid(), s.school_id, 'Christian Religious Studies', 'CRS', ARRAY[9,10,11,12,13,14], 'SOCIAL', true, NOW()
FROM (SELECT DISTINCT school_id FROM subjects) s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.school_id AND code = 'CRS'
)
ON CONFLICT DO NOTHING;

-- Biology (for JSS and SS)
INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, is_active, created_at)
SELECT gen_random_uuid(), s.school_id, 'Biology', 'BIO', ARRAY[9,10,11,12,13,14], 'SCIENCE', true, NOW()
FROM (SELECT DISTINCT school_id FROM subjects) s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.school_id AND code = 'BIO'
)
ON CONFLICT DO NOTHING;

-- Accounting (for SS only - Levels 12-14)
INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, department, is_active, created_at)
SELECT gen_random_uuid(), s.school_id, 'Accounting', 'ACC', ARRAY[12,13,14], 'COMMERCIAL', 'COMMERCIAL', true, NOW()
FROM (SELECT DISTINCT school_id FROM subjects) s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.school_id AND code = 'ACC'
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Also ensure these other missing subjects are created
-- ============================================================================

-- Arabic (for JSS and SS)
INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, is_active, created_at)
SELECT gen_random_uuid(), s.school_id, 'Arabic', 'ARAB', ARRAY[9,10,11,12,13,14], 'LANGUAGE', true, NOW()
FROM (SELECT DISTINCT school_id FROM subjects) s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.school_id AND code = 'ARAB'
)
ON CONFLICT DO NOTHING;

-- Technical Drawing (for JSS and SS)
INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, is_active, created_at)
SELECT gen_random_uuid(), s.school_id, 'Technical Drawing', 'TD', ARRAY[9,10,11,12,13,14], 'TECHNICAL', true, NOW()
FROM (SELECT DISTINCT school_id FROM subjects) s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.school_id AND code = 'TD'
)
ON CONFLICT DO NOTHING;

-- Home Economics (for Primary, JSS, and SS)
INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, is_active, created_at)
SELECT gen_random_uuid(), s.school_id, 'Home Economics', 'HE', ARRAY[3,4,5,6,7,8,9,10,11,12,13,14], 'TECHNICAL', true, NOW()
FROM (SELECT DISTINCT school_id FROM subjects) s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.school_id AND code = 'HE'
)
ON CONFLICT DO NOTHING;

-- Agricultural Science (for JSS and SS)
INSERT INTO subjects (id, school_id, name, code, applicable_to_levels, category, is_active, created_at)
SELECT gen_random_uuid(), s.school_id, 'Agricultural Science', 'AG', ARRAY[9,10,11,12,13,14], 'TECHNICAL', true, NOW()
FROM (SELECT DISTINCT school_id FROM subjects) s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.school_id AND code = 'AG'
)
ON CONFLICT DO NOTHING;

-- Biology with department mapping (Science stream for SS)
UPDATE subjects 
SET department = 'SCIENCE'
WHERE code = 'BIO' AND applicable_to_levels @> ARRAY[12] AND department IS NULL;

-- Chemistry with department mapping (Science stream for SS)
UPDATE subjects 
SET department = 'SCIENCE'
WHERE code = 'CHEM' AND applicable_to_levels @> ARRAY[12] AND department IS NULL;

-- Physics with department mapping (Science stream for SS)
UPDATE subjects 
SET department = 'SCIENCE'
WHERE code = 'PHYS' AND applicable_to_levels @> ARRAY[12] AND department IS NULL;

-- ============================================================================
-- Verification queries
-- ============================================================================
-- Check all schools have the missing subjects now
-- SELECT 
--   school_id,
--   COUNT(CASE WHEN code = 'ECON' THEN 1 END) as economics,
--   COUNT(CASE WHEN code = 'CHEM' THEN 1 END) as chemistry,
--   COUNT(CASE WHEN code = 'PHYS' THEN 1 END) as physics,
--   COUNT(CASE WHEN code = 'GEOG' THEN 1 END) as geography,
--   COUNT(CASE WHEN code = 'CRS' THEN 1 END) as crk,
--   COUNT(CASE WHEN code = 'BIO' THEN 1 END) as biology,
--   COUNT(CASE WHEN code = 'ACC' THEN 1 END) as accounting,
--   COUNT(CASE WHEN is_active = true THEN 1 END) as total_active
-- FROM subjects
-- GROUP BY school_id
-- ORDER BY total_active DESC;

-- Check JSS1 specific subjects
-- SELECT name, code FROM subjects 
-- WHERE is_active = true 
-- AND 9 = ANY(applicable_to_levels)
-- ORDER BY name;

-- Check SS1 specific subjects
-- SELECT name, code, department FROM subjects 
-- WHERE is_active = true 
-- AND 12 = ANY(applicable_to_levels)
-- ORDER BY name;
