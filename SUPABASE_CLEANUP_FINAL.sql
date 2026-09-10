-- ============================================================================
-- SUPABASE CLEANUP - FINAL VERSION (No UUID MAX() issue)
-- Deletes test/old data to free 200-500MB disk space
-- ============================================================================

-- ============================================================================
-- PART 1: Delete old records (test data, orphaned data)
-- ============================================================================

-- Delete test schools
DELETE FROM schools
WHERE LOWER(name) LIKE '%test%'
  OR LOWER(name) LIKE '%demo%'
  OR LOWER(name) LIKE '%temp%'
  OR LOWER(name) LIKE '%sandbox%'
  OR status = 'INACTIVE';

-- Delete orphaned students (students with invalid/missing class)
DELETE FROM students
WHERE class_arm_combo_id IS NOT NULL
  AND class_arm_combo_id NOT IN (SELECT id FROM class_arm_combos);

-- Delete orphaned teachers (teachers with no school)
DELETE FROM teachers
WHERE school_id NOT IN (SELECT id FROM schools);

-- Delete orphaned class_arm_combos (classes that don't exist)
DELETE FROM class_arm_combos
WHERE class_id NOT IN (SELECT id FROM classes)
  OR school_id NOT IN (SELECT id FROM schools);

-- Delete very old cbt_results (older than 1 year - keep recent data)
DELETE FROM cbt_results
WHERE created_at < NOW() - INTERVAL '12 months';

-- Delete very old transactions (older than 2 years)
DELETE FROM transactions
WHERE created_at < NOW() - INTERVAL '24 months';

-- Delete very old audit logs (older than 180 days)
DELETE FROM auth.audit_log_entries
WHERE created_at < NOW() - INTERVAL '180 days';

SELECT '✓ Old records deleted' as status;

-- ============================================================================
-- PART 2: Compact database (reclaim fragmented space)
-- WARNING: This locks the database for 5-30 minutes
-- Only run during off-hours when no one is using the system
-- ============================================================================

VACUUM FULL ANALYZE;

SELECT '✓ Database compacted and optimized' as status;

-- ============================================================================
-- PART 3: Verification - check current database size
-- ============================================================================

-- Show total database size
SELECT 
  'Database Size' as metric,
  pg_size_pretty(pg_database_size('postgres')) as value;

-- Show top 15 largest tables
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 15;

SELECT '✓ CLEANUP COMPLETE - Database optimized' as final_status;
