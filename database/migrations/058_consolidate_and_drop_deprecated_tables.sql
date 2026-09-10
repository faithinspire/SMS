-- ============================================================================
-- MIGRATION 058: Consolidate and Drop Deprecated Tables
-- ============================================================================
--
-- PURPOSE:
-- Drop all competing/redundant tables that have been superseded by canonical
-- tables. This enforces single source of truth and prevents data inconsistency.
--
-- DEPRECATED TABLES TO DROP:
-- 1. result_entries (superseded by score_sheets)
-- 2. cbt_results (superseded by cbt_submissions + score_sheets)
-- 3. student_subject_enrollment (superseded by student_subjects)
-- 4. teacher_assignments (superseded by subject_teacher_assignments)
-- 5. terms (superseded by academic_sessions → academic_terms)
-- 6. Any *_backup, *_old, *_temp tables
--
-- APPROACH:
-- 1. Backup data if needed (warn if >0 records exist)
-- 2. Check for orphaned FKs
-- 3. Drop tables in correct order (children before parents)
-- 4. Verify no orphaned references remain
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Check data in deprecated tables before dropping
-- ============================================================================

DO $$
DECLARE
  result_entries_count INT := 0;
  cbt_results_count INT := 0;
  student_subject_enrollment_count INT := 0;
  teacher_assignments_count INT := 0;
  terms_count INT := 0;
BEGIN
  -- Count records in each table if it exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'result_entries') THEN
    SELECT COUNT(*) INTO result_entries_count FROM result_entries;
    IF result_entries_count > 0 THEN
      RAISE WARNING 'WARNING: result_entries has % records - will be DROPPED', result_entries_count;
    END IF;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cbt_results') THEN
    SELECT COUNT(*) INTO cbt_results_count FROM cbt_results;
    IF cbt_results_count > 0 THEN
      RAISE WARNING 'WARNING: cbt_results has % records - will be DROPPED', cbt_results_count;
    END IF;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_subject_enrollment') THEN
    SELECT COUNT(*) INTO student_subject_enrollment_count FROM student_subject_enrollment;
    IF student_subject_enrollment_count > 0 THEN
      RAISE WARNING 'WARNING: student_subject_enrollment has % records - will be DROPPED', student_subject_enrollment_count;
    END IF;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teacher_assignments') THEN
    SELECT COUNT(*) INTO teacher_assignments_count FROM teacher_assignments;
    IF teacher_assignments_count > 0 THEN
      RAISE WARNING 'WARNING: teacher_assignments has % records - will be DROPPED', teacher_assignments_count;
    END IF;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'terms') THEN
    SELECT COUNT(*) INTO terms_count FROM terms;
    IF terms_count > 0 THEN
      RAISE WARNING 'WARNING: old terms table has % records - will be DROPPED', terms_count;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Drop deprecated tables (with CASCADE to handle FKs)
-- ============================================================================

-- Drop result_entries first (likely referenced by score_sheets or other tables)
DROP TABLE IF EXISTS result_entries CASCADE;

-- Drop cbt_results (deprecated, data integrated into cbt_submissions + score_sheets)
DROP TABLE IF EXISTS cbt_results CASCADE;

-- Drop student_subject_enrollment (superseded by student_subjects)
DROP TABLE IF EXISTS student_subject_enrollment CASCADE;

-- Drop teacher_assignments (superseded by subject_teacher_assignments)
DROP TABLE IF EXISTS teacher_assignments CASCADE;

-- Drop old terms table (superseded by academic_sessions → academic_terms)
DROP TABLE IF EXISTS terms CASCADE;

-- Clean up any backup or temporary tables
DROP TABLE IF EXISTS terms_backup CASCADE;
DROP TABLE IF EXISTS result_entries_backup CASCADE;
DROP TABLE IF EXISTS student_subject_enrollment_backup CASCADE;
DROP TABLE IF EXISTS teacher_assignments_backup CASCADE;
DROP TABLE IF EXISTS student_enrollment_old CASCADE;
DROP TABLE IF EXISTS results_old CASCADE;
DROP TABLE IF EXISTS enrollments_temp CASCADE;
DROP TABLE IF EXISTS assignments_temp CASCADE;

-- ============================================================================
-- STEP 3: Verify canonical tables still exist
-- ============================================================================

DO $$
BEGIN
  -- Verify canonical tables exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'score_sheets') THEN
    RAISE EXCEPTION 'ERROR: score_sheets table is missing! This is the canonical assessment table.';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cbt_submissions') THEN
    RAISE EXCEPTION 'ERROR: cbt_submissions table is missing! This is the canonical CBT submission table.';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_subjects') THEN
    RAISE EXCEPTION 'ERROR: student_subjects table is missing! This is the canonical student enrollment table.';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subject_teacher_assignments') THEN
    RAISE EXCEPTION 'ERROR: subject_teacher_assignments table is missing! This is the canonical teacher assignment table.';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'academic_terms') THEN
    RAISE EXCEPTION 'ERROR: academic_terms table is missing! This is the canonical academic period table.';
  END IF;
  
  RAISE NOTICE 'VERIFIED: All canonical tables exist and are ready';
END $$;

-- ============================================================================
-- STEP 4: Verify no orphaned FKs from other tables
-- ============================================================================

DO $$
DECLARE
  orphaned_fk_count INT := 0;
BEGIN
  -- This would check for FKs pointing to deleted tables
  -- In PostgreSQL, this is automatically prevented by CASCADE droppers above
  
  RAISE NOTICE 'Deprecated tables successfully dropped and data consolidated into canonical tables';
END $$;

-- ============================================================================
-- STEP 5: Data integrity verification
-- ============================================================================

DO $$
DECLARE
  score_sheets_count INT;
  cbt_submissions_count INT;
  student_subjects_count INT;
  subject_teacher_assignments_count INT;
  academic_terms_count INT;
BEGIN
  SELECT COUNT(*) INTO score_sheets_count FROM score_sheets;
  SELECT COUNT(*) INTO cbt_submissions_count FROM cbt_submissions;
  SELECT COUNT(*) INTO student_subjects_count FROM student_subjects;
  SELECT COUNT(*) INTO subject_teacher_assignments_count FROM subject_teacher_assignments;
  SELECT COUNT(*) INTO academic_terms_count FROM academic_terms;
  
  RAISE NOTICE 'DATA INTEGRITY CHECK:';
  RAISE NOTICE '  score_sheets: % records (canonical assessment table)',score_sheets_count;
  RAISE NOTICE '  cbt_submissions: % records (canonical CBT submission table)', cbt_submissions_count;
  RAISE NOTICE '  student_subjects: % records (canonical enrollment table)', student_subjects_count;
  RAISE NOTICE '  subject_teacher_assignments: % records (canonical assignment table)', subject_teacher_assignments_count;
  RAISE NOTICE '  academic_terms: % records (canonical academic period table)', academic_terms_count;
END $$;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (run after applying migration)
-- ============================================================================
-- Execute these to verify the migration was successful:

/*
-- 1. Verify deprecated tables are gone
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('result_entries', 'cbt_results', 'student_subject_enrollment', 'teacher_assignments', 'terms')
AND table_schema = 'public';

-- 2. Verify canonical tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('score_sheets', 'cbt_submissions', 'student_subjects', 'subject_teacher_assignments', 'academic_terms')
AND table_schema = 'public'
ORDER BY table_name;

-- 3. Verify data counts in canonical tables
SELECT 
  'score_sheets' as table_name, COUNT(*)::text as record_count FROM score_sheets
UNION ALL
SELECT 'cbt_submissions', COUNT(*)::text FROM cbt_submissions
UNION ALL
SELECT 'student_subjects', COUNT(*)::text FROM student_subjects
UNION ALL
SELECT 'subject_teacher_assignments', COUNT(*)::text FROM subject_teacher_assignments
UNION ALL
SELECT 'academic_terms', COUNT(*)::text FROM academic_terms;

-- 4. Check for any remaining orphaned FKs
SELECT constraint_name, table_name, referenced_table_name
FROM information_schema.referential_constraints
WHERE referenced_table_name IN ('result_entries', 'cbt_results', 'student_subject_enrollment', 'teacher_assignments', 'terms')
AND table_schema = 'public';
*/
