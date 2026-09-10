-- ============================================================================
-- SUPABASE CLEANUP - MINIMAL VERSION
-- Only deletes from tables that definitely exist
-- ============================================================================

-- ============================================================================
-- PART 1: Delete orphaned records (safe, minimal)
-- ============================================================================

-- Delete orphaned students (students with invalid class assignment)
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

-- Delete test schools (if any)
DELETE FROM schools
WHERE LOWER(name) LIKE '%test%'
  OR LOWER(name) LIKE '%demo%'
  OR status = 'INACTIVE';

SELECT '✓ Orphaned records deleted' as status;

-- ============================================================================
-- PART 2: Delete old audit logs (safe)
-- ============================================================================

-- Delete very old audit logs (older than 180 days)
DELETE FROM auth.audit_log_entries
WHERE created_at < NOW() - INTERVAL '180 days';

SELECT '✓ Old audit logs deleted' as status;

-- ============================================================================
-- PART 3: Compact database (CRITICAL - this is what saves the most space)
-- WARNING: Database locked for 5-30 minutes during VACUUM FULL
-- ============================================================================
-- NOTE: VACUUM must run outside a transaction block
-- Run this separately in Supabase SQL Editor:
-- 
-- VACUUM FULL ANALYZE;
--
-- Or use psql from terminal:
-- psql -h [host] -U [user] -d [database] -c "VACUUM FULL ANALYZE;"

SELECT '✓ Skipping VACUUM - run separately outside transaction' as status;

-- ============================================================================
-- VERIFICATION: Show current database size
-- ============================================================================

SELECT 
  'Database Size' as metric,
  pg_size_pretty(pg_database_size('postgres')) as value;

-- Show what tables are using space
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 15;

SELECT '✓ CLEANUP COMPLETE' as final_status;
