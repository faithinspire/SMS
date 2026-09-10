# End-to-End Test Guide: Unified Score Sheet Architecture

**Date:** August 25, 2026  
**Status:** Complete Implementation  
**Data Flow Validation:** Single source of truth via `score_sheets` table

---

## 🎯 Test Objective

Verify that the complete unified architecture works end-to-end:
1. Subject Teacher enters scores manually
2. CBT scores auto-populate from student submission
3. Class Teacher sees aggregated results (no re-entry)
4. Student sees final report card (all scores from canonical source)

---

## 📋 Pre-Test Requirements

### Database State
- [ ] Migration 043 executed: `drop result_entries, student_subject_enrollment, teacher_assignments`
- [ ] Migration 044 executed: Verify `score_sheets` table exists with all columns
- [ ] Verify no data in `result_entries`, `student_subject_enrollment`, `teacher_assignments` tables
- [ ] Current term is marked as `is_current=true` in `terms` table

### Test Data Setup
- [ ] Create test school (if not exists)
- [ ] Create test term marked as current
- [ ] Create test academic session
- [ ] Create test classes/arms
- [ ] Create test students with enrollments
- [ ] Create test subjects
- [ ] Assign subject teacher to subjects+classes
- [ ] Assign class teacher to class
- [ ] Enroll students in subjects (via `student_subjects` table)

---

## 🧪 Test Scenarios

### Scenario 1: Subject Teacher Manual Score Entry

**Goal:** Verify subject teacher can enter scores and they flow to `score_sheets`

**Steps:**

1. **Login as Subject Teacher**
   - Navigate to `/teacher/subject-score-sheet`
   - Expected: Page loads successfully
   - Expected: Subject teacher's assigned subjects appear in dropdown

2. **Select Subject and Class**
   - Select a subject from dropdown
   - Expected: Classes where teacher teaches that subject appear
   - Select a class
   - Expected: Students in that subject+class appear in table
   - **CRITICAL:** Only students enrolled in BOTH the subject AND in that class should appear
   - Verify: `subject_teacher_assignments` JOIN `student_subjects` is working

3. **Enter Scores**
   - Enter Test1: 8/10
   - Enter Test2: 7/10
   - Enter Test3: 9/10
   - Enter Test4: 8/10
   - Enter Exam: 45/60
   - Expected: Total auto-calculates to 77/100
   - Expected: Grade auto-calculates to A (70+)
   - Click "✅ Save All Scores"

4. **Verify Score Sheet Entry**
   ```sql
   SELECT * FROM score_sheets 
   WHERE student_id='{STUDENT_ID}' 
   AND subject_id='{SUBJECT_ID}' 
   AND term_id='{CURRENT_TERM_ID}'
   ```
   - Expected: Record exists
   - Expected: test1=8, test2=7, test3=9, test4=8, exam=45
   - Expected: total=77, grade='A'
   - Expected: test1_source='MANUAL', test2_source='MANUAL', etc.
   - Expected: test*_cbt_source=NULL (since manual entry)

**Test Result:** ✅ PASS / ❌ FAIL

---

### Scenario 2: CBT Score Auto-Population

**Goal:** Verify student's CBT submission auto-populates into `score_sheets`

**Prerequisites:**
- Create a CBT exam with:
  - `assessment_type='CA1'` (maps to test1 column)
  - `subject_id` = same as Scenario 1
  - `total_marks=100`
  - Add 5 MCQ questions with correct answers marked

**Steps:**

1. **Create CBT Exam**
   - Navigate to teacher CBT management
   - Create exam with assessment_type='CA1' (or CA2, CA3, CA4, EXAM)
   - Add questions and mark correct options
   - Make exam available to students

2. **Student Takes CBT**
   - Login as student from Scenario 1
   - Navigate to `/student/cbt`
   - Find and start the CBT exam
   - Answer questions (aim for 75/100 = 7.5/10 when scaled)
   - Submit exam
   - Expected: System auto-grades MCQ questions
   - Expected: Calculates percentage

3. **Verify Auto-Population**
   ```sql
   SELECT * FROM score_sheets 
   WHERE student_id='{STUDENT_ID}' 
   AND subject_id='{SUBJECT_ID}' 
   AND term_id='{CURRENT_TERM_ID}'
   ```
   - Expected: SAME record from Scenario 1 is UPDATED (not duplicated)
   - Expected: test1 is NOW populated (was NULL before if this was first CA1)
   - Expected: test1_source='CBT' (changed from MANUAL if re-taken)
   - Expected: test1_cbt_source='{SUBMISSION_ID}' (links to cbt_submissions)
   - Expected: total is re-calculated with new test1

4. **Verify Using Verification API**
   ```
   GET /api/cbt/verify-auto-population?submission_id={SUBMISSION_ID}
   ```
   - Expected: Returns success=true
   - Expected: Shows actual test1 value populated
   - Expected: Shows test1_source='CBT'

**Test Result:** ✅ PASS / ❌ FAIL

---

### Scenario 3: Class Teacher Aggregated View

**Goal:** Verify class teacher sees all subject scores aggregated (no re-entry)

**Steps:**

1. **Login as Class Teacher**
   - Navigate to `/teacher/results`
   - Expected: Page loads with class information
   - Expected: Class teacher's assigned class displays
   - **CRITICAL:** Should NOT have class selector (only their assigned class)

2. **View Student Results**
   - Expected: Student from Scenario 1 appears in grid
   - Expected: Shows: Name, Admission #, # Subjects (should be 3+), Avg Total, Grade
   - Click on student card to open detail modal

3. **Verify Subject Breakdown**
   - Expected: Modal shows subject-by-subject table
   - Expected: Rows for all subjects the student is enrolled in
   - Row for subject from Scenarios 1-2:
     - Test1: 8 (or CBT value) with source label (MANUAL or CBT)
     - Test2: 7 with source label
     - Test3: 9 with source label
     - Test4: 8 with source label
     - CA Total: 32
     - Exam: 45 with source label
     - Total: 77
     - Grade: A
   - Expected: Source indicators clearly show MANUAL vs CBT
   - **CRITICAL:** No edit buttons present - class teacher CANNOT modify

4. **Verify Aggregated Stats**
   - Expected: Shows number of subjects
   - Expected: Shows average of all subject totals
   - Expected: Shows aggregated grade

**Test Result:** ✅ PASS / ❌ FAIL

---

### Scenario 4: Student Report Card View

**Goal:** Verify student sees their complete report card from canonical source

**Steps:**

1. **Login as Student**
   - Navigate to `/student/results`
   - Expected: Page loads successfully

2. **Select Current Term**
   - Select current term from dropdown
   - Expected: Term loads

3. **Verify Report Card**
   - Expected: Results table displays
   - Subject from Scenarios 1-2:
     - Subject Name and Code display correctly
     - Test 1-4 scores from score_sheets
     - Exam score from score_sheets
     - Total: 77/100
     - Grade: A
   - Expected: Source is transparent (if CBT, might show in tooltip/comment)
   - Expected: All subjects the student is enrolled in appear

4. **Verify No Direct Edit**
   - Expected: No edit buttons on student results page
   - Expected: Scores are read-only

5. **Verify API Data Source**
   ```
   GET /api/student/report-card?school_id={SCHOOL_ID}&student_id={STUDENT_ID}&term_id={CURRENT_TERM_ID}
   ```
   - Expected: Returns report_card with all score_sheets data
   - Expected: Scores match what student sees in UI
   - Expected: Overall stats calculated correctly

**Test Result:** ✅ PASS / ❌ FAIL

---

### Scenario 5: Data Integrity Check

**Goal:** Verify only ONE source of truth exists (no duplicates)

**Steps:**

1. **Count Records**
   ```sql
   -- CRITICAL: These should all be 0 (tables deleted)
   SELECT COUNT(*) FROM result_entries;
   SELECT COUNT(*) FROM student_subject_enrollment;
   SELECT COUNT(*) FROM teacher_assignments;
   
   -- CRITICAL: This should have data for all test scenarios
   SELECT COUNT(*) FROM score_sheets;
   ```
   - Expected: result_entries count = 0
   - Expected: student_subject_enrollment count = 0
   - Expected: teacher_assignments count = 0
   - Expected: score_sheets count > 0

2. **Verify Uniqueness**
   ```sql
   -- Check UNIQUE constraint
   SELECT school_id, student_id, subject_id, term_id, COUNT(*) as cnt
   FROM score_sheets
   GROUP BY school_id, student_id, subject_id, term_id
   HAVING COUNT(*) > 1;
   ```
   - Expected: Returns 0 rows (no duplicates)

3. **Verify All Scores Come From score_sheets**
   ```sql
   -- Get all subjects with scores
   SELECT DISTINCT ss.subject_id, count(ss.id) as score_count
   FROM score_sheets ss
   GROUP BY ss.subject_id;
   ```
   - Expected: Shows distribution of scores by subject
   - Expected: All from score_sheets (not elsewhere)

**Test Result:** ✅ PASS / ❌ FAIL

---

### Scenario 6: Source Tracking Verification

**Goal:** Verify source='MANUAL' vs 'CBT' tracking works correctly

**Steps:**

1. **Manual Scores Show Correct Source**
   ```sql
   SELECT student_id, subject_id, test1, test1_source, test2_source, exam_source
   FROM score_sheets
   WHERE test1_source='MANUAL'
   LIMIT 5;
   ```
   - Expected: Shows manual entries with source='MANUAL'

2. **CBT Scores Show Correct Source**
   ```sql
   SELECT student_id, subject_id, test1, test1_source, test1_cbt_source
   FROM score_sheets
   WHERE test1_source='CBT'
   LIMIT 5;
   ```
   - Expected: Shows CBT entries with source='CBT'
   - Expected: test1_cbt_source links to valid cbt_submissions record

3. **Verify CBT Linkage**
   ```sql
   SELECT ss.id, ss.test1, ss.test1_cbt_source, cs.id, cs.score
   FROM score_sheets ss
   LEFT JOIN cbt_submissions cs ON ss.test1_cbt_source = cs.id
   WHERE ss.test1_source='CBT'
   LIMIT 5;
   ```
   - Expected: All CBT source scores link to valid submissions
   - Expected: Score values make sense (scaled correctly)

**Test Result:** ✅ PASS / ❌ FAIL

---

## ✅ Success Criteria

ALL of the following must be TRUE for complete success:

1. ✅ Subject teachers can enter scores and they appear in `score_sheets`
2. ✅ CBT submissions auto-populate into `score_sheets` with correct scaling
3. ✅ CBT scores update existing `score_sheets` entries (no duplicates)
4. ✅ Class teachers see aggregated results (no edit capability)
5. ✅ Students see their report cards from canonical `score_sheets` source
6. ✅ Source tracking (MANUAL vs CBT) is correct and visible
7. ✅ No data in deleted tables (result_entries, student_subject_enrollment, teacher_assignments)
8. ✅ UNIQUE constraint prevents duplicate entries
9. ✅ All three paths (manual, CBT, aggregation) read from single `score_sheets` table
10. ✅ No data duplication across tables

---

## 📊 Test Summary Template

| Scenario | Test | Result | Notes |
|----------|------|--------|-------|
| 1 | Subject Teacher Manual Entry | ✅/❌ | |
| 2 | CBT Auto-Population | ✅/❌ | |
| 3 | Class Teacher Aggregated View | ✅/❌ | |
| 4 | Student Report Card | ✅/❌ | |
| 5 | Data Integrity | ✅/❌ | |
| 6 | Source Tracking | ✅/❌ | |

**Overall Result:** ✅ ALL PASS / ❌ SOME FAILURES

---

## 🔍 Debugging Tips

If tests fail:

1. **Check Score Sheet Query**
   - Verify term_id is correct (use `is_current=true`)
   - Verify student_subjects enrollment exists
   - Check subject_teacher_assignments for class filters

2. **Check CBT Integration**
   - Run: `GET /api/cbt/verify-auto-population?submission_id={ID}`
   - Check cbt_exams.assessment_type is correctly set
   - Verify cbt_exams.subject_id matches

3. **Check API Endpoints**
   - POST /api/subject-scores - manual entry
   - POST /api/student/cbt/submit - CBT submission
   - GET /api/teacher/results - class teacher view
   - GET /api/student/report-card - student view

4. **Check UI Components**
   - Subject Teacher: src/app/teacher/subject-score-sheet/page.tsx
   - Class Teacher: src/app/teacher/results/page.tsx
   - Student: src/app/student/results/page.tsx

---

## 📝 Notes

- All timestamps should use UTC
- Grade calculation: A=70+, B=60-69, C=50-59, D=40-49, F=<40
- Test totals are capped at 40 (test1+2+3+4)
- Exam is capped at 60
- Grand total is capped at 100 (40+60)
- Source tracking enables audit trail and transparency

---

**Test Document Version:** 1.0  
**Last Updated:** August 25, 2026  
**Architecture:** Canonical score_sheets, Single Source of Truth
