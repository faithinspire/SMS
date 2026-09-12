# 🧪 SMS System - Testing Execution Guide

## Status: Ready for Testing

This guide provides step-by-step instructions to execute all tests from **PHASE_6_TESTING_VERIFICATION.md**.

---

## 📋 Pre-Test Checklist

Before starting tests, verify:
- [ ] All code changes saved
- [ ] Server running: `npm run dev` (should show: "compiled successfully")
- [ ] Supabase connection working (check in browser console)
- [ ] Migration 106 executed in Supabase
- [ ] Browser DevTools ready (F12)
- [ ] Test school exists in Supabase
- [ ] Test data populated (classes, subjects, arms)

---

## 🚀 Test Execution (Step-by-Step)

### TEST 1: User Registration & Authentication

#### Sub-test 1.1: School Admin Can Register
**Estimated Time:** 5 minutes
```
1. Open: http://localhost:3000
2. Navigate to Admin Registration (if available) or Auth Page
3. Register as: admin@testschool.com / TestPass123
4. Verify: ✅ "Admin registered successfully"
5. Check Supabase:
   SELECT * FROM users WHERE email = 'admin@testschool.com' AND role = 'SCHOOL_ADMIN';
   → Should show 1 row with role = 'SCHOOL_ADMIN'
```
**Expected Result:** ✅ Admin account created with SCHOOL_ADMIN role

#### Sub-test 1.2: Teacher Registration Via Admin
**Estimated Time:** 10 minutes
```
1. Login as: admin@testschool.com
2. Navigate to: Dashboard → Register Teacher
3. Fill form:
   - Level: SECONDARY
   - Name: John Teacher
   - Email: john@testschool.com
   - Password: TestPass123
   - Bank: ABC Bank / Account: 123456 / Salary: 50000
   - Class: Select any secondary class
   - Subjects: Select 2-3 subjects
4. Submit
5. Verify: ✅ "Teacher registered successfully"
6. Check Supabase:
   SELECT * FROM users WHERE email = 'john@testschool.com' AND role = 'TEACHER';
   SELECT * FROM teachers WHERE email = 'john@testschool.com';
   SELECT * FROM subject_teacher_assignments WHERE teacher_id = (SELECT id FROM users WHERE email = 'john@testschool.com');
   → Should show: 1 user, 1 teacher record, 2-3 subject assignments
```
**Expected Result:** ✅ Teacher created with all assignments saved

#### Sub-test 1.3: Student Registration Via Admin
**Estimated Time:** 10 minutes
```
1. Navigate to: Dashboard → Register Student
2. Fill form:
   - Name: Jane Student
   - Email: jane@testschool.com
   - Password: TestPass123
   - DOB: 2010-01-15
   - Parent: Mr. Parent / Phone: 0801234567
   - Section: SECONDARY
   - Class: Select class (should populate when section selected)
   - Arm: Select arm
   - Subjects: Select 2-3 subjects
3. Submit
4. Verify: ✅ "Student registered successfully"
5. Check Supabase:
   SELECT * FROM users WHERE email = 'jane@testschool.com' AND role = 'STUDENT';
   SELECT * FROM students WHERE id = (SELECT id FROM students WHERE user_id = (SELECT id FROM users WHERE email = 'jane@testschool.com'));
   SELECT * FROM student_subjects WHERE student_id = (SELECT id FROM students WHERE user_id = (SELECT id FROM users WHERE email = 'jane@testschool.com'));
   SELECT COUNT(*) FROM score_sheets WHERE student_id = (SELECT id FROM students WHERE user_id = (SELECT id FROM users WHERE email = 'jane@testschool.com'));
   → Should show: 1 user, 1 student, 2-3 subject enrollments, 2-3 score sheets (auto-created)
```
**Expected Result:** ✅ Student created with auto-created score sheets

---

### TEST 2: Data Integrity & Foreign Keys

#### Sub-test 2.1: Verify FK Constraints Exist
**Estimated Time:** 5 minutes
```
In Supabase SQL Editor, run:
-- Check score_sheets → academic_terms FK
SELECT constraint_name FROM information_schema.table_constraints
WHERE table_name = 'score_sheets' AND constraint_type = 'FOREIGN KEY';
→ Should show: fk_score_sheets_term_id_academic_terms

-- Check cbt_exams → academic_terms FK
SELECT constraint_name FROM information_schema.table_constraints
WHERE table_name = 'cbt_exams' AND constraint_type = 'FOREIGN KEY';
→ Should show: fk_cbt_exams_term_id_academic_terms

-- Check students → class_arm_combos FK
SELECT constraint_name FROM information_schema.table_constraints
WHERE table_name = 'students' AND constraint_type = 'FOREIGN KEY'
AND constraint_name LIKE '%class_arm%';
→ Should show: fk_students_class_arm_combo_id
```
**Expected Result:** ✅ All FK constraints present

#### Sub-test 2.2: Check for Orphaned Records
**Estimated Time:** 5 minutes
```
In Supabase SQL Editor, run:
-- Check for orphaned students
SELECT COUNT(*) FROM students s
WHERE NOT EXISTS (SELECT 1 FROM class_arm_combos ca WHERE ca.id = s.class_arm_combo_id);
→ Should return: 0 (no orphans)

-- Check for orphaned score_sheets
SELECT COUNT(*) FROM score_sheets ss
WHERE NOT EXISTS (SELECT 1 FROM students s WHERE s.id = ss.student_id);
→ Should return: 0 (no orphans)

-- Check for orphaned cbt_submissions
SELECT COUNT(*) FROM cbt_submissions cs
WHERE NOT EXISTS (SELECT 1 FROM students s WHERE s.id = cs.student_id);
→ Should return: 0 (no orphans)
```
**Expected Result:** ✅ Zero orphaned records

---

### TEST 3: Teacher & Student Workflow

#### Sub-test 3.1: Teacher Creates CBT Exam
**Estimated Time:** 15 minutes
```
1. Login as: john@testschool.com (teacher)
2. Navigate to: CBT Management
3. Create Exam:
   - Title: "Math Test 1"
   - Subject: Select a subject
   - Class: Select the class you teach
   - Type: TEST (test_number = 1)
   - Total Marks: 100
   - Passing %: 50
   - Duration: 30 minutes
   - Click: Create Exam
4. Verify: ✅ "Exam created successfully" + Exam ID shown
5. Add Questions (10 MCQ):
   For each question:
   a. Question text: "Question X"
   b. Type: MULTIPLE_CHOICE
   c. Marks: 10
   d. Add 4 options (A, B, C, D)
   e. Mark one as correct
   f. Click: Add Question
6. Verify: ✅ Each question added successfully
7. Publish Exam:
   - Click: Publish
   - Verify: ✅ Exam published (status = PUBLISHED)
8. Check Supabase:
   SELECT * FROM cbt_exams WHERE title = 'Math Test 1' AND created_by = (SELECT id FROM users WHERE email = 'john@testschool.com');
   SELECT COUNT(*) FROM cbt_questions WHERE cbt_exam_id = 'EXAM_ID';
   → Should show: 1 exam, 10 questions
```
**Expected Result:** ✅ Exam created with 10 questions

#### Sub-test 3.2: Student Takes CBT Exam
**Estimated Time:** 15 minutes
```
1. Login as: jane@testschool.com (student)
2. Navigate to: My CBT Exams (or Student Portal)
3. Verify: ✅ "Math Test 1" appears in exam list
4. Click: Start Exam
5. Verify: ✅ Timer starts, exam interface displays
6. Answer Questions:
   - For each question: Select an option (answer ~7/10 correctly)
   - Use navigation: Previous/Next buttons
   - Verify: Timer counting down
7. Submit Exam:
   - Click: Submit Exam
   - Confirm: "Are you sure?"
   - Click: Yes, submit
   - Verify: ✅ "Exam submitted successfully"
8. Check Supabase:
   SELECT * FROM cbt_submissions WHERE student_id = (SELECT id FROM students WHERE user_id = (SELECT id FROM users WHERE email = 'jane@testschool.com')) AND cbt_exam_id = 'EXAM_ID';
   → Should show: 1 submission with score ~70 (7/10 correct = 70%)
   
   SELECT * FROM cbt_answers WHERE submission_id = 'SUBMISSION_ID';
   → Should show: 10 answers with is_correct = true/false
   
   SELECT test1, test1_source FROM score_sheets WHERE student_id = (SELECT id FROM students WHERE user_id = (SELECT id FROM users WHERE email = 'jane@testschool.com')) AND subject_id = 'SUBJECT_ID';
   → Should show: test1 = 70, test1_source = 'CBT'
```
**Expected Result:** ✅ Exam submitted, auto-scored, score synced to report card

#### Sub-test 3.3: Verify Scoring Accuracy
**Estimated Time:** 5 minutes
```
In Supabase SQL Editor:
SELECT 
  cs.score,
  cs.percentage,
  cs.passed,
  COUNT(ca.id) as total_answers,
  SUM(CASE WHEN ca.is_correct THEN 1 ELSE 0 END) as correct_answers
FROM cbt_submissions cs
LEFT JOIN cbt_answers ca ON ca.submission_id = cs.id
WHERE cs.status = 'GRADED'
GROUP BY cs.id;

→ Expected:
  - score = correct_answers * (total_marks / total_questions)
  - percentage = (score / total_marks) * 100
  - passed = percentage >= passing_percentage
```
**Expected Result:** ✅ Scoring calculations accurate

---

### TEST 4: Cascading Selectors (Registration)

#### Sub-test 4.1: Teacher Registration Cascading
**Estimated Time:** 10 minutes
```
1. Go to: Teacher Registration
2. Step 1: Select "PRIMARY"
3. Verify: ✅ Class dropdown shows ONLY primary classes
4. Select a primary class
5. Submit and go back
6. Step 1: Select "SECONDARY"
7. Verify: ✅ Class dropdown shows ONLY secondary classes
8. Select secondary class
9. Verify: ✅ Arm dropdown populates
10. Select an arm
11. Verify: ✅ If arm is for SS1/SS2/SS3, stream dropdown appears
12. Select subjects
13. Verify: ✅ Only subjects for selected class level appear
```
**Expected Result:** ✅ All cascading selectors work correctly

#### Sub-test 4.2: Student Registration Cascading
**Estimated Time:** 10 minutes
```
1. Go to: Student Registration (Step 3: Academic Placement)
2. Select Section: "SECONDARY"
3. Verify: ✅ Class dropdown populates with secondary classes
4. Select a class
5. Verify: ✅ Arm dropdown populates with arms for that class
6. Select an arm
7. Verify: ✅ If SS1/SS2/SS3, stream dropdown appears (optional)
8. Verify: ✅ Subject list filtered by selected class level
9. Can select multiple subjects
```
**Expected Result:** ✅ All cascading selectors work correctly

---

### TEST 5: Dashboard Data Loading

#### Sub-test 5.1: Admin Dashboard
**Estimated Time:** 5 minutes
```
1. Login as: admin@testschool.com
2. Navigate to: Dashboard
3. Verify visible:
   - School name
   - Total students count
   - Total teachers count
   - Total classes count
   - Active exams count
   - Recent registrations list
   - Class overview table
4. Verify: ✅ All numbers match Supabase data
5. Open F12 → Network tab
6. Find: /api/admin/dashboard request
7. Verify: ✅ Response status 200
8. Check response data matches displayed values
```
**Expected Result:** ✅ Admin dashboard displays real data

#### Sub-test 5.2: Teacher Dashboard
**Estimated Time:** 5 minutes
```
1. Login as: john@testschool.com
2. Navigate to: Dashboard
3. Verify visible:
   - Teacher name
   - My classes (should show class+arm combos where class_teacher_id = user_id)
   - My subjects (should show subjects from subject_teacher_assignments)
   - My students count
   - Recent CBT exams
4. Verify: ✅ All data matches Supabase
5. Open F12 → Network tab
6. Find: /api/teacher/dashboard request
7. Verify: ✅ Response status 200
```
**Expected Result:** ✅ Teacher dashboard displays assignments

#### Sub-test 5.3: Student Dashboard
**Estimated Time:** 5 minutes
```
1. Login as: jane@testschool.com
2. Navigate to: Dashboard
3. Verify visible:
   - Student name
   - My class (e.g., "SS2 - Arm A")
   - My subjects (2-3 subjects enrolled)
   - Subject teachers
   - Current term results (if scores exist)
   - Available exams
4. Verify: ✅ All data correct
5. Open F12 → Network tab
6. Find: /api/student/dashboard request
7. Verify: ✅ Response status 200
```
**Expected Result:** ✅ Student dashboard displays class and subjects

---

### TEST 6: Results Display & Export

#### Sub-test 6.1: View Results
**Estimated Time:** 5 minutes
```
1. Login as: jane@testschool.com (student)
2. Navigate to: My Results
3. Verify visible:
   - Current term selector
   - Subject list with scores
   - Columns: Subject, Test1-4, Exam, Total, Grade
   - Current term results showing from score_sheets
   - Grade color-coding (A=green, C=yellow, F=red)
4. Verify: ✅ All scores from DB visible
5. Switch term (if available)
6. Verify: ✅ Results update for selected term
```
**Expected Result:** ✅ Results display correctly

#### Sub-test 6.2: Export to CSV
**Estimated Time:** 5 minutes
```
1. On Results page
2. Click: Export to CSV
3. Verify: ✅ CSV file downloads
4. Open CSV in spreadsheet application
5. Verify: ✅ Contains:
   - Header with column names
   - All subject rows with scores
   - Proper formatting (no broken quotes)
   - Timestamps
6. Open F12 → Console
7. Verify: ✅ No errors during export
```
**Expected Result:** ✅ CSV export works correctly

#### Sub-test 6.3: Print Report
**Estimated Time:** 5 minutes
```
1. On Results page
2. Click: Print Report
3. Verify: ✅ New window opens with formatted HTML
4. Verify visible:
   - School name (header)
   - Student name and info
   - Class information
   - Results table with colors
   - Professional styling
5. Click: Print (in print dialog)
6. Verify: ✅ Print preview shows properly formatted report
7. Cancel print
```
**Expected Result:** ✅ Print report displays professionally

---

### TEST 7: API Validation

#### Sub-test 7.1: Missing Required Fields
**Estimated Time:** 5 minutes
```
Using Postman or curl, test API validation:

Test 1: POST /api/auth/register - missing email
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"password":"test123","full_name":"Test"}'
→ Expected: 400 with error: "Missing required fields"

Test 2: POST /api/cbt/create - invalid school_id
curl -X POST http://localhost:3000/api/cbt/create \
  -H "Content-Type: application/json" \
  -d '{"school_id":"invalid","exam_type":"TEST",...}'
→ Expected: 400 with error: "Invalid school_id format"

Test 3: GET /api/student/dashboard - no auth
curl http://localhost:3000/api/student/dashboard
→ Expected: 401 with error: "Unauthorized"
```
**Expected Result:** ✅ All validation errors return appropriate responses

#### Sub-test 7.2: Authorization Checks
**Estimated Time:** 5 minutes
```
Test 1: Student tries to access /api/admin/dashboard
→ Expected: 403 with error: "Only school admins can access"

Test 2: Teacher tries to register student
→ Expected: 403 with error: "Only SCHOOL_ADMIN can register"

Test 3: Student tries to view class results
→ Expected: 403 with error: "Not teacher of this class"
```
**Expected Result:** ✅ All authorization checks working

---

### TEST 8: Browser Console Quality

#### Sub-test 8.1: Check for Errors
**Estimated Time:** 10 minutes
```
1. Open browser F12 → Console tab
2. Navigate through:
   - Registration pages
   - Dashboard pages
   - Results pages
   - CBT exam taking
3. Look for: Red X (console.error) or yellow warning triangles
4. If errors found:
   - Take screenshot
   - Note the error message
   - Check if it's a real error or warning
5. Expected: ✅ NO RED X ERRORS
   - May see yellow warnings (can be ignored)
```
**Expected Result:** ✅ Console clean (no red errors)

#### Sub-test 8.2: Verify Console Logs
**Estimated Time:** 5 minutes
```
Perform actions and check console logs:

Teacher registers:
✅ Should see logs like:
  "[Registration] Form submitted"
  "[Auth] Creating auth user..."
  "[Teacher] Teacher record created"
  "[Subjects] Assigning subjects..."

Student takes exam:
✅ Should see logs like:
  "[CBT] Starting exam..."
  "[CBT] Question loaded"
  "[Scoring] Auto-scoring submission..."
  "[Results] Score synced to report card"
```
**Expected Result:** ✅ Appropriate console logging visible

---

### TEST 9: Performance Verification

#### Sub-test 9.1: Page Load Times
**Estimated Time:** 10 minutes
```
1. Open DevTools → Network tab
2. Load each page and note time:
   - Admin dashboard: Should be < 3 seconds
   - Teacher dashboard: Should be < 3 seconds
   - Student dashboard: Should be < 2 seconds
   - CBT exam interface: Should be < 2 seconds
   - Results page: Should be < 3 seconds

If times exceed limits:
  - Check Network tab for slow requests
  - Look for large bundle sizes
  - Check for blocking requests
```
**Expected Result:** ✅ All pages < 3 seconds

#### Sub-test 9.2: Database Query Efficiency
**Estimated Time:** 5 minutes
```
1. Open DevTools → Network tab
2. Filter for API requests (/api/*)
3. Check each API call:
   - Dashboard APIs: Should return < 1 second
   - Results APIs: Should return < 1 second
   - CBT APIs: Should return < 1 second
4. Look for:
   - Unnecessary large payloads
   - Repeated similar requests
   - Missing pagination

If issues found:
  - Note which API is slow
  - Check if it needs optimization
```
**Expected Result:** ✅ All APIs respond < 1 second

---

### TEST 10: Multi-Tenancy Verification

#### Sub-test 10.1: Data Isolation Between Schools
**Estimated Time:** 10 minutes
```
Setup: Create 2 test schools (if not already done)

Test 1: Create admin1 for School A, admin2 for School B
Test 2: Login as admin1
  - Register teacher1, student1
  - Create CBT exam1
Test 3: Login as admin2
  - Register teacher2, student2
  - Create CBT exam2
Test 4: Login as admin1
  - Check: Can only see school A data (teacher1, student1, exam1)
  - Check: Cannot see school B data (teacher2, student2, exam2)
Test 5: Check database:
  SELECT school_id, COUNT(*) FROM users WHERE role = 'TEACHER' GROUP BY school_id;
  → Should show: teacher1 in SchoolA, teacher2 in SchoolB
```
**Expected Result:** ✅ Complete data isolation between schools

#### Sub-test 10.2: Teacher Can't Access Other School's Classes
**Estimated Time:** 5 minutes
```
1. Have teacher1 (SchoolA) logged in
2. Try to access direct URL: /api/teacher/dashboard?schoolId=SCHOOLB_ID
3. Expected: 403 error (unauthorized)
4. Check: Teacher only sees SchoolA classes in dropdown
5. If trying to manually change schoolId in API call
6. Expected: API rejects the request
```
**Expected Result:** ✅ Teacher cannot cross school boundaries

---

### TEST 11: End-to-End Workflow Test

#### Complete 30-Minute Workflow
**Estimated Time:** 30 minutes
```
SCENARIO: Full workflow from registration to results

1. [5 min] Admin registers teacher (John, Math, Class SS2A)
2. [5 min] Admin registers 3 students (Jane, Jack, Jill) in SS2A
3. [5 min] John creates CBT exam (10 questions)
   - Students auto-see in portal
4. [5 min] Each student takes exam
   - Jane: 8/10 correct = 80% = B
   - Jack: 7/10 correct = 70% = C
   - Jill: 6/10 correct = 60% = D
5. [3 min] View results:
   - As John: See all 3 student scores
   - As Jane: See only own score (80, B)
6. [2 min] Export results as CSV
7. Verify:
   ✅ All data correct
   ✅ All scores synced to score_sheets
   ✅ All dashboards show correct info
   ✅ No console errors
```
**Expected Result:** ✅ Complete workflow works end-to-end

---

## ✅ Test Summary Checklist

Mark as you complete each test:

**Phase 1 (Database):**
- [ ] TEST 2.1 - FK constraints exist
- [ ] TEST 2.2 - No orphaned records

**Phase 2 (Registration):**
- [ ] TEST 1.1 - Admin registration
- [ ] TEST 1.2 - Teacher registration
- [ ] TEST 1.3 - Student registration
- [ ] TEST 4.1 - Teacher cascading
- [ ] TEST 4.2 - Student cascading

**Phase 3 (CBT):**
- [ ] TEST 3.1 - Teacher creates exam
- [ ] TEST 3.2 - Student takes exam
- [ ] TEST 3.3 - Scoring accuracy

**Phase 4 (Dashboards):**
- [ ] TEST 5.1 - Admin dashboard
- [ ] TEST 5.2 - Teacher dashboard
- [ ] TEST 5.3 - Student dashboard

**Phase 5 (Results):**
- [ ] TEST 6.1 - View results
- [ ] TEST 6.2 - Export CSV
- [ ] TEST 6.3 - Print report

**General:**
- [ ] TEST 7.1 - API validation
- [ ] TEST 7.2 - Authorization
- [ ] TEST 8.1 - Console quality
- [ ] TEST 8.2 - Console logs
- [ ] TEST 9.1 - Page load times
- [ ] TEST 9.2 - Query efficiency
- [ ] TEST 10.1 - Data isolation
- [ ] TEST 10.2 - School boundaries
- [ ] TEST 11 - End-to-end workflow

---

## 🎯 Success Criteria

**System is PRODUCTION READY when:**
- ✅ All tests pass without errors
- ✅ Console shows NO red X errors
- ✅ All page loads < 3 seconds
- ✅ All APIs respond < 1 second
- ✅ Multi-tenancy working (data isolated)
- ✅ Role-based access working
- ✅ All data from real Supabase (no mocks)
- ✅ All features respond as expected

---

## 📊 Test Results Template

```
TESTING RESULTS
===============

Date Tested:          [DATE]
Tester Name:          [NAME]
Environment:          [dev/staging/prod]
Build Version:        [VERSION]
Database:             Supabase [URL]

Tests Executed:       XX / XX
Tests Passed:         XX
Tests Failed:         XX
Critical Issues:      XX
Minor Issues:         XX

Details:
[List any failures or issues found]

Sign-Off:
Tested By: ____________  Date: __________
Approved By: __________  Date: __________

Status: ✅ READY FOR PRODUCTION / ❌ NEEDS FIXES
```

---

## 🆘 If Tests Fail

**Step 1: Identify the Issue**
- Check console (F12 → Console tab)
- Check Network tab for API errors
- Note exact error message and step

**Step 2: Check Database**
- Verify migration 106 executed
- Verify test data exists
- Check FK constraints

**Step 3: Verify Code**
- Ensure all files created properly
- Check for typos in API routes
- Verify school_id is valid UUID

**Step 4: Common Issues**

Issue: "FK constraint violated"
→ Check if term_id is valid, execute migration 106

Issue: "Missing data in dropdown"
→ Verify test data exists in Supabase

Issue: "Student doesn't see exam"
→ Check exam status = 'PUBLISHED', student enrolled in subject

Issue: "Scores not syncing"
→ Check CBTScoringService logs, verify term_id

Issue: "Console errors"
→ Check F12 → Network for API error responses

---

## ✨ Next Steps After Testing

If all tests pass:
1. ✅ Ready for production deployment
2. ✅ Notify stakeholders
3. ✅ Schedule UAT (User Acceptance Testing) with school
4. ✅ Create user training documentation
5. ✅ Plan go-live date

If issues found:
1. Document all failures
2. Prioritize by severity
3. Fix and re-test
4. Return to Step 1

---

**Good luck with testing! 🚀**

**Remember:** Testing thoroughly now prevents major issues in production!
