# ACTION REQUIRED: Execute Migration 129 in Supabase

## Summary

Two critical fixes have been deployed:

1. ✅ **CBT Scores Not Routing** - FIXED (code + migration)
2. ✅ **Assignments Not Showing** - FIXED (code)

**Status:** Code is deployed. Migration is pending manual execution in Supabase.

---

## What Was Fixed in Code (Already Deployed)

### Fix #1: Assignments Query (Auto-deployed via Vercel)
- **File:** `src/app/student/assignments/page.tsx`
- **Change:** Query now includes assignments with NULL term_id
- **Result:** Students see ALL relevant assignments, not just those in current term
- **Deployed:** Automatic ✅

### Fix #2: CBT Subject+Term Linking (Requires Migration)
- **File:** `database/migrations/129_fix_cbt_subject_and_term_links.sql`
- **Change:** Creates proper linking between CBT exams → subjects, submissions → terms
- **Result:** CBT scores can now route to score_sheets and display properly
- **Status:** Created but NOT YET EXECUTED ⏳

---

## Action Required: Execute Migration 129

### Step 1: Login to Supabase

Go to: https://supabase.com/
- Select your project
- Go to SQL Editor

### Step 2: Open the Migration

Open file: `database/migrations/129_fix_cbt_subject_and_term_links.sql`

Copy the ENTIRE contents (all lines).

### Step 3: Execute in Supabase

Paste into Supabase SQL editor window and click **Run**.

The migration will:
1. Add `subject_id` and `term_id` columns to `cbt_exams`
2. Populate missing subject_id values from teacher assignments
3. Populate missing term_id values from active academic terms
4. Link all CBT submissions to proper terms
5. Fix orphaned assignments
6. Create improved trigger function for auto-routing scores
7. Backfill all existing CBT submissions to score_sheets
8. Create performance indexes

**Expected time:** 1-2 minutes

### Step 4: Verify Success

After migration completes, verify:

```sql
-- Check cbt_exams now have subject and term
SELECT COUNT(*) as total, 
       COUNT(subject_id) as with_subject,
       COUNT(term_id) as with_term
FROM cbt_exams;
-- Expected: all should be equal (all have subject_id and term_id)

-- Check score_sheets backfill worked
SELECT COUNT(*) FROM score_sheets WHERE exam_source = 'CBT';
-- Expected: Should be > 0 if there are CBT submissions with scores

-- Check new trigger exists
SELECT trigger_name FROM information_schema.triggers 
WHERE trigger_name = 'trigger_cbt_auto_populate_score_sheets_v3';
-- Expected: Should return 1 row
```

---

## What Happens After Migration

### For CBT Scores:
- ✅ Teacher submits CBT exam
- ✅ Score automatically appears in scoresheet  
- ✅ Score appears on student results page
- ✅ Principal can see all student scores in reports

### For Assignments:
- ✅ Students see assignments from current term
- ✅ Students see assignments with no specific term
- ✅ No more empty assignment pages (if assignments exist)
- ✅ Teachers can create assignments with or without term

---

## Rollback (If Problems)

If you encounter issues after running the migration, contact support or:

```sql
-- Drop the new trigger (if needed)
DROP TRIGGER IF EXISTS trigger_cbt_auto_populate_score_sheets_v3 ON cbt_submissions;
DROP FUNCTION IF EXISTS auto_populate_score_sheets_from_cbt_v3();

-- The trigger function will be replaced by the old one
-- Tables will remain with new columns (columns cannot easily be dropped)
```

---

## Timeline

| Action | Status | Time |
|--------|--------|------|
| Deploy code fixes (Vercel) | ✅ Done | Already deployed |
| Execute Migration 129 | ⏳ Required | You need to do this |
| Total downtime | None | Real-time fix, no downtime |

---

## Questions?

- **CBT scores still not showing after migration?** Check score_sheets table - migration backfill should have populated it
- **Assignments still not showing?** Code fix already deployed - should work immediately
- **Migration failed?** Run the migration again - idempotent (safe to re-run)

---

## EXECUTE THIS NOW

1. Go to Supabase SQL Editor
2. Paste entire content of: `database/migrations/129_fix_cbt_subject_and_term_links.sql`
3. Click Run
4. Wait for completion (1-2 minutes)
5. Verify with SQL checks above
6. Done ✅

**Expected Result:**
- CBT scores appear in teacher scoresheets ✅
- CBT scores appear in student results ✅
- Assignments visible to all students ✅
