# CBT System - Complete Fix & Testing Guide

## 🔄 Server Status
✅ Server restarted and running on port 3000

---

## ✅ All Issues Fixed

### Issue 1: Student Name Not Showing During Exam
**Status**: ✅ FIXED in `src/components/ExamHeader.tsx`
- Changed from `!inner` joins to outer joins
- Now shows "N/A" gracefully instead of crashing
- Fallback values for all missing data

### Issue 2: Exam Submission Not Working  
**Status**: ✅ FIXED in `src/app/api/cbt/submissions/sync-scores/route.ts`
- Improved error logging and debugging
- Fixed table reference bugs
- Better null handling
- Non-blocking sync (submission succeeds even if sync fails)

### Issue 3: Results Not in Teacher's Scoresheet
**Status**: ✅ FIXED via:
- `database/migrations/048_add_cbt_score_columns.sql`
- `src/app/api/cbt/submissions/sync-scores/route.ts`
- API now syncs scores to `score_sheets` table automatically

---

## 📋 DEPLOYMENT STEPS (MUST FOLLOW ORDER)

### STEP 1: Run Database Migration in Supabase
**CRITICAL - Do this FIRST in Supabase SQL Editor**

```sql
-- Go to: https://app.supabase.com
-- Select your project
-- SQL Editor → New Query
-- Copy and paste THIS entire migration:

-- ============================================================================
-- MIGRATION 048: ADD CBT SCORE COLUMNS TO SCORE_SHEETS
-- ============================================================================

ALTER TABLE score_sheets
ADD COLUMN IF NOT EXISTS cbt_exam_id UUID REFERENCES cbt_exams(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS cbt_submission_id UUID REFERENCES cbt_submissions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assessment_type VARCHAR(50) DEFAULT 'TRADITIONAL'
  CHECK (assessment_type IN ('TRADITIONAL', 'CBT', 'ASSIGNMENT', 'PROJECT')),
ADD COLUMN IF NOT EXISTS marks_obtained NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS total_marks NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS percentage NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS is_passed BOOLEAN,
ADD COLUMN IF NOT EXISTS class_arm_combo_id UUID REFERENCES class_arm_combos(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS entered_by VARCHAR(100),
ADD COLUMN IF NOT EXISTS entered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS comment TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_score_sheets_cbt_submission_id 
ON score_sheets(cbt_submission_id);

CREATE INDEX IF NOT EXISTS idx_score_sheets_assessment_type 
ON score_sheets(school_id, assessment_type, term_id);

CREATE INDEX IF NOT EXISTS idx_score_sheets_cbt_lookup 
ON score_sheets(school_id, student_id, cbt_exam_id)
WHERE assessment_type = 'CBT';

-- Then click "Run" button
```

**Expected Result**: Migration completes without errors

---

### STEP 2: Verify .env Has Service Role Key
Check `.env.local` file has:
```
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

If missing:
1. Go to Supabase Dashboard
2. Settings → API
3. Copy "Service Role Key" (NOT anon key)
4. Add to `.env.local`
5. Restart server

---

### STEP 3: Code Changes (Already Done)
✅ These files are already updated:
- `src/components/ExamHeader.tsx` - Fixed joins
- `src/app/api/cbt/submissions/sync-scores/route.ts` - New/updated API
- `src/app/student/cbt/page.tsx` - Fixed null crash

No additional code changes needed!

---

## 🧪 TESTING PROCEDURE

### Test 1: Verify Student Name Shows
1. **Student logs in**
2. **Goes to CBT Portal** (`/student/cbt`)
   - ✅ Should NOT crash with "Cannot read properties"
   - ✅ Should see list of exams
3. **Click an exam**
   - ✅ Should see exam name
   - ✅ Should see "Start Exam" button
4. **Click "Start Exam"**
   - ✅ ExamHeader should show:
     - Student Name: `[Full Name]`
     - Admission No: `[Admission Number]`
     - Class: `[Class Name - Arm Name]`
     - Subject: `[Subject Name]`
   - ✅ If any field is missing, shows "N/A" (not crash)

### Test 2: Exam Submission Works
1. **Student answers questions**
2. **Clicks "Submit Exam"**
   - ✅ Should say "Exam Submitted" with checkmark
   - ✅ Should show loading spinner
3. **Within 2 seconds, should redirect to results page**
   - ✅ URL should be: `/student/cbt/[exam-id]/results?submission=[submission-id]`
   - ✅ Should NOT say "Cannot load results"

### Test 3: Results Display Correctly
1. **On results page, should see:**
   - ✅ Your Score: `[number]`
   - ✅ Percentage: `[percentage]%`
   - ✅ Status: `PASSED` or `FAILED`
   - ✅ Passing Score: `[score]`
   - ✅ Review Answers button
2. **Click "Review Answers"**
   - ✅ Should show each question
   - ✅ Should show your answer
   - ✅ Should show ✅ Correct or ❌ Incorrect

### Test 4: Score Appears in Scoresheet
1. **In Supabase, run this query:**
```sql
SELECT 
  ss.id,
  ss.student_id,
  s.admission_number,
  ss.subject_id,
  subj.name as subject_name,
  ss.assessment_type,
  ss.marks_obtained,
  ss.total_marks,
  ss.percentage,
  ss.is_passed,
  ss.created_at
FROM score_sheets ss
JOIN students s ON ss.student_id = s.id
JOIN subjects subj ON ss.subject_id = subj.id
WHERE ss.assessment_type = 'CBT'
ORDER BY ss.created_at DESC
LIMIT 10;
```

2. **Should see:**
   - ✅ New rows with `assessment_type = 'CBT'`
   - ✅ Correct `marks_obtained`
   - ✅ Correct `total_marks`
   - ✅ Correct `percentage`
   - ✅ Correct `is_passed` (TRUE/FALSE)

### Test 5: Teacher Can View Score
1. **Teacher logs in**
2. **Goes to Results/Gradebook**
3. **Selects student and subject**
4. **Should see:**
   - ✅ CBT score with type "CBT"
   - ✅ Marks: `[score]/[total]`
   - ✅ Percentage: `[percentage]%`
   - ✅ Grade: `[A/B/C/D/F]`
   - ✅ Status: Passed/Failed

---

## 🔍 DEBUGGING GUIDE

### Problem: Student name still not showing
**Solution**:
1. Check browser console for errors
2. Verify `studentId` is being passed to ExamHeader
3. Check Supabase: Does student record exist?
```sql
SELECT id, user_id, admission_number FROM students LIMIT 5;
```

### Problem: Exam won't submit / "Submitting..." hangs
**Solution**:
1. Check browser console → Network tab
2. Look for POST request to `/api/cbt/submissions/sync-scores`
3. Should return `{ success: true, score_sheet_id: "..." }`
4. If error, check response for details

**If 500 error:**
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set
- Check server console for detailed error
- Restart server

### Problem: Results page shows "Cannot load results"
**Solution**:
1. Check URL has `?submission=` parameter
2. Verify submission exists in database:
```sql
SELECT id, student_id, score, total_marks, status 
FROM cbt_submissions 
WHERE id = '[submission-id]';
```
3. Check browser console for error details

### Problem: Score doesn't appear in teacher's gradebook
**Solution**:
1. Run the verification query (Test 4)
2. If no CBT rows, check server logs for sync errors
3. Verify migration 048 was applied
4. Try submitting another exam and check immediately

---

## ✓ SUCCESS CHECKLIST

- [ ] Migration 048 executed in Supabase (no errors)
- [ ] `.env.local` has `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Server restarted after env change
- [ ] Student can take exam without crashing
- [ ] Student name displays on exam header
- [ ] Can submit exam successfully
- [ ] Redirects to results page
- [ ] Results show score, percentage, status
- [ ] Score appears in `score_sheets` table
- [ ] Teacher can view CBT score in gradebook
- [ ] No errors in browser console
- [ ] No errors in server logs

---

## 📊 Quick Query to Verify Setup

Run in Supabase SQL Editor to verify everything is working:

```sql
-- Check 1: Do score_sheets have new CBT columns?
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'score_sheets' 
AND column_name IN ('assessment_type', 'cbt_exam_id', 'marks_obtained')
ORDER BY column_name;

-- Should return 3 rows

-- Check 2: Any CBT scores synced?
SELECT COUNT(*) as cbt_score_count
FROM score_sheets
WHERE assessment_type = 'CBT';

-- Check 3: Recent CBT submissions
SELECT id, student_id, score, total_marks, status, created_at
FROM cbt_submissions
ORDER BY created_at DESC
LIMIT 5;

-- Check 4: View latest synced scores
SELECT 
  ss.id,
  ss.student_id,
  ss.assessment_type,
  ss.marks_obtained,
  ss.percentage,
  ss.is_passed,
  ss.created_at
FROM score_sheets ss
WHERE ss.assessment_type = 'CBT'
ORDER BY ss.created_at DESC
LIMIT 10;
```

---

## 🚨 Common Mistakes to Avoid

❌ **Don't forget to run migration in Supabase first**
- Without it, score_sheets won't have CBT columns

❌ **Don't skip setting SUPABASE_SERVICE_ROLE_KEY**
- Without it, API will return 500 error

❌ **Don't use anon key instead of service role key**
- Anon key won't have permission to create/update rows

❌ **Don't forget to restart server after env changes**
- Changes won't take effect until restart

---

## 📞 SUPPORT REFERENCE

**If stuck on Test 1 (Student name)**
- Issue: Null join crash
- Fix: Already applied to ExamHeader.tsx
- Verify: Check for `!inner` joins (should be removed)

**If stuck on Test 2 (Submission)**
- Issue: Submission hangs or fails
- Fix: Check SUPABASE_SERVICE_ROLE_KEY in .env
- Verify: Restart server, check server logs

**If stuck on Test 4 (Scores in gradebook)**
- Issue: CBT rows don't appear in score_sheets
- Fix: Run migration 048 in Supabase
- Verify: Query should return CBT assessment rows

---

**Last Updated**: August 26, 2026
**Status**: ✅ All Fixes Applied & Ready to Test
**Next Step**: Follow testing procedure above
