BEGIN;

INSERT INTO academic_sessions (
  school_id, session_year, start_year, end_year, is_active, created_at, updated_at
)
VALUES (
  '9f9bda71-dc25-488f-8283-02eb5a931681',
  '2026/2027', 2026, 2027, true, NOW(), NOW()
)
ON CONFLICT DO NOTHING;

WITH session_info AS (
  SELECT id FROM academic_sessions
  WHERE school_id = '9f9bda71-dc25-488f-8283-02eb5a931681'
  AND session_year = '2026/2027'
)
INSERT INTO academic_terms (
  school_id, session_id, name, term_number, start_date, end_date, is_active, created_at, updated_at
)
SELECT
  '9f9bda71-dc25-488f-8283-02eb5a931681', si.id, t.term_name, t.term_order,
  t.start_date, t.end_date,
  CASE WHEN t.term_order = 1 THEN true ELSE false END, NOW(), NOW()
FROM session_info si
CROSS JOIN (
  VALUES
    ('First Term'::VARCHAR, 1::INT, '2026-09-01'::DATE, '2026-11-30'::DATE),
    ('Second Term', 2, '2026-12-01', '2027-03-31'),
    ('Third Term', 3, '2027-04-01', '2027-07-31')
) t(term_name, term_order, start_date, end_date)
ON CONFLICT DO NOTHING;

COMMIT;
