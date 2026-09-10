# Phase 2 Testing Guide - Complete End-to-End Testing

## 🚀 Quick Start

**Server**: Running on `http://localhost:3000`  
**Status**: Ready for testing  
**Expected Duration**: ~30 minutes for full test suite

---

## TEST SUITE 1: Teacher Registration System

### Test 1.1: Teacher Registration with Subjects

**Path**: `http://localhost:3000/school-admin/dashboard` → Register Teacher

**Test Steps**:
1. Click "Register Teacher" button
2. Fill in teacher details:
   - Name: "Test Teacher 01"
   - Email: "teacher01@test.com"
   - Phone: "+2348012345678"
   - Teaching Level: Select a level
   - Class: Select a class
   - Subjects: Select at least 2 subjects
3. Click "Register Teacher"
4. Wait for response

**Expected Results** ✅
```
Console Messages:
✅ "Teacher registered successfully"
✅ No database errors
✅ No foreign key errors
✅ No null value errors

Database Check (Supabase):
✅ New user created in 'users' table
   - user.role = 'TEACHER'
   - user.school_id = <current school>
   
✅ New teacher record in 'teachers' table
   - teacher.user_id = users.id (CRITICAL - NOT teachers.id)
   - teacher.school_id = <current school>
   
✅ Subject assignments created
   - subject_teacher_assignments.teacher_id = users.id
   - subject_teacher_assignments.subject_id = <selected subjects>
   - subject_teacher_assignments.school_id = <current school>

✅ Class assignment created
   - class_arm_combos.class_teacher_id = users.id
```

**If Errors Occur**:
- ❌ "Key (teacher_id) is not present in table users" → ID type mismatch
- ❌ "null value in column 'school_id'" → Missing school_id on assignments
- ❌ "Cannot find teacher" → User record creation failed

---

### Test 1.2: Teacher Login & Dashboard

**Path**: `http://localhost:3000/auth/login`

**Test Steps**:
1. Login as the teacher (email: teacher01@test.com, password: set during registration)
2. Navigate to `/teacher/dashboard`
3. Verify dashboard content

**Expected Results** ✅
```
Dashboard Should Show:
✅ Teacher name at top
✅ School name
✅ List of assigned classes
✅ List of assigned subjects
✅ Number of students in each class
✅ Quick links to create CBT

Console:
✅ No auth errors
✅ No data loading errors
```

---

## TEST SUITE 2: Student Registration System

### Test 2.1: Student Registration

**Path**: `http://localhost:3000/school-admin/dashboard` → Register Student

**Test Steps**:
1. Click "Register Student" button
2. Fill in student details:
   - Name: "Test Student 01"
   - Email: "student01@test.com"
   - Phone: "+2348087654321"
   - Class: Same class as test teacher
   - Admission Number: "STU-2024-001"
3. Click "Register Student"
4. Wait for response

**Expected Results** ✅
```
Console Messages:
✅ "Student registered successfully"
✅ No database errors
✅ Proper links to class and subjects

Database Check (Supabase):
✅ New user created in 'users' table
   - user.role = 'STUDENT'
   - user.school_id = <current school>
   
✅ New student record in 'students' table
   - student.user_id = users.id
   - student.class_arm_combo_id = <selected class>
   - student.school_id = <current school>
   - student.admission_number = "STU-2024-001"
   
✅ Subject links created
   - student_subjects records created for class subjects
   - student_subjects.student_id = students.id
   - student_subjects.subject_id = <class subjects>
   - student_subjects.school_id = <current school>
```

---

### Test 2.2: Student Login & Dashboard

**Path**: `http://localhost:3000/auth/login`

**Test Steps**:
1. Login as the student
2. Navigate to `/student/dashboard`
3. Verify dashboard shows class and subject info

**Expected Results** ✅
```
Dashboard Should Show:
✅ Student name
✅ School name
✅ Class name
✅ List of subjects
✅ Admission number
✅ Link to "My CBT Exams"

Console:
✅ No auth errors
✅ No data loading errors
```

---

## TEST SUITE 3: CBT Creation System

### Test 3.1: Create CBT Exam

**Path**: Teacher Dashboard → CBT Management → Create Test

**Test Steps**:
1. Click "Create New CBT"
2. Fill exam details:
   - Title: "Mathematics Test - Chapter 1"
   - Subject: Select teacher's subject
   - Class: Select teacher's class
   - Duration: 60 minutes
   - Total Marks: 100
   - Passing Percentage: 50
   - Start Time: Now + 1 hour
   - End Time: Now + 2 hours
3. Add Questions (add 5 questions for complete test):
   - Q1: "What is 2+2?" (4 marks)
     - A) 3 | B) **4** | C) 5 | D) 6
   - Q2: "Capital of France?" (4 marks)
     - A) London | B) **Paris** | C) Berlin | D) Madrid
   - Q3: "How many continents?" (3 marks)
     - A) 5 | B) 6 | C) **7** | D) 8
   - Q4-Q5: Add any 2 more questions (44 + 44 = 88 marks, total = 100)
4. Verify total marks = 100
5. Click "Create CBT"

**Expected Results** ✅
```
Console Messages:
✅ "CBT created successfully"
✅ "Questions saved successfully"
✅ No validation errors
✅ No NaN errors
✅ No column name errors

Database Check (Supabase):
✅ New record in 'cbt_exams' table
   - cbt_exams.school_id = <current school>
   - cbt_exams.subject_id = <selected subject>
   - cbt_exams.class_arm_combo_id = <selected class>
   - cbt_exams.created_by = users.id (teacher)
   - cbt_exams.total_marks = 100
   - cbt_exams.passing_percentage = 50
   
✅ New records in 'cbt_questions' table
   - 5 questions created
   - Each has cbt_exam_id pointing to exam
   - Each has school_id
   - Question marks sum to 100
   
✅ New records in 'cbt_options' table
   - 4 options per question
   - Each linked to question_id
   - One marked as is_correct per question
```

**If Errors Occur**:
- ❌ "Cannot find column 'end_date'" → Should be `end_time`
- ❌ "Cannot find column 'passing_marks'" → Should be `passing_percentage`
- ❌ "The specified value 'NaN' cannot be parsed" → Validation failed
- ❌ "Total marks do not match" → Question marks validation
- ❌ "null value in column 'school_id'" → Missing school_id

---

## TEST SUITE 4: Student CBT Portal

### Test 4.1: View Available CBTs (Performance Test)

**Path**: Student Dashboard → My CBT Exams

**Test Steps**:
1. Login as the student created earlier
2. Navigate to `/student/cbt`
3. Observe page load time
4. Check available exams list

**Expected Results** ✅
```
Performance:
✅ Page loads in < 3 seconds (optimized)
✅ No loading spinner delays
✅ Data displays smoothly

Content Display:
✅ CBT exam created earlier is visible
✅ Shows exam title
✅ Shows subject name
✅ Shows class name
✅ Shows duration
✅ Shows total marks
✅ Shows passing percentage
✅ Shows exam date/time
✅ Shows status badge (Available/Active/Expired/Completed)

UI Features:
✅ "Start Exam" button visible
✅ Subject filter buttons work
✅ Statistics section shows counts

Console:
✅ No errors
✅ No query warnings
✅ No N+1 patterns detected

Browser DevTools (Optional Performance Check):
✅ Network requests < 2 seconds
✅ Database queries minimal
✅ No duplicate requests
```

---

### Test 4.2: Filter CBTs by Subject

**Test Steps**:
1. If student has multiple subjects, click subject filter buttons
2. Verify exam list updates

**Expected Results** ✅
```
✅ Exams filter by selected subject
✅ No console errors
✅ List updates instantly
```

---

## TEST SUITE 5: Error Handling & Validation

### Test 5.1: Teacher Registration - Invalid Data

**Path**: Teacher Registration Form

**Test Steps**:
1. Try to register with missing required fields
2. Observe error messages

**Expected Results** ✅
```
✅ Clear error messages shown
✅ Form validation prevents submission
✅ Specific field errors highlighted
```

---

### Test 5.2: CBT Creation - Invalid Marks

**Path**: CBT Management → Create Test

**Test Steps**:
1. Create exam with questions
2. Make question marks NOT equal total marks
3. Try to submit

**Expected Results** ✅
```
✅ Error shown: "Total marks must equal sum of question marks"
✅ Cannot submit with invalid data
✅ Form shows which field is wrong
```

---

## Database Verification Commands

**Access Supabase Dashboard**:
1. Go to `https://supabase.com`
2. Login to project: SMS
3. Run these queries in SQL Editor

### Query 1: Check Teachers Created
```sql
SELECT u.id, u.full_name, u.role, t.id, t.user_id, t.school_id 
FROM users u
JOIN teachers t ON u.id = t.user_id
WHERE u.school_id = '<your-school-id>'
ORDER BY u.created_at DESC
LIMIT 10;
```

**Expected**: Returns teacher records with proper ID linking

### Query 2: Check Subject Assignments
```sql
SELECT u.full_name, s.name, sta.teacher_id, sta.school_id
FROM subject_teacher_assignments sta
JOIN users u ON sta.teacher_id = u.id
JOIN subjects s ON sta.subject_id = s.id
WHERE sta.school_id = '<your-school-id>'
ORDER BY sta.created_at DESC
LIMIT 10;
```

**Expected**: `teacher_id` = `users.id`, `school_id` is set

### Query 3: Check CBT Exams
```sql
SELECT ce.id, ce.title, ce.total_marks, ce.passing_percentage, 
       ce.school_id, COUNT(cq.id) as question_count
FROM cbt_exams ce
LEFT JOIN cbt_questions cq ON ce.id = cq.cbt_exam_id
WHERE ce.school_id = '<your-school-id>'
GROUP BY ce.id
ORDER BY ce.created_at DESC
LIMIT 10;
```

**Expected**: Exams created with proper school_id and questions linked

### Query 4: Check Questions & Options
```sql
SELECT cq.id, cq.question_text, cq.marks, cq.school_id,
       COUNT(co.id) as option_count,
       SUM(CASE WHEN co.is_correct THEN 1 ELSE 0 END) as correct_count
FROM cbt_questions cq
LEFT JOIN cbt_options co ON cq.id = co.question_id
WHERE cq.school_id = '<your-school-id>'
GROUP BY cq.id
ORDER BY cq.created_at DESC
LIMIT 20;
```

**Expected**: Questions have school_id, options linked, one correct answer each

---

## Performance Metrics to Monitor

### Server Response Times
- Teacher Dashboard: < 1 second
- Student Dashboard: < 1 second
- CBT Portal: < 3 seconds (was slow before optimization)
- Create CBT: < 2 seconds

### Database Performance
- CBT Portal query: < 500ms
- Teacher data load: < 300ms
- Student data load: < 300ms

### Browser Console
- No errors
- No warnings
- No deprecated API usage

---

## Troubleshooting Guide

### If Teacher Registration Fails

**Error**: "Key (teacher_id) is not present in table 'users'"
```
Root Cause: Code using teachers.id instead of users.id
Solution: Check teacher.service.ts - assignSubjectsToTeacher()
File: src/services/teacher.service.ts
Look for: Wrong ID type in subject_teacher_assignments insert
```

**Error**: "null value in column 'school_id'"
```
Root Cause: Missing school_id in insert statement
Solution: Verify all inserts include school_id
File: src/services/teacher.service.ts
Verify: All subject assignments have school_id set
```

### If CBT Creation Fails

**Error**: "The specified value 'NaN' cannot be parsed"
```
Root Cause: Numeric validation not working
Solution: Check validation before insert
File: src/app/teacher/cbt-management/page.tsx
Look for: NaN prevention in numeric fields
```

**Error**: "Cannot find column 'end_date'"
```
Root Cause: Wrong column name
Solution: Column is 'end_time' not 'end_date'
File: src/app/teacher/cbt-management/page.tsx
Verify: Using end_time and start_time
```

### If Student CBT Portal Loads Slowly

**Error**: Page takes 10+ seconds to load
```
Root Cause: Unoptimized database queries
Solution: Check query optimization
File: src/app/student/cbt/page.tsx
Verify: Using Promise.all() for parallel queries
Verify: Limiting results to 20
Verify: Selecting only required columns
```

---

## Sign-Off Checklist

After completing all tests, verify these points:

```
Teacher Registration
- [ ] Teacher created without errors
- [ ] User record created (users.id exists)
- [ ] Subjects assigned with users.id (not teachers.id)
- [ ] School_id properly set everywhere
- [ ] Dashboard shows subjects/classes

Student Registration
- [ ] Student created without errors
- [ ] User record created
- [ ] Linked to class
- [ ] Linked to subjects
- [ ] Dashboard shows info

CBT Creation
- [ ] Exam created successfully
- [ ] Questions saved
- [ ] Options saved
- [ ] Validation working
- [ ] Total marks correct

CBT Portal
- [ ] Student sees available exams
- [ ] Page loads quickly (< 3 seconds)
- [ ] Filters work
- [ ] Status badges correct
- [ ] No console errors

Performance
- [ ] Database queries optimized
- [ ] No N+1 patterns
- [ ] Server response times acceptable
- [ ] Browser console clean

Database
- [ ] All records have proper school_id
- [ ] All ID types consistent
- [ ] Foreign keys valid
- [ ] No orphaned records
```

---

## Next Phase (After Testing Passes)

Once all tests pass ✅, proceed with:

1. **Exam Taking Interface** - `/student/cbt/[id]/page.tsx`
   - Display questions one per screen
   - Timer countdown
   - Answer submission
   - Progress tracking

2. **Results Display** - `/student/cbt/[id]/results/page.tsx`
   - Final score
   - Pass/fail status
   - Answer review
   - Score breakdown

3. **Teacher Results** - Expand `/teacher/cbt-management`
   - View all submissions
   - Student scores
   - Export results
   - Analytics

4. **Analytics & Reporting**
   - Class performance
   - Subject performance
   - Question difficulty
   - Student progress

---

## Support & Documentation

**If You Get Stuck**:
1. Check console for error messages
2. Review `SERVER_READY_STATUS.md`
3. Check `DEVELOPER_ROADMAP.md`
4. Review `CBT_COMPLETE_FIX_SUMMARY.md`
5. Check database with provided SQL queries
6. Look for `.md` files with "FIX" in name for technical details

**Database Connection**:
- **URL**: https://egdreueuspmuxhezdpqm.supabase.co
- **Project**: SMS
- **Project Ref**: egdreueuspmuxhezdpqm

---

**Happy Testing! 🚀**

Report any issues found and we'll fix them immediately.

Generated: August 19, 2026  
Session: Phase 2 Performance & Completion
