# End-to-End Test Scenario: Complete Data Flow
## Registration → Attendance → Results → Report Card

**Purpose**: Validate the complete holistic rebuild with canonical database schema and no duplicates.

**Status**: Testing all PHASES 1-10 fixes in one complete flow

---

## SETUP: Database State Check

Run this query in Supabase to verify canonical tables exist:

```sql
SELECT 
  'subject_teacher_assignments' as table_name,
  COUNT(*) as record_count
FROM subject_teacher_assignments
WHERE school_id = (SELECT id FROM schools WHERE name ILIKE '%leadway%' LIMIT 1)

UNION ALL

SELECT 'student_subjects' as table_name, COUNT(*) FROM student_subjects
WHERE school_id = (SELECT id FROM schools WHERE name ILIKE '%leadway%' LIMIT 1)

UNION ALL

SELECT 'score_sheets' as table_name, COUNT(*) FROM score_sheets
WHERE school_id = (SELECT id FROM schools WHERE name ILIKE '%leadway%' LIMIT 1)

UNION ALL

SELECT 'students' as table_name, COUNT(*) FROM students
WHERE school_id = (SELECT id FROM schools WHERE name ILIKE '%leadway%' LIMIT 1);
```

---

## FLOW: Step-by-Step Test Scenario

### STEP 1: School Admin Registers a New Student
**Component**: `/src/app/student/register/page.tsx`
**Expected Flow**:
1. Student fills: Full Name, Email, Admission Number, DOB, Class, Subjects
2. System creates: users record → students record → student_subjects records
3. Guardian info saved to guardians table

**Test Action**:
```
1. Go to: School Admin Dashboard → Register Student
2. Fill form:
   - Name: "Test Student ABC"
   - Email: "teststudent@school.com"
   - Admission #: "ADM-2024-0001"
   - Class: "JSS1 Red"
   - Subjects: English, Mathematics, Science
3. Click "Register"
4. Expected: Student appears in student list, NO DUPLICATE students records
```

**Verify**:
```sql
-- Check student registered once
SELECT COUNT(*) as student_count FROM students 
WHERE admission_number = 'ADM-2024-0001';

-- Check all subjects linked
SELECT COUNT(*) as subject_count FROM student_subjects 
WHERE student_id = (SELECT id FROM students WHERE admission_number = 'ADM-2024-0001');
```

---

### STEP 2: Teacher Assigned to Class and Subjects
**Component**: TeacherContextService + EditStaffModal
**Expected Flow**:
1. Admin edits staff profile
2. System updates users record
3. Updates class_arm_combos.class_teacher_id (FK)
4. Updates subject_teacher_assignments (canonical table)

**Test Action**:
```
1. Go to: School Admin Dashboard → Staff List
2. Click "Edit" on a teacher
3. Edit:
   - Class Assignment: "JSS1 Red"
   - Subjects: English, Mathematics
4. Click "Save Changes"
5. Expected: Teacher assigned to class and subjects, NO DUPLICATE assignments
```

**Verify**:
```sql
-- Check teacher assigned to class once
SELECT COUNT(*) as class_count FROM class_arm_combos 
WHERE class_teacher_id = 'TEACHER_USER_ID';

-- Check subjects assigned (canonical table)
SELECT COUNT(*) as subject_count FROM subject_teacher_assignments 
WHERE teacher_id = 'TEACHER_USER_ID' 
AND class_arm_combo_id = (SELECT id FROM class_arm_combos WHERE class_teacher_id = 'TEACHER_USER_ID');
```

---

### STEP 3: Teacher Marks Attendance
**Component**: `/src/app/teacher/attendance/page.tsx` (PHASE 2 fixed)
**Expected Flow**:
1. Teacher selects class
2. System queries students via students.class_arm_combo_id (FK)
3. Records attendance in attendance table

**Test Action**:
```
1. Go to: Teacher Dashboard → My Classes → JSS1 Red → Mark Attendance
2. Check "Present" for each student
3. Click "Save Attendance"
4. Expected: Attendance recorded for all students in the class
```

**Verify**:
```sql
-- Check attendance recorded
SELECT COUNT(*) as attendance_count FROM attendance 
WHERE class_arm_combo_id = 'CLASS_COMBO_ID' 
AND attendance_date = CURRENT_DATE;
```

---

### STEP 4: Teacher Enters Manual Scores
**Component**: `/src/app/teacher/results/page.tsx`
**Expected Flow**:
1. Teacher selects subject and class
2. System loads students via student_subjects (canonical)
3. Teacher enters scores for each assessment type (CA1, CA2, CA3, EXAM)
4. System creates/updates score_sheets records

**Test Action**:
```
1. Go to: Teacher Dashboard → My Subjects → English → Enter Results
2. Select: JSS1 Red, Term 1
3. Enter scores:
   - Test Student ABC: CA1=8, CA2=7, CA3=9, EXAM=45
4. Click "Submit Scores"
5. Expected: Scores saved in score_sheets table
```

**Verify**:
```sql
-- Check scores in canonical table
SELECT student_id, test1, test2, test3, exam 
FROM score_sheets 
WHERE subject_id = 'SUBJECT_ID' 
AND student_id IN (SELECT id FROM students WHERE admission_number = 'ADM-2024-0001');
```

---

### STEP 5: Teacher Creates CBT Exam
**Component**: `/src/app/teacher/cbt/page.tsx`
**Expected Flow**:
1. Teacher creates CBT exam with questions
2. System stores exam in cbt_exams table
3. Questions stored in cbt_questions table

**Test Action**:
```
1. Go to: Teacher Dashboard → CBT Exams → Create New
2. Fill:
   - Title: "English Comprehension Quiz"
   - Subject: English
   - Class: JSS1 Red
   - Assessment Type: CA1
   - Total Marks: 10
   - Questions: Add 3 MCQ questions (2 marks each)
3. Click "Create"
4. Expected: CBT exam created and students can see it
```

**Verify**:
```sql
-- Check CBT exam created
SELECT COUNT(*) FROM cbt_exams WHERE title = 'English Comprehension Quiz';
```

---

### STEP 6: Student Takes CBT Exam
**Component**: `/src/app/student/cbt/[id]/page.tsx`
**Expected Flow**:
1. Student loads exam (must be enrolled in subject)
2. Student answers questions
3. Student submits exam
4. System auto-grades MCQ questions
5. System creates/updates score_sheets entry

**Test Action**:
```
1. Switch to Student account
2. Go to: CBT Portal → My CBT Exams
3. Click "Start" on "English Comprehension Quiz"
4. Answer 2-3 questions correctly
5. Click "Submit Exam"
6. Expected: Score calculated and shown to student
```

**Verify**:
```sql
-- Check submission created
SELECT id, score, percentage, status FROM cbt_submissions 
WHERE student_id = 'STUDENT_ID' 
AND cbt_exam_id = 'CBT_EXAM_ID';

-- Check score_sheets updated
SELECT test1, test1_source FROM score_sheets 
WHERE student_id = 'STUDENT_ID' 
AND subject_id = (SELECT subject_id FROM cbt_exams WHERE id = 'CBT_EXAM_ID');
```

---

### STEP 7: View Student Profile (Edit Modal)
**Component**: `EditStudentModal.tsx` (PHASE 7 fixed)
**Expected Flow**:
1. Admin opens student edit modal
2. System loads: students, users, class_arm_combos, student_subjects (canonical)
3. Admin can edit: name, email, class, subjects
4. System calls StudentService.updateStudentProfile()
5. Updates EXISTING student, no duplicates

**Test Action**:
```
1. Go to: School Admin Dashboard → Student List
2. Click "Edit" on Test Student ABC
3. Change:
   - Name: "Test Student XYZ"
   - Add Subject: History
4. Click "Save Changes"
5. Expected: Student updated (NOT duplicated)
```

**Verify**:
```sql
-- Check ONLY ONE student record
SELECT COUNT(*) as student_count FROM students 
WHERE admission_number = 'ADM-2024-0001';
-- Should return: 1

-- Check subjects updated (old ones removed, new ones added)
SELECT subject_id FROM student_subjects 
WHERE student_id = (SELECT id FROM students WHERE admission_number = 'ADM-2024-0001')
ORDER BY created_at DESC;
```

---

### STEP 8: Generate Admission Letter
**Component**: `AdmissionLetterModal.tsx` + `/api/documents/admission-letter/route.ts` (PHASE 9)
**Expected Flow**:
1. Admin opens student admission letter
2. System queries: students, users, class_arm_combos, classes, arms, student_subjects (canonical)
3. Letter includes: student name, class, subjects
4. Letter can be printed/downloaded

**Test Action**:
```
1. Go to: School Admin Dashboard → Student List
2. Click "View Letter" on Test Student ABC
3. Letter should show:
   - Student Name: Test Student XYZ
   - Class: JSS1 Red
   - Subjects: English, Mathematics, Science, History
4. Click "Print" or "Download"
5. Expected: PDF/HTML generated correctly
```

---

### STEP 9: Generate Appointment Letter
**Component**: `AppointmentLetterModal.tsx` + `/api/documents/appointment-letter/route.ts` (PHASE 9 fixed)
**Expected Flow**:
1. Admin opens teacher appointment letter
2. System queries: users, subject_teacher_assignments (canonical), class_arm_combos, classes, arms
3. Letter includes: teacher name, classes, subjects being taught

**Test Action**:
```
1. Go to: School Admin Dashboard → Staff List
2. Click "View Letter" on teacher
3. Letter should show:
   - Teacher Name: [Teacher Name]
   - Classes: JSS1 Red
   - Subjects: English, Mathematics
4. Click "Print" or "Download"
5. Expected: PDF/HTML generated correctly
```

---

### STEP 10: View Report Card
**Component**: `/src/app/student/report-card/page.tsx`
**Expected Flow**:
1. Student goes to report card page
2. System queries score_sheets for student
3. Calculates: Total, Grade, Position
4. Shows all assessments (manual + CBT)

**Test Action**:
```
1. Go to: Student Dashboard → My Report Card
2. Select: Term 1
3. View all subjects with:
   - CA1, CA2, CA3, EXAM scores
   - Total marks
   - Grade
4. Expected: All scores visible including CBT scores
```

**Verify**:
```sql
-- Check score_sheets has all scores
SELECT subject_id, test1, test1_source, test2, test3, exam, exam_source 
FROM score_sheets 
WHERE student_id = 'STUDENT_ID' 
AND term_id = 'CURRENT_TERM';
```

---

## VALIDATION CHECKLIST

After completing the flow, verify:

- [ ] **PHASE 7**: No duplicate student records created (admission_number is unique)
- [ ] **PHASE 8**: No duplicate teacher assignments
- [ ] **PHASE 9**: Admission letter includes class and subjects
- [ ] **PHASE 9**: Appointment letter includes classes and subjects
- [ ] **PHASE 10**: CBT scores auto-populate into score_sheets with correct assessment type mapping
- [ ] **ATTENDANCE**: Students queried from students.class_arm_combo_id FK (not deprecated table)
- [ ] **RESULTS**: Student subjects queried from student_subjects (canonical)
- [ ] **SUBJECTS**: Teacher subjects queried from subject_teacher_assignments (canonical)
- [ ] **REPORT CARD**: All scores visible (manual + CBT combined)

---

## Critical Queries to Verify Canonical Schema

```sql
-- ✅ VERIFY: No deprecated tables in use
SELECT COUNT(*) as deprecated_records FROM class_arm_combo_students;
SELECT COUNT(*) as deprecated_records FROM teacher_subjects;
SELECT COUNT(*) as deprecated_records FROM result_entries;

-- ✅ VERIFY: Canonical tables have data
SELECT 'subject_teacher_assignments' as table_name, COUNT(*) as count 
FROM subject_teacher_assignments;
SELECT 'student_subjects', COUNT(*) FROM student_subjects;
SELECT 'score_sheets', COUNT(*) FROM score_sheets;

-- ✅ VERIFY: FK relationships intact
SELECT COUNT(*) FROM class_arm_combos 
WHERE class_teacher_id IS NOT NULL;

SELECT COUNT(*) FROM students 
WHERE class_arm_combo_id IS NOT NULL;

-- ✅ VERIFY: No orphaned records
SELECT COUNT(*) FROM students 
WHERE class_arm_combo_id NOT IN (SELECT id FROM class_arm_combos);

SELECT COUNT(*) FROM subject_teacher_assignments 
WHERE teacher_id NOT IN (SELECT id FROM users WHERE role = 'TEACHER');
```

---

## Success Criteria

**PASS** if:
1. ✅ Complete flow works without errors (registration → attendance → results → report card)
2. ✅ No duplicate student/teacher records created
3. ✅ All canonical tables used correctly
4. ✅ Admission letter includes class and subjects
5. ✅ Appointment letter includes classes and subjects
6. ✅ CBT scores auto-populate and appear in report card
7. ✅ No deprecated tables queried

**If any FAIL**, check:
- Database migrations applied (run all in /database/migrations/)
- Service methods use canonical tables
- API routes query correct tables
- Components pass correct parameters to services

---

## Next: PHASE 12

After successful test, run:
1. Build: `npm run build`
2. Test: `npm run test` (if available)
3. Deploy to staging/production
