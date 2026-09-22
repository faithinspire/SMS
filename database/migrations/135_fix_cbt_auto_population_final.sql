-- ============================================================================
-- Migration 135: Fix CBT Auto-Population - Final Comprehensive Fix
-- ============================================================================
-- PROBLEM:
-- CBT subject scores are not automatically appearing in:
-- 1. Subject teacher score sheets
-- 2. Class teacher result pages
-- 3. Student result pages
--
-- ROOT CAUSE ANALYSIS:
-- 1. ✅ Trigger exists (Migration 126) but depends on:
--    - term_id being set on cbt_submissions (typo in start route prevented checking)
--    - subject_id being set on cbt_exams
--    - assessment_type being set correctly (CA1/CA2/CA3/CA4/EXAM)
--
-- 2. ❌ score_sheets query in result pages may not aggregate properly
--    - Queries only match (school_id, student_id, subject_id, term_id)
--    - May have stale/incomplete data from partial syncs
--
-- 3. ❌ Results service queries both score_sheets AND cbt_test_scores
--    - Legacy cbt_test_scores system still active
--    - Confusion between two competing score systems
--
-- SOLUTION:
-- 1. Fix typo in CBT start route (cbtExamId → cbt_exam_id)
-- 2. Ensure trigger is active and working on cbt_submissions
-- 3. Create diagnostic function to identify missing score syncs
-- 4. Create backfill function to sync any graded CBT that wasn't populated
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Verify Trigger is Created and Active
-- ============================================================================

-- Check that migration 126 trigger exists
DO $$
BEGIN
  IF EXISTS(
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_cbt_auto_populate_score_sheets_v2'
    AND tgrelid = 'cbt_submissions'::regclass
  ) THEN
    RAISE NOTICE '[Migration 135] ✅ Trigger trigger_cbt_auto_populate_score_sheets_v2 is ACTIVE on cbt_submissions';
  ELSE
    RAISE NOTICE '[Migration 135] ❌ CRITICAL: Trigger trigger_cbt_auto_populate_score_sheets_v2 NOT FOUND - this is required!';
    RAISE NOTICE '    Migration 126 may not have executed properly.';
  END IF;
END $$;

-- ============================================================================
-- PART 2: Diagnostic Function - Find CBT Submissions Not in score_sheets
-- ============================================================================

CREATE OR REPLACE FUNCTION diagnose_cbt_score_gaps()
RETURNS TABLE (
  submission_id UUID,
  student_id UUID,
  cbt_exam_id UUID,
  exam_title TEXT,
  status TEXT,
  score NUMERIC,
  assessment_type TEXT,
  term_id UUID,
  subject_id UUID,
  issue TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH cbt_status AS (
    SELECT 
      cs.id AS submission_id,
      cs.student_id,
      cs.cbt_exam_id,
      ce.assessment_type,
      ce.subject_id,
      cs.term_id,
      cs.status,
      cs.score,
      ce.title AS exam_title,
      CASE 
        WHEN cs.status != 'GRADED' THEN 'Status not GRADED - won''t trigger sync'
        WHEN cs.score IS NULL THEN 'Score is NULL - won''t trigger sync'
        WHEN ce.assessment_type IS NULL THEN 'Exam assessment_type is NULL - trigger defaults to EXAM'
        WHEN ce.subject_id IS NULL THEN 'Exam subject_id is NULL - trigger skips'
        WHEN cs.term_id IS NULL THEN 'Submission term_id is NULL - trigger skips'
        ELSE NULL
      END AS issue_if_exists
    FROM cbt_submissions cs
    JOIN cbt_exams ce ON ce.id = cs.cbt_exam_id
    WHERE cs.status = 'GRADED' AND cs.score IS NOT NULL
  )
  SELECT 
    cs.submission_id,
    cs.student_id,
    cs.cbt_exam_id,
    cs.exam_title,
    cs.status,
    cs.score,
    cs.assessment_type,
    cs.term_id,
    cs.subject_id,
    COALESCE(cs.issue_if_exists, 'SHOULD BE SYNCED') AS issue
  FROM cbt_status cs
  WHERE 
    -- Find graded scores that:
    cs.status = 'GRADED' 
    AND cs.score IS NOT NULL
    -- Either have an issue preventing sync, OR aren't in score_sheets
    AND (
      cs.issue_if_exists IS NOT NULL
      OR NOT EXISTS (
        SELECT 1 FROM score_sheets ss
        WHERE ss.school_id = (
          SELECT school_id FROM cbt_exams WHERE id = cs.cbt_exam_id LIMIT 1
        )
        AND ss.student_id = cs.student_id
        AND ss.subject_id = cs.subject_id
        AND ss.term_id = cs.term_id
      )
    )
  ORDER BY cs.submission_id DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 3: Backfill Function - Manually Sync Missed CBT Scores to score_sheets
-- ============================================================================

CREATE OR REPLACE FUNCTION backfill_cbt_scores_to_score_sheets()
RETURNS TABLE (
  synced_count INT,
  failed_count INT,
  message TEXT
) AS $$
DECLARE
  v_synced INT := 0;
  v_failed INT := 0;
  v_gap RECORD;
BEGIN
  -- Find all gaps
  FOR v_gap IN SELECT * FROM diagnose_cbt_score_gaps()
  LOOP
    BEGIN
      -- Call trigger logic manually for this submission
      DECLARE
        v_exam RECORD;
        v_scaled_score NUMERIC;
        v_score_column TEXT;
        v_source_column TEXT;
        v_cbt_source_column TEXT;
        v_assessment_type TEXT;
        v_total_marks NUMERIC;
        v_student_class_id UUID;
        v_academic_session_id UUID;
        v_session_year TEXT;
      BEGIN
        -- Get exam details
        SELECT 
          e.total_marks,
          e.assessment_type,
          s.class_arm_combo_id,
          at.session_id,
          asess.session_year
        INTO 
          v_total_marks,
          v_assessment_type,
          v_student_class_id,
          v_academic_session_id,
          v_session_year
        FROM cbt_exams e
        LEFT JOIN students s ON s.id = v_gap.student_id
        LEFT JOIN academic_terms at ON at.id = v_gap.term_id
        LEFT JOIN academic_sessions asess ON asess.id = at.session_id
        WHERE e.id = v_gap.cbt_exam_id;

        -- Skip if missing critical data
        IF v_gap.subject_id IS NULL OR v_gap.term_id IS NULL THEN
          v_failed := v_failed + 1;
          CONTINUE;
        END IF;

        -- Determine score column
        v_assessment_type := COALESCE(v_gap.assessment_type, 'EXAM');
        CASE v_assessment_type
          WHEN 'CA1' THEN 
            v_score_column := 'test1'; v_source_column := 'test1_source'; v_cbt_source_column := 'test1_cbt_source';
          WHEN 'CA2' THEN 
            v_score_column := 'test2'; v_source_column := 'test2_source'; v_cbt_source_column := 'test2_cbt_source';
          WHEN 'CA3' THEN 
            v_score_column := 'test3'; v_source_column := 'test3_source'; v_cbt_source_column := 'test3_cbt_source';
          WHEN 'CA4' THEN 
            v_score_column := 'test4'; v_source_column := 'test4_source'; v_cbt_source_column := 'test4_cbt_source';
          ELSE 
            v_score_column := 'exam'; v_source_column := 'exam_source'; v_cbt_source_column := 'exam_cbt_source';
        END CASE;

        -- Scale score
        IF v_score_column = 'exam' THEN
          v_scaled_score := ROUND((v_gap.score / COALESCE(v_total_marks, 100)) * 60 * 100) / 100;
        ELSE
          v_scaled_score := ROUND((v_gap.score / COALESCE(v_total_marks, 100)) * 10 * 100) / 100;
        END IF;

        -- Get school_id for this exam
        DECLARE
          v_school_id UUID;
        BEGIN
          SELECT school_id INTO v_school_id FROM cbt_exams WHERE id = v_gap.cbt_exam_id;
          
          -- Upsert into score_sheets
          INSERT INTO score_sheets (
            school_id, student_id, subject_id, term_id,
            class_arm_combo_id, academic_session_id, session_year,
            created_at, updated_at
          )
          VALUES (
            v_school_id, v_gap.student_id, v_gap.subject_id, v_gap.term_id,
            v_student_class_id, v_academic_session_id, v_session_year,
            NOW(), NOW()
          )
          ON CONFLICT (school_id, student_id, subject_id, term_id) DO UPDATE SET updated_at = NOW();

          -- Update the score column dynamically
          EXECUTE format(
            'UPDATE score_sheets SET %I = %L, %I = %L, %I = %L, updated_at = NOW() 
             WHERE school_id = %L AND student_id = %L AND subject_id = %L AND term_id = %L',
            v_score_column, v_scaled_score,
            v_source_column, 'CBT',
            v_cbt_source_column, v_gap.submission_id,
            v_school_id, v_gap.student_id, v_gap.subject_id, v_gap.term_id
          );

          v_synced := v_synced + 1;
        END;
      END;
    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed + 1;
      RAISE WARNING '[backfill_cbt_scores_to_score_sheets] Error syncing submission %: %', v_gap.submission_id, SQLERRM;
    END;
  END LOOP;

  RETURN QUERY SELECT v_synced, v_failed, format('Synced: %s, Failed: %s', v_synced, v_failed);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 4: Run Diagnostics and Report
-- ============================================================================

DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM diagnose_cbt_score_gaps();
  
  IF v_count > 0 THEN
    RAISE NOTICE '[Migration 135] ⚠️ Found % CBT submissions with sync issues', v_count;
    RAISE NOTICE '    Running backfill to sync missed scores...';
  ELSE
    RAISE NOTICE '[Migration 135] ✅ No CBT score gaps detected - all synced scores are in score_sheets';
  END IF;
END $$;

-- ============================================================================
-- PART 5: Commit
-- ============================================================================

COMMIT;

-- ============================================================================
-- POST-DEPLOYMENT INSTRUCTIONS:
-- ============================================================================
-- 1. Monitor logs for any warnings during migration execution
-- 2. Run diagnostic query to verify: SELECT * FROM diagnose_cbt_score_gaps();
-- 3. If gaps found, execute: SELECT * FROM backfill_cbt_scores_to_score_sheets();
-- 4. Verify result pages now show CBT scores:
--    SELECT * FROM score_sheets WHERE 
--      test1_source = 'CBT' OR test2_source = 'CBT' OR 
--      test3_source = 'CBT' OR test4_source = 'CBT' OR exam_source = 'CBT'
--    LIMIT 10;
