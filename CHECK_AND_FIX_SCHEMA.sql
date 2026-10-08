-- FIRST: Check what columns actually exist in academic_terms table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'academic_terms'
ORDER BY ordinal_position;

-- If that shows the columns, then use this to add test data:
-- Replace test_school_id with: 9f9bda71-dc25-488f-8283-02eb5a931681

BEGIN;

-- 1. Add session for test school
INSERT INTO academic_sessions (
  school_id,
  session_year,
  start_year,
  end_year,
  is_active
)
VALUES (
  '9f9bda71-dc25-488f-8283-02eb5a931681',
  '2026/2027',
  2026,
  2027,
  true
)
ON CONFLICT (school_id, session_year) DO NOTHING;

-- 2. Get the session ID and add terms
WITH session_info AS (
  SELECT id 
  FROM academic_sessions 
  WHERE school_id = '9f9bda71-dc25-488f-8283-02eb5a931681'
  AND session_year = '2026/2027'
)
INSERT INTO academic_terms (
  school_id,
  session_id,
  term_name,
  term_order,
  start_date,
  end_date,
  is_active
)
SELECT
  '9f9bda71-dc25-488f-8283-02eb5a931681' as school_id,
  si.id as session_id,
  t.term_name,
  t.term_order,
  t.start_date,
  t.end_date,
  CASE WHEN t.term_order = 1 THEN true ELSE false END as is_active
FROM session_info si
CROSS JOIN (
  VALUES 
    ('First Term'::TEXT, 1::INT, '2026-09-01'::DATE, '2026-11-30'::DATE),
    ('Second Term', 2, '2026-12-01', '2027-03-31'),
    ('Third Term', 3, '2027-04-01', '2027-07-31')
) t(term_name, term_order, start_date, end_date)
ON CONFLICT DO NOTHING;

COMMIT;
