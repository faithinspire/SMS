# PHASE 11: End-to-End System Testing Plan

## Overview
Complete integration testing of all 8 workflows to verify the holistic rebuild is functional end-to-end.

## Test Environment Setup

### Prerequisites
1. Supabase project is running
2. All migrations 055-058 have been applied
3. Next.js development server is running: `npm run dev`
4. Browser console is open to check for errors
5. Postman or similar tool for API testing (optional)

### Test Data Setup
```bash
# Create test school
INSERT INTO schools (id, name, address) VALUES 
  ('test-school-id', 'Test School', 'Test Address');

# Create test admin user
INSERT INTO users (id, email, full_name, role) VALUES 
  ('admin-id', 'admin@test.com', 'Admin User', 'ADMIN');

# Create test principal
INSERT INTO users (id, email, full_name, role) VALUES 
  ('principal-id', 'principal@test.com', 'Principal', 'PRINCIPAL');

# Create test teacher
INSERT INTO users (id, email, full_name, role) VALUES 
  ('teacher-id', 'teacher@test.com', 'Teacher', 'TEACHER');

# Create test student
INSERT INTO users (id, email, full_name, role) VALUES 
  ('student-id', 'student@test.com', 'Student', 'STUDENT');

# Create academic session
INSERT INTO academic_sessions (school_id, session_year, start_year, end_year, is_active) VALUES 
  ('test-school-id', '2024/2025', 2024, 2025, TRUE);

# Create academic term
INSERT INTO academic_terms (session_id, school_id, term_name, term_order, start_date, end_date, is_active) VALUES 
  ('session-id', 'test-school-id', 'First Term', 1, '2024-09-01', '2024-12-31', TRUE);
```

---

## WORKFLOW 1: Student Admission → Admission Letter Generation

### Scenario
New student registers → System generates admission letter

### Steps

#### 1.1: Register Student
```
POST /api/students (or admin registration form)
{
  "school_id": "test-school-id",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@test.com",
  "class_arm_combo_id": "class-arm-id",
  "admission_number": "ADM/2024/001"
}
```

**Expected Result**: 
- Status: 200 OK
- Response contains `student_id`
- Student record created in database
- No console errors

#### 1.2: Generate Admission Letter
```
GET /api/documents/admission-letter?studentId={student_id}
```

**Expected Result**:
- Status: 200 OK
- Response contains HTML letter with:
  - Student name: "John Doe"
  - School name: "Test School"
  - Admission number: "ADM/2024/001"
  - Class and arm information
  - No "undefined" values
- Letter can be printed/downloaded
- No console errors

### Verification
- [ ] Student created successfully
- [ ] Admission letter displays correct data
- [ ] No "undefined" or placeholder text in letter
- [ ] School isolation works (admin from other school can't access this student)

---

## WORKFLOW 2: Teacher Registration → CBT Creation → Student Submission → Auto-Grading

### Scenario
Teacher creates CBT exam → Student takes exam → System auto-grades

### Steps

#### 2.1: Register Teacher
```
POST /api/auth/staff/register (or admin registration)
{
  "school_id": "test-school-id",
  "email": "teacher@test.com",
  "first_name": "Mr",
  "last_name": "Teacher",
  "role": "TEACHER"
}
```

**Expected Result**: Status 200, teacher created

#### 2.2: Assign Teacher to Subject/Class
```
POST /api/teacher/assignments
{
  "school_id": "test-school-id",
  "teacher_id": "teacher-id",
  "subject_id": "subject-id",
  "class_arm_combo_id": "class-arm-id"
}
```

**Expected Result**: Status 200, assignment created

#### 2.3: Teacher Creates CBT Exam
```
POST /api/teacher/cbt/create
{
  "school_id": "test-school-id",
  "subject_id": "subject-id",
  "class_arm_combo_id": "class-arm-id",
  "teacher_id": "teacher-id",
  "title": "Mathematics Quiz",
  "assessment_type": "CA1",
  "term_id": "term-id",
  "duration_minutes": 30,
  "total_marks": 10,
  "questions": [
    {
      "question_text": "What is 2+2?",
      "question_type": "MULTIPLE_CHOICE",
      "marks": 2,
      "options": [
        {"option_key": "A", "option_text": "3", "is_correct": false},
        {"option_key": "B", "option_text": "4", "is_correct": true},
        {"option_key": "C", "option_text": "5", "is_correct": false},
        {"option_key": "D", "option_text": "6", "is_correct": false}
      ]
    },
    {
      "question_text": "What is 5+3?",
      "question_type": "MULTIPLE_CHOICE",
      "marks": 2,
      "options": [
        {"option_key": "A", "option_text": "8", "is_correct": true},
        {"option_key": "B", "option_text": "7", "is_correct": false},
        {"option_key": "C", "option_text": "9", "is_correct": false},
        {"option_key": "D", "option_text": "10", "is_correct": false}
      ]
    }
  ]
}
```

**Expected Result**:
- Status: 200 OK (no 23502 error about option_key)
- Response contains `exam_id`
- CBT exam record created
- Questions created with proper display_order
- Options created with `option_key` (A,B,C,D)
- Exactly ONE `is_correct=true` per question

**Verification**:
```sql
-- Verify option_key constraint
SELECT * FROM cbt_options WHERE option_key IS NULL;
-- Expected: 0 rows

-- Verify single correct answer per question
SELECT question_id, COUNT(*) FROM cbt_options 
WHERE is_correct = TRUE 
GROUP BY question_id 
HAVING COUNT(*) > 1;
-- Expected: 0 rows
```

#### 2.4: Student Takes Exam
```
GET /api/student/cbt/{examId}?school_id=test-school-id&student_id=student-id
```

**Expected Result**:
- Status: 200 OK
- Response contains exam details and questions
- Questions include options with option_key (A,B,C,D)
- Timer starts

#### 2.5: Student Submits Answers
```
POST /api/student/cbt/submit
{
  "school_id": "test-school-id",
  "submission_id": "submission-id",
  "student_id": "student-id"
}
```

**Expected Result**:
- Status: 200 OK
- Response contains:
  - `score`: 2 or 4 or 6 or 8 or 10 (depends on correct answers)
  - `percentage`: calculated correctly
  - `passed`: true/false based on percentage >= passing_percentage
  - `status`: 'GRADED' or 'LOCKED'
- No errors

#### 2.6: Verify Auto-Grading
```sql
-- Check submission was graded
SELECT id, score, percentage, passed, status FROM cbt_submissions 
WHERE id = 'submission-id';
-- Expected: status='GRADED', score>0 if correct answers, percentage calculated

-- Check answers were marked
SELECT * FROM cbt_answers 
WHERE submission_id = 'submission-id'
-- Expected: is_correct=true/false based on selected option, marks_awarded populated

-- Check score_sheets was updated
SELECT * FROM score_sheets 
WHERE student_id = 'student-id' 
AND subject_id = 'subject-id' 
AND term_id = 'term-id'
-- Expected: test1 (or test2-4) = score mapped to 0-10 range, source='CBT'
```

### Verification Checklist
- [ ] Exam creation succeeds (no option_key error)
- [ ] Questions have proper option_key (A,B,C,D)
- [ ] Only one correct answer per question
- [ ] Student can fetch exam and see options
- [ ] Submission auto-grades without manual intervention
- [ ] Score appears in score_sheets with source='CBT'
- [ ] Percentage calculated correctly
- [ ] Passed/failed determination correct (>= passing_percentage)

---

## WORKFLOW 3: Teacher Lesson Note → Principal Review → Approval/Return

### Scenario
Teacher submits lesson note → Principal sees pending → Principal approves or returns

### Steps

#### 3.1: Teacher Submits Lesson Note
```
POST /api/teacher/lessons/submit
{
  "school_id": "test-school-id",
  "subject_id": "subject-id",
  "class_arm_combo_id": "class-arm-id",
  "teacher_id": "teacher-id",
  "title": "Introduction to Algebra",
  "content": "Today we covered basic algebraic expressions and equations...",
  "attachments": null
}
```

**Expected Result**:
- Status: 200 OK
- Response contains `lesson_note_id`
- Status in response: 'SUBMITTED'
- Timestamp recorded in `created_at`

#### 3.2: Principal Views Pending Lessons
```
GET /api/principal/lessons/pending?school_id=test-school-id&principal_id=principal-id
```

**Expected Result**:
- Status: 200 OK
- Response contains array of pending lessons
- Each lesson includes:
  - `id`, `title`, `content`
  - `teacher_name` (joined from users)
  - `subject_name` (joined from subjects)
  - `class_name`, `arm_name` (joined)
  - `status`: 'SUBMITTED' or 'UNDER_REVIEW'
  - `created_at`, `updated_at`
- Count > 0 (includes the lesson submitted in 3.1)

#### 3.3a: Principal Approves Lesson
```
PUT /api/principal/lessons/approve
{
  "school_id": "test-school-id",
  "principal_id": "principal-id",
  "lesson_note_id": "lesson-id",
  "comments": "Excellent coverage of the topic"
}
```

**Expected Result**:
- Status: 200 OK
- Response contains updated lesson with `status`: 'APPROVED'
- `reviewed_by`: principal-id
- `reviewed_at`: timestamp
- `review_comments`: "Excellent coverage..."

#### 3.3b: OR Principal Returns for Revision
```
PUT /api/principal/lessons/return
{
  "school_id": "test-school-id",
  "principal_id": "principal-id",
  "lesson_note_id": "lesson-id",
  "comments": "Please include more practical examples"
}
```

**Expected Result**:
- Status: 200 OK
- Response contains updated lesson with `status`: 'RETURNED'
- `review_comments`: "Please include..."
- Lesson reappears in pending list for teacher to revise

#### 3.4: Verify Workflow
```sql
-- Check lesson was created
SELECT * FROM lesson_notes WHERE id = 'lesson-id';
-- Expected: status='APPROVED' or 'RETURNED', reviewed_by populated

-- Check approval workflow
SELECT id, status, reviewed_by, reviewed_at, review_comments 
FROM lesson_notes 
WHERE id = 'lesson-id';
```

### Verification Checklist
- [ ] Teacher can submit lesson note
- [ ] Status is 'SUBMITTED' after submission
- [ ] Principal can view pending lessons (count > 0)
- [ ] Principal can approve lesson (status changes to 'APPROVED')
- [ ] Principal can return lesson with comments (status changes to 'RETURNED')
- [ ] Approval/return tracked with timestamp and principal ID
- [ ] School isolation enforced (other school's principal can't see this lesson)

---

## WORKFLOW 4: Admin Broadcast → Teacher Receives Message

### Scenario
Admin sends broadcast → Teachers receive in inbox → Can mark as read

### Steps

#### 4.1: Admin Creates Broadcast
```
POST /api/announcements/broadcast
{
  "school_id": "test-school-id",
  "created_by": "admin-id",
  "title": "Staff Meeting Tomorrow",
  "message": "Meeting at 3 PM in the staff room. All teachers required.",
  "scope": "ROLE",
  "target_role": "TEACHER"
}
```

**Expected Result**:
- Status: 200 OK
- Response contains:
  - `announcement_id`
  - `notifications_created`: 1 or more (number of teachers)
  - Message: "Broadcast message sent to X recipient(s)"

#### 4.2: Teacher Views Inbox
```
GET /api/teacher/broadcast-inbox?school_id=test-school-id&teacher_id=teacher-id&unread_only=false
```

**Expected Result**:
- Status: 200 OK
- Response contains:
  - `count`: total messages
  - `unread_count`: 1 (new broadcast)
  - `inbox`: array with at least 1 message containing:
    - `id`, `title`, `message`
    - `sender`: 'Admin' or admin name
    - `created_at`: timestamp
    - `read_at`: null (not yet read)
    - `read`: false

#### 4.3: Teacher Marks as Read
```
PATCH /api/teacher/broadcast-inbox
{
  "school_id": "test-school-id",
  "teacher_id": "teacher-id",
  "notification_id": "notification-id"
}
```

**Expected Result**:
- Status: 200 OK
- Response contains:
  - `updated`: 1
  - Message: "Updated X notification(s)"

#### 4.4: Verify Message Still Visible After Read
```
GET /api/teacher/broadcast-inbox?school_id=test-school-id&teacher_id=teacher-id
```

**Expected Result**:
- Message still in list
- `read_at`: timestamp (populated)
- `read`: true
- `unread_count`: 0

### Verification Checklist
- [ ] Broadcast created with proper scope
- [ ] Notifications created for all target recipients
- [ ] Teacher can fetch inbox
- [ ] Unread count correct
- [ ] Teacher can mark message as read
- [ ] Message remains in inbox after being read
- [ ] School isolation enforced (other school's broadcast not visible)

---

## WORKFLOW 5: Principal Dashboard Data Display

### Scenario
Principal logs in → Dashboard shows real aggregated data

### Steps

#### 5.1: Principal Views Dashboard
```
GET /api/principal/dashboard?school_id=test-school-id&principal_id=principal-id
```

**Expected Result**:
- Status: 200 OK
- Response contains aggregated data:
  - `school_info`: name, logo_url, type
  - `stats`:
    - `total_classes`: 1 or more (not 0 if classes exist)
    - `total_students`: 1 or more (matches actual student count)
    - `total_teachers`: 1 or more (matches actual teacher count)
    - `total_staff`: 0 or more (matches actual staff count)
    - `average_attendance`: percentage (0-100)
    - `pending_lesson_notes`: count
  - `classes`: array with each class containing:
    - `name`, `level`, `arm_name`, `teacher_name`
    - `student_count`: actual count (not 0)
    - `average_score`: calculated from score_sheets
    - `attendance_rate`: calculated from attendance
  - `recent_scores`: array of latest score entries
  - `attendance_summary`: {present, absent, late} for today
  - `recent_activity`: list of recent events

#### 5.2: Verify Data Accuracy
```sql
-- Verify counts match database
SELECT COUNT(*) FROM class_arm_combos 
WHERE school_id = 'test-school-id';

SELECT COUNT(*) FROM students 
WHERE school_id = 'test-school-id';

SELECT COUNT(*) FROM users 
WHERE role = 'TEACHER' AND school_id = 'test-school-id';

-- Check scores are from current term
SELECT COUNT(*) FROM score_sheets 
WHERE school_id = 'test-school-id' AND term_id = 'current-term-id';
```

### Verification Checklist
- [ ] Dashboard loads without errors
- [ ] Stats show actual data (not mock/hardcoded)
- [ ] Counts are non-zero when data exists
- [ ] No "undefined" or "N/A" values
- [ ] Attendance rates calculated correctly
- [ ] Recent scores show actual data
- [ ] School isolation enforced (other school's data not visible)

---

## WORKFLOW 6: Appointment Letter Generation (Multi-Role)

### Scenario
Generate appointment letters for different roles (teacher, principal, accountant)

### Steps

#### 6.1: Teacher Appointment Letter
```
GET /api/documents/appointment-letter?teacherId=teacher-id
```

**Expected Result**:
- Status: 200 OK
- Letter contains:
  - "Letter of Appointment"
  - Teacher name: "Mr Teacher"
  - Position: from `staff.position` (not "undefined")
  - Employment date: from `staff.employment_date`
  - List of classes and subjects assigned
  - School name and address
  - No "undefined" values

#### 6.2: Principal Appointment Letter
```
GET /api/documents/appointment-letter?teacherId=principal-id&principal=1
```

**Expected Result**:
- Status: 200 OK
- Letter contains:
  - "Letter of Appointment - Principal"
  - Principal name
  - Position: "Principal"
  - Employment date
  - Role-specific responsibilities
  - No "undefined" values

#### 6.3: Accountant Appointment Letter
```
GET /api/documents/appointment-letter?teacherId=accountant-id
```

**Expected Result**:
- Status: 200 OK
- Letter contains:
  - "Letter of Appointment - Accountant"
  - Staff name
  - Position: "Accountant"
  - Employment date
  - No "undefined" values

### Verification Checklist
- [ ] Teacher letter includes name, position, employment date, classes/subjects
- [ ] Principal letter includes name, position as 'Principal'
- [ ] Accountant letter includes name, position as 'Accountant'
- [ ] All letters have actual data (no "undefined")
- [ ] Employment dates are correct
- [ ] School info is correct in letter

---

## WORKFLOW 7: School Isolation (Multi-Tenant Security)

### Scenario
Verify cross-school access is blocked

### Steps

#### 7.1: Create Second School with Different Admin
```sql
INSERT INTO schools (id, name, address) VALUES 
  ('school2-id', 'School 2', 'Address 2');

INSERT INTO users (id, email, full_name, role, school_id) VALUES 
  ('admin2-id', 'admin2@test.com', 'Admin 2', 'ADMIN', 'school2-id');
```

#### 7.2: Try to Access School A Data as Admin from School B
```
GET /api/principal/dashboard?school_id=test-school-id&principal_id=admin-id
```

**Expected Result**:
- Status: 200 OK (admin can see school's data)

#### 7.3: Try to Access School A as Admin from School B (SHOULD FAIL)
```
GET /api/principal/dashboard?school_id=test-school-id&principal_id=admin2-id
```

**Expected Result**:
- Status: 403 Forbidden or 404 Not Found
- NOT: 200 OK with School A data
- Error message: "Unauthorized" or "Not found"

#### 7.4: Try to Get Student from Other School
```
GET /api/documents/admission-letter?studentId=student-from-school-a
```

**Expected Result (if accessed by School B user)**:
- Status: 404 Not Found
- NOT: 200 with letter for other school

#### 7.5: Verify Via Direct API Calls
```
POST /api/subject-scores
{
  "school_id": "test-school-id",  // School A
  "student_id": "student-from-school-a",
  "subject_id": "subject-id",
  "teacher_id": "admin2-id"  // Admin from School B
}
```

**Expected Result**:
- Status: 403 Forbidden or validation error
- NOT: 200 with score saved

### Verification Checklist
- [ ] User from School B cannot access School A dashboard
- [ ] User from School B cannot generate letters for School A students
- [ ] User from School B cannot save scores for School A students
- [ ] Every API enforces `school_id` filtering
- [ ] No data leakage between schools

---

## WORKFLOW 8: Error Handling

### Scenario
Verify proper error responses for various failure cases

### Steps

#### 8.1: Missing Required Field
```
POST /api/subject-scores
{
  "school_id": "test-school-id",
  "student_id": "student-id",
  // Missing: subject_id, term_id, class_arm_combo_id, teacher_id
}
```

**Expected Result**:
- Status: 400 Bad Request
- Response contains: `"error": "Missing required field: subject_id"`

#### 8.2: Invalid UUID
```
GET /api/student/report-card?school_id=invalid&student_id=student-id
```

**Expected Result**:
- Status: 400 Bad Request
- Response contains clear error message

#### 8.3: Record Not Found
```
GET /api/documents/admission-letter?studentId=nonexistent-id
```

**Expected Result**:
- Status: 404 Not Found
- Response contains: `"error": "Student not found"` or similar

#### 8.4: Unauthorized Access
```
PUT /api/principal/lessons/approve
{
  "school_id": "test-school-id",
  "principal_id": "teacher-id",  // Not a principal
  "lesson_note_id": "lesson-id"
}
```

**Expected Result**:
- Status: 403 Forbidden
- Response contains: `"error": "Unauthorized"` or "Permission denied"

#### 8.5: Database Error
```
POST /api/teacher/cbt/create
{
  // Valid request but intentionally cause DB error
  // (e.g., foreign key violation)
}
```

**Expected Result**:
- Status: 500 Internal Server Error
- Response contains: `"error": "Database error"` or descriptive message
- Error logged to console/server logs

### Verification Checklist
- [ ] 400 returned for missing/invalid parameters
- [ ] 404 returned for missing records (not fake data, not 200)
- [ ] 403 returned for unauthorized access (not 404)
- [ ] 500 returned for server errors (with descriptive message)
- [ ] All error messages are descriptive (not generic)
- [ ] Console shows error logs with context

---

## Final Integration Verification

### SQL Verification Queries

```sql
-- 1. Verify academic hierarchy
SELECT COUNT(*) FROM academic_sessions WHERE school_id = 'test-school-id';
SELECT COUNT(*) FROM academic_terms WHERE school_id = 'test-school-id';

-- 2. Verify CBT system
SELECT COUNT(*) FROM cbt_exams WHERE school_id = 'test-school-id';
SELECT COUNT(*) FROM cbt_questions WHERE cbt_exam_id = 'exam-id';
SELECT COUNT(*) FROM cbt_options WHERE option_key IN ('A','B','C','D');
SELECT COUNT(*) FROM cbt_submissions WHERE school_id = 'test-school-id';
SELECT COUNT(*) FROM cbt_answers WHERE school_id = 'test-school-id';

-- 3. Verify assessment data (canonical)
SELECT COUNT(*) FROM score_sheets WHERE school_id = 'test-school-id';

-- 4. Verify lesson notes
SELECT COUNT(*) FROM lesson_notes WHERE school_id = 'test-school-id';

-- 5. Verify broadcasts
SELECT COUNT(*) FROM announcements WHERE school_id = 'test-school-id';
SELECT COUNT(*) FROM notifications WHERE school_id = 'test-school-id';

-- 6. Verify no deprecated tables
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_name IN ('result_entries', 'cbt_results', 'terms', 'student_subject_enrollment', 'teacher_assignments')
AND table_schema = 'public';
-- Expected: 0 rows (all should be dropped by migration 058)

-- 7. Verify FK constraints
SELECT constraint_name, table_name 
FROM information_schema.table_constraints 
WHERE table_name = 'cbt_exams' AND constraint_type = 'FOREIGN KEY'
ORDER BY constraint_name;
```

### Browser Console Verification
- [ ] No errors logged
- [ ] No warnings about missing data
- [ ] Network tab shows 200/201 responses
- [ ] No 404 errors for API calls
- [ ] No CORS errors
- [ ] No unhandled promise rejections

---

## Test Completion Checklist

- [ ] Workflow 1: Admission letter generation ✅
- [ ] Workflow 2: CBT creation → submission → auto-grading ✅
- [ ] Workflow 3: Lesson note workflow ✅
- [ ] Workflow 4: Broadcast messaging ✅
- [ ] Workflow 5: Principal dashboard ✅
- [ ] Workflow 6: Appointment letters (multi-role) ✅
- [ ] Workflow 7: School isolation ✅
- [ ] Workflow 8: Error handling ✅
- [ ] Database migrations applied (055, 056, 057, 058) ✅
- [ ] No deprecated tables exist ✅
- [ ] No deprecated table references in code ✅
- [ ] Build passes without errors/warnings ✅

---

**Status**: Ready for end-to-end testing
**Next**: Execute all 8 workflows and document results
