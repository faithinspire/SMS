-- EXECUTE THIS IN SUPABASE SQL EDITOR NOW
-- This populates test school with academic data so dropdowns work

-- Test school ID
-- 9f9bda71-dc25-488f-8283-02eb5a931681

BEGIN;

-- 1. CREATE SESSION 2026/2027
INSERT INTO academic_sessions (
  id,
  school_id,
  session_year,
  start_year,
  end_year,
  is_active,
  created_at
)
VALUES (
  gen_random_uuid(),
  '9f9bda71-dc25-488f-8283-02eb5a931681',
  '2026/2027',
  2026,
  2027,
  true,
  NOW()
)
ON CONFLICT DO NOTHING;

-- 2. GET THE SESSION ID WE JUST CREATED
-- (We need this to create terms)
WITH session_data AS (
  SELECT id as session_id
  FROM academic_sessions
  WHERE school_id = '9f9bda71-dc25-488f-8283-02eb5a931681'
  AND session_year = '2026/2027'
  LIMIT 1
)

-- 3. CREATE TERMS FOR THAT SESSION
INSERT INTO academic_terms (
  id,
  session_id,
  school_id,
  term_name,
  term_order,
  start_date,
  end_date,
  is_active,
  created_at
)
SELECT
  gen_random_uuid(),
  sd.session_id,
  '9f9bda71-dc25-488f-8283-02eb5a931681',
  term_name,
  term_order,
  start_date,
  end_date,
  CASE WHEN term_name = 'First Term' THEN true ELSE false END,
  NOW()
FROM session_data sd
CROSS JOIN (
  SELECT 'First Term' as term_name, 1 as term_order, DATE '2026-09-01' as start_date, DATE '2026-11-30' as end_date
  UNION ALL
  SELECT 'Second Term', 2, DATE '2026-12-01', DATE '2027-03-31'
  UNION ALL
  SELECT 'Third Term', 3, DATE '2027-04-01', DATE '2027-07-31'
) AS terms
ON CONFLICT DO NOTHING;

-- 4. CREATE CLASSES FOR TEST SCHOOL
INSERT INTO classes (
  id,
  school_id,
  name,
  level,
  created_at
)
VALUES 
  (gen_random_uuid(), '9f9bda71-dc25-488f-8283-02eb5a931681', 'JSS 1', 7, NOW()),
  (gen_random_uuid(), '9f9bda71-dc25-488f-8283-02eb5a931681', 'JSS 2', 8, NOW()),
  (gen_random_uuid(), '9f9bda71-dc25-488f-8283-02eb5a931681', 'JSS 3', 9, NOW())
ON CONFLICT DO NOTHING;

-- 5. CREATE ARMS FOR EACH CLASS
WITH class_data AS (
  SELECT id, name FROM classes 
  WHERE school_id = '9f9bda71-dc25-488f-8283-02eb5a931681'
)
INSERT INTO class_arm_combos (
  id,
  school_id,
  class_id,
  arm_id,
  created_at
)
SELECT
  gen_random_uuid(),
  '9f9bda71-dc25-488f-8283-02eb5a931681',
  c.id,
  a.id,
  NOW()
FROM class_data c
CROSS JOIN (
  SELECT id FROM arms WHERE school_id = '9f9bda71-dc25-488f-8283-02eb5a931681'
) a
ON CONFLICT DO NOTHING;

COMMIT;

-- After running this:
-- 1. Results page Sessions dropdown should show "2026/2027"
-- 2. Click Session → Terms dropdown should show "First Term, Second Term, Third Term"
-- 3. Click Term → Classes dropdown should show "JSS 1, JSS 2, JSS 3"
-- 4. Click Class → Arms dropdown should show available arms

-- If dropdowns still empty after this, something else is wrong with the database schema.
