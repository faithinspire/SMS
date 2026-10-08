-- Migration 170: Complete Academic Data Population - SIMPLE VERSION
-- Only populates: Sessions (done), Terms, Classes - the 3 critical dropdowns

BEGIN;

-- ============================================================================
-- STEP 1: Populate Academic Terms (1st, 2nd, 3rd) for each session
-- ============================================================================
INSERT INTO academic_terms (school_id, session_id, name, term_number, start_date, end_date, is_active)
SELECT 
  s.school_id,
  s.id,
  CASE tn WHEN 1 THEN 'First Term' WHEN 2 THEN 'Second Term' WHEN 3 THEN 'Third Term' END,
  tn,
  MAKE_DATE(CASE WHEN tn = 2 THEN s.start_year + 1 ELSE s.start_year END, CASE WHEN tn = 1 THEN 9 WHEN tn = 2 THEN 1 ELSE 4 END, 1),
  MAKE_DATE(CASE WHEN tn = 2 THEN s.start_year + 1 ELSE s.start_year END, CASE WHEN tn = 1 THEN 12 WHEN tn = 2 THEN 3 ELSE 6 END, 28),
  FALSE
FROM academic_sessions s
CROSS JOIN (SELECT 1 AS tn UNION SELECT 2 UNION SELECT 3) t
WHERE NOT EXISTS (SELECT 1 FROM academic_terms WHERE school_id = s.school_id AND session_id = s.id AND term_number = t.tn);

-- ============================================================================
-- STEP 2: Populate Classes (CRITICAL for Results dropdown)
-- ============================================================================
INSERT INTO classes (school_id, name, level, type)
SELECT s.id, cn.name, cn.lvl, CASE WHEN cn.lvl <= 6 THEN 'SECONDARY' ELSE 'PRIMARY' END
FROM schools s, (
  VALUES 
    (1, 'JSS 1'), (2, 'JSS 2'), (3, 'JSS 3'), (4, 'SSS 1'), (5, 'SSS 2'), (6, 'SSS 3'),
    (7, 'Primary 1'), (8, 'Primary 2'), (9, 'Primary 3'), (10, 'Primary 4'), (11, 'Primary 5'), (12, 'Primary 6')
) cn(lvl, name)
WHERE s.status = 'ACTIVE' AND NOT EXISTS (SELECT 1 FROM classes c WHERE c.school_id = s.id AND c.name = cn.name);

-- ============================================================================
-- STEP 3: Results verification
-- ============================================================================
SELECT 'Sessions' as entity, school_id, COUNT(*) as count FROM academic_sessions WHERE start_year IS NOT NULL GROUP BY school_id
UNION ALL
SELECT 'Terms', school_id, COUNT(*) FROM academic_terms GROUP BY school_id
UNION ALL
SELECT 'Classes', school_id, COUNT(*) FROM classes GROUP BY school_id
ORDER BY entity, school_id;

COMMIT;
