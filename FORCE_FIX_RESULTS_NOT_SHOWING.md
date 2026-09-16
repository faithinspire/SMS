# FORCE FIX: SCORES NOT SHOWING IN RESULTS PAGE

## IMMEDIATE ACTION REQUIRED

The issue is that **scores were saved but results query is not finding them**. This is a critical blocker.

### What You Need to Do

1. **Run Diagnostic Queries in Supabase SQL Editor**
   - Open Supabase dashboard
   - Go to SQL Editor
   - Run queries from: `DIAGNOSTIC_QUERIES_RUN_IN_SUPABASE.sql`
   - Take screenshots of the results
   - Share what you see

2. **The Queries Will Show:**
   - If score_sheets table has data
   - If academic_terms table has data
   - If there's a FK mismatch
   - If the results query finds scores

### Critical Questions to Answer

1. **Does score_sheets have data?**
   - Query: `SELECT COUNT(*) as total_scores FROM score_sheets;`
   - If > 0, scores ARE being saved ✓
   - If = 0, scores are NOT being saved ✗

2. **Does academic_terms have data?**
   - Query: `SELECT COUNT(*) as total_terms FROM academic_terms;`
   - If > 0, terms exist ✓
   - If = 0, no terms exist ✗

3. **Do score_sheets records have valid term_id?**
   - Query: `SELECT COUNT(*) as orphaned_scores FROM score_sheets ss LEFT JOIN academic_terms at ON ss.term_id = at.id WHERE at.id IS NULL;`
   - If = 0, all scores link to valid terms ✓
   - If > 0, orphaned scores exist ✗

4. **Does the results query find scores?**
   - This is the KEY test
   - The results page uses: `WHERE school_id = X AND student_id = Y AND term_id = Z`
   - If query returns rows, the problem is in the PAGE code
   - If query returns 0 rows, the problem is in the DATA

---

## POSSIBLE SCENARIOS & FIXES

### Scenario 1: score_sheets is EMPTY (no scores saved)
**Symptom:** `COUNT(*) FROM score_sheets` = 0

**Cause:** Scores are not being saved to score_sheets table when teacher clicks "Save"

**Fix:**
1. Check the scoresheet page (src/app/teacher/score-sheet/page.tsx)
2. Verify the upsert query is writing to correct table
3. Run test: Enter score in UI → Check browser console for errors
4. Check Supabase logs for failed inserts

**Migration 116 will:** Create score_sheets table if missing

---

### Scenario 2: academic_terms is EMPTY (no terms created)
**Symptom:** `COUNT(*) FROM academic_terms` = 0

**Cause:** Migrations 111-112 didn't populate terms

**Fix:**
1. Manually run: `DELETE FROM academic_sessions; DELETE FROM academic_terms;`
2. Run Migration 111 in Supabase SQL editor
3. Run Migration 112
4. Verify: `SELECT COUNT(*) FROM academic_terms;` should return > 0

**Migration 116 will:** Populate default terms for all schools

---

### Scenario 3: Orphaned Scores (score_sheets has data, but wrong term_id)
**Symptom:** 
- `COUNT(*) FROM score_sheets` > 0 ✓
- `COUNT(*) FROM academic_terms` > 0 ✓
- `SELECT COUNT(*) FROM score_sheets ss LEFT JOIN academic_terms at ON ss.term_id = at.id WHERE at.id IS NULL` > 0 ✗

**Cause:** Scores were saved with OLD term_id (from obsolete `terms` table)

**Fix:**
1. Run: `SELECT DISTINCT term_id FROM score_sheets;` 
2. Check if those IDs exist in academic_terms: `SELECT id FROM academic_terms WHERE id IN (...)`
3. If not, delete orphaned scores and re-enter them
4. Or migrate term_ids to correct values (advanced)

**Migration 116 will:** Make term_id FK flexible to allow existing data

---

### Scenario 4: Results Query Returns Rows But Page Shows "Pending"
**Symptom:**
- `COUNT(*) FROM score_sheets` > 0 ✓
- Query finds scores ✓
- Results page still shows "Pending" ✗

**Cause:** Page code is not reading test1/test2/test3/test4/exam columns correctly

**Fix:**
1. Check `src/services/result-aggregation.service.ts` line 170-184
2. Verify the SELECT includes: test1, test2, test3, test4, exam columns
3. Check if column names match database schema
4. Add console.log() to see what data is returned

**Test manually:**
```sql
SELECT test1, test2, test3, test4, exam FROM score_sheets LIMIT 1;
-- Should show values if teacher entered them
```

---

## STEP-BY-STEP EMERGENCY FIX

If none of the above works, follow this:

### Step 1: Clear and Rebuild Everything

```sql
-- Run in Supabase SQL Editor (IN THIS ORDER)

-- 1. Delete all existing data
DELETE FROM score_sheets;
DELETE FROM academic_terms;
DELETE FROM academic_sessions;

-- 2. Verify it's deleted
SELECT COUNT(*) FROM score_sheets;        -- Should be 0
SELECT COUNT(*) FROM academic_terms;      -- Should be 0
SELECT COUNT(*) FROM academic_sessions;   -- Should be 0

-- 3. Recreate academic sessions
INSERT INTO academic_sessions (school_id, session_year, start_year, end_year, is_active)
SELECT DISTINCT school_id, '2025/2026', 2025, 2026, true FROM schools;

-- 4. Recreate academic terms
INSERT INTO academic_terms (session_id, school_id, term_name, term_order, start_date, end_date, is_active)
SELECT 
  as.id,
  as.school_id,
  'First Term',
  1,
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '90 days',
  true
FROM academic_sessions as;

-- 5. Verify
SELECT COUNT(*) FROM academic_sessions;  -- Should be > 0
SELECT COUNT(*) FROM academic_terms;     -- Should be > 0
```

### Step 2: Re-Enter Scores

1. Go to Teacher → Score Sheet
2. Select Class, Subject, Term
3. Enter test1=5 for one student
4. Click "Save Scores"
5. Check Supabase: `SELECT * FROM score_sheets;`
6. Verify score is there

### Step 3: Check Results Page

1. Go to Teacher → Results
2. Select same Class and Term
3. Look for the student
4. Should see test1=5 in the results table

---

## IF STILL NOT WORKING

Contact support with:
1. Screenshot of score_sheets data (first 3 rows)
2. Screenshot of academic_terms data
3. Screenshot of diagnostic query results
4. Error messages from browser console (F12 → Console tab)
5. Vercel build logs
6. Supabase query logs

---

## MIGRATIONS DEPLOYED

✅ Migration 111: Create academic_sessions & terms  
✅ Migration 112: Diagnostic & populate  
✅ Migration 113: Disable RLS  
✅ Migration 114: Fix score_sheets schema  
✅ Migration 115: Fix FK reference  
✅ Migration 116: Comprehensive diagnostic

All migrations are idempotent (safe to run multiple times)

---

## WHAT MIGRATION 116 DOES

1. **Ensures score_sheets table exists** with ALL required columns
2. **Makes term_id FK flexible** - doesn't strictly enforce FK if academic_terms is empty
3. **Ensures academic_terms exists** with required columns
4. **Creates default term** for every school if missing
5. **Creates performance indexes** for fast queries
6. **Provides verification queries** to check status

---

## FINAL CHECKLIST

- [ ] Run diagnostic queries from `DIAGNOSTIC_QUERIES_RUN_IN_SUPABASE.sql`
- [ ] Verify score_sheets has data: COUNT(*) > 0
- [ ] Verify academic_terms has data: COUNT(*) > 0
- [ ] Verify no orphaned scores: orphaned_count = 0
- [ ] Test results query manually
- [ ] Check results page loads scores
- [ ] If not, check browser console for errors
- [ ] If still not working, follow emergency fix steps

---

**Status:** All migrations committed and pushed. Diagnostic queries ready. Waiting for deployment to complete and data to be verified.
