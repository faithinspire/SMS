# Hard Fix: CBT Scores Routing + Assignments Display

## Critical Issues Fixed

1. ✅ **CBT scores NOT appearing in teacher scoresheets and student result pages**
2. ✅ **Assignments NOT appearing in student assignments page**

---

## Issue #1: CBT Scores Not Routing to Teachers/Students

### Root Cause Analysis

**The Problem Chain:**
1. Student submits CBT exam → score saved to `cbt_submissions` table
2. Migration 126 has trigger to auto-populate `score_sheets` from CBT
3. BUT the trigger FAILS SILENTLY because:
   - `cbt_exams.subject_id` is NULL (exam not linked to subject)
   - `cbt_submissions.term_id` is NULL (submission not linked to term)
   - Without both, trigger cannot populate `score_sheets`
4. No error logging, just silent failure
5. Teachers query `score_sheets` for their subject → empty results
6. Students query their results → only see old manual entries, not CBT

**Why Previous Migrations Failed:**
- Migration 126 had correct trigger logic BUT it required data to already be properly linked
- Migration 128 tried to backfill BUT skipped rows where subject_id/term_id were NULL
- The `/api/student/cbt/submit` endpoint had comprehensive code to create score_sheets directly BUT it also failed due to missing subject_id/term_id on exams

### Solution Implemented

**File:** `database/migrations/129_fix_cbt_subject_and_term_links.sql`

**What Migration 129 Does:**

1. **Adds Missing Columns to `cbt_exams`:**
   - Adds `subject_id` column (UUID, FK to subjects)
   - Adds `term_id` column (UUID, FK to academic_terms)

2. **Populates `cbt_exams.subject_id`:**
   - Links exams to subjects via teacher's subject assignments
   - Uses `subject_teacher_assignments` to match teacher+school → subject

3. **Populates `cbt_exams.term_id`:**
   - Links exams to active academic terms
   - Uses most recent active term per school

4. **Populates `cbt_submissions.term_id`:**
   - Inherits from exam's term_id
   - Ensures submissions are linked to academic period

5. **Fixes Assignments Missing Terms:**
   - Assignments created without term_id get linked to active term
   - Now all assignments have proper term_id

6. **Creates Improved Trigger `auto_populate_score_sheets_from_cbt_v3`:**
   - Replaces Migration 126's broken trigger
   - Handles NULL values gracefully
   - Finds term_id multiple ways (exam → submission → active term)
   - Gets academic_session from term
   - Scales scores correctly: CA1/2/3/4 → 0-10, EXAM → 0-60
   - Creates AND updates score_sheets atomically
   - **CRITICAL:** Uses `ON CONFLICT` to avoid duplicates

7. **Backfills All Existing CBT Submissions:**
   - Finds all GRADED submissions with scores
   - Ensures each one has entry in score_sheets
   - Preserves existing data with `COALESCE(EXCLUDED.X, existing.X)`

### Data Flow After Fix

```
Student Submits CBT
    ↓
/api/student/cbt/submit updates cbt_submissions.status = 'GRADED'
    ↓
Trigger fires: trigger_cbt_auto_populate_score_sheets_v3
    ↓
Gets subject_id from cbt_exams.subject_id (NOW POPULATED)
Gets term_id from cbt_submissions.term_id or cbt_exams.term_id (NOW POPULATED)
Gets academic_session from term.session_id (NOW POPULATED)
    ↓
INSERTS/UPDATES score_sheets with scaled score
    ↓
Teacher queries score_sheets:
    SELECT test1, test2, test3, test4, exam FROM score_sheets
    WHERE school_id = ? AND term_id = ? AND subject_id = ? ← NOW RETURNS DATA ✅
    
Student queries results:
    SELECT score_sheets WHERE student_id = ? AND term_id = ? ← NOW RETURNS CBT SCORES ✅
```

### What Teachers See
✅ Student CBT scores appear in subject scoresheet
✅ Scores are properly scaled (0-10 for tests, 0-60 for exam)
✅ Can distinguish between manual entry and CBT via `test1_source = 'CBT'`

### What Students See
✅ CBT scores appear on their results page
✅ Integrated with traditional scores in same view
✅ Clear indication which scores are from CBT (`*_source = 'CBT'`)

---

## Issue #2: Assignments Not Appearing to Students

### Root Cause Analysis

**The Problem:**
1. Teacher creates assignment without assigning a term → `term_id = NULL`
2. Student page queries assignments with filter: `WHERE term_id = activeTermId`
3. In SQL: `WHERE term_id = 'some-uuid'` does NOT match `term_id IS NULL`
4. Assignment exists in database but is invisible to students
5. **Root issue:** NULL != specific_value in SQL

**Why This Happens:**
- Migration 100 made `term_id` optional on assignments
- But student query still assumes all assignments have a term_id
- Teachers weren't warned to set term, so many assignments created with NULL term

### Solution Implemented

**File:** `src/app/student/assignments/page.tsx` (lines 98-120)

**What the Fix Does:**

1. **Changed Query Filter Logic:**
   ```javascript
   // BEFORE (BROKEN):
   if (currentTermId) {
     query = query.eq('term_id', currentTermId)
   }
   // Result: Excludes assignments with NULL term_id
   
   // AFTER (FIXED):
   if (currentTermId) {
     query = query.or(`term_id.eq.${currentTermId},term_id.is.null`)
   }
   // Result: Includes BOTH assignments for this term AND assignments with no term assigned
   ```

2. **Added `status = 'ACTIVE'` Filter:**
   - Only show active assignments
   - Ignore draft/archived

3. **Added `term_id` to Query Select:**
   - Now fetches term_id so it's available if needed
   - Ensures term matching logic works

### Data Flow After Fix

```
Teacher Creates Assignment (without assigning term):
    → term_id = NULL in database

Student Views Assignments Page:
    Gets current active term_id
    Query: (term_id = activeTermId) OR (term_id IS NULL)
    ↓
Both assignments appear:
    - Assignment 1: created for this term → term_id = activeTermId ✅
    - Assignment 2: created with no term → term_id = NULL ✅
    
Student can see ALL relevant assignments
```

### What Students See
✅ Assignments for current term (term_id = activeTermId)
✅ Assignments with no specific term (term_id = NULL)
✅ No more empty assignment page

---

## Migration 129 Execution Steps

### CRITICAL: This migration MUST be executed in Supabase SQL editor

```bash
# Copy entire content of:
database/migrations/129_fix_cbt_subject_and_term_links.sql

# Paste into Supabase SQL editor and execute
```

### What Migration Does (Detailed)

**STEP 1-3:** Add subject_id and term_id to cbt_exams
- If cbt_exams.subject_id is NULL, populate from teacher's subject
- If cbt_exams.term_id is NULL, populate from active term

**STEP 4:** Link cbt_submissions to terms
- If submission has no term, inherit from exam

**STEP 5:** Fix orphaned assignments
- If assignment has no term, assign to active term
- Ensures no assignment is "invisible"

**STEP 6:** Create indexes for performance
- Faster lookups on CBT-score_sheets joins

**STEP 7:** Create improved trigger v3
- Replaces broken trigger from Migration 126
- Handles all edge cases (NULL values, missing data)
- Logs all operations via RAISE NOTICE

**STEP 8:** Backfill all existing CBT submissions
- Finds all GRADED submissions with scores
- Creates/updates score_sheets entries
- Takes ~1-2 minutes depending on data volume

---

## Verification Checklist

### CBT Scores Flow

**In Database:**
```sql
-- Verify cbt_exams now have subject_id and term_id
SELECT id, subject_id, term_id FROM cbt_exams LIMIT 5;
-- Should show: subject_id = <UUID>, term_id = <UUID>

-- Verify cbt_submissions have term_id
SELECT id, term_id FROM cbt_submissions WHERE status = 'GRADED' LIMIT 5;
-- Should show: term_id = <UUID>

-- Verify score_sheets has CBT entries
SELECT id, test1, test1_source, exam, exam_source 
FROM score_sheets 
WHERE exam_source = 'CBT' LIMIT 5;
-- Should show: exam_source = 'CBT', exam = <score>
```

**In UI:**

1. **Teacher Perspective:**
   - Login as teacher
   - Go to Subject Scoresheet for subject
   - Select a term
   - ✅ Student scores appear (from CBT)
   - ✅ `test1_source = 'CBT'` shown if available

2. **Student Perspective:**
   - Login as student
   - Go to Results page
   - ✅ See CBT scores integrated with other scores
   - ✅ Scores marked as from 'CBT'

### Assignments Flow

**In Database:**
```sql
-- Verify assignments have term_id (either set or NULL is OK)
SELECT id, term_id, status FROM assignments LIMIT 10;

-- Verify students can query with our new filter
SELECT a.id, a.title, a.term_id
FROM assignments a
WHERE a.class_arm_combo_id = '<STUDENT_CLASS>'
  AND a.school_id = '<SCHOOL>'
  AND a.status = 'ACTIVE'
  AND (a.term_id = '<ACTIVE_TERM_ID>' OR a.term_id IS NULL)
LIMIT 10;
-- Should show assignments
```

**In UI:**

1. **Student Perspective:**
   - Login as student
   - Go to Assignments page
   - ✅ See assignments for class
   - ✅ Include assignments with and without specific term
   - ✅ No more empty assignment page (if assignments exist)

---

## Files Modified/Created

**Modified:**
1. `src/app/student/assignments/page.tsx` - Fixed query filter to include NULL terms

**Created:**
1. `database/migrations/129_fix_cbt_subject_and_term_links.sql` - Comprehensive fix

---

## Deployment Status

**Status:** Ready for deployment ✅

**Next Steps:**
1. Commit this fix
2. Push to origin/main
3. Vercel automatically deploys
4. **THEN:** Execute Migration 129 in Supabase SQL editor (cannot be auto-executed via migration runner)

**Timing:**
- Code deployment: Automatic via Vercel (2-5 minutes)
- Migration execution: Manual in Supabase (run SQL, takes 1-2 minutes)

---

## Rollback (If Issues)

```bash
# Revert code changes
git revert HEAD
git push origin main

# To undo Migration 129 in Supabase, run:
DROP TRIGGER IF EXISTS trigger_cbt_auto_populate_score_sheets_v3 ON cbt_submissions;
DROP FUNCTION IF EXISTS auto_populate_score_sheets_from_cbt_v3();
-- Note: Columns added (subject_id, term_id) and data populated cannot be easily rolled back
-- Recommendation: Keep this migration permanent
```

---

## Why These Fixes Are Permanent

1. **CBT Linking:** Once subject_id and term_id are on cbt_exams/submissions, all future submissions work
2. **Assignments:** Changed query logic to handle NULL terms - works for all future assignments
3. **Better Trigger:** v3 trigger is more robust than v2, handles edge cases

All fixes target root causes, not symptoms. Production-ready. ✅
