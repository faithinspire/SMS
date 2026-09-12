-- ============================================================================
-- QUICK FIX: Populate Terms Table Directly
-- ============================================================================
-- Execute this in Supabase SQL Editor IMMEDIATELY if Migration 106 failed
-- This will populate terms for all schools so CBT creation works
-- ============================================================================

-- Step 1: Populate terms for all schools
INSERT INTO terms (id, school_id, name, session_year, start_date, end_date, is_current, created_at)
SELECT 
  gen_random_uuid(),
  s.id,
  term_name,
  2023,
  start_d,
  end_d,
  TRUE,
  NOW()
FROM schools s
CROSS JOIN (
  VALUES 
    ('First Term'::text, '2023-09-01'::date, '2023-11-30'::date),
    ('Second Term'::text, '2023-12-01'::date, '2024-02-28'::date),
    ('Third Term'::text, '2024-03-01'::date, '2024-05-31'::date)
) AS t(term_name, start_d, end_d)
WHERE NOT EXISTS (
  SELECT 1 FROM terms 
  WHERE school_id = s.id AND name = t.term_name AND session_year = 2023
)
ON CONFLICT DO NOTHING;

-- Step 2: Verify terms were created
SELECT 'Terms populated - Count by school:' as status;
SELECT school_id, COUNT(*) as term_count FROM terms GROUP BY school_id ORDER BY school_id;

-- Step 3: Show sample terms
SELECT 'Sample terms:' as status;
SELECT id, school_id, name, session_year, is_current FROM terms LIMIT 10;
