-- COMPREHENSIVE FIX FOR PRODUCTION
-- Populate test school with 10 years of academic sessions and full data

BEGIN;

-- Test school ID
-- 9f9bda71-dc25-488f-8283-02eb5a931681

-- Step 1: Delete existing data for clean slate
DELETE FROM academic_terms WHERE school_id = '9f9bda71-dc25-488f-8283-02eb5a931681';
DELETE FROM academic_sessions WHERE school_id = '9f9bda71-dc25-488f-8283-02eb5a931681';

-- Step 2: Create 10 years of academic sessions (2025/2026 through 2034/2035)
INSERT INTO academic_sessions (
  school_id,
  session_year,
  start_year,
  end_year,
  is_active,
  created_at,
  updated_at
)
SELECT
  '9f9bda71-dc25-488f-8283-02eb5a931681',
  (year::TEXT || '/' || (year+1)::TEXT),
  year,
  year + 1,
  CASE WHEN year = 2025 THEN true ELSE false END,
  NOW(),
  NOW()
FROM (
  SELECT generate_series(2025, 2034) as year
) AS years;

-- Step 3: Create 3 terms for EACH session
WITH sessions AS (
  SELECT id, session_year FROM academic_sessions
  WHERE school_id = '9f9bda71-dc25-488f-8283-02eb5a931681'
)
INSERT INTO academic_terms (
  school_id,
  session_id,
  name,
  term_number,
  start_date,
  end_date,
  is_active,
  created_at,
  updated_at
)
SELECT
  '9f9bda71-dc25-488f-8283-02eb5a931681',
  s.id,
  t.term_name,
  t.term_order,
  t.start_date,
  t.end_date,
  CASE WHEN t.term_order = 1 AND s.session_year = '2025/2026' THEN true ELSE false END,
  NOW(),
  NOW()
FROM sessions s
CROSS JOIN (
  VALUES
    ('First Term'::VARCHAR, 1::INT, '2025-09-01'::DATE, '2025-11-30'::DATE),
    ('Second Term', 2, '2025-12-01', '2026-03-31'),
    ('Third Term', 3, '2026-04-01', '2026-07-31')
) t(term_name, term_order, start_date, end_date);

-- Step 4: Verify data was created
SELECT 
  (SELECT COUNT(*) FROM academic_sessions WHERE school_id = '9f9bda71-dc25-488f-8283-02eb5a931681') as sessions_count,
  (SELECT COUNT(*) FROM academic_terms WHERE school_id = '9f9bda71-dc25-488f-8283-02eb5a931681') as terms_count;

COMMIT;

-- Expected result: 10 sessions, 30 terms (3 per session)
