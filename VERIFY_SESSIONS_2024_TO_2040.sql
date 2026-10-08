-- Verify Sessions 2024-2040 Created Successfully

SELECT 
  school_id,
  COUNT(*) as total_sessions,
  MIN(start_year) as earliest_year,
  MAX(start_year) as latest_year,
  COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_sessions
FROM academic_sessions
GROUP BY school_id
ORDER BY school_id;

-- Show sample of sessions for first school
SELECT 
  session_year,
  start_year,
  end_year,
  is_active
FROM academic_sessions
WHERE school_id = (SELECT id FROM schools LIMIT 1)
ORDER BY start_year ASC;

-- Count total sessions across all schools
SELECT COUNT(*) as total_sessions_in_db FROM academic_sessions;

