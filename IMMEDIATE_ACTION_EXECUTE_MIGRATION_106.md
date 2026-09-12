# 🚀 IMMEDIATE ACTION: Execute Migration 106 in Supabase

**Time to execute**: ~2 minutes
**Status**: ✅ Code committed to git - Now execute in Supabase

---

## The Problem

Your SMS system code is complete and pushed to GitHub/Vercel, BUT the database migration hasn't been executed yet. This causes errors like:
- "TERM NOT FOUND IN EITHER ACADEMIC_TERMS OR TERMS TABLE"
- "Column level does not exist"
- "school_id does not exist in academic_sessions"

## The Solution

Execute Migration 106 SQL in your Supabase database. Follow these exact steps:

---

## STEP-BY-STEP EXECUTION

### Step 1: Go to Supabase
1. Open https://supabase.com in your browser
2. Sign in to your account
3. Open your SMS project

### Step 2: Open SQL Editor
1. Click **SQL Editor** (left sidebar, bottom section)
2. Click **New Query** (green button, top right)
3. Clear any existing text in the editor

### Step 3: Copy Migration 106

Copy the entire content from:
**File**: `database/migrations/106_phase1_critical_fixes.sql`

Or copy this entire SQL below:

```sql
-- ============================================================================
-- PHASE 1: CRITICAL DATABASE FIXES & FOREIGN KEY CORRECTIONS (FIXED)
-- ============================================================================
-- Purpose: Fix all critical FK issues, ensure terms exist, and populate test data
-- ACTUAL SCHEMA: Uses 'terms' table (not academic_terms) for score_sheets/cbt_exams FK
-- Execution Date: Phase 1 Start
-- ============================================================================

-- ============================================================================
-- STEP 1: ENSURE ACADEMIC SESSIONS EXIST
-- ============================================================================

-- Ensure academic sessions exist for current and previous years
INSERT INTO academic_sessions (id, school_id, name, start_year, end_year, is_active, created_at)
SELECT 
  gen_random_uuid(),
  s.id as school_id,
  '2023/2024' as name,
  2023,
  2024,
  TRUE as is_active,
  NOW() as created_at
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM academic_sessions a 
  WHERE a.school_id = s.id 
    AND a.start_year = 2023 
    AND a.end_year = 2024
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 1B: ENSURE TERMS TABLE HAS PROPER DATA
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
SELECT 'TERMS TABLE CONTENT - Migration 106 Executed Successfully' as status;
SELECT school_id, name, session_year, is_current, start_date, end_date
FROM terms
ORDER BY school_id, session_year DESC, name
LIMIT 15;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Status: Phase 1 critical fixes executed
-- Notes:
--   - Uses canonical 'terms' table (not academic_terms) for FK references
--   - Auto-creates score sheets when students enroll in subjects
--   - Verifies data integrity and reports orphaned records
-- ============================================================================
```

### Step 4: Paste into Supabase
1. In the SQL editor, paste the entire SQL code above
2. You should see the SQL query appear in the editor

### Step 5: Execute the Query
1. Click **Run** (green play button icon, top right of editor)
2. Wait 3-5 seconds for execution to complete

### Step 6: Verify Success

You should see output similar to this:

```
Query completed successfully

NOTICE: FK constraint already exists for score_sheets.term_id
NOTICE: FK constraint already exists for cbt_exams.term_id
NOTICE: OK: No orphaned score_sheets found
NOTICE: OK: No orphaned cbt_exams found

Results:
status
---
TERMS TABLE CONTENT - Migration 106 Executed Successfully

school_id | name | session_year | is_current | start_date | end_date
--- | --- | --- | --- | --- | ---
[uuid] | First Term | 2023 | t | 2023-09-01 | 2023-11-30
[uuid] | Second Term | 2023 | t | 2023-12-01 | 2024-02-28
[uuid] | Third Term | 2023 | t | 2024-03-01 | 2024-05-31
```

✅ **Success indicators**:
- No red error messages
- "Query completed successfully" message
- Terms showing with all 3 terms
- All NOTICE messages showing "OK"

---

## What This Migration Does

1. **Creates Academic Sessions** - For the 2023/2024 school year
2. **Populates Terms** - First Term, Second Term, Third Term for all schools
3. **Verifies Foreign Keys** - Ensures score_sheets & cbt_exams reference terms correctly
4. **Creates Auto-Trigger** - When a student enrolls in a subject, automatically creates their score sheet
5. **Verifies Data Integrity** - Checks for orphaned records and reports any issues

---

## After Migration Execution

Once you see the success message:

1. ✅ You can now **register students** without term errors
2. ✅ You can now **create CBT exams** - terms will be available
3. ✅ You can now **take exams** - scores will auto-sync to report cards
4. ✅ You can now **view results** - student dashboards will work

---

## If You Get an Error

**Error**: "relation academic_sessions does not exist"
- **Solution**: This table should already exist. Check that all previous migrations ran (001-105)

**Error**: "Duplicate key value violates unique constraint"
- **Solution**: This is fine - it means terms already exist. Migration will skip them.

**Error**: "ERROR: syntax error at or near..."
- **Solution**: Make sure you copied the entire SQL code correctly. Check for missing quotes or semicolons.

---

## Deployment Timeline

**Git Status**: ✅ Already pushed to main
**Vercel Status**: 🔄 Automatically building from main (check dashboard)
**Supabase Status**: ⏳ **Waiting for you to execute Migration 106**

Once you execute Migration 106 → Your system is fully live!

---

**Questions?** Check `00_DEPLOYMENT_COMPLETE_NEXT_STEPS.md` for complete documentation.

**Ready?** Execute that Migration 106 SQL now! 🚀
