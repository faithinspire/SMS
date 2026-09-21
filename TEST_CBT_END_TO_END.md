# End-to-End Testing Guide - CBT Results Auto-Sync

## 🎯 OBJECTIVE
Test that CBT exam results automatically appear in teacher scoresheets, results pages, and student result pages after migration 126 is executed.

---

## 📋 TEST CASE 1: Basic CBT Submission Flow

### Prerequisites
- ✅ Migration 126 executed successfully in Supabase
- ✅ Verification queries show trigger exists and is on `cbt_submissions`
- ✅ Application is running (npm run dev)
- ✅ Test student and teacher user accounts exist
- ✅ CBT exam is created and published

### Test Steps

#### Step 1: Student Takes CBT Exam
1. Login as student
2. Navigate to CBT Portal
3. Select an available exam
4. Complete the exam (answer all questions)
5. Click "Submit Exam"
6. System should auto-grade and show results

**Expected Results:**
- ✅ Submission status should be GRADED
- ✅ Score and percentage should display
- ✅ "Exam submitted successfully" message appears

**DB Verification:**
```sql
SELECT id, student_id, status, score, percentage, cbt_exam_id
FROM cbt_submissions
WHERE student_id = '[test_student_id]'
ORDER BY created_at DESC
LIMIT 1;
```
Should show: `status='GRADED'`, `score > 0`, `percentage > 0`

---

#### Step 2: Verify Trigger Fired & Score Sheet Created
**Wait 2-3 seconds for trigger to execute**

**DB Verification:**
```sql
SELECT ss.*, s.name as subject_name
FROM score_sheets ss
LEFT JOIN subjects s ON s.id = ss.subject_id
WHERE ss.student_id = '[test_student_id]'
  AND ss.created_at > NOW() - INTERVAL '5 minutes'
ORDER BY ss.created_at DESC
LIMIT 1;
```

Should show:
- ✅ Entry created (created_at is recent)
- ✅ One of: test1, test2, test3, test4, or exam > 0
- ✅ Source column (test1_source, exam_source, etc.) = 'CBT'
- ✅ CBT source column = submission_id
- ✅ academic_session_id is not NULL
- ✅ session_year is populated

**If no entry appears:**
- Check if cbt_exam has subject_id: `SELECT subject_id FROM cbt_exams WHERE id = [exam_id]`
- Check if submission has term_id: `SELECT term_id FROM cbt_submissions WHERE id = [submission_id]`
- Check trigger function logs in Supabase (Function → auto_populate_score_sheets_from_cbt)

---

#### Step 3: Teacher Verifies Score in Class Scoresheet
1. Login as teacher
2. Navigate to Class Scoresheet
3. Select same term/session as CBT exam
4. Find the student and subject
5. Look for the test score

**Expected Results:**
- ✅ Score appears in appropriate CA column (CA1, CA2, CA3, CA4) or Exam column
- ✅ Score value is correct (scaled 0-10 for CA, 0-60 for Exam)
- ✅ Source shows "CBT" or similar indicator
- ✅ Teacher can still edit the score if needed

**Example:**
- Student took CA1 exam, scored 35/50
- Should show: test1 = 7.0 (35/50 * 10)
- Source: CBT
- Source ID: [submission_id visible]

**If score doesn't appear:**
- Check if teacher has access to this class: `SELECT * FROM teacher_subjects WHERE teacher_id = [teacher_id]`
- Check if student enrolled in subject: `SELECT * FROM student_subjects WHERE student_id = [student_id] AND subject_id = [subject_id]`
- Reload the scoresheet page (may need cache refresh)

---

#### Step 4: Admin/Principal Views Results Page
1. Login as admin, principal, or headteacher
2. Navigate to Results → Results Management (or similar)
3. Select same term/session as CBT exam
4. Filter by class or view all

**Expected Results:**
- ✅ Student appears in results list
- ✅ Subject appears with CBT score
- ✅ Score shows in correct CA column
- ✅ Overall score includes CBT component
- ✅ Grade calculated correctly

**If score doesn't appear:**
- Check if user has school_id match: `SELECT school_id FROM users WHERE id = [user_id]`
- Check if score_sheets has data: `SELECT COUNT(*) FROM score_sheets WHERE exam_source = 'CBT'`
- Check if academic session is correct: `SELECT academic_session_id FROM score_sheets WHERE id = [id]`

---

#### Step 5: Student Views Their Results
1. Login as student
2. Navigate to My Results
3. Select same session and term
4. View results table

**Expected Results:**
- ✅ Subject appears in list
- ✅ CBT score shows in CA column (test1, test2, test3, test4) or Exam
- ✅ Total score includes CBT component
- ✅ Grade and remark calculated correctly
- ✅ Page displays without errors

**Example Display:**
```
Subject         | CA1  | CA2  | CA3  | CA4  | CA/40 | Exam | Total | Grade | Remark
Mathematics     | 7.5  | -    | -    | -    | 7.5   | -    | 7.5   | B     | Good
English         | 8.0  | 8.2  | -    | -    | 16.2  | -    | 16.2  | A     | Excellent
(CBT Tests)     | 6.5  | 7.2  | 6.8  | 7.0  | 27.5  | -    | 27.5  | A     | Excellent
```

**If score doesn't appear:**
- Check student enrollment: `SELECT * FROM student_subjects WHERE student_id = [student_id]`
- Check if term_id in score_sheets: `SELECT term_id FROM score_sheets WHERE student_id = [student_id] LIMIT 5`
- Check ResultAggregationService logs in browser console

---

## 📋 TEST CASE 2: Multiple Assessment Types

### Objective
Verify that different assessment types (CA1, CA2, CA3, CA4, EXAM) all work correctly.

### Prerequisites
- Create or have available 5 CBT exams with different assessment_types:
  - Exam 1: assessment_type = 'CA1'
  - Exam 2: assessment_type = 'CA2'
  - Exam 3: assessment_type = 'CA3'
  - Exam 4: assessment_type = 'CA4'
  - Exam 5: assessment_type = 'EXAM'

### Test Steps
1. **Student takes Exam 1 (CA1):**
   - Complete and submit
   - Verify score in score_sheets: `test1 > 0`, `test1_source = 'CBT'`
   - Verify in teacher scoresheet: CA1 column has score

2. **Student takes Exam 2 (CA2):**
   - Complete and submit
   - Verify score in score_sheets: `test2 > 0`, `test2_source = 'CBT'`
   - Verify in teacher scoresheet: CA2 column has score
   - Verify CA1 column still has previous score (not overwritten)

3. **Student takes Exam 3 (CA3):**
   - Complete and submit
   - Verify score in score_sheets: `test3 > 0`
   - Verify CA1 and CA2 untouched

4. **Student takes Exam 4 (CA4):**
   - Complete and submit
   - Verify score in score_sheets: `test4 > 0`
   - Verify CA1, CA2, CA3 untouched

5. **Student takes Exam 5 (EXAM):**
   - Complete and submit
   - Verify score in score_sheets: `exam > 0`, `exam_source = 'CBT'`
   - Verify all CA columns untouched

### Expected Results
**In Teacher Scoresheet:**
```
Student | CA1 | CA2 | CA3 | CA4 | CA/40 | Exam | Total
Alice   | 7.5 | 8.0 | 7.2 | 8.5 | 31.2  | 42.0 | 73.2
```

**In score_sheets table:**
```
student_id | subject_id | test1 | test2 | test3 | test4 | exam | test1_source | test2_source | test3_source | test4_source | exam_source | test1_cbt_source | ... | exam_cbt_source
-----------|------------|-------|-------|-------|-------|------|------|------|------|------|------|------|------|
[alice]    | [subj]     | 7.5   | 8.0   | 7.2   | 8.5   | 42.0 | CBT  | CBT  | CBT  | CBT  | CBT  | [sub1] | ... | [sub5]
```

**If any assessment type fails:**
- Check exam assessment_type: `SELECT id, assessment_type FROM cbt_exams ORDER BY created_at DESC`
- Check submission assessment_type: `SELECT id, assessment_type FROM cbt_submissions WHERE student_id = [id] ORDER BY created_at DESC`
- Verify trigger mapped correctly: `CASE WHEN assessment_type = 'CA2' THEN 'test2'...`

---

## 📋 TEST CASE 3: Score Scaling Accuracy

### Objective
Verify scores are scaled correctly (CA max 10, EXAM max 60).

### Test Setup
Create CBT exams with known max marks:
- Exam 1: total_marks = 50, assessment_type = 'CA1'
- Exam 2: total_marks = 100, assessment_type = 'EXAM'

### Student Answers
- Exam 1: Score 35/50
- Exam 2: Score 70/100

### Expected Results
**Exam 1 (CA1):**
- Raw: 35/50
- Scaled: (35/50) * 10 = 7.0
- Check: `SELECT test1 FROM score_sheets WHERE student_id = [id] AND test1_source = 'CBT' LIMIT 1`
- Should show: `test1 = 7.0`

**Exam 2 (EXAM):**
- Raw: 70/100
- Scaled: (70/100) * 60 = 42.0
- Check: `SELECT exam FROM score_sheets WHERE student_id = [id] AND exam_source = 'CBT' LIMIT 1`
- Should show: `exam = 42.0`

**If scaling is wrong:**
- Verify total_marks on exam: `SELECT total_marks FROM cbt_exams WHERE id = [exam_id]`
- Check migration formula: `ROUND((score / total_marks) * max) / 100`
- Verify endpoint is using correct scaling

---

## 📋 TEST CASE 4: Teacher Manual Entry Preservation

### Objective
Verify that existing teacher-entered scores are NOT overwritten by CBT scores.

### Setup
1. Teacher manually enters CA1 score: 8.5 for student Alice in Math
2. System shows: test1 = 8.5, test1_source = 'MANUAL'

### Test Steps
1. Student Alice takes CA1 CBT exam in Math
2. System auto-grades: score 30/50 = 6.0
3. Trigger fires and attempts to update score_sheets

### Expected Results
**In score_sheets:**
- test1 should REMAIN 8.5 (manual entry preserved)
- test1_source should REMAIN 'MANUAL'
- test1_cbt_source should be NULL or unchanged

**Verification:**
```sql
SELECT test1, test1_source, test1_cbt_source
FROM score_sheets
WHERE student_id = '[alice]' AND subject_id = '[math]';
```
Should show: `test1=8.5, test1_source='MANUAL', test1_cbt_source=NULL`

**In Teacher Scoresheet:**
- CA1 should show 8.5 (not overwritten to 6.0)

**If overwritten:**
- Check migration logic: `ON CONFLICT DO UPDATE SET test1 = COALESCE(EXCLUDED.test1, score_sheets.test1)`
- The COALESCE should preserve existing values
- If not working, check if it's CONFLICT clause preventing the update

---

## 📋 TEST CASE 5: Multi-School Isolation

### Objective
Verify CBT scores from one school don't leak to another school.

### Setup
- School A: 2 students, 1 teacher, CBT exams
- School B: 2 students, 1 teacher, CBT exams

### Test Steps
1. **School A Student 1 takes CBT exam:**
   - Submit and verify score appears in School A teacher's scoresheet
   - Verify score DOES NOT appear in School B teacher's scoresheet

2. **School B Student 1 takes CBT exam:**
   - Submit and verify score appears in School B teacher's scoresheet
   - Verify score DOES NOT appear in School A teacher's scoresheet

3. **School A Results Page:**
   - Should show ONLY School A students' scores
   - Should NOT show School B students

4. **School B Results Page:**
   - Should show ONLY School B students' scores
   - Should NOT show School A students

### Database Verification
```sql
-- Check School A scoresheet only has School A scores
SELECT COUNT(DISTINCT ss.school_id) as school_count
FROM score_sheets ss
JOIN students s ON s.id = ss.student_id
WHERE ss.school_id = '[school_a_id]'
  AND s.school_id = '[school_a_id]';
-- Should return 1 (only school_a_id)

-- Check no School A scores in School B
SELECT COUNT(*)
FROM score_sheets ss
WHERE ss.school_id = '[school_a_id]'
  AND EXISTS (
    SELECT 1 FROM students s
    WHERE s.id = ss.student_id AND s.school_id != '[school_a_id]'
  );
-- Should return 0 (no mismatches)
```

**If isolation fails:**
- Check if school_id properly set in cbt_submissions
- Verify trigger uses NEW.school_id from submission
- Check if teacher queries filter by school_id

---

## 📋 TEST CASE 6: Edge Cases

### Test 6.1: Exam with No Subject
**Setup:** Create exam with subject_id = NULL

**Student Action:** Submit exam

**Expected:**
- ❌ Score should NOT appear in score_sheets
- ✅ Submission marked GRADED
- ✅ No trigger execution (skipped due to missing subject_id)
- ✅ Error logged in trigger function

**Verification:**
```sql
SELECT * FROM score_sheets
WHERE student_id = [id] AND created_at > NOW() - INTERVAL '5 minutes';
-- Should return 0 rows
```

### Test 6.2: Student with No Class Assignment
**Setup:** Student enrolled but not assigned to class_arm_combo

**Student Action:** Submit CBT exam

**Expected:**
- ⚠️ Score may or may not sync (depends on migration logic)
- ✅ Submission marked GRADED
- ✅ No database error

### Test 6.3: No Academic Term Set
**Setup:** CBT exam submitted but submission has term_id = NULL

**Student Action:** Submit exam

**Expected:**
- ❌ Score should NOT sync to score_sheets
- ✅ Submission marked GRADED
- ✅ Trigger skips (term_id is NULL)

### Test 6.4: Zero Score
**Setup:** Student takes CBT but scores 0/50

**Student Action:** Submit exam

**Expected:**
- ✅ Score (0) appears in score_sheets
- ✅ Shows as 0.0 in teacher scoresheet
- ✅ Grade calculated (likely 'F' or 'E')
- ✅ No database errors

**Verification:**
```sql
SELECT test1, test1_source FROM score_sheets
WHERE student_id = [id] AND test1_source = 'CBT';
-- Should show test1 = 0.0
```

### Test 6.5: Perfect Score
**Setup:** Student scores 50/50

**Student Action:** Submit exam

**Expected:**
- ✅ Score appears as 10.0 in score_sheets (50/50 * 10)
- ✅ Shows in teacher scoresheet as 10.0
- ✅ Grade: 'A' or highest grade
- ✅ Overall calculation correct

---

## 🧪 TEST EXECUTION CHECKLIST

### Before Testing
- [ ] Migration 126 executed successfully
- [ ] Verification queries passed (trigger exists, backfill successful)
- [ ] Application running (npm run dev)
- [ ] Test student account created and enrolled
- [ ] Test teacher account created and assigned to class
- [ ] CBT exam created with questions
- [ ] CBT exam published and assigned to student

### Test Cases
- [ ] Test Case 1: Basic Flow (5 steps)
- [ ] Test Case 2: Multiple Assessment Types (5 subtests)
- [ ] Test Case 3: Score Scaling (2 exams)
- [ ] Test Case 4: Teacher Manual Entry Preservation (1 test)
- [ ] Test Case 5: Multi-School Isolation (4 subtests)
- [ ] Test Case 6: Edge Cases (5 subtests)

### Post-Testing
- [ ] All tests passed
- [ ] No errors in browser console
- [ ] No database errors
- [ ] Scores appear in all three locations (teacher scoresheet, results page, student results)
- [ ] Data integrity maintained (no cross-school leakage, no overwrites)
- [ ] Ready for production deployment

---

## 🚨 TROUBLESHOOTING

### Problem: Score doesn't appear after submission
**Steps:**
1. Check if submission status='GRADED': `SELECT status, score FROM cbt_submissions WHERE id = [id]`
2. Check if trigger fired: Look for score_sheets entry created recently
3. Check exam has subject_id: `SELECT subject_id FROM cbt_exams WHERE id = [exam_id]`
4. Check student has class: `SELECT class_arm_combo_id FROM students WHERE id = [student_id]`
5. Check term_id: `SELECT term_id FROM cbt_submissions WHERE id = [id]`
6. Review trigger logs in Supabase

### Problem: Score appears but value is wrong
**Steps:**
1. Calculate expected: (raw_score / exam_total_marks) * column_max
2. Compare with actual in score_sheets
3. Check exam total_marks: `SELECT total_marks FROM cbt_exams WHERE id = [exam_id]`
4. Verify assessment_type mapped to correct column

### Problem: Score appears but teacher can't see it in scoresheet
**Steps:**
1. Check teacher enrolled for subject: `SELECT * FROM teacher_subjects WHERE teacher_id = [id] AND subject_id = [subject_id]`
2. Check student in class: `SELECT * FROM students WHERE id = [student_id] AND class_arm_combo_id = [teacher_class_id]`
3. Reload teacher scoresheet page (cache issue)
4. Check API response in browser Network tab

### Problem: Results page shows error
**Steps:**
1. Check browser console for error messages
2. Check if academic_session_id populated: `SELECT academic_session_id FROM score_sheets LIMIT 1`
3. Verify student enrolled in subjects: `SELECT * FROM student_subjects WHERE student_id = [id]`
4. Review ResultAggregationService logs

---

## 📞 SUPPORT

If tests fail:
1. Review error message and troubleshooting steps above
2. Check verification queries in VERIFY_MIGRATION_126.sql
3. Inspect database directly to see if data exists
4. Review migration logic in database/migrations/126_fix_cbt_results_pipeline.sql
5. Check application logs for trigger execution errors
