-- ============================================================================
-- PHASE 1: CRITICAL DATABASE FIXES & FOREIGN KEY CORRECTIONS (FIXED)
-- ============================================================================
-- Purpose: Fix all critical FK issues, ensure terms exist, and populate test data
-- ACTUAL SCHEMA: Uses 'terms' table (not academic_terms) for score_sheets/cbt_exams FK
-- Execution Date: Phase 1 Start
-- ============================================================================

-- ============================================================================
-- STEP 1: ENSURE TERMS TABLE HAS PROPER DATA
-- ============================================================================

-- Ensure terms exist for test school
INSERT INTO terms (id, school_id, name, session_year, start_date, end_date, is_current, created_at)
SELECT 
  gen_random_uuid(),
  s.id as school_id,
  term_data.name,
  2023 as session_year,
  term_data.start_date,
  term_data.end_date,
  TRUE as is_current,
  NOW() as created_at
FROM schools s
CROSS JOIN (
  VALUES 
    ('First Term', '2023-09-01'::date, '2023-11-30'::date),
    ('Second Term', '2023-12-01'::date, '2024-02-28'::date),
    ('Third Term', '2024-03-01'::date, '2024-05-31'::date)
) AS term_data(name, start_date, end_date)
WHERE NOT EXISTS (
  SELECT 1 FROM terms t 
  WHERE t.school_id = s.id 
    AND t.name = term_data.name
    AND t.session_year = 2023
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 2: VERIFY FOREIGN KEY CONSTRAINTS EXIST
-- ============================================================================

-- Check score_sheets.term_id → terms FK (should already exist from migration 001)
DO $$
BEGIN
  -- This constraint should exist from migration 001
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'score_sheets'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name LIKE '%term%'
  ) THEN
    ALTER TABLE score_sheets
    ADD CONSTRAINT fk_score_sheets_term_id
    FOREIGN KEY (term_id) 
    REFERENCES terms(id) 
    ON DELETE CASCADE;
    RAISE NOTICE 'Added missing FK: score_sheets.term_id → terms.id';
  ELSE
    RAISE NOTICE 'FK constraint already exists for score_sheets.term_id';
  END IF;
EXCEPTION WHEN OTHERS THEN 
  RAISE NOTICE 'FK already exists or error: %', SQLERRM;
END $$;

-- Check cbt_exams.term_id → terms FK (should already exist from migration 001)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'cbt_exams'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name LIKE '%term%'
  ) THEN
    ALTER TABLE cbt_exams
    ADD CONSTRAINT fk_cbt_exams_term_id
    FOREIGN KEY (term_id) 
    REFERENCES terms(id) 
    ON DELETE SET NULL;
    RAISE NOTICE 'Added missing FK: cbt_exams.term_id → terms.id';
  ELSE
    RAISE NOTICE 'FK constraint already exists for cbt_exams.term_id';
  END IF;
EXCEPTION WHEN OTHERS THEN 
  RAISE NOTICE 'FK already exists or error: %', SQLERRM;
END $$;

-- ============================================================================
-- STEP 3: CREATE AUTO-CREATE SCORE SHEETS TRIGGER
-- ============================================================================

-- Drop trigger if exists (safe)
DROP TRIGGER IF EXISTS auto_create_score_sheet_on_student_subject ON student_subjects;
DROP FUNCTION IF EXISTS fn_auto_create_score_sheet();

-- Function to auto-create score sheet when student enrolls in subject
CREATE OR REPLACE FUNCTION fn_auto_create_score_sheet()
RETURNS TRIGGER AS $$
DECLARE
  current_term_id UUID;
BEGIN
  -- Get current/latest term for school
  SELECT id INTO current_term_id
  FROM terms
  WHERE school_id = NEW.school_id
    AND is_current = true
  ORDER BY session_year DESC, 
           CASE name 
             WHEN 'First Term' THEN 1
             WHEN 'Second Term' THEN 2
             WHEN 'Third Term' THEN 3
             ELSE 4
           END DESC
  LIMIT 1;

  -- If we found a term, create score sheet
  IF current_term_id IS NOT NULL THEN
    INSERT INTO score_sheets (
      school_id, student_id, subject_id, term_id, 
      test1, test2, test3, test4, exam,
      test1_source, test2_source, test3_source, test4_source, exam_source,
      created_at, updated_at
    )
    VALUES (
      NEW.school_id, NEW.student_id, NEW.subject_id, current_term_id,
      NULL, NULL, NULL, NULL, NULL,
      'MANUAL', 'MANUAL', 'MANUAL', 'MANUAL', 'MANUAL',
      NOW(), NOW()
    )
    ON CONFLICT (school_id, student_id, subject_id, term_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create score sheets
CREATE TRIGGER auto_create_score_sheet_on_student_subject
AFTER INSERT ON student_subjects
FOR EACH ROW
EXECUTE FUNCTION fn_auto_create_score_sheet();

-- ============================================================================
-- STEP 4: DATA INTEGRITY - VERIFY NO ORPHANED RECORDS
-- ============================================================================

-- Check for orphaned score_sheets (FK constraint violations)
-- This should catch if any score_sheets reference a term_id that doesn't exist
DO $$
DECLARE
  orphan_count INT;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM score_sheets ss
  WHERE NOT EXISTS (SELECT 1 FROM terms t WHERE t.id = ss.term_id);
  
  IF orphan_count > 0 THEN
    RAISE NOTICE 'WARNING: Found % orphaned score_sheets records (term_id not found)', orphan_count;
  ELSE
    RAISE NOTICE 'OK: No orphaned score_sheets found';
  END IF;
END $$;

-- Check for orphaned cbt_exams
DO $$
DECLARE
  orphan_count INT;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM cbt_exams ce
  WHERE ce.term_id IS NOT NULL 
    AND NOT EXISTS (SELECT 1 FROM terms t WHERE t.id = ce.term_id);
  
  IF orphan_count > 0 THEN
    RAISE NOTICE 'WARNING: Found % orphaned cbt_exams records (term_id not found)', orphan_count;
  ELSE
    RAISE NOTICE 'OK: No orphaned cbt_exams found';
  END IF;
END $$;

-- ============================================================================
-- STEP 5: VERIFICATION SUMMARY
-- ============================================================================

-- Show terms table content
SELECT 'TERMS TABLE CONTENT:' as section;
SELECT school_id, name, session_year, start_date, end_date, is_current, COUNT(*) as count
FROM terms
GROUP BY school_id, name, session_year, start_date, end_date, is_current
ORDER BY school_id, session_year DESC;

-- Show table record counts
SELECT 'RECORD COUNTS:' as section;
SELECT 'schools' as table_name, COUNT(*) as row_count FROM schools
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'students', COUNT(*) FROM students
UNION ALL
SELECT 'teachers', COUNT(*) FROM teachers
UNION ALL
SELECT 'classes', COUNT(*) FROM classes
UNION ALL
SELECT 'subjects', COUNT(*) FROM subjects
UNION ALL
SELECT 'terms', COUNT(*) FROM terms
UNION ALL
SELECT 'score_sheets', COUNT(*) FROM score_sheets
UNION ALL
SELECT 'cbt_exams', COUNT(*) FROM cbt_exams
UNION ALL
SELECT 'class_arm_combos', COUNT(*) FROM class_arm_combos;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Status: Phase 1 critical fixes executed
-- Notes:
--   - Uses canonical 'terms' table (not academic_terms) for FK references
--   - Auto-creates score sheets when students enroll in subjects
--   - Verifies data integrity and reports orphaned records
-- ============================================================================
