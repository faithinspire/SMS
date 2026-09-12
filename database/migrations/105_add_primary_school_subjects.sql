-- Migration 105: Add PRIMARY School Subjects (PREP/KG/NURSERY/P1-6)
-- Adds complete curriculum for primary school levels

-- PRIMARY School Levels and Subjects
-- PREP (Level 0), KG (Level 1), NURSERY (Level 2), P1-P6 (Levels 3-8)

INSERT INTO subjects (school_id, name, code, level, is_active, created_at) 
SELECT NULL, 'English Language', 'ENG', level, true, NOW()
FROM (
  SELECT 0 as level UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8
) levels
ON CONFLICT(school_id, name, level) DO NOTHING;

INSERT INTO subjects (school_id, name, code, level, is_active, created_at) 
SELECT NULL, 'Mathematics', 'MATH', level, true, NOW()
FROM (
  SELECT 0 as level UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8
) levels
ON CONFLICT(school_id, name, level) DO NOTHING;

INSERT INTO subjects (school_id, name, code, level, is_active, created_at) 
SELECT NULL, 'Science', 'SCI', level, true, NOW()
FROM (
  SELECT 2 as level UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8
) levels
ON CONFLICT(school_id, name, level) DO NOTHING;

INSERT INTO subjects (school_id, name, code, level, is_active, created_at) 
SELECT NULL, 'Social Studies', 'SS', level, true, NOW()
FROM (
  SELECT 1 as level UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8
) levels
ON CONFLICT(school_id, name, level) DO NOTHING;

INSERT INTO subjects (school_id, name, code, level, is_active, created_at) 
SELECT NULL, 'Religious Studies', 'REL', level, true, NOW()
FROM (
  SELECT 2 as level UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8
) levels
ON CONFLICT(school_id, name, level) DO NOTHING;

INSERT INTO subjects (school_id, name, code, level, is_active, created_at) 
SELECT NULL, 'Yoruba Language', 'YOR', level, true, NOW()
FROM (
  SELECT 0 as level UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8
) levels
ON CONFLICT(school_id, name, level) DO NOTHING;

INSERT INTO subjects (school_id, name, code, level, is_active, created_at) 
SELECT NULL, 'Igbo Language', 'IGB', level, true, NOW()
FROM (
  SELECT 0 as level UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8
) levels
ON CONFLICT(school_id, name, level) DO NOTHING;

INSERT INTO subjects (school_id, name, code, level, is_active, created_at) 
SELECT NULL, 'Hausa Language', 'HAS', level, true, NOW()
FROM (
  SELECT 0 as level UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8
) levels
ON CONFLICT(school_id, name, level) DO NOTHING;

INSERT INTO subjects (school_id, name, code, level, is_active, created_at) 
SELECT NULL, 'French Language', 'FRE', level, true, NOW()
FROM (
  SELECT 2 as level UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8
) levels
ON CONFLICT(school_id, name, level) DO NOTHING;

INSERT INTO subjects (school_id, name, code, level, is_active, created_at) 
SELECT NULL, 'Arts & Crafts', 'ART', level, true, NOW()
FROM (
  SELECT 0 as level UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8
) levels
ON CONFLICT(school_id, name, level) DO NOTHING;

INSERT INTO subjects (school_id, name, code, level, is_active, created_at) 
SELECT NULL, 'Physical Education', 'PE', level, true, NOW()
FROM (
  SELECT 0 as level UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8
) levels
ON CONFLICT(school_id, name, level) DO NOTHING;

INSERT INTO subjects (school_id, name, code, level, is_active, created_at) 
SELECT NULL, 'Computer Studies', 'CST', level, true, NOW()
FROM (
  SELECT 3 as level UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8
) levels
ON CONFLICT(school_id, name, level) DO NOTHING;

INSERT INTO subjects (school_id, name, code, level, is_active, created_at) 
SELECT NULL, 'Pre-Vocational Studies', 'PVS', level, true, NOW()
FROM (
  SELECT 6 as level UNION SELECT 7 UNION SELECT 8
) levels
ON CONFLICT(school_id, name, level) DO NOTHING;

INSERT INTO subjects (school_id, name, code, level, is_active, created_at) 
SELECT NULL, 'Music', 'MUS', level, true, NOW()
FROM (
  SELECT 0 as level UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8
) levels
ON CONFLICT(school_id, name, level) DO NOTHING;

INSERT INTO subjects (school_id, name, code, level, is_active, created_at) 
SELECT NULL, 'Agricultural Science', 'AGR', level, true, NOW()
FROM (
  SELECT 5 as level UNION SELECT 6 UNION SELECT 7 UNION SELECT 8
) levels
ON CONFLICT(school_id, name, level) DO NOTHING;
