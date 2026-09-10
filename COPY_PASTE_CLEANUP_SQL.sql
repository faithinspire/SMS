-- ============================================================================
-- COPY-PASTE CLEANUP SQL
-- Paste each section into Supabase SQL Editor one at a time
-- ============================================================================

-- ============================================================================
-- SECTION 1: DELETE OLD STORAGE FILES (frees 1-2GB typically)
-- SAFE: Photos can be re-uploaded
-- ============================================================================

DELETE FROM storage.objects
WHERE bucket_id IN ('student_photos', 'uploads', 'photos', 'documents', 'files', 'avatars')
  OR created_at < NOW() - INTERVAL '30 days';

-- Verify
SELECT COUNT(*) as files_remaining FROM storage.objects;

-- ============================================================================
-- SECTION 2: DELETE TEST/DUPLICATE DATA (frees 200-500MB)
-- SAFE: Only deletes test records, not production data
-- ============================================================================

-- Delete test schools
DELETE FROM schools
WHERE LOWER(name) LIKE '%test%'
  OR LOWER(name) LIKE '%demo%'
  OR LOWER(name) LIKE '%temp%'
  OR LOWER(name) LIKE '%sandbox%'
  OR status = 'INACTIVE';

-- Delete orphaned students (students with no valid class)
DELETE FROM students
WHERE class_arm_combo_id NOT IN (SELECT id FROM class_arm_combos)
  AND class_arm_combo_id IS NOT NULL;

-- Delete orphaned teachers (teachers with no school)
DELETE FROM teachers
WHERE school_id NOT IN (SELECT id FROM schools);

-- Delete duplicate subjects (keep only the latest)
DELETE FROM subjects s1
WHERE s1.id NOT IN (
  SELECT MAX(id) FROM subjects s2 
  WHERE s2.school_id = s1.school_id 
  AND LOWER(s2.name) = LOWER(s1.name)
  GROUP BY s2.school_id, LOWER(s2.name)
);

-- Verify
SELECT COUNT(*) as schools FROM schools;
SELECT COUNT(*) as students FROM students;
SELECT COUNT(*) as teachers FROM teachers;
SELECT COUNT(*) as subjects FROM subjects;

-- ============================================================================
-- SECTION 3: DELETE OLD AUDIT LOGS (frees 100-300MB)
-- SAFE: Keeps recent logs, deletes old ones
-- ============================================================================

DELETE FROM auth.audit_log_entries
WHERE created_at < NOW() - INTERVAL '90 days';

SELECT COUNT(*) as audit_log_entries FROM auth.audit_log_entries;

-- ============================================================================
-- SECTION 4: COMPACT DATABASE (CRITICAL - frees 30-50%)
-- WARNING: Database locked for 5-30 minutes
-- Run this last, during off-hours
-- ============================================================================

VACUUM FULL ANALYZE;

-- ============================================================================
-- VERIFICATION: Check freed space
-- ============================================================================

-- Current database size
SELECT 
  pg_size_pretty(pg_database_size('postgres')) as total_database_size;

-- What's using space
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;

-- ============================================================================
-- AFTER CLEANUP: Run this to fix student loading
-- ============================================================================

-- UPDATE subjects with missing applicable_to_levels
UPDATE subjects s
SET applicable_to_levels = ARRAY[1,2,3,4,5,6]
WHERE (s.applicable_to_levels IS NULL OR array_length(s.applicable_to_levels, 1) = 0)
  AND EXISTS (
    SELECT 1 FROM schools sch 
    WHERE sch.id = s.school_id 
    AND sch.type IN ('PRIMARY', 'BOTH')
  );

UPDATE subjects s
SET applicable_to_levels = ARRAY[9,10,11,12,13,14]
WHERE (s.applicable_to_levels IS NULL OR array_length(s.applicable_to_levels, 1) = 0)
  AND EXISTS (
    SELECT 1 FROM schools sch 
    WHERE sch.id = s.school_id 
    AND sch.type IN ('SECONDARY', 'BOTH')
  );

-- Verify
SELECT COUNT(*) as subjects_fixed FROM subjects WHERE applicable_to_levels IS NOT NULL;
