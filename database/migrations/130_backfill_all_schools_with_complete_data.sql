-- ============================================================================
-- Migration 130: Backfill ALL Schools with Complete Base Data
-- ============================================================================
-- PROBLEM:
-- Old schools (registered before migrations 015, 016, 049) are missing:
-- 1. Academic sessions (2025/2026, etc.)
-- 2. Academic terms (First Term, Second Term, Third Term)
-- 3. Streams (Science, Commercial, Humanities, Technical)
-- 4. Complete class structure with arms and combos
-- 5. Complete subject catalog
--
-- New features (broadcasts, lesson notes, assignments, CBT) require this data.
-- This migration ensures ALL schools (old and new) have identical base data.
--
-- SOLUTION: Pure SQL (no RAISE NOTICE, no FOR loops) - compatible with Supabase
-- 1. Create academic sessions if missing
-- 2. Create academic terms if missing
-- 3. Create streams if missing
-- 4. Create complete class structure if missing
-- 5. Verify all subjects exist
--
-- TIME: < 1 minute for typical deployment (< 1000 schools)
-- SAFETY: Uses ON CONFLICT DO NOTHING - idempotent, safe to re-run
-- ============================================================================

-- ============================================================================
-- STEP 1: Ensure All Schools Have Academic Sessions (2025/2026 onwards)
-- ============================================================================

WITH all_schools AS (
  SELECT id FROM schools
),
session_years AS (
  SELECT generate_series(2025, 2060) as start_year
),
combinations AS (
  SELECT 
    s.id as school_id,
    sy.start_year,
    sy.start_year + 1 as end_year
  FROM all_schools s
  CROSS JOIN session_years sy
)
INSERT INTO academic_sessions (school_id, session_year, start_year, end_year, is_active)
SELECT 
  school_id,
  start_year || '/' || end_year,
  start_year,
  end_year,
  CASE WHEN start_year = 2025 THEN true ELSE false END
FROM combinations
ON CONFLICT (school_id, session_year) DO NOTHING;

-- ============================================================================
-- STEP 2: Ensure All Schools Have Academic Terms (First, Second, Third)
-- ============================================================================

WITH session_data AS (
  SELECT id as session_id, school_id FROM academic_sessions WHERE school_id NOT IN (
    SELECT DISTINCT school_id FROM academic_terms
  )
),
term_definitions AS (
  SELECT 
    'First Term' as term_name,
    1 as term_order
  UNION ALL
  SELECT 
    'Second Term' as term_name,
    2 as term_order
  UNION ALL
  SELECT 
    'Third Term' as term_name,
    3 as term_order
)
INSERT INTO academic_terms (
  session_id,
  school_id,
  term_name,
  term_order,
  start_date,
  end_date,
  is_active
)
SELECT 
  sd.session_id,
  sd.school_id,
  td.term_name,
  td.term_order,
  CASE 
    WHEN td.term_name = 'First Term' THEN DATE '2025-09-01'
    WHEN td.term_name = 'Second Term' THEN DATE '2025-12-01'
    WHEN td.term_name = 'Third Term' THEN DATE '2026-04-01'
  END,
  CASE 
    WHEN td.term_name = 'First Term' THEN DATE '2025-11-30'
    WHEN td.term_name = 'Second Term' THEN DATE '2026-03-31'
    WHEN td.term_name = 'Third Term' THEN DATE '2026-07-31'
  END,
  CASE WHEN td.term_name = 'First Term' THEN true ELSE false END
FROM session_data sd
CROSS JOIN term_definitions td
ON CONFLICT (session_id, term_name) DO NOTHING;

-- ============================================================================
-- STEP 3: Ensure All Schools Have Streams (Science, Commercial, etc.)
-- ============================================================================

WITH all_schools AS (
  SELECT id FROM schools
),
stream_names AS (
  SELECT 'Science' as name UNION ALL
  SELECT 'Commercial' UNION ALL
  SELECT 'Humanities' UNION ALL
  SELECT 'Technical'
)
INSERT INTO streams (school_id, name)
SELECT s.id, sn.name
FROM all_schools s
CROSS JOIN stream_names sn
ON CONFLICT (school_id, name) DO NOTHING;

-- ============================================================================
-- STEP 4: Ensure All Schools Have Complete Class Structure
-- ============================================================================

-- Standard class definitions
WITH class_definitions AS (
  SELECT 'Nursery' as name, 1 as level, 'PRIMARY' as class_type UNION ALL
  SELECT 'Kindergarten', 2, 'PRIMARY' UNION ALL
  SELECT 'Primary 1', 3, 'PRIMARY' UNION ALL
  SELECT 'Primary 2', 4, 'PRIMARY' UNION ALL
  SELECT 'Primary 3', 5, 'PRIMARY' UNION ALL
  SELECT 'Primary 4', 6, 'PRIMARY' UNION ALL
  SELECT 'Primary 5', 7, 'PRIMARY' UNION ALL
  SELECT 'Primary 6', 8, 'PRIMARY' UNION ALL
  SELECT 'JSS 1', 9, 'SECONDARY' UNION ALL
  SELECT 'JSS 2', 10, 'SECONDARY' UNION ALL
  SELECT 'JSS 3', 11, 'SECONDARY' UNION ALL
  SELECT 'SS 1', 12, 'SECONDARY' UNION ALL
  SELECT 'SS 2', 13, 'SECONDARY' UNION ALL
  SELECT 'SS 3', 14, 'SECONDARY'
),
all_schools AS (
  SELECT id FROM schools
),
school_class_combos AS (
  SELECT s.id as school_id, cd.name, cd.level, cd.class_type
  FROM all_schools s
  CROSS JOIN class_definitions cd
),
new_classes AS (
  INSERT INTO classes (school_id, name, level, type)
  SELECT school_id, name, level, class_type
  FROM school_class_combos
  WHERE (school_id, name) NOT IN (SELECT school_id, name FROM classes)
  RETURNING id, school_id, name
),
arm_definitions AS (
  SELECT 'A' as name, 40 as capacity UNION ALL
  SELECT 'B', 40 UNION ALL
  SELECT 'C', 40
),
new_arms AS (
  INSERT INTO arms (class_id, school_id, name, capacity)
  SELECT c.id, c.school_id, ad.name, ad.capacity
  FROM (SELECT id, school_id FROM classes) c
  CROSS JOIN arm_definitions ad
  WHERE (c.id, c.school_id, ad.name) NOT IN (
    SELECT class_id, school_id, name FROM arms
  )
  RETURNING id, class_id, school_id
)
INSERT INTO class_arm_combos (school_id, class_id, arm_id)
SELECT DISTINCT c.school_id, c.id, a.id
FROM classes c
CROSS JOIN arms a
WHERE c.id = a.class_id AND (c.school_id, c.id, a.id) NOT IN (
  SELECT school_id, class_id, arm_id FROM class_arm_combos
)
ON CONFLICT (school_id, class_id, arm_id) DO NOTHING;

-- ============================================================================
-- STEP 5: Ensure All Schools Have Complete Subject Catalog
-- ============================================================================

WITH all_schools AS (
  SELECT id FROM schools
),
subject_catalog AS (
  SELECT 'English Language' as name, 'ENG' as code, ARRAY[1,2,3,4,5,6,7,8] as levels UNION ALL
  SELECT 'Mathematics', 'MATH', ARRAY[1,2,3,4,5,6,7,8,9,10,11,12,13,14] UNION ALL
  SELECT 'Science', 'SCI', ARRAY[1,2,3,4,5,6,7,8] UNION ALL
  SELECT 'Social Studies', 'SS', ARRAY[1,2,3,4,5,6,7,8] UNION ALL
  SELECT 'Civic Education', 'CIV', ARRAY[1,2,3,4,5,6,7,8,9,10,11,12,13,14] UNION ALL
  SELECT 'Physical Education', 'PE', ARRAY[1,2,3,4,5,6,7,8,9,10,11,12,13,14] UNION ALL
  SELECT 'Art & Craft', 'ART', ARRAY[1,2,3,4,5,6,7,8] UNION ALL
  SELECT 'Music', 'MUS', ARRAY[1,2,3,4,5,6,7,8] UNION ALL
  SELECT 'Home Economics', 'HE', ARRAY[1,2,3,4,5,6,7,8] UNION ALL
  SELECT 'Information Technology', 'ICT', ARRAY[3,4,5,6,7,8,9,10,11,12,13,14] UNION ALL
  SELECT 'English', 'ENG', ARRAY[9,10,11,12,13,14] UNION ALL
  SELECT 'Biology', 'BIO', ARRAY[9,10,11,12,13,14] UNION ALL
  SELECT 'Chemistry', 'CHEM', ARRAY[9,10,11,12,13,14] UNION ALL
  SELECT 'Physics', 'PHY', ARRAY[9,10,11,12,13,14] UNION ALL
  SELECT 'History', 'HIST', ARRAY[9,10,11,12,13,14] UNION ALL
  SELECT 'Geography', 'GEO', ARRAY[9,10,11,12,13,14] UNION ALL
  SELECT 'Agricultural Science', 'AGR', ARRAY[9,10,11,12,13,14] UNION ALL
  SELECT 'Technical Drawing', 'TD', ARRAY[9,10,11,12,13,14] UNION ALL
  SELECT 'Computer Science', 'CS', ARRAY[9,10,11,12,13,14] UNION ALL
  SELECT 'Economics', 'ECON', ARRAY[12,13,14] UNION ALL
  SELECT 'Accounting', 'ACC', ARRAY[12,13,14] UNION ALL
  SELECT 'Government', 'GOV', ARRAY[12,13,14] UNION ALL
  SELECT 'Literature In English', 'LIT', ARRAY[12,13,14] UNION ALL
  SELECT 'Further Mathematics', 'FM', ARRAY[12,13,14]
)
INSERT INTO subjects (school_id, name, code, applicable_to_levels)
SELECT s.id, sc.name, sc.code, sc.levels
FROM all_schools s
CROSS JOIN subject_catalog sc
ON CONFLICT (school_id, name) DO NOTHING;
