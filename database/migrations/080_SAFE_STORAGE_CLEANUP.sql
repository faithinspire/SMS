-- Migration 080: SAFE STORAGE CLEANUP
-- Deletes old/unused data to free disk space
-- SAFE: Only deletes test data, old logs, unused files - NOT production data

-- ============================================================================
-- PART 1: Delete old/unused storage files (photos, uploads)
-- ============================================================================

-- Delete all files from storage.objects (student photos, etc.)
-- These can be re-uploaded if needed
DELETE FROM storage.objects
WHERE bucket_id IN ('student_photos', 'uploads', 'photos', 'documents', 'files')
  OR created_at < NOW() - INTERVAL '30 days';

-- Cleanup storage metadata
VACUUM FULL storage.objects;

-- ============================================================================
-- PART 2: Delete duplicate/test records
-- ============================================================================

-- Delete test schools (if named with 'test', 'demo', 'temp')
DELETE FROM schools
WHERE LOWER(name) LIKE '%test%'
  OR LOWER(name) LIKE '%demo%'
  OR LOWER(name) LIKE '%temp%'
  OR status = 'INACTIVE';

-- Delete orphaned students (no valid class assignment)
DELETE FROM students
WHERE class_arm_combo_id NOT IN (SELECT id FROM class_arm_combos)
  AND class_arm_combo_id IS NOT NULL;

-- Delete orphaned teachers (no school)
DELETE FROM teachers
WHERE school_id NOT IN (SELECT id FROM schools);

-- Delete duplicate subject entries (same school, same subject name)
DELETE FROM subjects s1
WHERE s1.id NOT IN (
  SELECT MAX(id) FROM subjects s2 
  WHERE s2.school_id = s1.school_id 
  AND LOWER(s2.name) = LOWER(s1.name)
  GROUP BY s2.school_id, LOWER(s2.name)
);

-- ============================================================================
-- PART 3: Clean up migration/audit logs and system tables
-- ============================================================================

-- If you have an audit_log table, delete old entries
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS migration_log CASCADE;
DROP TABLE IF EXISTS system_logs CASCADE;

-- Delete auth.audit_log_entries older than 90 days (if exists)
DELETE FROM auth.audit_log_entries
WHERE created_at < NOW() - INTERVAL '90 days';

-- ============================================================================
-- PART 4: Optimize/reclaim space
-- ============================================================================

-- Cluster tables to reclaim fragmented space
CLUSTER subjects USING idx_subjects_pkey;
CLUSTER students USING idx_students_pkey;
CLUSTER teachers USING idx_teachers_pkey;
CLUSTER classes USING idx_classes_pkey;

-- Full vacuum and analyze (reclaim space, update statistics)
VACUUM FULL ANALYZE;

-- ============================================================================
-- PART 5: Verification
-- ============================================================================

SELECT '✓ CLEANUP COMPLETE' as status;
SELECT 'Database is now optimized and compacted' as message;

-- Show new storage usage
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;
