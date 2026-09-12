# Phase 6: Testing & Verification

## Overview
Comprehensive end-to-end testing and system verification across all phases.

## Test Scenarios

### 1. User Registration & Authentication

#### Admin Registration
- [ ] School admin can register (via Supabase auth)
- [ ] Admin account created with SCHOOL_ADMIN role
- [ ] Admin can login successfully
- [ ] Admin dashboard loads correctly

#### Teacher Registration
- [ ] Admin can access teacher registration form
- [ ] Form validates all required fields
- [ ] Teacher created in users table
- [ ] Teacher created in teachers table with FK to users
- [ ] Subject assignments saved to subject_teacher_assignments
- [ ] Class assignment saved to class_arm_combos.class_teacher_id
- [ ] Success message displayed
- [ ] Teacher can login with registered email/password

#### Student Registration
- [ ] Admin can access student registration form
- [ ] Form supports cascading selectors (class → arm → stream)
- [ ] Student created in users table
- [ ] Student created in students table with class_arm_combo_id FK
- [ ] Subject enrollments saved to student_subjects
- [ ] Score sheets auto-created for each subject (via trigger)
- [ ] Success message displayed
- [ ] Student can login with registered email/password

### 2. Data Integrity & Foreign Keys

#### Check FK Relationships
- [ ] score_sheets.term_id → academic_terms (Migration 106)
- [ ] cbt_exams.term_id → academic_terms (Migration 106)
- [ ] students.class_arm_combo_id → class_arm_combos (not null)
- [ ] students.user_id → users (one-to-one)
- [ ] teachers.user_id → users (one-to-one)
- [ ] subject_teacher_assignments.teacher_id → users.id
- [ ] student_subjects.student_id → students.id
- [ ] cbt_submissions.student_id → students.id
- [ ] cbt_answers.submission_id → cbt_submissions.id

#### Run Integrity Checks
```sql
-- Check for orphaned students (should be 0)
SELECT COUNT(*) FROM students s
WHERE NOT EXISTS (SELECT 1 FROM class_arm_combos ca WHERE ca.id = s.class_arm_combo_id);

-- Check for orphaned score_sheets (should be 0)
SELECT COUNT(*) FROM score_sheets ss
WHERE NOT EXISTS (SELECT 1 FROM students s WHERE s.id = ss.student_id);

-- Check for orphaned cbt_submissions (should be 0)
SELECT COUNT(*) FROM cbt_submissions cs
WHERE NOT EXISTS (SELECT 1 FROM students s WHERE s.id = cs.student_id);

-- Check academic_terms consistency
SELECT COUNT(*) FROM score_sheets ss
WHERE NOT EXISTS (SELECT 1 FROM academic_terms at WHERE at.id = ss.term_id);
```

### 3. Teacher & Student Workflow

#### Teacher Registration → CBT Creation → Scoring
1. [ ] Admin registers teacher (John) for Subject A
   - Expected: John can login, see Subject A in dashboard
2. [ ] John creates CBT exam (10 MCQ questions)
   - Expected: Exam saved, questions and options in DB
3. [ ] John publishes exam
   - Expected: Status = PUBLISHED, visible to students
4. [ ] Student takes exam (answers 7/10 correct)
   - Expected: Submission created, exam saved
5. [ ] Submission auto-scored
   - Expected: Score = 70%, Grade = C, passed = true
6. [ ] Score synced to score_sheets
   - Expected: score_sheets.exam = 70, grade = C
7. [ ] John views results
   - Expected: See student score, 70%, C grade
8. [ ] Student views results
   - Expected: See their score, 70%, C grade

#### Student Enrollment → Class Assignment → Subject Access
1. [ ] Admin registers student (Jane) for Class A, Arm B
   - Expected: Jane assigned to Class A, Arm B
2. [ ] Admin enrolls Jane in Math, English, Science
   - Expected: 3 score_sheets auto-created (one per subject)
3. [ ] Admin assigns class teacher (John) to Class A Arm B
   - Expected: John sees Class A Arm B in dashboard, sees Jane as student
4. [ ] Admin assigns Math teacher (Mary) to subject Math
   - Expected: Mary sees Jane in Math class
5. [ ] Jane can see all 3 subjects in dashboard
   - Expected: Dashboard shows Math (Mary), English (Teacher), Science (Teacher)
6. [ ] Mary creates Math test, Jane takes it
   - Expected: Jane sees test available, can submit, gets scored

### 4. Cascading Selectors (Registration)

#### Teacher Registration - Section & Class Selection
- [ ] Can select PRIMARY or SECONDARY
- [ ] When PRIMARY selected, only primary classes appear
- [ ] When SECONDARY selected, only secondary classes appear
- [ ] Can select class from dropdown
- [ ] Can select subjects for that class
- [ ] Subjects filtered by class level

#### Student Registration - Cascading Selection
- [ ] Can select PRIMARY or SECONDARY
- [ ] When selected, class dropdown populates
- [ ] When class selected, arm dropdown populates
- [ ] When arm selected (for SS classes), stream dropdown appears
- [ ] Subject list filtered by class level
- [ ] Can select multiple subjects

### 5. Dynamic Data Loading

#### Subject Loading
- [ ] RegistrationConfigService.getSubjectsForSchool returns real DB data
- [ ] No hardcoded subject lists
- [ ] All subjects have applicable_to_levels set
- [ ] Filtering by level works correctly

#### Class & Arm Loading
- [ ] RegistrationConfigService.getClasses returns real classes
- [ ] Grouped by section (PRIMARY/SECONDARY)
- [ ] getArms returns correct arms for selected class
- [ ] Cascading updates work (class change clears arms)

#### CBT Data Loading
- [ ] Student portal shows exams for their class and subjects only
- [ ] Exams from other classes don't appear
- [ ] Exams from subjects they're not enrolled in don't appear
- [ ] Teacher sees only their created exams

### 6. API Validation

#### Auth Register API
- [ ] Rejects missing fields (email, password, role, school_id)
- [ ] Validates password length (min 6)
- [ ] Validates school_id UUID format
- [ ] Returns user ID on success
- [ ] Handles duplicate email gracefully

#### Admin Register APIs
- [ ] Verify school_id ownership (user can only register in their school)
- [ ] Verify role (only SCHOOL_ADMIN can register users)
- [ ] Validate all FK relationships before insert
- [ ] Return success/error appropriately

#### CBT APIs
- [ ] Can only add questions to own exams
- [ ] Can only submit exams for own student account
- [ ] Auto-scoring completes without errors
- [ ] Score synced to score_sheets correctly

### 7. Browser Console Check

#### No Errors or Warnings
- [ ] F12 → Console tab is clean (no red X errors)
- [ ] No yellow warning triangles
- [ ] No undefined variable messages
- [ ] No import/require failures
- [ ] No CORS errors

#### Verify Logs
- [ ] Expected [LOG] messages appear (✅, ❌, etc)
- [ ] No orphaned console.log statements
- [ ] Error messages are helpful and specific

### 8. Performance Verification

#### Page Load Times
- [ ] Admin dashboard: < 3 seconds
- [ ] Teacher dashboard: < 3 seconds
- [ ] Student portal: < 2 seconds
- [ ] Results page: < 3 seconds
- [ ] Registration page: < 1 second

#### Database Query Efficiency
- [ ] No N+1 queries (check Supabase query logs)
- [ ] Joins optimized (use select() carefully)
- [ ] Pagination applied to large result sets
- [ ] Indexes on school_id, foreign keys

### 9. Multi-Tenancy Verification

#### Data Isolation
- [ ] Admin of School A cannot see School B's students
- [ ] Teacher from School A cannot see School B's classes
- [ ] Students from School A see only their school's results
- [ ] All queries filter by school_id

Test Method:
```
1. Create 2 test schools (A, B)
2. Register admin for each
3. Login as Admin A
4. Try to access School B data (should fail)
5. Verify API returns empty or forbidden
```

### 10. Database Verification

#### Migration Execution
- [ ] Run migration 106 in Supabase
- [ ] Check for errors
- [ ] Verify FK constraints exist
- [ ] Verify academic_terms created
- [ ] Verify score_sheets trigger exists

#### Data Population
- [ ] Test school exists (created by migration 013)
- [ ] Test classes, arms, subjects exist
- [ ] Academic sessions created (migration 054)
- [ ] Academic terms created for current year

#### Score Sheets Trigger
- [ ] When student_subjects insert: score_sheets auto-created
- [ ] Score sheet has correct school_id, student_id, subject_id, term_id
- [ ] All test scores null initially
- [ ] Trigger doesn't duplicate entries (test insert twice)

### 11. End-to-End Workflow Test

#### Complete Flow (30 minutes)
1. [ ] Create school (or use test school)
2. [ ] Admin registers teacher with 3 subjects
3. [ ] Admin registers 5 students in same class
4. [ ] Teacher creates 2 CBT exams (one test, one exam)
5. [ ] Each student takes both exams
6. [ ] Verify 10 submissions created (5 students × 2 exams)
7. [ ] Verify 10 scores recorded
8. [ ] Teacher views class results
9. [ ] Each student views their results
10. [ ] Results match between teacher and student view

### 12. Error Handling Test

#### Graceful Error Handling
- [ ] Invalid school_id → clear error message
- [ ] Duplicate email → user already exists message
- [ ] FK violation → specific constraint error message
- [ ] Missing data → helpful debugging info
- [ ] Network error → retry or suggest offline mode

#### Error Messages Should Include
- [ ] What went wrong (❌ specific issue)
- [ ] Where it went wrong (❌ which API, form, or operation)
- [ ] What to do (contact admin, retry, check input, etc)

## Test Execution Checklist

### Phase 1: Database
- [ ] Migration 106 executed successfully
- [ ] All FK constraints in place
- [ ] Academic terms created
- [ ] Score sheets trigger works

### Phase 2: Registration
- [ ] Teacher registration form works end-to-end
- [ ] Student registration form works end-to-end
- [ ] All data saved to Supabase
- [ ] API routes return correct responses
- [ ] Cascading selectors work
- [ ] No FK errors on save

### Phase 3: CBT
- [ ] Exam creation works
- [ ] Questions and options save correctly
- [ ] Student can take exam
- [ ] Submission saved
- [ ] Auto-scoring works
- [ ] Score synced to score_sheets

### Phase 4: Dashboards
- [ ] Admin dashboard loads with correct data
- [ ] Teacher dashboard shows assignments
- [ ] Student dashboard shows class and subjects
- [ ] All real data from Supabase

### Phase 5: Results
- [ ] Results page loads
- [ ] Score sheets display correctly
- [ ] Filters work (by term, subject)
- [ ] Export to PDF works
- [ ] Export to CSV works

### Phase 6: Verification
- [ ] All tests above pass
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Multi-tenancy verified
- [ ] End-to-end workflow complete

## Success Criteria (ALL MUST PASS)

✅ All 12 test scenarios complete without errors
✅ Zero console errors (F12 → red X)
✅ All FK relationships verified
✅ Multi-tenancy working (data isolation)
✅ Real data from Supabase (no hardcoding)
✅ All APIs return correct responses
✅ User role-based access working
✅ Registration cascading selectors functional
✅ CBT scoring accurate
✅ Results display and export working
✅ Performance acceptable (< 3sec page loads)
✅ Error messages helpful and specific

## If Tests Fail

1. Check console logs (F12 → Console)
2. Check API response (F12 → Network)
3. Check Supabase data (Dashboard → SQL Editor)
4. Review error message (what, where, what to do)
5. Check migration status (was it applied?)
6. Verify school_id is valid UUID
7. Check FK relationships exist

## Sign-Off Checklist

When all tests pass:
- [ ] Tester name: _______________
- [ ] Date tested: _______________
- [ ] Build version: _______________
- [ ] Supabase environment: [dev|staging|prod]
- [ ] Notes: _______________

**Status: ✅ READY FOR PRODUCTION**
