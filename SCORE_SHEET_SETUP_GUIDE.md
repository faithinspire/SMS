# Score Sheet Setup Guide - Creating Test Data

## ⚠️ Problem: No Classes or Students Showing

The Score Sheet page shows empty because there's no data linking:
1. Teacher → Classes (via `teacher_assignments`)
2. Classes → Students (via `class_arm_combos` and students with that combo_id)
3. Students → Subjects (via `student_subject_enrollment`)

---

## ✅ Solution: Create Test Data

### Step 1: Identify Your IDs

Go to **Supabase Dashboard** → **SQL Editor** and run these queries to find the actual IDs in your database:

```sql
-- Find teachers
SELECT id, full_name, email FROM users WHERE role = 'TEACHER' LIMIT 5;

-- Find schools
SELECT id, name FROM schools LIMIT 5;

-- Find classes and class_arm_combos
SELECT 
  cac.id as class_combo_id,
  c.name as class_name,
  a.name as arm_name
FROM class_arm_combos cac
LEFT JOIN classes c ON cac.class_id = c.id
LEFT JOIN arms a ON cac.arm_id = a.id
LIMIT 5;

-- Find subjects
SELECT id, name, code FROM subjects LIMIT 10;

-- Find students
SELECT id, admission_number, user_id FROM students LIMIT 10;
```

**Example Output:**
```
Teacher ID:       "550e8400-e29b-41d4-a716-446655440000"
School ID:        "660e8400-e29b-41d4-a716-446655440001"
Class Combo ID:   "770e8400-e29b-41d4-a716-446655440002"
Subject IDs:      
  - "880e8400-e29b-41d4-a716-446655440003" (Mathematics)
  - "880e8400-e29b-41d4-a716-446655440004" (English)
  - "880e8400-e29b-41d4-a716-446655440005" (Physics)
Student IDs:
  - "990e8400-e29b-41d4-a716-446655440006"
  - "990e8400-e29b-41d4-a716-446655440007"
```

---

### Step 2: Create Teacher Assignments

Run this in SQL Editor (replace the XXXXX values with your actual IDs):

```sql
INSERT INTO teacher_assignments (school_id, teacher_id, subject_id, class_arm_combo_id)
VALUES 
  ('SCHOOL_ID', 'TEACHER_ID', 'MATH_SUBJECT_ID', 'CLASS_COMBO_ID'),
  ('SCHOOL_ID', 'TEACHER_ID', 'ENGLISH_SUBJECT_ID', 'CLASS_COMBO_ID'),
  ('SCHOOL_ID', 'TEACHER_ID', 'PHYSICS_SUBJECT_ID', 'CLASS_COMBO_ID')
ON CONFLICT (teacher_id, subject_id, class_arm_combo_id) DO NOTHING;
```

**Example:**
```sql
INSERT INTO teacher_assignments (school_id, teacher_id, subject_id, class_arm_combo_id)
VALUES 
  ('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', '880e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440002'),
  ('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', '880e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440002'),
  ('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', '880e8400-e29b-41d4-a716-446655440005', '770e8400-e29b-41d4-a716-446655440002')
ON CONFLICT (teacher_id, subject_id, class_arm_combo_id) DO NOTHING;
```

✅ **Result:** Teacher is now assigned to the class and can see it in Score Sheet

---

### Step 3: Create Student Subject Enrollments

Run this in SQL Editor (replace values with your actual IDs):

```sql
INSERT INTO student_subject_enrollment (school_id, student_id, subject_id, class_arm_combo_id)
VALUES 
  ('SCHOOL_ID', 'STUDENT_1_ID', 'MATH_SUBJECT_ID', 'CLASS_COMBO_ID'),
  ('SCHOOL_ID', 'STUDENT_1_ID', 'ENGLISH_SUBJECT_ID', 'CLASS_COMBO_ID'),
  ('SCHOOL_ID', 'STUDENT_1_ID', 'PHYSICS_SUBJECT_ID', 'CLASS_COMBO_ID'),
  ('SCHOOL_ID', 'STUDENT_2_ID', 'MATH_SUBJECT_ID', 'CLASS_COMBO_ID'),
  ('SCHOOL_ID', 'STUDENT_2_ID', 'ENGLISH_SUBJECT_ID', 'CLASS_COMBO_ID'),
  ('SCHOOL_ID', 'STUDENT_2_ID', 'PHYSICS_SUBJECT_ID', 'CLASS_COMBO_ID')
ON CONFLICT (student_id, subject_id, class_arm_combo_id) DO NOTHING;
```

**Example:**
```sql
INSERT INTO student_subject_enrollment (school_id, student_id, subject_id, class_arm_combo_id)
VALUES 
  ('660e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440006', '880e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440002'),
  ('660e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440006', '880e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440002'),
  ('660e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440006', '880e8400-e29b-41d4-a716-446655440005', '770e8400-e29b-41d4-a716-446655440002'),
  ('660e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440007', '880e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440002'),
  ('660e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440007', '880e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440002'),
  ('660e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440007', '880e8400-e29b-41d4-a716-446655440005', '770e8400-e29b-41d4-a716-446655440002')
ON CONFLICT (student_id, subject_id, class_arm_combo_id) DO NOTHING;
```

✅ **Result:** Students are now enrolled in subjects and will appear in Score Sheet

---

### Step 4: Verify the Data

Run these queries to confirm data was created:

```sql
-- Check teacher assignments
SELECT 
  ta.id,
  u.full_name as teacher,
  c.name as class,
  a.name as arm,
  s.name as subject
FROM teacher_assignments ta
JOIN users u ON ta.teacher_id = u.id
JOIN class_arm_combos cac ON ta.class_arm_combo_id = cac.id
JOIN classes c ON cac.class_id = c.id
JOIN arms a ON cac.arm_id = a.id
JOIN subjects s ON ta.subject_id = s.id;

-- Check student enrollments
SELECT 
  sse.id,
  u.full_name as student,
  s.admission_number,
  c.name as class,
  a.name as arm,
  subj.name as subject
FROM student_subject_enrollment sse
JOIN students s ON sse.student_id = s.id
JOIN users u ON s.user_id = u.id
JOIN class_arm_combos cac ON sse.class_arm_combo_id = cac.id
JOIN classes c ON cac.class_id = c.id
JOIN arms a ON cac.arm_id = a.id
JOIN subjects subj ON sse.subject_id = subj.id;
```

---

## 🎯 Now Test the Score Sheet

1. **Log in** as the teacher you assigned
2. Go to **Dashboard** → click **Score Sheet**
3. You should now see:
   - ✅ **Class dropdown** populated with your class
   - ✅ **Class auto-selected** (first one)
   - ✅ **Student list** showing your students in cards
   - ✅ **[ENTER SCORES] button** on each student

4. Click **[ENTER SCORES]** on a student:
   - ✅ Modal opens
   - ✅ Subjects appear in grid (Math, English, Physics)
   - ✅ CA1-4 and Exam input fields ready
   - ✅ Type scores → calculations update instantly

5. **Enter test scores:**
   - CA1: 8, CA2: 9, CA3: 7, CA4: 9
   - Exam: 52
   - See real-time calc: CA=33/40, Total=85/100, Grade=B

6. Click **[Save Scores]**:
   - ✅ Toast: "✅ Scores saved successfully!"
   - ✅ Data saved to result_entries table

7. **Log in as student** and go to **Results**:
   - ✅ Select same Term/Session
   - ✅ ✅ See scores: 85/100, Grade B
   - ✅ Attendance displayed
   - ✅ Click "View" to see breakdown

---

## 🚀 Quick Test (Single Command)

If you have a single teacher and one class, run this:

```sql
-- Add teacher to a class with 3 subjects
WITH teacher_data AS (
  SELECT id as teacher_id, school_id
  FROM users
  WHERE role = 'TEACHER'
  LIMIT 1
),
class_data AS (
  SELECT id as class_combo_id, id as school_id
  FROM class_arm_combos
  LIMIT 1
),
subject_data AS (
  SELECT id FROM subjects
  WHERE name IN ('Mathematics', 'English', 'Physics')
  LIMIT 3
),
student_data AS (
  SELECT id as student_id, school_id
  FROM students
  WHERE class_arm_combo_id = (SELECT class_combo_id FROM class_data)
  LIMIT 2
)
INSERT INTO teacher_assignments (school_id, teacher_id, subject_id, class_arm_combo_id)
SELECT teacher_data.school_id, teacher_data.teacher_id, subject_data.id, class_data.class_combo_id
FROM teacher_data, class_data, subject_data
ON CONFLICT DO NOTHING;

-- Enroll students in those subjects
WITH class_data AS (
  SELECT id as class_combo_id, id as school_id
  FROM class_arm_combos
  LIMIT 1
),
subject_data AS (
  SELECT id FROM subjects
  WHERE name IN ('Mathematics', 'English', 'Physics')
),
student_data AS (
  SELECT id as student_id, school_id
  FROM students
  WHERE class_arm_combo_id = (SELECT class_combo_id FROM class_data)
)
INSERT INTO student_subject_enrollment (school_id, student_id, subject_id, class_arm_combo_id)
SELECT student_data.school_id, student_data.student_id, subject_data.id, class_data.class_combo_id
FROM student_data, subject_data, class_data
ON CONFLICT DO NOTHING;
```

Then refresh Score Sheet page → should see students!

---

## ❓ Still No Data?

**Check these:**

1. **Are there teachers?**
   ```sql
   SELECT COUNT(*) FROM users WHERE role = 'TEACHER';
   ```
   If 0: Create a teacher account via registration

2. **Are there classes?**
   ```sql
   SELECT COUNT(*) FROM class_arm_combos;
   ```
   If 0: Create classes via school admin dashboard

3. **Are there students?**
   ```sql
   SELECT COUNT(*) FROM students;
   ```
   If 0: Enroll students via school admin dashboard

4. **Check logs** for Supabase errors:
   - Open browser DevTools (F12)
   - Check **Console** tab for red errors
   - Check **Network** tab to see API responses

---

**Once test data is created, Score Sheet will be fully functional!**
