-- Migration 119: Check if Score Sheet Data is Saving
-- Diagnostic migration to verify scores are actually being saved to score_sheets table

BEGIN;

-- ============================================================================
-- PHASE 1: CHECK IF SCORE_SHEETS TABLE HAS ANY DATA
-- ============================================================================

DO $$
DECLARE
  total_count INTEGER;
  test1_count INTEGER;
  test2_count INTEGER;
  test3_count INTEGER;
  test4_count INTEGER;
  exam_count INTEGER;
  schools_count INTEGER;
  students_count INTEGER;
  subjects_count INTEGER;
  terms_count INTEGER;
BEGIN
  -- Count total records
  SELECT COUNT(*) INTO total_count FROM score_sheets;
  SELECT COUNT(*) INTO test1_count FROM score_sheets WHERE test1 IS NOT NULL;
  SELECT COUNT(*) INTO test2_count FROM score_sheets WHERE test2 IS NOT NULL;
  SELECT COUNT(*) INTO test3_count FROM score_sheets WHERE test3 IS NOT NULL;
  SELECT COUNT(*) INTO test4_count FROM score_sheets WHERE test4 IS NOT NULL;
  SELECT COUNT(*) INTO exam_count FROM score_sheets WHERE exam IS NOT NULL;
  SELECT COUNT(*) INTO schools_count FROM schools;
  SELECT COUNT(*) INTO students_count FROM students;
  SELECT COUNT(*) INTO subjects_count FROM subjects;
  SELECT COUNT(*) INTO terms_count FROM academic_terms;
  
  RAISE NOTICE '';
  RAISE NOTICE '====== SCORE SHEET DATA DIAGNOSTIC ======';
  RAISE NOTICE 'Total score_sheets records: %', total_count;
  RAISE NOTICE '  - With test1 populated: %', test1_count;
  RAISE NOTICE '  - With test2 populated: %', test2_count;
  RAISE NOTICE '  - With test3 populated: %', test3_count;
  RAISE NOTICE '  - With test4 populated: %', test4_count;
  RAISE NOTICE '  - With exam populated: %', exam_count;
  RAISE NOTICE '';
  RAISE NOTICE 'System totals:';
  RAISE NOTICE '  - Schools: %', schools_count;
  RAISE NOTICE '  - Students: %', students_count;
  RAISE NOTICE '  - Subjects: %', subjects_count;
  RAISE NOTICE '  - Terms: %', terms_count;
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- If no score_sheets, give guidance
  IF total_count = 0 THEN
    RAISE NOTICE 'ACTION REQUIRED: No scores found in score_sheets table';
    RAISE NOTICE 'Scores must be entered via /teacher/score-sheet page';
    RAISE NOTICE 'After entering scores, they should appear in score_sheets table';
  ELSE
    RAISE NOTICE 'SUCCESS: Score sheets found. Scores are being saved.';
    IF test1_count > 0 OR test2_count > 0 OR test3_count > 0 OR test4_count > 0 OR exam_count > 0 THEN
      RAISE NOTICE 'SUCCESS: Populated scores detected in table.';
    ELSE
      RAISE NOTICE 'WARNING: Score sheets exist but no populated scores. Check if form is saving values correctly.';
    END IF;
  END IF;
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- PHASE 2: SAMPLE DATA CHECK
-- ============================================================================

DO $$
DECLARE
  sample_record RECORD;
  sample_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO sample_count FROM score_sheets;
  
  IF sample_count > 0 THEN
    RAISE NOTICE 'Sample score_sheet record:';
    FOR sample_record IN
      SELECT 
        id,
        student_id,
        subject_id,
        test1,
        test2,
        test3,
        test4,
        exam,
        total,
        grade,
        test1_source,
        term_id,
        created_at
      FROM score_sheets
      LIMIT 1
    LOOP
      RAISE NOTICE '  ID: %', sample_record.id;
      RAISE NOTICE '  Student: %', sample_record.student_id;
      RAISE NOTICE '  Subject: %', sample_record.subject_id;
      RAISE NOTICE '  Scores: Test1=% Test2=% Test3=% Test4=% Exam=%', 
        sample_record.test1, sample_record.test2, sample_record.test3, 
        sample_record.test4, sample_record.exam;
      RAISE NOTICE '  Total: % Grade: %', sample_record.total, sample_record.grade;
      RAISE NOTICE '  Test1 Source: %', sample_record.test1_source;
      RAISE NOTICE '  Term ID: %', sample_record.term_id;
      RAISE NOTICE '  Created: %', sample_record.created_at;
    END LOOP;
  ELSE
    RAISE NOTICE 'No sample records found.';
  END IF;
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- PHASE 3: VERIFY ACADEMIC TERMS EXIST
-- ============================================================================

DO $$
DECLARE
  term_count INTEGER;
  session_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO term_count FROM academic_terms;
  SELECT COUNT(*) INTO session_count FROM academic_sessions;
  
  RAISE NOTICE 'Academic structure check:';
  RAISE NOTICE '  Academic Sessions: %', session_count;
  RAISE NOTICE '  Academic Terms: %', term_count;
  
  IF session_count = 0 THEN
    RAISE NOTICE '  WARNING: No academic sessions found';
  END IF;
  
  IF term_count = 0 THEN
    RAISE NOTICE '  WARNING: No academic terms found';
  ELSE
    RAISE NOTICE '  Terms are populated. Results page should work.';
  END IF;
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- PHASE 4: TEST RESULTS API QUERY
-- ============================================================================

DO $$
DECLARE
  test_school UUID;
  test_student UUID;
  test_term UUID;
  query_result INTEGER;
BEGIN
  -- Get a sample school/student/term combination
  SELECT s.id INTO test_school FROM schools s LIMIT 1;
  
  IF test_school IS NOT NULL THEN
    SELECT st.id INTO test_student FROM students st WHERE st.school_id = test_school LIMIT 1;
    SELECT at.id INTO test_term FROM academic_terms at WHERE at.school_id = test_school LIMIT 1;
    
    IF test_student IS NOT NULL AND test_term IS NOT NULL THEN
      -- Run the exact query the results API uses
      SELECT COUNT(*) INTO query_result FROM score_sheets
      WHERE school_id = test_school
        AND student_id = test_student
        AND term_id = test_term;
      
      RAISE NOTICE 'Results API Query Test:';
      RAISE NOTICE '  School: %', test_school;
      RAISE NOTICE '  Student: %', test_student;
      RAISE NOTICE '  Term: %', test_term;
      RAISE NOTICE '  Scores found for this combination: %', query_result;
      
      IF query_result = 0 THEN
        RAISE NOTICE '  INFO: This student has no scores entered yet for this term.';
      ELSE
        RAISE NOTICE '  SUCCESS: Query returns scores for this student.';
      END IF;
    ELSE
      RAISE NOTICE 'Could not find test data (student or term)';
    END IF;
  ELSE
    RAISE NOTICE 'Could not find test school';
  END IF;
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- PHASE 5: CREATE SCORES MONITORING VIEW
-- ============================================================================

DROP VIEW IF EXISTS v_score_entry_monitor CASCADE;

CREATE VIEW v_score_entry_monitor AS
SELECT 
  COUNT(*) as total_score_sheets,
  COUNT(CASE WHEN test1 IS NOT NULL THEN 1 END) as test1_entries,
  COUNT(CASE WHEN test2 IS NOT NULL THEN 1 END) as test2_entries,
  COUNT(CASE WHEN test3 IS NOT NULL THEN 1 END) as test3_entries,
  COUNT(CASE WHEN test4 IS NOT NULL THEN 1 END) as test4_entries,
  COUNT(CASE WHEN exam IS NOT NULL THEN 1 END) as exam_entries,
  COUNT(CASE WHEN grade IS NOT NULL THEN 1 END) as graded,
  MAX(created_at) as last_score_entered,
  MAX(updated_at) as last_score_updated
FROM score_sheets;

COMMIT;
