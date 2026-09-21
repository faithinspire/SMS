-- ================================================================
-- DIAGNOSTIC SQL FOR ACADEMIC TERMS AND SESSIONS
-- ================================================================
-- This diagnostic file checks for data consistency issues
-- between academic_sessions and academic_terms tables

-- ================================================================
-- 1. COUNT SCHOOLS IN DATABASE
-- ================================================================
SELECT 
  COUNT(*) as total_schools,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_schools,
  COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_schools
FROM schools;

-- ================================================================
-- 2. COUNT ACADEMIC SESSIONS
-- ================================================================
SELECT 
  COUNT(*) as total_sessions,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_sessions,
  COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_sessions
FROM academic_sessions;

-- ================================================================
-- 3. COUNT ACADEMIC TERMS
-- ================================================================
SELECT 
  COUNT(*) as total_terms,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_terms,
  COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_terms
FROM academic_terms;

-- ================================================================
-- 4. SAMPLE DATA FROM ACADEMIC_TERMS
-- ================================================================
SELECT 
  id,
  session_id,
  term_name,
  term_order,
  is_active,
  start_date,
  end_date,
  created_at
FROM academic_terms
ORDER BY session_id, term_order
LIMIT 20;

-- ================================================================
-- 5. CHECK FOR MISSING FIELDS IN ACADEMIC_TERMS
-- ================================================================
SELECT 
  id,
  session_id,
  term_name,
  term_order,
  CASE 
    WHEN session_id IS NULL THEN 'MISSING: session_id'
    WHEN term_name IS NULL THEN 'MISSING: term_name'
    WHEN term_order IS NULL THEN 'MISSING: term_order'
    ELSE 'OK'
  END as data_status
FROM academic_terms
WHERE session_id IS NULL 
   OR term_name IS NULL 
   OR term_order IS NULL
LIMIT 50;

-- ================================================================
-- 6. CHECK SESSIONS AND THEIR TERM COUNTS
-- ================================================================
SELECT 
  s.id as session_id,
  s.session_year,
  s.is_active as session_active,
  COUNT(t.id) as term_count,
  STRING_AGG(t.term_name, ', ' ORDER BY t.term_order) as terms
FROM academic_sessions s
LEFT JOIN academic_terms t ON s.id = t.session_id
GROUP BY s.id, s.session_year, s.is_active
ORDER BY s.session_year DESC;

-- ================================================================
-- 7. CHECK FOR SESSIONS WITH NO TERMS (POTENTIAL ISSUE)
-- ================================================================
SELECT 
  s.id as session_id,
  s.session_year,
  s.school_id,
  s.is_active,
  COUNT(t.id) as term_count
FROM academic_sessions s
LEFT JOIN academic_terms t ON s.id = t.session_id
GROUP BY s.id, s.session_year, s.school_id, s.is_active
HAVING COUNT(t.id) = 0
ORDER BY s.session_year DESC;

-- ================================================================
-- 8. VERIFY TERM_ORDER VALUES (SHOULD BE 1, 2, 3...)
-- ================================================================
SELECT 
  session_id,
  COUNT(DISTINCT term_order) as distinct_orders,
  MIN(term_order) as min_order,
  MAX(term_order) as max_order,
  STRING_AGG(DISTINCT term_order::text, ',' ORDER BY term_order::text) as all_orders
FROM academic_terms
GROUP BY session_id
ORDER BY session_id;

-- ================================================================
-- 9. CHECK FOR DUPLICATE TERM_ORDER VALUES IN SAME SESSION
-- ================================================================
SELECT 
  session_id,
  term_order,
  COUNT(*) as count,
  STRING_AGG(id::text, ', ') as term_ids
FROM academic_terms
GROUP BY session_id, term_order
HAVING COUNT(*) > 1
ORDER BY session_id, term_order;

-- ================================================================
-- 10. SCHOOLS WITH NO SESSIONS (POTENTIAL ISSUE)
-- ================================================================
SELECT 
  s.id as school_id,
  s.name,
  s.is_active,
  COUNT(as_inner.id) as session_count
FROM schools s
LEFT JOIN academic_sessions as_inner ON s.id = as_inner.school_id
GROUP BY s.id, s.name, s.is_active
HAVING COUNT(as_inner.id) = 0
ORDER BY s.name;

-- ================================================================
-- 11. SCHOOLS WITH SESSIONS AND TERM STATUS
-- ================================================================
SELECT 
  s.id as school_id,
  s.name as school_name,
  COUNT(DISTINCT as_inner.id) as session_count,
  COUNT(DISTINCT t.id) as total_terms,
  COUNT(DISTINCT CASE WHEN t.is_active = true THEN t.id END) as active_terms
FROM schools s
LEFT JOIN academic_sessions as_inner ON s.id = as_inner.school_id
LEFT JOIN academic_terms t ON as_inner.id = t.session_id
GROUP BY s.id, s.name
ORDER BY s.name;

-- ================================================================
-- 12. DATA CONSISTENCY CHECK SUMMARY
-- ================================================================
SELECT 
  'Schools' as entity,
  COUNT(*) as count,
  'N/A' as expected_reference
FROM schools
UNION ALL
SELECT 
  'Academic Sessions' as entity,
  COUNT(*) as count,
  COUNT(DISTINCT school_id)::text as expected_reference
FROM academic_sessions
UNION ALL
SELECT 
  'Academic Terms' as entity,
  COUNT(*) as count,
  COUNT(DISTINCT session_id)::text as expected_reference
FROM academic_terms;

-- ================================================================
-- End of Diagnostic Queries
-- ================================================================
