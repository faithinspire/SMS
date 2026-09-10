-- ============================================================================
-- Migration 020: Insert Test Terms for Schools
-- ============================================================================
-- This migration creates test terms for each school so that the results
-- page has data to load. Without terms, the results page won't work properly.
-- ============================================================================

-- Insert terms for the main test school (Faith Inspire Academy)
INSERT INTO terms (id, school_id, name, start_date, end_date, is_active, created_at)
SELECT 
  gen_random_uuid(),
  '18459a61-7e93-494c-b951-6cef5d589a88'::UUID,
  name,
  start_date,
  end_date,
  is_active,
  NOW()
FROM (
  VALUES 
    ('Term 1 2024', '2024-01-15'::DATE, '2024-04-15'::DATE, TRUE),
    ('Term 2 2024', '2024-05-01'::DATE, '2024-08-15'::DATE, FALSE),
    ('Term 3 2024', '2024-09-01'::DATE, '2024-12-15'::DATE, FALSE),
    ('Term 1 2025', '2025-01-15'::DATE, '2025-04-15'::DATE, TRUE),
    ('Term 2 2025', '2025-05-01'::DATE, '2025-08-15'::DATE, FALSE)
) AS data(name, start_date, end_date, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM terms 
  WHERE school_id = '18459a61-7e93-494c-b951-6cef5d589a88'::UUID 
  LIMIT 1
);

-- Also insert terms for any other schools that might be created later
-- For each school without terms, create a default set
INSERT INTO terms (id, school_id, name, start_date, end_date, is_active, created_at)
SELECT 
  gen_random_uuid(),
  s.id,
  data.name,
  data.start_date,
  data.end_date,
  data.is_active,
  NOW()
FROM schools s
CROSS JOIN (
  VALUES 
    ('Term 1 2024', '2024-01-15'::DATE, '2024-04-15'::DATE, TRUE),
    ('Term 2 2024', '2024-05-01'::DATE, '2024-08-15'::DATE, FALSE),
    ('Term 3 2024', '2024-09-01'::DATE, '2024-12-15'::DATE, FALSE),
    ('Term 1 2025', '2025-01-15'::DATE, '2025-04-15'::DATE, TRUE),
    ('Term 2 2025', '2025-05-01'::DATE, '2025-08-15'::DATE, FALSE)
) AS data(name, start_date, end_date, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM terms 
  WHERE school_id = s.id 
  LIMIT 1
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Verification Queries (Run to verify)
-- ============================================================================

-- Check how many terms exist per school
-- SELECT 
--   school_id,
--   COUNT(*) as term_count,
--   SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_terms
-- FROM terms
-- GROUP BY school_id;

-- View all terms
-- SELECT name, start_date, end_date, is_active FROM terms ORDER BY start_date DESC LIMIT 10;

-- View terms for specific school
-- SELECT name, start_date, end_date, is_active 
-- FROM terms 
-- WHERE school_id = '18459a61-7e93-494c-b951-6cef5d589a88'::UUID
-- ORDER BY start_date DESC;

