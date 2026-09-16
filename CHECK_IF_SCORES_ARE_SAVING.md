# CHECK: Are Scores Actually Saving to Database?

## The Issue
User entered scores in the scoresheet, but results page still shows "PENDING". This could mean:
1. ✅ Scores ARE saving, but page displays them wrong (FIXED by page.tsx changes)
2. ❌ Scores are NOT saving to database (need to check)
3. ❌ Scores saving to wrong table/field (need to verify)

## Quick Check: Is Any Data in score_sheets?

### In Supabase SQL Editor, run:
```sql
SELECT COUNT(*) as total_scores FROM score_sheets;
```

**Expected Result:**
- If `total_scores > 0`: Scores ARE being saved ✅
- If `total_scores = 0`: Scores are NOT being saved ❌

---

## If Scores ARE Being Saved (total_scores > 0)

Then the issue is DISPLAY-ONLY and the page.tsx fix should work.

**What to do:**
1. Push code changes to Vercel
2. Rebuild the app
3. Test results page again
4. Should see scores now

---

## If Scores are NOT Being Saved (total_scores = 0)

This means the form is not saving data correctly.

### Step 1: Check if Score Entry API is Working
Run this in SQL Editor:
```sql
-- Check if API endpoint exists
SELECT 
  schemaname,
  tablename 
FROM pg_tables 
WHERE tablename = 'score_sheets';
```

Should return: `public | score_sheets`

### Step 2: Check Score Entry Form
**Go to:** `/teacher/score-sheet`

**What to look for:**
1. Can you see students listed?
2. Can you enter scores?
3. Does it say "Score saved successfully"?

**If form doesn't work:**
- Check browser console for errors (F12 → Console)
- Look for API errors
- Check network tab to see if request succeeds

### Step 3: Check Score Entry API Endpoint
**File to check:** `src/app/api/subject-scores/route.ts`

**What it should do:**
- Accept POST request with student_id, subject_id, test1, test2, etc.
- Save to score_sheets table
- Return success response

### Step 4: Manual Test - Insert Score Directly
**In Supabase SQL Editor:**
```sql
-- Get sample data first
SELECT id, admission_number FROM students LIMIT 1;
SELECT id, name FROM subjects LIMIT 1;
SELECT id FROM academic_terms LIMIT 1;
SELECT id FROM schools LIMIT 1;

-- Insert a test score
INSERT INTO score_sheets (
  school_id,
  student_id,
  subject_id,
  term_id,
  test1,
  test2,
  test3,
  test4,
  exam
) VALUES (
  'SCHOOL_ID_HERE',
  'STUDENT_ID_HERE',
  'SUBJECT_ID_HERE',
  'TERM_ID_HERE',
  8.5,
  7.0,
  8.0,
  9.5,
  42.0
);

-- Verify it was inserted
SELECT * FROM score_sheets WHERE student_id = 'STUDENT_ID_HERE';
```

If this works, then the API issue is in the form submission.

---

## Run Diagnostic Migration 119

This migration checks everything and shows detailed output.

**In Supabase SQL Editor:**
1. Copy entire content of: `database/migrations/119_check_score_sheet_data.sql`
2. Paste into SQL Editor
3. Click "Execute"
4. Check the output/logs

**What it will show:**
```
Total score_sheets records: 45
  - With test1 populated: 32
  - With test2 populated: 28
  - With test3 populated: 25
  - With test4 populated: 20
  - With exam populated: 45

System totals:
  - Schools: 5
  - Students: 150
  - Subjects: 25
  - Terms: 15

ACTION REQUIRED or SUCCESS: [depending on data]
```

---

## Scoring System Flowchart

```
Teacher goes to /teacher/score-sheet
    ↓
Selects student, subject, term
    ↓
Enters Test1, Test2, Test3, Test4, Exam scores
    ↓
Clicks "Save Score"
    ↓
POST to /api/subject-scores
    ↓
API validates data
    ↓
API saves to score_sheets table
    ↓
"Score saved successfully" toast message
    ↓
Teacher goes to /teacher/results
    ↓
Clicks on student
    ↓
Results page calls /api/results/student/[id]?schoolId=X&termId=Y
    ↓
API queries score_sheets table
    ↓
Returns scores with test1, test2, test3, test4, exam fields
    ↓
Page displays in table columns
```

---

## Checklist to Verify Score Entry is Working

- [ ] Can access `/teacher/score-sheet` page
- [ ] Page shows students list
- [ ] Can enter a score and click "Save"
- [ ] See "Score saved successfully" message
- [ ] Browser console (F12) shows no errors
- [ ] When running `SELECT COUNT(*) FROM score_sheets;` → result > 0
- [ ] When running query test from Migration 119 → shows scores
- [ ] Go to results page → sees scores in table

---

## If Everything is Configured Correctly But Still No Scores

### Check API Endpoint

**File:** `src/app/api/subject-scores/route.ts`

Look for:
```typescript
INSERT INTO score_sheets (
  school_id,
  student_id,
  subject_id,
  term_id,
  test1,
  test2,
  test3,
  test4,
  exam
) VALUES (...)
```

If this code is missing or wrong, scores won't save.

### Check Supabase RLS Policies

**In Supabase Dashboard:**
1. Go to Authentication → Policies
2. Find policies for score_sheets table
3. Verify INSERT is allowed for authenticated users

If RLS blocks INSERT, no data saves even if form works.

---

## What The Fixes Do

**File 1: page.tsx (Results Display Fix)**
- Shows scores from API response
- Uses correct field names (test1/2/3/4, not ca1/2/3/4)
- Displays score in correct column

**File 2: Migration 119 (Diagnostic)**
- Checks if score_sheets has data
- Shows sample record
- Tests the results query
- Provides detailed diagnostic output

---

## Summary

1. **If scores ARE in database:** Page fix will display them ✅
2. **If scores are NOT in database:** Check score entry form is working ❌
3. **Run Migration 119 to diagnose** the exact issue

Next step: Run Migration 119 and share the output to see exactly what's happening.
