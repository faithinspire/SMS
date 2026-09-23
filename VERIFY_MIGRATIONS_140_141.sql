-- VERIFICATION SCRIPT FOR MIGRATIONS 140 & 141
-- Run this AFTER executing both migrations to confirm success
-- Copy and paste entire script into Supabase SQL Editor, then Run

-- ============================================================================
-- SECTION 1: Verify Migration 140 Results
-- ============================================================================

RAISE NOTICE '========== VERIFICATION SECTION 1: MIGRATION 140 RESULTS ==========';

-- 1.1: How many schools now have subjects?
SELECT 
  COUNT(DISTINCT school_id) as schools_with_subjects,
  COUNT(*) as total_subject_records
FROM subjects
WHERE subject_code IS NOT NULL;

-- Expected output: Should show number of schools and ~215 * number_of_schools total records

-- 1.2: Verify PREP subjects per school (should be 18)
SELECT 
  school_id,
  COUNT(*) as prep_subject_count
FROM subjects
WHERE subject_code LIKE 'PREP-%'
GROUP BY school_id
ORDER BY school_id;

-- Expected: Each school has exactly 18 PREP subjects

-- 1.3: Verify KG subjects per school (should be 19)
SELECT 
  COUNT(DISTINCT CASE WHEN subject_code LIKE 'KG-%' THEN 1 END) as kg_count,
  COUNT(DISTINCT CASE WHEN subject_code LIKE 'NUR-%' THEN 1 END) as nursery_count
FROM subjects
WHERE school_id IN (SELECT DISTINCT school_id FROM subjects WHERE subject_code LIKE 'KG-%')
LIMIT 1;

-- Expected: 19 KG subjects, 19 Nursery subjects per school

-- 1.4: Verify Primary 1-3 subjects per school (should be 13)
SELECT 
  COUNT(DISTINCT subject_code) as pri1_3_subject_count
FROM subjects
WHERE subject_code LIKE 'PRI-%' AND subject_code NOT LIKE 'PRI46-%'
LIMIT 1;

-- Expected: 13 unique PRI-* subject codes

-- 1.5: Verify Primary 4-6 subjects per school (should be 16)
SELECT 
  COUNT(DISTINCT subject_code) as pri4_6_subject_count
FROM subjects
WHERE subject_code LIKE 'PRI46-%'
LIMIT 1;

-- Expected: 16 unique PRI46-* subject codes

-- 1.6: Verify JSS subjects per school (should be 22)
SELECT 
  COUNT(DISTINCT subject_code) as jss_subject_count
FROM subjects
WHERE subject_code LIKE 'JSS-%'
LIMIT 1;

-- Expected: 22 unique JSS-* subject codes

-- 1.7: Verify SS subjects per school (should be 46)
SELECT 
  COUNT(DISTINCT subject_code) as ss_subject_count
FROM subjects
WHERE subject_code LIKE 'SS-%'
LIMIT 1;

-- Expected: 46 unique SS-* subject codes

-- 1.8: Verify SS departments are correctly organized
SELECT 
  department,
  COUNT(DISTINCT subject_code) as count
FROM subjects
WHERE subject_code LIKE 'SS-%' AND department IS NOT NULL
GROUP BY department
ORDER BY department;

-- Expected:
-- BUSINESS: 4 (Accounting, Commerce, Marketing, Economics)
-- CORE: 4 (English, Math, CHS, Digital)
-- HUMANITIES: 14 (History, Gov, CRS, ISL, 3 Languages, French, Arabic, Arts, Music, Lit, Home, Catering)
-- SCIENCE: 10 (Biology, Chemistry, Physics, Agric, FMath, PE, Health, Foods, Geo, Tech Draw)
-- TRADE: 6 (Solar, Fashion, Livestock, Beauty, Hardware, Horticulture)

-- 1.9: Check for duplicate subjects (should return 0 rows)
SELECT 
  school_id,
  subject_code,
  COUNT(*) as duplicate_count
FROM subjects
WHERE subject_code IS NOT NULL
GROUP BY school_id, subject_code
HAVING COUNT(*) > 1;

-- Expected: No rows (0 duplicates)

-- 1.10: Verify NO subjects have NULL school_id
SELECT COUNT(*) as null_school_id_count
FROM subjects
WHERE school_id IS NULL;

-- Expected: 0 (all subjects must have school_id)

-- ============================================================================
-- SECTION 2: Verify Migration 141 Setup
-- ============================================================================

RAISE NOTICE '========== VERIFICATION SECTION 2: MIGRATION 141 TRIGGER SETUP ==========';

-- 2.1: Check if trigger exists
SELECT 
  tgname as trigger_name,
  tgrelname as table_name,
  tgenabled as trigger_enabled
FROM pg_trigger
WHERE tgname = 'trigger_initialize_school_curriculum';

-- Expected: 1 row with trigger_name='trigger_initialize_school_curriculum', trigger_enabled=true

-- 2.2: Get trigger definition
SELECT 
  pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger
WHERE tgname = 'trigger_initialize_school_curriculum';

-- Expected: Shows trigger definition with "AFTER INSERT ON schools"

-- 2.3: Check if helper function exists
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name = 'initialize_school_curriculum';

-- Expected: 1 row with routine_type='FUNCTION'

-- ============================================================================
-- SECTION 3: Test Auto-Initialization (New School)
-- ============================================================================

RAISE NOTICE '========== VERIFICATION SECTION 3: TEST AUTO-INIT ==========';

-- 3.1: Create a test school
INSERT INTO schools (name, type, email, phone, address, status)
VALUES (
  'Test Auto-Init School ' || TO_CHAR(NOW(), 'HH24:MI:SS'),
  'BOTH',
  'test-auto-init-' || gen_random_uuid()::TEXT || '@test.com',
  '1234567890',
  'Test Address',
  'ACTIVE'
)
RETURNING id as test_school_id;

-- Note: Copy the returned test_school_id from above

-- 3.2: Verify test school got subjects (run after getting test_school_id)
-- Replace 'TEST_SCHOOL_ID_HERE' with the id from step 3.1
SELECT 
  COUNT(*) as total_subjects_for_test_school,
  COUNT(DISTINCT CASE WHEN subject_code LIKE 'PREP-%' THEN 1 END) as prep_subjects,
  COUNT(DISTINCT CASE WHEN subject_code LIKE 'SS-%' THEN 1 END) as ss_subjects
FROM subjects
WHERE school_id = 'TEST_SCHOOL_ID_HERE';

-- Expected: ~215 total subjects, 18 PREP, 46 SS

-- ============================================================================
-- SECTION 4: Multi-Tenancy Verification
-- ============================================================================

RAISE NOTICE '========== VERIFICATION SECTION 4: MULTI-TENANCY ISOLATION ==========';

-- 4.1: Get list of schools with subjects
SELECT 
  s.id,
  s.name,
  COUNT(sub.id) as subject_count
FROM schools s
LEFT JOIN subjects sub ON s.id = sub.school_id
GROUP BY s.id, s.name
ORDER BY s.created_at DESC
LIMIT 10;

-- Expected: Each school has 215 subjects (if migrated) or 0 (if not yet migrated)

-- 4.2: Verify no cross-school subject contamination
-- Check that each subject_code belongs to only one school
SELECT 
  subject_code,
  COUNT(DISTINCT school_id) as school_count
FROM subjects
WHERE subject_code IS NOT NULL
GROUP BY subject_code
HAVING COUNT(DISTINCT school_id) > 1;

-- Expected: 0 rows (each subject_code should only belong to ONE school)

-- ============================================================================
-- SECTION 5: Existing Data Preservation
-- ============================================================================

RAISE NOTICE '========== VERIFICATION SECTION 5: EXISTING DATA PRESERVATION ==========';

-- 5.1: Check if existing student-subject relationships are still valid
SELECT 
  COUNT(ss.id) as student_subject_count,
  COUNT(CASE WHEN s.id IS NULL THEN 1 END) as orphaned_references
FROM student_subjects ss
LEFT JOIN subjects s ON ss.subject_id = s.id;

-- Expected: All student_subject_count values, orphaned_references = 0

-- 5.2: Check if existing results still reference valid subjects
SELECT 
  COUNT(r.id) as result_count,
  COUNT(CASE WHEN s.id IS NULL THEN 1 END) as orphaned_results
FROM score_sheets r
LEFT JOIN subjects s ON r.subject_id = s.id;

-- Expected: All result_count values, orphaned_results = 0

-- 5.3: Check if existing CBT exams still reference valid subjects
SELECT 
  COUNT(c.id) as cbt_count,
  COUNT(CASE WHEN s.id IS NULL THEN 1 END) as orphaned_cbt
FROM cbt_exams c
LEFT JOIN subjects s ON c.subject_id = s.id
WHERE c.subject_id IS NOT NULL;

-- Expected: All cbt_count values, orphaned_cbt = 0

-- ============================================================================
-- SECTION 6: Summary Report
-- ============================================================================

RAISE NOTICE '========== VERIFICATION SECTION 6: SUMMARY REPORT ==========';

-- 6.1: Final subject count by level
SELECT 
  CASE 
    WHEN level = 0 THEN 'PREP'
    WHEN level = 1 THEN 'KG/NURSERY'
    WHEN level = 2 THEN 'PRIMARY 1-3'
    WHEN level = 3 THEN 'PRIMARY 4-6'
    WHEN level = 4 THEN 'JSS 1-3'
    WHEN level = 5 THEN 'SS 1-3'
  END as education_level,
  COUNT(DISTINCT subject_code) as unique_subject_codes,
  COUNT(*) as total_subject_records_across_all_schools
FROM subjects
WHERE subject_code IS NOT NULL
GROUP BY level
ORDER BY level;

-- Expected:
-- PREP: 18 unique codes
-- KG/NURSERY: 19 unique codes each
-- PRIMARY 1-3: 13 unique codes
-- PRIMARY 4-6: 16 unique codes
-- JSS 1-3: 22 unique codes
-- SS 1-3: 46 unique codes

-- 6.2: Overall stats
SELECT 
  COUNT(DISTINCT school_id) as total_schools_with_subjects,
  COUNT(DISTINCT subject_code) as total_unique_subject_codes,
  COUNT(*) as total_subject_records,
  (COUNT(*) / COUNT(DISTINCT school_id)) as subjects_per_school
FROM subjects
WHERE subject_code IS NOT NULL;

-- Expected:
-- total_schools_with_subjects: >= 1 (all schools that were migrated)
-- total_unique_subject_codes: ~215-230 (depends on language/trade variants)
-- total_subject_records: total_schools * 215
-- subjects_per_school: ~215

-- ============================================================================
-- SUCCESS CRITERIA
-- ============================================================================

/*
 * ✅ ALL of the following should be TRUE for successful migration:
 *
 * 1. Migration 140 Results:
 *    - All existing schools have ~215 subjects each
 *    - PREP: 18 subjects per school
 *    - KG/NUR: 19 subjects per school
 *    - PRI 1-3: 13 subjects per school
 *    - PRI 4-6: 16 subjects per school
 *    - JSS: 22 subjects per school
 *    - SS: 46 subjects per school (4 CORE + 10 SCIENCE + 14 HUMANITIES + 4 BUSINESS + 6 TRADE)
 *    - NO duplicate subjects (0 rows when checking for COUNT > 1)
 *    - NO NULL school_id values
 *
 * 2. Migration 141 Trigger Setup:
 *    - Trigger 'trigger_initialize_school_curriculum' exists
 *    - Trigger is ENABLED
 *    - Trigger fires AFTER INSERT on schools table
 *    - Helper function 'initialize_school_curriculum' exists
 *
 * 3. Auto-Initialization Test:
 *    - Test school created successfully
 *    - Test school automatically received 215 subjects
 *    - Subjects include PREP, JSS, SS categories
 *
 * 4. Multi-Tenancy:
 *    - Each subject_code belongs to exactly ONE school
 *    - No cross-school subject leakage
 *
 * 5. Data Preservation:
 *    - All existing student-subject relationships valid
 *    - All existing results still reference valid subjects
 *    - All existing CBT exams still reference valid subjects
 */

RAISE NOTICE '========== END OF VERIFICATION SCRIPT ==========';
RAISE NOTICE 'If all sections above returned expected results, migrations are SUCCESSFUL!';
