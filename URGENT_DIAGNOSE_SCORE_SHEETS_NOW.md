# ⚠️ URGENT: Score Sheets Empty - Diagnostic & Fix Guide

## Current Situation

**Error:** `[StudentDetail] Subjects count: 0` + `[StudentDetail] No scores found`

**What's happening:**
- Teachers say they're entering scores in the scoresheet
- Scores should appear in results pages
- BUT the API returns 0 subjects/scores
- This means the **score_sheets table is completely EMPTY**

---

## Root Cause

The API modified to query `score_sheets` directly is working correctly - it's just returning **0 records** because:

**Either:**
1. ❌ Scores are NOT being saved to `score_sheets` table when teachers click "Save"
2. ❌ Scores are being saved to a DIFFERENT table (old `result_entries` perhaps)
3. ❌ Scores are saved with WRONG term_id or school_id values

**Most Likely:** The scoresheet form is still submitting to the wrong endpoint or the wrong database table.

---

## Step 1: Check if Scores Exist in Database

**You need to run this SQL query in Supabase SQL Editor:**

```sql
-- Check if ANY scores exist
SELECT 
  COUNT(*) as total_scores,
  COUNT(CASE WHEN test1 IS NOT NULL THEN 1 END) as test1_count,
  COUNT(CASE WHEN test2 IS NOT NULL THEN 1 END) as test2_count,
  COUNT(CASE WHEN test3 IS NOT NULL THEN 1 END) as test3_count,
  COUNT(CASE WHEN test4 IS NOT NULL THEN 1 END) as test4_count,
  COUNT(CASE WHEN exam IS NOT NULL THEN 1 END) as exam_count
FROM score_sheets;
```

**Expected result if scores exist:**
```
total_scores | test1_count | test2_count | test3_count | test4_count | exam_count
    150      |     120     |     115     |     110     |     105     |     95
```

**Actual result if scores DO NOT exist:**
```
total_scores | test1_count | test2_count | test3_count | test4_count | exam_count
      0      |      0      |      0      |      0      |      0      |     0
```

---

## Step 2: If Scores EXIST - Check for Data Issues

If the query shows scores exist, run this:

```sql
-- Check where scores are stored
SELECT 
  school_id,
  student_id,
  term_id,
  COUNT(*) as score_count
FROM score_sheets
GROUP BY school_id, student_id, term_id
LIMIT 10;
```

**Check if:**
- `school_id` matches your school
- `term_id` is NOT NULL
- `term_id` exists in `academic_terms` table

---

## Step 3: If Scores DO NOT EXIST - Find Where They Are

Check the old `result_entries` table:

```sql
-- Are scores in the old result_entries table?
SELECT COUNT(*) as count FROM result_entries;

-- Get sample records
SELECT * FROM result_entries LIMIT 5;
```

If scores ARE in `result_entries`:
- Teachers are entering scores into the OLD system
- We need to MIGRATE those scores to `score_sheets`
- OR update the API to query `result_entries` instead

---

## Step 4: Check the Scoresheet Form - Where Do Scores Go?

Find the scoresheet save endpoint:

**Look for:** `src/app/api/teacher/score-sheet` or similar

**Check what happens when teachers click "Save":**
- Does it save to `score_sheets` table?
- Does it save to `result_entries` table?
- Does it save to some other location?

The endpoint MUST save to `score_sheets` table or the results pages won't work.

---

## Quick Fix Options

### Option A: Scores ARE in score_sheets but with wrong filters

**Problem:** API filters by term_id/school_id but data has different values

**Fix:** Run this to fix mismatched foreign keys:

```sql
-- Ensure all score_sheets have valid term_id references
UPDATE score_sheets s
SET term_id = (
  SELECT id FROM academic_terms 
  WHERE school_id = s.school_id 
  AND is_active = true
  LIMIT 1
)
WHERE s.term_id IS NULL;

-- Verify fix
SELECT COUNT(*) FROM score_sheets WHERE term_id IS NULL;
-- Should return 0
```

### Option B: Scores ARE in result_entries (old table)

**Problem:** Scores saved to old system, API looking in new system

**Fix Option 1:** Migrate old scores to new system:

```sql
-- Copy from result_entries to score_sheets
INSERT INTO score_sheets (
  school_id, student_id, subject_id, term_id,
  test1, test2, test3, test4, exam,
  created_at, updated_at
)
SELECT
  school_id, student_id, subject_id, term_id,
  ca1 as test1, ca2 as test2, ca3 as test3, ca4 as test4, exam_score as exam,
  created_at, updated_at
FROM result_entries
WHERE NOT EXISTS (
  SELECT 1 FROM score_sheets ss
  WHERE ss.student_id = result_entries.student_id
  AND ss.subject_id = result_entries.subject_id
  AND ss.term_id = result_entries.term_id
)
ON CONFLICT DO NOTHING;
```

**Fix Option 2:** Update API to query result_entries instead (quick but not preferred):

```typescript
// In /api/results/student/[studentId]/route.ts
const { data: scores } = await supabase
  .from('result_entries')  // ← Use old table instead
  .select(`...`)
  .eq('school_id', schoolId)
  .eq('student_id', studentId)
  .eq('term_id', termId)
```

### Option C: Scoresheet form not saving at all

**Problem:** Form has UI bugs, save button doesn't work

**Fix:**
1. Go to `/teacher/score-sheet` page
2. Open browser DevTools (F12)
3. Go to Network tab
4. Enter a test score and click Save
5. Look for the API call in Network tab
6. Check if it succeeds or fails
7. If fails, look at response to see error message

---

## Immediate Diagnostic Steps (DO THESE NOW)

### 1. Open Supabase Console

**Go to:** https://supabase.com  
**Select:** Your SMS project  
**Go to:** SQL Editor

### 2. Run Diagnostic Query #1

```sql
SELECT 
  'score_sheets' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN test1 IS NOT NULL THEN 1 END) as filled_records
FROM score_sheets

UNION ALL

SELECT 
  'result_entries' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN ca1 IS NOT NULL THEN 1 END) as filled_records
FROM result_entries
```

**This will show you where scores ACTUALLY are:**
- If `score_sheets` has 0 records → Scores not saving to new system
- If `result_entries` has records → Scores in old system

### 3. Open Browser Console

**On the teacher results page:**
1. Press F12
2. Go to Console tab
3. Look for messages like:
   ```
   [API] DEBUG - Query params: { schoolId: '...', studentId: '...', termId: '...' }
   [API] DEBUG - Scores returned: []
   [API] DIAGNOSTIC - Any scores for this student: 0
   ```

**This tells you:**
- What parameters the API is using
- If ANY scores exist for that student (even with wrong term)

### 4. Ask Teachers to Re-Enter One Score

1. Have a teacher go to `/teacher/score-sheet`
2. Enter ONE test score for ONE student in ONE subject
3. Click "Save"
4. Immediately run the SQL query again to check if score appears in score_sheets

**This proves:** Is the save function working or not?

---

## Summary of Diagnosis Flowchart

```
Are there scores in score_sheets?
│
├─ YES → Check if term_id matches current term
│  └─ NO → Run Option A fix (set term_id)
│  └─ YES → API filtering might be wrong, debug API params
│
└─ NO → Are there scores in result_entries?
   │
   ├─ YES → Run Option B fix (migrate to score_sheets)
   │
   └─ NO → No scores anywhere
      └─ Scoresheet save endpoint broken
         └─ Check /teacher/score-sheet form
         └─ Check what API it calls when saving
         └─ Fix form to save to correct table
```

---

## What You'll Find

Based on my analysis, one of these will be TRUE:

**Scenario 1 (Most Likely):**
- SQL query shows `score_sheets` count = **0**
- SQL query shows `result_entries` count = **150+**
- **Diagnosis:** Teachers ARE entering scores but saving to OLD table
- **Fix:** Migrate scores from `result_entries` → `score_sheets` using Option B

**Scenario 2 (Possible):**
- SQL query shows `score_sheets` count = **0**
- SQL query shows `result_entries` count = **0**
- **Diagnosis:** Scoresheet save is completely broken
- **Fix:** Fix the `/teacher/score-sheet` form save endpoint

**Scenario 3 (Unlikely):**
- SQL query shows `score_sheets` count = **150+**
- API returns 0 scores
- **Diagnosis:** Data exists but API filtering is too strict
- **Fix:** Check term_id, school_id, student_id values in database

---

## IMMEDIATE ACTION REQUIRED

**Do this NOW:**

1. ✅ Open Supabase SQL Editor
2. ✅ Run the diagnostic query (see "Step 1" above)
3. ✅ **Tell me the result** (screenshot or paste the numbers)
4. ✅ Based on the result, I'll give you the exact fix

**Once you tell me which scenario is happening, I can:**
- Provide the exact SQL migration script
- Update the API endpoint
- Fix the scoresheet form
- Get scores displaying within 5 minutes

---

## Files to Check Manually

If you want to look at the code:

- **Scoresheet Save Endpoint:** Look for `src/app/api/teacher/score-sheet` or `src/app/api/subject-scores`
- **Results API:** `src/app/api/results/student/[studentId]/route.ts` (I already fixed this)
- **Scoresheet Form Page:** `src/app/teacher/score-sheet/page.tsx`

---

**NEXT STEP:** Run the SQL diagnostic query and reply with the results. I'll then provide the exact fix for your specific situation.
