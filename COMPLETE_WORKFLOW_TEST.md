# 📋 Complete End-to-End Workflow Test

This document provides step-by-step instructions to test the complete student-teacher linking system.

## Prerequisites

✅ Migration 015 applied (classes & subjects)
✅ Migration 017 applied (bridge tables)
✅ School data populated
✅ Dev server running: `npm run dev`

---

## Phase 1: Verify System Setup

### Step 1: Check Migration 017 Applied

**In Supabase SQL Editor**, run:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('student_class_teachers', 'student_subject_teachers')
ORDER BY table_name;
```

**Expected Result**:
```
table_name
─────────────────────────────
student_class_teachers
student_subject_teachers
```

### Step 2: Check School Data Populated

**In Supabase SQL Editor**, run:

```sql
SELECT 
  COUNT(DISTINCT c.id) as class_count,
  COUNT(DISTINCT s.id) as subject_count
FROM classes c
CROSS JOIN subjects s
WHERE c.school_id = s.school_id
LIMIT 1;
```

**Expected Result**:
```
class_count | subject_count
────────────┼──────────────
15          | 17
```

### Step 3: API Verification Endpoint

**Open in browser**:
```
http://localhost:3000/api/test/verify-bridge-tables
```

**Expected Response** (JSON):
```json
{
  "bridge_tables_exist": true,
  "student_class_teachers_count": 0,
  "student_subject_teachers_count": 0,
  "sample_links": {
    "class_links": [],
    "subject_links": []
  },
  "errors": [],
  "status": "OK"
}
```

✅ If all above pass, proceed to Phase 2

---

## Phase 2: Register Teacher with Class & Subjects

### Step 1: Create Teacher User

**Go to**: http://localhost:3000/admin/dashboard

**Click**: "Register New Staff" → "Register Teacher"

**Fill Form**:

| Field | Value |
|-------|-------|
| Full Name | `Mr. Ahmed Khan` |
| Email | `ahmed.khan@school.com` |
| Password | `SecurePass123!` |
| Confirm Password | `SecurePass123!` |
| Date of Birth | `1985-03-20` |

**Click**: "Continue"

### Step 2: Assign as Class Teacher

**Fill Form**:

| Field | Value |
|-------|-------|
| Bank Name | `First Bank` |
| Account Number | `0123456789` |
| Account Holder | `Ahmed Khan` |
| Salary Amount | `150000` |
| Employment Date | `2024-01-15` |

**Click**: "Continue"

### Step 3: Select Class

**Fill Form**:

| Field | Value |
|-------|-------|
| Class Teacher Assignment | ✅ **JSS1A** |

**Click**: "Continue"

### Step 4: Select Subjects

**Select**:
- ✅ English Language
- ✅ Mathematics
- ✅ Integrated Science

**Click**: "Submit"

**Expected**:
```
✅ Teacher registered successfully!
✅ Assigned as class teacher for JSS1A
✅ Assigned 3 subjects
```

### Step 5: Verify in Database

**In Supabase SQL Editor**, run:

```sql
-- Find the teacher
SELECT id, full_name, email FROM users WHERE email = 'ahmed.khan@school.com';
```

Save the teacher `id` (let's call it `TEACHER_ID`)

**Then verify assignments**:

```sql
-- Check class teacher assignment
SELECT 
  cac.id as class_combo_id,
  c.name as class_name,
  a.name as arm_name,
  cac.class_teacher_id
FROM class_arm_combos cac
JOIN classes c ON c.id = cac.class_id
JOIN arms a ON a.id = cac.arm_id
WHERE cac.class_teacher_id = 'TEACHER_ID'
  AND c.name = 'JSS1A';

-- Check subject assignments
SELECT 
  sta.id,
  s.name as subject_name,
  u.full_name as teacher_name,
  c.name as class_name
FROM subject_teacher_assignments sta
JOIN subjects s ON s.id = sta.subject_id
JOIN users u ON u.id = sta.teacher_id
JOIN class_arm_combos cac ON cac.id = sta.class_arm_combo_id
JOIN classes c ON c.id = cac.class_id
WHERE u.email = 'ahmed.khan@school.com'
ORDER BY s.name;
```

**Expected**:
- 1 row showing teacher is class teacher of JSS1A
- 3 rows showing teacher assigned to 3 subjects for JSS1A

---

## Phase 3: Register Student in Teacher's Class & Subjects

### Step 1: Go to Registration

**Click**: "Register New Student"

### Step 2: Personal Information (Step 1)

**Fill Form**:

| Field | Value |
|-------|-------|
| Full Name | `Zainab Ahmed Hassan` |
| Email | `zainab.hassan@student.com` |
| Password | `StudentPass123!` |
| Confirm Password | `StudentPass123!` |
| Date of Birth | `2010-06-15` |

**Click**: "Continue"

### Step 3: Parent Information (Step 2)

**Fill Form**:

| Field | Value |
|-------|-------|
| Parent Name | `Hajiya Amina Hassan` |
| Phone | `+2348012345678` |
| Email | `amina@email.com` |

**Click**: "Continue"

### Step 4: Academic Placement (Step 3)

**Select**:
- Section: ✅ **Secondary**
- Class: ✅ **JSS1A**

**Click**: "Continue"

### Step 5: Subject Selection (Step 4)

**Select** (same as teacher):
- ✅ English Language
- ✅ Mathematics
- ✅ Integrated Science

**Click**: "Complete Registration"

**Expected**:
```
✅ Student registered successfully!
✅ Auto-linked to class teacher Ahmed Khan
✅ Auto-linked to 3 subject teachers
```

### Step 6: Verify in Database

**In Supabase SQL Editor**, run:

```sql
-- Find the student
SELECT id, admission_number FROM students WHERE admission_number LIKE '%JSS1A%' ORDER BY created_at DESC LIMIT 1;
```

Save the student `id` (let's call it `STUDENT_ID`)

**Then verify auto-linking**:

```sql
-- Check class teacher link
SELECT 
  sct.student_id,
  s.admission_number,
  u.full_name as teacher_name,
  c.name as class_name
FROM student_class_teachers sct
JOIN students s ON s.id = sct.student_id
JOIN users u ON u.id = sct.teacher_id
JOIN class_arm_combos cac ON cac.id = sct.class_arm_combo_id
JOIN classes c ON c.id = cac.class_id
WHERE s.id = 'STUDENT_ID';

-- Check subject teacher links
SELECT 
  sst.student_id,
  s.admission_number,
  subj.name as subject_name,
  u.full_name as teacher_name
FROM student_subject_teachers sst
JOIN students s ON s.id = sst.student_id
JOIN subjects subj ON subj.id = sst.subject_id
JOIN users u ON u.id = sst.teacher_id
WHERE s.id = 'STUDENT_ID'
ORDER BY subj.name;
```

**Expected**:
- 1 row showing student linked to Ahmed Khan as class teacher
- 3 rows showing student linked to Ahmed Khan as subject teacher

---

## Phase 4: Verify Teacher Dashboard

### Step 1: Login as Teacher

**Open new tab/private window**: http://localhost:3000

**Login**:
- Email: `ahmed.khan@school.com`
- Password: `SecurePass123!`

**Go to**: Teacher Dashboard (or Dashboard link)

### Step 2: Verify Class Students Section

**Expected to see**:

```
CLASS STUDENTS
┌────────────────────────────────────────────┐
│ Classes Managed: 1                         │
├────────────────────────────────────────────┤
│ 📚 JSS1A                                   │
│ Students in class: 1                       │
├────────────────────────────────────────────┤
│ • Zainab Ahmed Hassan (SMS-JSS1A-00001)    │
│   Subjects: 3                              │
│   👤 Click to view details                 │
└────────────────────────────────────────────┘
```

### Step 3: Verify Subject Students Section

**Expected to see**:

```
SUBJECT STUDENTS
┌────────────────────────────────────────────┐
│ Subjects Taught: 3                         │
├────────────────────────────────────────────┤
│ 📖 English Language                        │
│ Students: 1                                │
│ • Zainab Ahmed Hassan (JSS1A)              │
├────────────────────────────────────────────┤
│ 🔢 Mathematics                             │
│ Students: 1                                │
│ • Zainab Ahmed Hassan (JSS1A)              │
├────────────────────────────────────────────┤
│ 🧪 Integrated Science                      │
│ Students: 1                                │
│ • Zainab Ahmed Hassan (JSS1A)              │
└────────────────────────────────────────────┘
```

### Step 4: Click on Student

**Click**: "Zainab Ahmed Hassan" under class students

**Expected to see**:
- Full name
- Admission number
- Class: JSS1A
- Subjects enrolled: 3
- Parent contact info
- Registration date

---

## Phase 5: Verify Student Dashboard & Exam Access

### Step 1: Login as Student

**Open new tab/private window**: http://localhost:3000

**Login**:
- Email: `zainab.hassan@student.com`
- Password: `StudentPass123!`

**Expected**: Student Dashboard

### Step 2: Check Personal Information

**Go to**: "My Profile" or similar

**Expected to see**:
- Name: Zainab Ahmed Hassan
- Admission: SMS-JSS1A-00001 (or similar)
- Class: JSS1A
- Subjects: 3 (English, Math, Science)
- Class Teacher: Ahmed Khan

### Step 3: Check Available Exams

**Go to**: "My Exams" or "Examinations"

**Expected to see**:
```
AVAILABLE EXAMS FOR YOUR REGISTERED SUBJECTS
┌──────────────────────────────────────────┐
│ 📝 English Language - Quiz 1              │
│ Due: [date]                              │
│ Duration: 30 mins                        │
├──────────────────────────────────────────┤
│ 📝 Mathematics - Quiz 1                  │
│ Due: [date]                              │
│ Duration: 30 mins                        │
├──────────────────────────────────────────┤
│ 📝 Integrated Science - Quiz 1           │
│ Due: [date]                              │
│ Duration: 30 mins                        │
└──────────────────────────────────────────┘
```

### Step 4: Take a Sample Exam

**Click**: "English Language - Quiz 1"

**Expected**: Exam loads with questions

**Take the exam**:
1. Answer questions
2. Click "Submit"

**Expected**:
```
✅ Exam submitted successfully
📊 Your score: [score/total]
💯 Grade: [grade]
```

---

## Phase 6: Verify Multi-Tenancy Isolation

### Test: Students from Different Schools Can't See Each Other's Data

### Step 1: Create Second School (Optional - if multiple schools exist)

Or find an existing school in database

### Step 2: Register Teacher in Second School

**Repeat Phase 2** but for a different school

### Step 3: Try to Access Data from First School

**As teacher in School 2**:
- Try to see students from School 1: ❌ Should fail/show empty
- Try to view exams from School 1: ❌ Should fail/show empty

**In database** (both schools):
```sql
-- Verify isolation
SELECT school_id, COUNT(*) FROM students GROUP BY school_id;
-- Each school should only see their own data
```

---

## Phase 7: Automated Verification Tests

### Test 1: Bridge Table Integrity

**Run in Supabase SQL**:

```sql
-- Test 1: No orphaned student-class links
SELECT COUNT(*) as orphaned_class_links
FROM student_class_teachers sct
WHERE NOT EXISTS (SELECT 1 FROM students s WHERE s.id = sct.student_id)
   OR NOT EXISTS (SELECT 1 FROM users u WHERE u.id = sct.teacher_id)
   OR NOT EXISTS (SELECT 1 FROM class_arm_combos c WHERE c.id = sct.class_arm_combo_id);

-- Test 2: No orphaned student-subject links
SELECT COUNT(*) as orphaned_subject_links
FROM student_subject_teachers sst
WHERE NOT EXISTS (SELECT 1 FROM students s WHERE s.id = sst.student_id)
   OR NOT EXISTS (SELECT 1 FROM users u WHERE u.id = sst.teacher_id)
   OR NOT EXISTS (SELECT 1 FROM subjects s WHERE s.id = sst.subject_id);

-- Test 3: Verify uniqueness constraints
SELECT 
  COUNT(*) as duplicate_class_links
FROM (
  SELECT school_id, student_id, class_arm_combo_id, COUNT(*) as cnt
  FROM student_class_teachers
  GROUP BY school_id, student_id, class_arm_combo_id
  HAVING COUNT(*) > 1
) t;

-- Test 4: Verify all students have a class teacher
SELECT COUNT(*) as students_without_class_teacher
FROM students s
WHERE NOT EXISTS (
  SELECT 1 FROM student_class_teachers sct WHERE sct.student_id = s.id
);

-- Test 5: Students with subjects should have subject teachers
SELECT COUNT(*) as subjects_without_teacher
FROM student_subjects ss
WHERE NOT EXISTS (
  SELECT 1 FROM student_subject_teachers sst 
  WHERE sst.student_id = ss.student_id 
    AND sst.subject_id = ss.subject_id
);
```

**Expected**: All results should be 0 (no issues)

### Test 2: Query Performance

**Check indexes are being used**:

```sql
-- Verify indexes exist
SELECT indexname, tablename FROM pg_indexes 
WHERE tablename IN ('student_class_teachers', 'student_subject_teachers')
ORDER BY tablename, indexname;

-- Explain query performance
EXPLAIN ANALYZE
SELECT s.admission_number, u.full_name
FROM student_class_teachers sct
JOIN students s ON s.id = sct.student_id
JOIN users u ON u.id = sct.teacher_id
WHERE sct.teacher_id = 'TEACHER_ID';
```

**Expected**: 
- Indexes created
- Query uses Index Scan (not Seq Scan)
- Execution time < 100ms

---

## Summary Checklist

```
✅ Bridge tables created (student_class_teachers, student_subject_teachers)
✅ Teacher registered and assigned to class + 3 subjects
✅ Student registered and auto-linked to class teacher
✅ Student registered and auto-linked to 3 subject teachers
✅ Teacher dashboard shows student under "Class Students"
✅ Teacher dashboard shows student under each "Subject Students"
✅ Student sees exams for all registered subjects
✅ Student can take exams
✅ No data leakage between schools
✅ Database integrity maintained (no orphaned records)
✅ Indexes working (query performance OK)
✅ System ready for production use
```

---

## Troubleshooting

### Issue: Bridge tables don't exist
**Solution**: Apply migration 017 via Supabase SQL Editor

### Issue: Teacher doesn't appear in student links
**Solution**: 
1. Verify teacher was assigned to class
2. Check browser console for errors during registration
3. Manually create link via SQL:
```sql
INSERT INTO student_class_teachers (student_id, teacher_id, class_arm_combo_id, school_id)
SELECT 'STUDENT_ID', 'TEACHER_ID', cac.id, cac.school_id
FROM class_arm_combos cac
WHERE cac.id = 'CLASS_COMBO_ID';
```

### Issue: Student not appearing in teacher dashboard
**Solution**:
1. Refresh page (F5)
2. Logout and login again
3. Check if `student_class_teachers` record exists
4. Verify teacher_id matches logged-in teacher

### Issue: Student can't see exams
**Solution**:
1. Verify student_subject_teachers records exist
2. Verify exams created for those subjects
3. Check exam start_time is not in future
4. Verify student is in correct class

---

## Time Estimate

| Phase | Time |
|-------|------|
| 1. Verify Setup | 5 min |
| 2. Register Teacher | 5 min |
| 3. Register Student | 5 min |
| 4. Verify Teacher Dashboard | 5 min |
| 5. Verify Student Dashboard | 5 min |
| 6. Test Multi-Tenancy | 5 min |
| 7. Automated Tests | 5 min |
| **TOTAL** | **~35 min** |

All tests should pass with 100% success rate.
