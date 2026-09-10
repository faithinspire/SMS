# Test CBT Integration: Step-by-Step

## Current Status
✅ **CBT scores are now automatically integrated into Student Results page**

The system now fetches:
- Traditional scores from `score_sheets` (teacher-entered)
- **NEW:** CBT exam scores from `cbt_submissions` (from completed CBT exams)

## Test Steps

### 1. Ensure You Have Test Data

**Check if you have CBT submissions:**
```sql
-- Run in Supabase SQL Editor
SELECT COUNT(*) as graded_submissions 
FROM cbt_submissions 
WHERE status = 'GRADED';
```

If **count = 0**, you need to:
1. Create a CBT exam (as teacher)
2. Have a student take it
3. Ensure it's marked as GRADED

### 2. Login as Student

1. Go to **http://localhost:3001**
2. Select **"Student Login"**
3. Use student credentials (example: student@school.edu)

### 3. Navigate to Results

1. Click **"Dashboard"** (if not auto-redirected)
2. Click **"Results"** or **"View Results"**
3. Select a **Session** (e.g., 2025/2026)
4. Select a **Term** (e.g., First Term)

### 4. Verify Display

You should see:

#### Console Output (F12 → Console tab)
```
[ResultAgg] ✅ Fetched 3 score sheets
[ResultAgg] ✅ Fetched 2 CBT submissions
[ResultAgg] Processing 2 CBT submissions
[ResultAgg] CBT: English Midterm (MIDTERM), Score: 72/100, Grade: A
[StudentResults] Result loaded: 5 subjects
```

#### Results Display
```
Subject Results for [Student Name]
Admission Number: ADM001
Class: JSS3A
Session: 2025/2026
Term: First Term

Subjects:
┌─────────────────────────────┐
│ Mathematics                 │
├─────────────────────────────┤
│ CA1: 15  CA2: 16  CA3: 14   │
│ CA4: 17  Exam: 65           │
│ Total: 75  Grade: A         │
│ Remark: Excellent           │
└─────────────────────────────┘

┌─────────────────────────────┐
│ English (CBT)               │ ← NEW CBT EXAM
├─────────────────────────────┤
│ CA1: 0   CA2: 0   CA3: 0    │
│ CA4: 72  Exam: 0            │
│ Total: 72  Grade: A         │
│ Remark: Excellent           │
│ Teacher: System (CBT)       │
└─────────────────────────────┘

Overall Performance:
Overall Score: 73.5
Overall Grade: A
Status: PASS
```

### 5. Verify Data Accuracy

Compare console log data with display:
- ✅ Score matches CBT submission score
- ✅ Grade calculation is correct
- ✅ Subject name includes "(CBT)" tag
- ✅ Teacher shows "System (CBT)"

## Common Issues & Fixes

### Issue: No CBT scores showing, only traditional scores
**Cause:** Student has no graded CBT submissions

**Fix:**
1. Create a CBT exam (Teacher Dashboard → CBT Management)
2. Have student take the exam
3. Grade it (teacher dashboard)
4. Refresh student results page

### Issue: CBT shows but with score 0
**Cause:** `cbt_submissions.score` or `cbt_submissions.percentage` is NULL

**Fix:**
```sql
-- Update missing percentage
UPDATE cbt_submissions 
SET percentage = (score / (
  SELECT total_marks FROM cbt_exams WHERE id = cbt_exam_id
)) * 100
WHERE percentage IS NULL AND status = 'GRADED';
```

### Issue: Overall grade doesn't include CBT
**Cause:** CBT subjects not being added to the array

**Fix:** Check console for errors:
```javascript
// If you see an error, it's likely:
"Cannot read property 'cbt_exams' of undefined"
// This means the join didn't work - check Supabase permissions
```

### Issue: Page shows "Result loaded: 0 subjects"
**Cause:** 
1. Student has no scores at all (traditional or CBT)
2. Wrong term/session selected
3. Student not enrolled

**Fix:**
```sql
-- Verify student is enrolled in a subject
SELECT COUNT(*) FROM student_subject_enrollments 
WHERE student_id = 'student-uuid' 
AND class_arm_combo_id = 'class-uuid';

-- Check if student has any scores
SELECT COUNT(*) FROM score_sheets 
WHERE student_id = 'student-uuid';

SELECT COUNT(*) FROM cbt_submissions 
WHERE student_id = 'student-uuid' 
AND status = 'GRADED';
```

## Expected Console Logs

**Successful load:**
```
[StudentResults] Loading sessions for school: abc-123
[StudentResults] Sessions loaded: 1
[StudentResults] Auto-selecting session: 2025/2026
[StudentResults] Loading terms for session: abc-123
[StudentResults] Terms loaded: 3
[StudentResults] Loading results for term: xyz-789
[ResultAgg] Query results: schoolId=abc-123, studentId=stu-123, termId=xyz-789
[ResultAgg] ✅ Fetched 3 score sheets
[ResultAgg] ✅ Fetched 2 CBT submissions
[ResultAgg] Processing 2 CBT submissions
[ResultAgg] CBT: Mathematics CA4 (CA4), Score: 72/100, Grade: A
[ResultAgg] CBT: English Midterm (MIDTERM), Score: 85/100, Grade: A
[StudentResults] Result loaded: 5 subjects
```

**No scores:**
```
[ResultAgg] ⚠️ No scores found for student stu-123 in term xyz-789
[StudentResults] Result loaded: 0 subjects
```

## Performance

The integration fetches:
1. Score sheets (usually 4-8 records per student per term)
2. CBT submissions (usually 0-3 records)
3. User data (1 separate query per CBT if needed)

**Expected load time:** 200-500ms per student

**To optimize:** Add indexes on:
```sql
CREATE INDEX idx_cbt_submissions_student_term 
ON cbt_submissions(student_id, term_id, status);
```

---

**Test now and check console for logs!** If you see CBT exams in the results, the integration is working. 🎉
