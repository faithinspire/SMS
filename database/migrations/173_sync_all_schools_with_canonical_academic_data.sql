-- Migration 173: Sync ALL Schools with Canonical Academic Data
-- ============================================================================
-- PROBLEM:
-- - New schools have incomplete data (no sessions, terms, subjects)
-- - Old schools have data but structure may vary
-- - Registration APIs expect specific table structures
-- - Dropdowns show empty for new schools
--
-- SOLUTION:
-- This migration ensures ALL schools (old and new) have IDENTICAL complete data:
-- 1. 17 Academic Sessions (2024-2040) - matching the JS seeding function
-- 2. 51 Academic Terms (3 per session)
-- 3. 12 Standard Classes (JSS 1-3, SSS 1-3, Primary 1-6)
-- 4. 36 Arms (A, B, C per class)
-- 5. 36 Class-Arm Combos
-- 6. 20 Standard Nigerian Curriculum Subjects
--
-- This is idempotent - can be run multiple times safely
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Populate Sessions (2024-2040) for ALL schools
-- ============================================================================
INSERT INTO academic_sessions (school_id, session_year, start_year, end_year, is_active)
SELECT 
  s.id as school_id,
  y || '/' || (y + 1) as session_year,
  y as start_year,
  y + 1 as end_year,
  y = EXTRACT(YEAR FROM CURRENT_DATE)::INT as is_active
FROM schools s
CROSS JOIN generate_series(2024, 2040) as y
WHERE NOT EXISTS (
  SELECT 1 FROM academic_sessions as2 
  WHERE as2.school_id = s.id 
    AND as2.session_year = y || '/' || (y + 1)
)
ON CONFLICT (school_id, session_year) DO NOTHING;

-- ============================================================================
-- STEP 2: Create Terms for each Session (3 per session: First, Second, Third)
-- ============================================================================
INSERT INTO academic_terms (school_id, session_id, term_name, term_number, start_date, end_date, is_active, status)
SELECT 
  s.school_id,
  s.id,
  CASE tn 
    WHEN 1 THEN 'First Term' 
    WHEN 2 THEN 'Second Term' 
    WHEN 3 THEN 'Third Term' 
  END as term_name,
  tn as term_number,
  MAKE_DATE(
    CASE WHEN tn = 2 THEN s.start_year + 1 ELSE s.start_year END,
    CASE WHEN tn = 1 THEN 9 WHEN tn = 2 THEN 1 ELSE 4 END,
    1
  ) as start_date,
  MAKE_DATE(
    CASE WHEN tn = 2 THEN s.start_year + 1 ELSE s.start_year END,
    CASE WHEN tn = 1 THEN 12 WHEN tn = 2 THEN 3 ELSE 6 END,
    28
  ) as end_date,
  tn = 1 as is_active,
  'ACTIVE' as status
FROM academic_sessions s
CROSS JOIN (SELECT 1 AS tn UNION SELECT 2 UNION SELECT 3) term_nums
WHERE NOT EXISTS (
  SELECT 1 FROM academic_terms at2 
  WHERE at2.school_id = s.school_id 
    AND at2.session_id = s.id 
    AND at2.term_number = term_nums.tn
)
ON CONFLICT (school_id, session_id, term_number) DO NOTHING;

-- ============================================================================
-- STEP 3: Create 12 Standard Classes for each school
-- ============================================================================
INSERT INTO classes (school_id, name, level, type, status)
SELECT 
  s.id,
  cls.class_name,
  cls.level,
  cls.class_type,
  'ACTIVE'
FROM schools s
CROSS JOIN (
  VALUES 
    ('JSS 1', 1, 'SECONDARY'),
    ('JSS 2', 2, 'SECONDARY'),
    ('JSS 3', 3, 'SECONDARY'),
    ('SSS 1', 4, 'SECONDARY'),
    ('SSS 2', 5, 'SECONDARY'),
    ('SSS 3', 6, 'SECONDARY'),
    ('Primary 1', 7, 'PRIMARY'),
    ('Primary 2', 8, 'PRIMARY'),
    ('Primary 3', 9, 'PRIMARY'),
    ('Primary 4', 10, 'PRIMARY'),
    ('Primary 5', 11, 'PRIMARY'),
    ('Primary 6', 12, 'PRIMARY')
) cls(class_name, level, class_type)
WHERE NOT EXISTS (
  SELECT 1 FROM classes c 
  WHERE c.school_id = s.id 
    AND c.name = cls.class_name
)
ON CONFLICT (school_id, name) DO NOTHING;

-- ============================================================================
-- STEP 4: Create Arms (A, B, C) for each class
-- ============================================================================
INSERT INTO arms (school_id, class_id, name, capacity, status)
SELECT 
  c.school_id,
  c.id,
  arm_name,
  40,
  'ACTIVE'
FROM classes c
CROSS JOIN (VALUES ('A'), ('B'), ('C')) arms_list(arm_name)
WHERE NOT EXISTS (
  SELECT 1 FROM arms a 
  WHERE a.class_id = c.id 
    AND a.name = arms_list.arm_name
)
ON CONFLICT (school_id, class_id, name) DO NOTHING;

-- ============================================================================
-- STEP 5: Create Class-Arm Combos
-- ============================================================================
INSERT INTO class_arm_combos (school_id, class_id, arm_id, status)
SELECT 
  c.school_id,
  c.id,
  a.id,
  'ACTIVE'
FROM classes c
JOIN arms a ON a.class_id = c.id AND a.school_id = c.school_id
WHERE NOT EXISTS (
  SELECT 1 FROM class_arm_combos cac 
  WHERE cac.school_id = c.school_id 
    AND cac.class_id = c.id 
    AND cac.arm_id = a.id
)
ON CONFLICT (school_id, class_id, arm_id) DO NOTHING;

-- ============================================================================
-- STEP 6: Create 20 Standard Nigerian Curriculum Subjects for each school
-- ============================================================================
INSERT INTO subjects (school_id, code, name, subject_type, department, is_active)
SELECT 
  s.id,
  subj.code,
  subj.name,
  subj.type,
  subj.department,
  TRUE
FROM schools s
CROSS JOIN (
  VALUES 
    ('ENG', 'English Language', 'CORE', 'ACADEMICS'),
    ('MATH', 'Mathematics', 'CORE', 'ACADEMICS'),
    ('SCIENCE', 'Science', 'CORE', 'ACADEMICS'),
    ('SS', 'Social Studies', 'CORE', 'ACADEMICS'),
    ('ICT', 'Information & Communication Technology', 'CORE', 'ACADEMICS'),
    ('CRS', 'Christian Religious Studies', 'CORE', 'ACADEMICS'),
    ('ISLAMIC', 'Islamic Studies', 'CORE', 'ACADEMICS'),
    ('BUSINESS', 'Business Studies', 'ELECTIVE', 'ACADEMICS'),
    ('ECONOMICS', 'Economics', 'ELECTIVE', 'ACADEMICS'),
    ('GOVT', 'Government', 'CORE', 'ACADEMICS'),
    ('CHEMISTRY', 'Chemistry', 'CORE', 'SCIENCE'),
    ('PHYSICS', 'Physics', 'CORE', 'SCIENCE'),
    ('BIOLOGY', 'Biology', 'CORE', 'SCIENCE'),
    ('LITERATURE', 'Literature in English', 'ELECTIVE', 'ACADEMICS'),
    ('HISTORY', 'History', 'ELECTIVE', 'ACADEMICS'),
    ('GEOGRAPHY', 'Geography', 'ELECTIVE', 'ACADEMICS'),
    ('PE', 'Physical Education', 'CORE', 'SPORTS'),
    ('MUSIC', 'Music', 'ELECTIVE', 'ARTS'),
    ('ART', 'Visual Art', 'ELECTIVE', 'ARTS'),
    ('FRENCH', 'French Language', 'ELECTIVE', 'LANGUAGES')
) subj(code, name, type, department)
WHERE NOT EXISTS (
  SELECT 1 FROM subjects sb 
  WHERE sb.school_id = s.id 
    AND sb.code = subj.code
)
ON CONFLICT (school_id, code) DO NOTHING;

-- ============================================================================
-- VERIFICATION: Show what was created
-- ============================================================================
SELECT 
  'academic_sessions' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT school_id) as schools_covered,
  MIN(session_year) as oldest_session,
  MAX(session_year) as newest_session
FROM academic_sessions
WHERE status = 'ACTIVE'
UNION ALL
SELECT 
  'academic_terms',
  COUNT(*),
  COUNT(DISTINCT school_id),
  MIN(term_name),
  MAX(term_name)
FROM academic_terms
WHERE status = 'ACTIVE'
UNION ALL
SELECT 
  'classes',
  COUNT(*),
  COUNT(DISTINCT school_id),
  MIN(name),
  MAX(name)
FROM classes
WHERE status = 'ACTIVE'
UNION ALL
SELECT 
  'arms',
  COUNT(*),
  COUNT(DISTINCT school_id),
  MIN(name),
  MAX(name)
FROM arms
WHERE status = 'ACTIVE'
UNION ALL
SELECT 
  'class_arm_combos',
  COUNT(*),
  COUNT(DISTINCT school_id),
  'combos',
  'created'
FROM class_arm_combos
WHERE status = 'ACTIVE'
UNION ALL
SELECT 
  'subjects',
  COUNT(*),
  COUNT(DISTINCT school_id),
  MIN(name),
  MAX(name)
FROM subjects
WHERE is_active = TRUE;

COMMIT;
