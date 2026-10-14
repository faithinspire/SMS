-- Migration 174: PERMANENT MULTI-TENANT FIX - New Schools Missing Academic Data
-- Root cause: seedSchoolCurriculum() creates only 1 session, 0 terms, 0 subjects
-- Solution: Populate ALL schools with complete academic data:
--   - 17 academic sessions (2024-2040)
--   - 51 academic terms (3 per session)
--   - 12 classes (Primary 1-6, JSS 1-3, SSS 1-3)
--   - 36 arms (A, B, C per class)
--   - 36 class-arm combos
--   - 20 Nigerian curriculum subjects
--
-- SCHEMA NOTES:
--   - academic_terms columns: name (not term_name), term_number (not term_order)
--   - All inserts use WHERE NOT EXISTS (no ON CONFLICT)

BEGIN;

-- ============================================================================
-- STEP 1: Create 17 Academic Sessions (2024-2040) for each school
-- ============================================================================
INSERT INTO academic_sessions (school_id, session_year, start_year, end_year, is_active)
SELECT 
  s.id,
  y || '/' || (y + 1),
  y,
  y + 1,
  y = EXTRACT(YEAR FROM CURRENT_DATE)::INT
FROM schools s
CROSS JOIN generate_series(2024, 2040) as y
WHERE NOT EXISTS (
  SELECT 1 FROM academic_sessions 
  WHERE school_id = s.id AND session_year = y || '/' || (y + 1)
);

-- ============================================================================
-- STEP 2: Create 51 Academic Terms (3 per session)
-- Uses actual schema: name and term_number (NOT term_name and term_order)
-- ============================================================================
INSERT INTO academic_terms (school_id, session_id, name, term_number, start_date, end_date, is_active)
SELECT 
  s.school_id,
  s.id,
  CASE tn WHEN 1 THEN 'First Term' WHEN 2 THEN 'Second Term' ELSE 'Third Term' END,
  tn,
  MAKE_DATE(CASE WHEN tn = 2 THEN s.start_year + 1 ELSE s.start_year END, 
            CASE WHEN tn = 1 THEN 9 WHEN tn = 2 THEN 1 ELSE 4 END, 1),
  MAKE_DATE(CASE WHEN tn = 2 THEN s.start_year + 1 ELSE s.start_year END, 
            CASE WHEN tn = 1 THEN 12 WHEN tn = 2 THEN 3 ELSE 6 END, 28),
  tn = 1
FROM academic_sessions s
CROSS JOIN (SELECT 1 AS tn UNION ALL SELECT 2 UNION ALL SELECT 3) t
WHERE NOT EXISTS (
  SELECT 1 FROM academic_terms 
  WHERE school_id = s.school_id AND session_id = s.id AND term_number = t.tn
);

-- ============================================================================
-- STEP 3: Create 12 Standard Classes per school
-- ============================================================================
INSERT INTO classes (school_id, name, level, type)
SELECT 
  s.id,
  c.name,
  c.level,
  c.type
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
) c(name, level, type)
WHERE NOT EXISTS (
  SELECT 1 FROM classes WHERE school_id = s.id AND name = c.name
);

-- ============================================================================
-- STEP 4: Create 36 Arms (A, B, C per class) with 40 capacity each
-- ============================================================================
INSERT INTO arms (school_id, class_id, name, capacity)
SELECT 
  c.school_id,
  c.id,
  a.arm,
  40
FROM classes c
CROSS JOIN (VALUES ('A'), ('B'), ('C')) a(arm)
WHERE NOT EXISTS (
  SELECT 1 FROM arms WHERE class_id = c.id AND name = a.arm
);

-- ============================================================================
-- STEP 5: Create 36 Class-Arm Combos
-- ============================================================================
INSERT INTO class_arm_combos (school_id, class_id, arm_id)
SELECT DISTINCT c.school_id, c.id, a.id
FROM classes c
JOIN arms a ON a.class_id = c.id
WHERE NOT EXISTS (
  SELECT 1 FROM class_arm_combos 
  WHERE school_id = c.school_id AND class_id = c.id AND arm_id = a.id
);

-- ============================================================================
-- STEP 6: Create 20 Standard Nigerian Curriculum Subjects per school
-- ============================================================================
INSERT INTO subjects (school_id, code, name, subject_type, department, is_active)
SELECT 
  s.id,
  subj.code,
  subj.name,
  subj.type,
  subj.dept,
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
) subj(code, name, type, dept)
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.id AND code = subj.code
);

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (Run these after transaction completes)
-- ============================================================================

-- Verify sessions created (should be 17 per school)
SELECT 
  'Academic Sessions' as metric,
  COUNT(DISTINCT school_id) as num_schools,
  COUNT(*) / COUNT(DISTINCT school_id) as sessions_per_school,
  COUNT(*) as total_sessions
FROM academic_sessions;

-- Verify terms created (should be 51 per school = 17 sessions × 3 terms)
SELECT 
  'Academic Terms' as metric,
  COUNT(DISTINCT school_id) as num_schools,
  COUNT(*) / COUNT(DISTINCT school_id) as terms_per_school,
  COUNT(*) as total_terms
FROM academic_terms;

-- Verify classes created (should be 12 per school)
SELECT 
  'Classes' as metric,
  COUNT(DISTINCT school_id) as num_schools,
  COUNT(*) / COUNT(DISTINCT school_id) as classes_per_school,
  COUNT(*) as total_classes
FROM classes;

-- Verify subjects created (should be 20 per school)
SELECT 
  'Subjects' as metric,
  COUNT(DISTINCT school_id) as num_schools,
  COUNT(*) / COUNT(DISTINCT school_id) as subjects_per_school,
  COUNT(*) as total_subjects
FROM subjects
WHERE is_active = TRUE;

-- Sample: Show one school's data
SELECT 
  'Sample School Data' as metric,
  s.name as school_name,
  (SELECT COUNT(*) FROM academic_sessions WHERE school_id = s.id) as num_sessions,
  (SELECT COUNT(*) FROM academic_terms WHERE school_id = s.id) as num_terms,
  (SELECT COUNT(*) FROM classes WHERE school_id = s.id) as num_classes,
  (SELECT COUNT(*) FROM subjects WHERE school_id = s.id AND is_active = TRUE) as num_subjects
FROM schools s
LIMIT 1;
