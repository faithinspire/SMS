# URGENT FIX - TERM DROPDOWN & STUDENT LOADING ISSUES

**Issues Reported**:
1. ❌ Term dropdown not showing (weather first, second, third term)
2. ❌ Students not showing for Lucky Idudu at Ruachmodel School

---

## ISSUE 1: TERM DROPDOWN NOT SHOWING

### Root Cause
**No terms exist in the `terms` table for the school**, OR terms were created but not for the correct school_id.

### How to Fix

#### Step 1: Check if Terms Exist
Go to **Supabase SQL Editor** and run:

```sql
SELECT t.id, t.name, t.session_year, s.name as school_name
FROM terms t
JOIN schools s ON t.school_id = s.id
ORDER BY s.name, t.session_year DESC, t.name;
```

**Expected Result**: See terms like:
- 2024/2025 - First Term
- 2024/2025 - Second Term
- 2024/2025 - Third Term

**If NO results**: Go to Step 2  
**If results shown**: Check that school is correct and go to Step 3

#### Step 2: Create Missing Terms

If no terms exist, run this SQL to create them:

```sql
-- Create terms for all schools
INSERT INTO terms (school_id, name, session_year, start_date, end_date, is_current)
SELECT 
  s.id,
  term_data.name,
  term_data.session_year,
  term_data.start_date,
  term_data.end_date,
  term_data.is_current
FROM schools s
CROSS JOIN (
  VALUES 
    ('First Term', 2024, '2024-09-01'::date, '2024-11-30'::date, true),
    ('Second Term', 2024, '2024-12-01'::date, '2025-02-28'::date, false),
    ('Third Term', 2024, '2025-03-01'::date, '2025-05-31'::date, false)
) AS term_data(name, session_year, start_date, end_date, is_current)
WHERE NOT EXISTS (
  SELECT 1 FROM terms t 
  WHERE t.school_id = s.id 
  AND t.name = term_data.name
  AND t.session_year = term_data.session_year
);
```

This creates First, Second, Third Terms for ALL schools in 2024.

#### Step 3: Verify in UI

After creating terms:

1. Hard refresh browser (Ctrl+Shift+Delete or Cmd+Shift+Delete)
2. Go to `/teacher/score-sheet`
3. **Term dropdown** should now show:
   - First Term (2024)
   - Second Term (2024)
   - Third Term (2024)

**If still empty**: Check browser console for error message (see Debugging section)

---

## ISSUE 2: STUDENTS NOT SHOWING FOR LUCKY IDUDU

### Root Cause
**One of these**:
1. Students exist but NOT in `student_subjects` table (not enrolled in subject)
2. Students exist but `class_arm_combo_id` not set correctly
3. User "Lucky Idudu" is not actually a TEACHER in the system

### How to Diagnose

#### Step 1: Find Lucky Idudu in Database

Go to **Supabase SQL Editor** and run:

```sql
SELECT u.id, u.full_name, u.role, s.name as school_name
FROM users u
JOIN schools s ON u.school_id = s.id
WHERE u.full_name LIKE '%Lucky%' OR u.full_name LIKE '%idudu%'
ORDER BY s.name;
```

**Expected Result**: See Lucky Idudu with role='TEACHER'

**If NO result**: Lucky doesn't have an account  
**If role != 'TEACHER'**: Wrong role, can't have students

#### Step 2: Check Students in Lucky's Classes

```sql
-- Find all students in classes taught by Lucky
WITH lucky AS (
  SELECT u.id as teacher_id, u.full_name
  FROM users u
  WHERE (u.full_name LIKE '%Lucky%' OR u.full_name LIKE '%idudu%') AND u.role = 'TEACHER'
)
SELECT 
  l.full_name as teacher,
  c.name || ' ' || arm.name as class,
  u.full_name as student_name,
  st.admission_number,
  COUNT(st.id) as total_students_in_class
FROM lucky l
JOIN class_arm_combos cac ON cac.class_teacher_id = l.teacher_id
JOIN classes c ON cac.class_id = c.id
JOIN arms arm ON cac.arm_id = arm.id
LEFT JOIN students st ON st.class_arm_combo_id = cac.id
LEFT JOIN users u ON st.user_id = u.id
GROUP BY l.teacher_id, l.full_name, cac.id, c.name, arm.name, u.full_name, st.admission_number
ORDER BY c.name, u.full_name;
```

**Expected Result**: See students with names and admission numbers

**If NO students**: Class has no students enrolled  
**If students shown**: Go to Step 3

#### Step 3: Check if Students Enrolled in Subjects

```sql
-- Check if students taking subjects taught by Lucky
WITH lucky AS (
  SELECT u.id as teacher_id, u.full_name
  FROM users u
  WHERE (u.full_name LIKE '%Lucky%' OR u.full_name LIKE '%idudu%') AND u.role = 'TEACHER'
)
SELECT 
  l.full_name as teacher,
  subj.name as subject,
  COUNT(ss.id) as students_taking_subject,
  c.name || ' ' || arm.name as class
FROM lucky l
JOIN subject_teacher_assignments sta ON sta.teacher_id = l.teacher_id
JOIN subjects subj ON sta.subject_id = subj.id
JOIN class_arm_combos cac ON sta.class_arm_combo_id = cac.id
JOIN classes c ON cac.class_id = c.id
JOIN arms arm ON cac.arm_id = arm.id
LEFT JOIN student_subjects ss ON ss.subject_id = subj.id
GROUP BY l.teacher_id, l.full_name, subj.id, subj.name, cac.id, c.name, arm.name
ORDER BY subj.name;
```

**If 0 students taking subject**: Students haven't been enrolled in this subject

### How to Fix - Missing Subject Enrollments

If students exist in the class but not in `student_subjects`, run:

```sql
-- Enroll all students in subjects for their class
INSERT INTO student_subjects (student_id, subject_id, school_id)
SELECT DISTINCT
  st.id as student_id,
  subj.id as subject_id,
  st.school_id
FROM students st
JOIN class_arm_combos cac ON st.class_arm_combo_id = cac.id
JOIN subjects subj ON cac.class_id = ANY(subj.applicable_to_levels)
WHERE NOT EXISTS (
  SELECT 1 FROM student_subjects ss
  WHERE ss.student_id = st.id AND ss.subject_id = subj.id
);
```

**This ensures all students in a class are enrolled in subjects that apply to their level.**

---

## QUICK DIAGNOSTIC SCRIPT

Save as `CHECK_ISSUES.sql` and run in Supabase SQL Editor:

```sql
-- ===== ISSUE 1: TERMS =====
SELECT 'TERMS' as section, COUNT(*) as count FROM terms;

-- ===== ISSUE 2: LUCKY IDUDU =====
SELECT 'LUCKY IDUDU EXISTS' as section,
  (SELECT COUNT(*) FROM users WHERE (full_name LIKE '%Lucky%' OR full_name LIKE '%idudu%') AND role = 'TEACHER') as teacher_count;

-- ===== ISSUE 3: STUDENTS IN LUCKY'S CLASSES =====
WITH lucky AS (
  SELECT u.id FROM users u 
  WHERE (u.full_name LIKE '%Lucky%' OR u.full_name LIKE '%idudu%') AND u.role = 'TEACHER'
)
SELECT 'STUDENTS IN LUCKY''S CLASSES' as section, COUNT(*) as count
FROM students st
JOIN class_arm_combos cac ON st.class_arm_combo_id = cac.id
WHERE cac.class_teacher_id IN (SELECT id FROM lucky);

-- ===== ISSUE 4: STUDENTS IN LUCKY'S SUBJECTS =====
WITH lucky AS (
  SELECT u.id FROM users u 
  WHERE (u.full_name LIKE '%Lucky%' OR u.full_name LIKE '%idudu%') AND u.role = 'TEACHER'
)
SELECT 'STUDENTS IN LUCKY''S SUBJECTS' as section, COUNT(*) as count
FROM student_subjects ss
JOIN subject_teacher_assignments sta ON ss.subject_id = sta.subject_id
WHERE sta.teacher_id IN (SELECT id FROM lucky);
```

Expected output if everything is working:
```
section                              | count
TERMS                               | 3
LUCKY IDUDU EXISTS                  | 1
STUDENTS IN LUCKY'S CLASSES         | 5
STUDENTS IN LUCKY'S SUBJECTS        | 5
```

---

## BROWSER CONSOLE DEBUGGING

After the fix, check browser console (F12) for these debug logs:

### For Score Sheet Term Loading
```
[ScoreSheet] Fetched terms: [Array(3)]
  0: {id: "...", name: "First Term", sessionYear: 2024, startDate: "2024-09-01", endDate: "2024-11-30"}
  1: {id: "...", name: "Second Term", sessionYear: 2024, startDate: "2024-12-01", endDate: "2025-02-28"}
  2: {id: "...", name: "Third Term", sessionYear: 2024, startDate: "2025-03-01", endDate: "2025-05-31"}
```

### For Students Loading
```
[TeacherDataService] Loading students for subject {subjectId}
[TeacherDataService] Found 5 student-subject links for subject {subjectId}
[TeacherDataService] Retrieved 5 student records
[TeacherDataService] Retrieved 5 user records
[TeacherDataService] Loaded 5 subject students
```

**If you see warnings or errors**: Copy the full error message and paste below

---

## UPDATED CODE CHANGES

**File Modified**: `src/services/teacher-data.service.ts`
- Enhanced `getSubjectStudents()` with detailed logging
- Now shows exactly where students might be missing

**File Modified**: `src/app/teacher/score-sheet/page.tsx`
- Better error handling for missing terms
- Shows user-friendly error message if no terms exist

---

## NEXT STEPS

1. ✅ Run the diagnostic SQL above
2. ✅ Take note of counts (0 or >0)
3. ✅ Apply the appropriate fix from this guide
4. ✅ Refresh browser (Ctrl+Shift+Delete)
5. ✅ Check browser console for debug logs
6. ✅ Report results

---

**Need more help?** Paste:
1. Output of diagnostic SQL
2. Browser console error message (full text)
3. Teacher name and school name you're testing

---

**CRITICAL**: After fixing, BOTH issues should be resolved:
- ✅ Term dropdown shows First, Second, Third Terms
- ✅ Students visible in subject students section
- ✅ No error messages in console
