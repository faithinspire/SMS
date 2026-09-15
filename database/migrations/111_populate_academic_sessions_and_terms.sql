-- Migration 111: Populate Academic Sessions and Terms (2025/2026 to 2060/2061)
-- Separate sessions from terms for better organization
-- Sessions: Academic years (e.g., 2025/2026)
-- Terms: Within sessions (First Term, Second Term, Third Term)

BEGIN;

-- Get all schools (to populate sessions/terms for each school)
WITH schools AS (
  SELECT DISTINCT id FROM schools
)
-- Generate sessions from 2025/2026 to 2060/2061
, session_years AS (
  SELECT generate_series(2025, 2060) as start_year
)
, all_combinations AS (
  SELECT 
    s.id as school_id,
    sy.start_year,
    sy.start_year + 1 as end_year
  FROM schools s
  CROSS JOIN session_years sy
)
INSERT INTO academic_sessions (school_id, session_name, start_year, end_year, is_current, created_at)
SELECT 
  school_id,
  start_year || '/' || end_year as session_name,
  start_year,
  end_year,
  CASE WHEN start_year = 2025 THEN true ELSE false END as is_current,
  NOW()
FROM all_combinations
ON CONFLICT (school_id, session_name) DO NOTHING;

-- Now populate terms for each academic session
-- Sessions must exist first
WITH session_data AS (
  SELECT id as session_id, school_id FROM academic_sessions
)
, term_definitions AS (
  SELECT 
    'First Term' as term_name,
    1 as sequence,
    DATE '2025-09-01' as start_date,
    DATE '2025-11-30' as end_date
  UNION ALL
  SELECT 
    'Second Term' as term_name,
    2 as sequence,
    DATE '2025-12-01' as start_date,
    DATE '2026-03-31' as end_date
  UNION ALL
  SELECT 
    'Third Term' as term_name,
    3 as sequence,
    DATE '2026-04-01' as start_date,
    DATE '2026-07-31' as end_date
)
INSERT INTO terms (
  school_id, 
  session_id, 
  name, 
  sequence,
  start_date, 
  end_date,
  is_current,
  created_at
)
SELECT 
  sd.school_id,
  sd.session_id,
  td.term_name,
  td.sequence,
  td.start_date,
  td.end_date,
  CASE WHEN td.term_name = 'First Term' AND sd.session_id IN (
    SELECT id FROM academic_sessions WHERE is_current = true LIMIT 1
  ) THEN true ELSE false END as is_current,
  NOW()
FROM session_data sd
CROSS JOIN term_definitions td
ON CONFLICT (school_id, session_id, name) DO NOTHING;

-- Mark first term of current session as current
UPDATE terms
SET is_current = true
WHERE session_id IN (SELECT id FROM academic_sessions WHERE is_current = true)
  AND name = 'First Term'
  AND is_current = false;

COMMIT;
