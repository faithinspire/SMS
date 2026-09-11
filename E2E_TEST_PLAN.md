# End-to-End Testing Plan: FTECH School Management Software
## Production Build Verification - September 2026

### SCOPE
Comprehensive testing of fixes implemented in this session:
1. Deletion endpoints (404 error fix)
2. Class-level based subject catalogue
3. CBT→score_sheets auto-population pipeline
4. Payment schema enhancements
5. SS stream/department selection

---

## TEST ENVIRONMENT SETUP

### Pre-Test Checklist
- [ ] All migrations (019, 103, 104) have been applied to Supabase
- [ ] Latest code changes pushed to Git
- [ ] Application deployed to Vercel
- [ ] Database backups taken
- [ ] Test user accounts created for each role
- [ ] Test school created with test data

### Test Users
- **Super Admin**: superadmin@test.com / password123
- **School Admin**: admin@testschool.com / password123
- **Teacher (PRIMARY)**: teacher_primary@test.com / password123
- **Teacher (JSS)**: teacher_jss@test.com / password123
- **Teacher (SS)**: teacher_ss@test.com / password123
- **Student (PRIMARY)**: student_primary@test.com / password123
- **Student (JSS)**: student_jss@test.com / password123
- **Student (SS)**: student_ss@test.com / password123

---

## TEST 1: DELETION ENDPOINTS (Task #1)

### 1.1 School Deletion
**Objective**: Verify school deletion calls correct endpoint with Bearer token

**Steps**:
1. Login as Super Admin
2. Navigate to Schools page
3. Select a test school
4. Click Delete button
5. Confirm deletion

**Expected Result**:
- ✓ No 404 error
- ✓ Request goes to `/api/superadmin/schools/{id}/delete` (not `/api/schools/{id}`)
- ✓ Bearer token sent in Authorization header
- ✓ School deleted from database
- ✓ Success message displayed

**Verification**:
```
Browser Dev Tools → Network tab
→ Search for "delete"
→ Verify: Method=DELETE, URL=/api/superadmin/schools/{id}/delete
→ Verify: Headers contain "Authorization: Bearer {token}"
```

### 1.2 Staff Deletion
**Objective**: Verify staff member deletion uses correct endpoint

**Steps**:
1. Login as School Admin
2. Navigate to Staff page
3. Click Delete on a staff member
4. Confirm deletion

**Expected Result**:
- ✓ No 404 error
- ✓ Request goes to `/api/school-admin/staff/{id}/delete`
- ✓ Bearer token sent in Authorization header
- ✓ Staff member deleted
- ✓ Success message displayed

### 1.3 Student Deletion
**Objective**: Verify student deletion uses correct endpoint

**Steps**:
1. Login as School Admin
2. Navigate to Students page
3. Click Delete on a student
4. Confirm deletion

**Expected Result**:
- ✓ No 404 error
- ✓ Request goes to `/api/school-admin/students/{id}/delete`
- ✓ Bearer token sent in Authorization header
- ✓ Student deleted
- ✓ Success message displayed

---

## TEST 2: CLASS-LEVEL SUBJECT FILTERING (Task #2)

### 2.1 PRIMARY Class Subject Filtering
**Objective**: Verify PRIMARY classes (Prep, KG, Primary 1-6) show only PRIMARY subjects

**Steps**:
1. Create teacher → Select "Primary School"
2. Go to Step 4 (Teaching Assignment)
3. Select "Primary 3" class
4. Check subjects dropdown

**Expected Result**:
- ✓ Only PRIMARY subjects displayed: English, Math, Science, Social Studies, etc.
- ✓ No JSS subjects (Biology, Chemistry, Physics, etc.)
- ✓ No SSS subjects (Economics, Accounting, etc.)
- ✓ Subjects filtered via `applicable_to_levels` array containing level 5

**Verification**:
```
Browser Dev Tools → Console
→ Check CanonicalSubjectService logs
→ Verify: "Loaded X subjects for Primary 3"
→ Subjects match PRIMARY curriculum
```

### 2.2 JSS Class Subject Filtering
**Objective**: Verify JSS classes (JSS1-3) show only JSS subjects

**Steps**:
1. Create teacher → Select "Secondary School"
2. Go to Step 4
3. Select "JSS 2" class
4. Check subjects dropdown

**Expected Result**:
- ✓ Only JSS subjects displayed: English, Math, Basic Science, Basic Technology, etc.
- ✓ No PRIMARY subjects
- ✓ No SSS-only subjects (Economics, Accounting)
- ✓ Subjects filtered via `applicable_to_levels` array containing level 10

### 2.3 SS Class Subject Filtering
**Objective**: Verify SSS classes (SS1-3) show SSS subjects

**Steps**:
1. Create teacher → Select "Secondary School"
2. Go to Step 4
3. Select "SS 1" class
4. Check subjects dropdown

**Expected Result**:
- ✓ SSS subjects displayed: English, Math, Biology, Chemistry, Physics, Economics, etc.
- ✓ No PRIMARY or JSS-only subjects
- ✓ Subjects filtered via `applicable_to_levels` array containing level 12

### 2.4 Student Registration Subject Filtering
**Objective**: Verify students see correct subjects for their class

**Steps**:
1. Register student → Select "Primary 4" class
2. Check subjects dropdown

**Expected Result**:
- ✓ Only PRIMARY subjects for level 6 displayed
- ✓ No subject mixing between levels

---

## TEST 3: CBT→SCORE_SHEETS PIPELINE (Task #3)

### 3.1 CBT Creation with Assessment Type & Term
**Objective**: Verify CBT exam creation requires assessment_type and term_id

**Steps**:
1. Login as teacher
2. Navigate to CBT Creation
3. Try to create exam WITHOUT selecting Assessment Type
4. Try to create exam WITHOUT selecting Term

**Expected Result**:
- ✓ Form validation error: "Please fill in all required fields including Term and Assessment Type"
- ✓ Assessment Type dropdown visible and required
- ✓ Academic Term dropdown visible and required
- ✓ Both fields load from database

**Verification**:
```
Browser Console → Check logs
→ Verify: "Assessment Type loaded: CA1, CA2, CA3, CA4, EXAM"
→ Verify: "Terms loaded: X academic terms"
```

### 3.2 CBT Creation with Valid Data
**Objective**: Verify CBT creation succeeds with all required fields

**Steps**:
1. Create CBT exam with:
   - Title: "Primary 3 Math Test"
   - Subject: "Mathematics" (level 5)
   - Class: "Primary 3A"
   - Assessment Type: "CA1"
   - Term: Current term
   - Duration: 30 minutes
   - Total Marks: 20
   - Add 5 questions

**Expected Result**:
- ✓ Exam created successfully
- ✓ No validation errors
- ✓ API call to `/api/teacher/cbt/create` succeeds
- ✓ assessment_type, term_id stored in database

### 3.3 CBT Auto-Grading & Score Sheet Creation
**Objective**: Verify CBT submission auto-grades and creates score_sheets

**Steps**:
1. Login as student in Primary 3A
2. Take the CBT exam created above
3. Answer all MCQ questions (mix correct/incorrect)
4. Submit exam

**Expected Result**:
- ✓ Exam graded successfully
- ✓ Score calculated correctly (% of total_marks)
- ✓ Score sheet automatically created
- ✓ Console shows: "✓ All conditions met - proceeding with score_sheets creation"
- ✓ score_sheets entry contains:
  - student_id, subject_id, term_id
  - test1 = scaled score (0-10)
  - test1_source = "CBT"
  - academic_session_id = linked session

**Verification**:
```
Supabase → score_sheets table
→ Filter: student_id = {student}, subject_id = {math}
→ Verify: test1 value = calculated score (0-10)
→ Verify: test1_source = "CBT"
→ Verify: academic_session_id IS NOT NULL
```

### 3.4 Multiple Assessment Types
**Objective**: Verify different assessment types map to correct score columns

**Tests**:
- [ ] CA1 exam → test1 column populated
- [ ] CA2 exam → test2 column populated  
- [ ] CA3 exam → test3 column populated
- [ ] CA4 exam → test4 column populated
- [ ] EXAM type → exam column populated (scaled to 0-60)

**Expected Result**:
- ✓ Each assessment type populates correct column
- ✓ Scores scaled appropriately (CA tests 0-10, EXAM 0-60)

---

## TEST 4: PAYMENT SCHEMA ENHANCEMENTS (Task #4)

### 4.1 Payment Recording with student_id
**Objective**: Verify payments table has student_id and can record direct student payments

**Steps**:
1. Login as Accountant
2. Go to Payment Recording
3. Record payment for student "John Doe"
4. Amount: ₦50,000
5. Fee Type: TUITION

**Expected Result**:
- ✓ Payment recorded with student_id FK populated
- ✓ No need for JOIN through receipts table
- ✓ payment.student_id = students.id

**Verification**:
```
Supabase → payments table
→ Query: SELECT student_id, amount FROM payments WHERE student_id IS NOT NULL LIMIT 1
→ Verify: student_id is populated (not NULL)
```

### 4.2 Class-Based Fee Reporting
**Objective**: Verify class_id column enables class-based fee queries

**Steps**:
1. Record payments for students in "Primary 3A" and "Primary 3B"
2. Admin views "Class Fee Summary"

**Expected Result**:
- ✓ Report queries payments.class_id directly
- ✓ Can group by class without complex joins
- ✓ Shows: "Class Primary 3A: ₦500,000 collected, ₦200,000 pending"

**Verification**:
```
Supabase → payments table
→ Query: SELECT class_id, SUM(amount) as total FROM payments 
          WHERE status = 'COMPLETED' GROUP BY class_id
→ Verify: Results grouped by class
→ Verify: class_id properly linked to class_arm_combos
```

---

## TEST 5: SS STREAM/DEPARTMENT SELECTION (Task #5)

### 5.1 Student Department Selection (SS Classes Only)
**Objective**: Verify department dropdown only appears for SS classes

**Steps**:
1. Register student → Select "Primary 3"
2. Check for Department field → Should NOT appear

3. Register student → Select "JSS 2"
4. Check for Department field → Should NOT appear

5. Register student → Select "SS 1"
6. Check for Department field → Should APPEAR

**Expected Result**:
- ✓ Department dropdown visible ONLY for SS (levels 12-14)
- ✓ Options: Science, Commercial, Humanities, Technical, Vocational
- ✓ Validation requires department for SS classes
- ✓ Can't submit SS registration without selecting department

### 5.2 Teacher Department Selection (SS Classes Only)
**Objective**: Verify teacher department assignment for SS classes

**Steps**:
1. Register teacher → Primary level
2. Step 4: Select "Primary 3" → No department field

3. Register teacher → Secondary level
4. Step 4: Select "JSS 2" → No department field
5. Step 4: Select "SS 1" → Department field APPEARS
6. Select "Science"
7. Complete registration

**Expected Result**:
- ✓ Department field appears only for SS classes
- ✓ Department saved to teachers table
- ✓ Can't complete SS teacher registration without department

### 5.3 Department Reset on Class Change
**Objective**: Verify department field resets when class selection changes

**Steps**:
1. Teacher registration → Select "SS 1" Science
2. Change class selection to "SS 2"
3. Check department field

**Expected Result**:
- ✓ Department field reset to empty
- ✓ Must reselect department for new class

---

## TEST 6: MULTI-SCHOOL DATA ISOLATION

### 6.1 School Isolation in Deletion
**Objective**: Verify deletion doesn't affect other schools

**Steps**:
1. Create Test School A with staff, students
2. Create Test School B with different staff, students
3. Delete staff member from School A
4. Verify School B staff unaffected

**Expected Result**:
- ✓ Only School A's staff deleted
- ✓ School B's data intact
- ✓ RLS policies properly enforced

### 6.2 School Isolation in Subject Catalogue
**Objective**: Verify subject filtering is per-school

**Steps**:
1. School A: Create subject "Advanced Mathematics"
2. School B: Teachers don't see this subject
3. Teacher in School B creates exam → Mathematics options only include School B subjects

**Expected Result**:
- ✓ Subjects isolated per school_id
- ✓ No subject leakage between schools

---

## TEST 7: REGRESSION TESTING

### 7.1 Existing Features
- [ ] Login functionality still works
- [ ] Student portal accessible
- [ ] Teacher dashboard loads correctly
- [ ] Admin dashboard responsive
- [ ] Score sheet generation works
- [ ] Report card generation works
- [ ] Photo uploads still functional
- [ ] Admission letter generation works

### 7.2 Database Integrity
- [ ] No foreign key violations
- [ ] Cascading deletes work correctly
- [ ] Indexes improve query performance
- [ ] Data migrations successful

---

## PASS/FAIL CRITERIA

### PASS Requirements:
- ✓ All deletion tests pass (no 404 errors)
- ✓ Subject filtering works per class level
- ✓ CBT pipeline creates score_sheets automatically
- ✓ Payment recording works with student_id
- ✓ Department selection works for SS classes only
- ✓ No regression in existing features
- ✓ Multi-school isolation maintained

### FAIL Triggers:
- ✗ Any 404 errors on delete operations
- ✗ Subject mixing between levels
- ✗ CBT scores not auto-populating to score_sheets
- ✗ Payment recording fails
- ✗ Department field appears for non-SS classes
- ✗ Data leakage between schools
- ✗ Existing feature breakage

---

## TEST EXECUTION CHECKLIST

- [ ] All pre-test setup completed
- [ ] Test 1: Deletion endpoints (all 3 tests pass)
- [ ] Test 2: Subject filtering (all 4 tests pass)
- [ ] Test 3: CBT pipeline (all 4 tests pass)
- [ ] Test 4: Payment schema (all 2 tests pass)
- [ ] Test 5: SS departments (all 3 tests pass)
- [ ] Test 6: Multi-school isolation (all 2 tests pass)
- [ ] Test 7: Regression testing (all pass)
- [ ] All console logs show success messages
- [ ] Database queries return expected results
- [ ] Vercel deployment successful

---

## NOTES FOR TESTERS

1. **Browser Dev Tools**: Keep Network tab open to verify API calls
2. **Console Logs**: Check browser console for detailed operation logs
3. **Database Access**: Use Supabase dashboard to verify data persistence
4. **Performance**: Monitor API response times (should be < 500ms)
5. **Error Handling**: Verify error messages are user-friendly and actionable

---

## POST-TEST ACTIONS

1. Document any failures with screenshots
2. Create bug reports for any regressions
3. Verify all fixes ready for production deployment
4. Schedule performance testing if needed
5. Prepare deployment notes for team

---

**Test Date**: _____________
**Tester Name**: _____________
**Final Status**: [ ] PASS  [ ] FAIL  [ ] BLOCKED

**Comments**:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
