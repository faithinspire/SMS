-- ============================================================================
-- MIGRATION 120: Create Academic Sessions & Terms with Test Data
-- ============================================================================
-- Creates academic sessions and terms for ALL schools in database
-- Populates with realistic test data (2025/2026 session)
-- This enables the result pages to function properly

BEGIN;

-- ============================================================================
-- STEP 1: Create Academic Sessions for all schools
-- ============================================================================

INSERT INTO public.academic_sessions (id, school_id, session_year, is_active, created_at, updated_at)
SELECT
  gen_random_uuid() as id,
  id as school_id,
  '2025/2026' as session_year,
  true as is_active,
  now() as created_at,
  now() as updated_at
FROM public.schools
WHERE deleted_at IS NULL
ON CONFLICT (school_id, session_year) DO NOTHING;

-- ============================================================================
-- STEP 2: Create Academic Terms for each session
-- ============================================================================

-- First Term
INSERT INTO public.academic_terms (id, session_id, term_name, term_number, is_active, start_date, end_date, created_at, updated_at)
SELECT
  gen_random_uuid() as id,
  s.id as session_id,
  'First Term' as term_name,
  1 as term_number,
  true as is_active,
  '2025-09-01'::date as start_date,
  '2025-11-30'::date as end_date,
  now() as created_at,
  now() as updated_at
FROM public.academic_sessions s
WHERE s.session_year = '2025/2026'
  AND NOT EXISTS (
    SELECT 1 FROM public.academic_terms t
    WHERE t.session_id = s.id AND t.term_name = 'First Term'
  );

-- Second Term
INSERT INTO public.academic_terms (id, session_id, term_name, term_number, is_active, start_date, end_date, created_at, updated_at)
SELECT
  gen_random_uuid() as id,
  s.id as session_id,
  'Second Term' as term_name,
  2 as term_number,
  false as is_active,
  '2025-12-01'::date as start_date,
  '2026-02-28'::date as end_date,
  now() as created_at,
  now() as updated_at
FROM public.academic_sessions s
WHERE s.session_year = '2025/2026'
  AND NOT EXISTS (
    SELECT 1 FROM public.academic_terms t
    WHERE t.session_id = s.id AND t.term_name = 'Second Term'
  );

-- Third Term
INSERT INTO public.academic_terms (id, session_id, term_name, term_number, is_active, start_date, end_date, created_at, updated_at)
SELECT
  gen_random_uuid() as id,
  s.id as session_id,
  'Third Term' as term_name,
  3 as term_number,
  false as is_active,
  '2026-03-01'::date as start_date,
  '2026-05-31'::date as end_date,
  now() as created_at,
  now() as updated_at
FROM public.academic_sessions s
WHERE s.session_year = '2025/2026'
  AND NOT EXISTS (
    SELECT 1 FROM public.academic_terms t
    WHERE t.session_id = s.id AND t.term_name = 'Third Term'
  );

-- ============================================================================
-- STEP 3: Populate Score Sheets with Test Data
-- ============================================================================
-- For each student in a class, create score sheets for all terms and subjects

INSERT INTO public.score_sheets (
  id, student_id, subject_id, term_id, school_id, 
  test1, test2, test3, test4, exam, total, grade,
  test1_source, test2_source, test3_source, test4_source, exam_source,
  class_arm_combo_id, created_at, updated_at
)
SELECT
  gen_random_uuid() as id,
  st.id as student_id,
  sbj.id as subject_id,
  term.id as term_id,
  st.school_id,
  -- Generate random test scores (5-20 out of 25 or similar scale)
  CEIL(RANDOM() * 15 + 5)::integer as test1,
  CEIL(RANDOM() * 15 + 5)::integer as test2,
  CEIL(RANDOM() * 15 + 5)::integer as test3,
  CEIL(RANDOM() * 15 + 5)::integer as test4,
  -- Exam score (40-100)
  CEIL(RANDOM() * 60 + 40)::integer as exam,
  -- Total will be calculated
  0 as total,
  NULL as grade,
  'Manual' as test1_source,
  'Manual' as test2_source,
  'Manual' as test3_source,
  'Manual' as test4_source,
  'Manual' as exam_source,
  st.class_arm_combo_id,
  now() as created_at,
  now() as updated_at
FROM public.students st
CROSS JOIN public.student_subjects ss ON ss.student_id = st.id
CROSS JOIN public.subjects sbj ON sbj.id = ss.subject_id
CROSS JOIN public.academic_terms term ON term.session_id IN (
  SELECT id FROM public.academic_sessions 
  WHERE school_id = st.school_id 
    AND session_year = '2025/2026'
)
WHERE st.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.score_sheets existing
    WHERE existing.student_id = st.id
      AND existing.subject_id = sbj.id
      AND existing.term_id = term.id
      AND existing.school_id = st.school_id
  )
LIMIT 10000;  -- Safety limit to prevent massive inserts

-- ============================================================================
-- STEP 4: Calculate totals and grades for all score sheets
-- ============================================================================

UPDATE public.score_sheets
SET 
  total = COALESCE(test1, 0) + COALESCE(test2, 0) + COALESCE(test3, 0) + COALESCE(test4, 0) + COALESCE(exam, 0),
  grade = CASE 
    WHEN (COALESCE(test1, 0) + COALESCE(test2, 0) + COALESCE(test3, 0) + COALESCE(test4, 0) + COALESCE(exam, 0)) >= 90 THEN 'A'
    WHEN (COALESCE(test1, 0) + COALESCE(test2, 0) + COALESCE(test3, 0) + COALESCE(test4, 0) + COALESCE(exam, 0)) >= 80 THEN 'B'
    WHEN (COALESCE(test1, 0) + COALESCE(test2, 0) + COALESCE(test3, 0) + COALESCE(test4, 0) + COALESCE(exam, 0)) >= 70 THEN 'C'
    WHEN (COALESCE(test1, 0) + COALESCE(test2, 0) + COALESCE(test3, 0) + COALESCE(test4, 0) + COALESCE(exam, 0)) >= 60 THEN 'D'
    WHEN (COALESCE(test1, 0) + COALESCE(test2, 0) + COALESCE(test3, 0) + COALESCE(test4, 0) + COALESCE(exam, 0)) >= 50 THEN 'E'
    ELSE 'F'
  END,
  updated_at = now()
WHERE total = 0 OR total IS NULL;

-- ============================================================================
-- STEP 5: Verify Data Was Created
-- ============================================================================

DO $$
DECLARE
  v_session_count INTEGER;
  v_term_count INTEGER;
  v_score_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_session_count FROM public.academic_sessions WHERE session_year = '2025/2026';
  SELECT COUNT(*) INTO v_term_count FROM public.academic_terms WHERE id IN (
    SELECT id FROM public.academic_terms t
    WHERE t.session_id IN (SELECT id FROM public.academic_sessions WHERE session_year = '2025/2026')
  );
  SELECT COUNT(*) INTO v_score_count FROM public.score_sheets;

  RAISE NOTICE 'Migration 120 Complete:';
  RAISE NOTICE '  - Academic Sessions Created: %', v_session_count;
  RAISE NOTICE '  - Academic Terms Created: %', v_term_count;
  RAISE NOTICE '  - Score Sheets Populated: %', v_score_count;
  RAISE NOTICE 'Result pages should now work properly!';
END $$;

COMMIT;
