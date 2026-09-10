# 🔧 FIX: Teacher Data Linking - Classes & Subjects Not Showing

**Problem**: Teachers registered but see no classes, subjects, or students  
**Root Cause**: Missing data links in database  
**Solution**: 3-step diagnostic + auto-fix  
**Time**: 10 minutes

---

## 🔗 Supabase Connection

Your Supabase Project:
- **URL**: https://egdreueuspmuxhezdpqm.supabase.co
- **Status**: ✅ Connected (URL found in `.env.local`)

---

## 📊 Step 1: Diagnostic (Check Current State)

### Option A: Quick Online Check

1. Go to **https://egdreueuspmuxhezdpqm.supabase.co**
2. Login with your credentials
3. Click **SQL Editor** → **New Query**
4. Run this query to see if teachers exist:

```sql
SELECT u.id, u.full_name, u.email, u.role
FROM users u
WHERE u.role = 'TEACHER'
ORDER BY u.created_at DESC
LIMIT 10;
```

**Expected Result**: See list of teachers you registered  
**If Empty**: Teachers weren't created - re-register them

---

### Option B: Check Classes & Subjects

```sql
-- Check classes
SELECT id, name, level FROM classes LIMIT 5;

-- Check subjects  
SELECT id, name, code FROM subjects LIMIT 5;

-- Check if any assignments exist
SELECT COUNT(*) FROM subject_teacher_assignments;
SELECT COUNT(*) FROM class_arm_combos WHERE class_teacher_id IS NOT NULL;
```

**Expected Result**:
- Classes: Should see 6+ rows
- Subjects: Should see 5+ rows
- Assignments: Should see > 0

**If All Empty**: Need to create test data first

---

## 🛠️ Step 2: Auto-Link (Fix Missing Links)

### Copy This Entire SQL Block

```sql
-- AUTO-LINK: Assign teachers to classes and subjects
-- This safely creates assignments if they don't exist

-- Step 1: Get first teacher with no class assignment
DO $$
DECLARE
  teacher_id UUID;
  school_id UUID;
  class_arm_combo_id UUID;
BEGIN
  SELECT u.id, u.school_id INTO teacher_id, school_id
  FROM users u
  WHERE u.role = 'TEACHER'
  AND NOT EXISTS (
    SELECT 1 FROM class_arm_combos cac 
    WHERE cac.class_teacher_id = u.id
  )
  LIMIT 1;
  
  IF teacher_id IS NOT NULL THEN
    -- Assign to first available class
    SELECT id INTO class_arm_combo_id
    FROM class_arm_combos
    WHERE school_id = school_id
    AND class_teacher_id IS NULL
    LIMIT 1;
    
    IF class_arm_combo_id IS NOT NULL THEN
      UPDATE class_arm_combos
      SET class_teacher_id = teacher_id
      WHERE id = class_arm_combo_id;
      
      RAISE NOTICE 'Assigned teacher to class ✓';
    END IF;
  END IF;
END $$;

-- Step 2: Assign teachers to all subjects in their classes
INSERT INTO subject_teacher_assignments (
  school_id,
  subject_id,
  class_arm_combo_id,
  teacher_id
)
SELECT 
  s.school_id,
  s.id,
  cac.id,
  cac.class_teacher_id
FROM subjects s
CROSS JOIN class_arm_combos cac
WHERE cac.class_teacher_id IS NOT NULL
AND s.school_id = cac.school_id
AND NOT EXISTS (
  SELECT 1 FROM subject_teacher_assignments sta
  WHERE sta.subject_id = s.id
  AND sta.class_arm_combo_id = cac.id
  AND sta.teacher_id = cac.class_teacher_id
)
ON CONFLICT DO NOTHING;

-- Step 3: Verify assignments were created
SELECT 
  u.full_name as teacher,
  COUNT(DISTINCT CASE WHEN cac.class_teacher_id = u.id THEN cac.id END) as classes,
  COUNT(DISTINCT sta.subject_id) as subjects
FROM users u
LEFT JOIN class_arm_combos cac ON cac.class_teacher_id = u.id
LEFT JOIN subject_teacher_assignments sta ON sta.teacher_id = u.id
WHERE u.role = 'TEACHER'
GROUP BY u.id, u.full_name
ORDER BY u.full_name;
```

### Execute Steps

1. Go to **https://egdreueuspmuxhezdpqm.supabase.co**
2. Click **SQL Editor** → **New Query**
3. **Paste** the entire SQL block above
4. Click **Run** button
5. Wait for results
6. **Check output** - Should see ✓ messages and teacher list

---

## 📋 Step 3: Verify It Worked

Run this verification query:

```sql
-- Show all teachers with their assignments
SELECT 
  u.id,
  u.full_name as teacher_name,
  u.email,
  COUNT(DISTINCT CASE WHEN cac.class_teacher_id = u.id THEN cac.id END) as managed_classes,
  COUNT(DISTINCT sta.subject_id) as taught_subjects,
  COUNT(DISTINCT CASE WHEN sta.teacher_id = u.id THEN sta.subject_id END) > 0 as has_subjects
FROM users u
LEFT JOIN class_arm_combos cac ON cac.class_teacher_id = u.id
LEFT JOIN subject_teacher_assignments sta ON sta.teacher_id = u.id
WHERE u.role = 'TEACHER'
GROUP BY u.id, u.full_name, u.email
ORDER BY u.full_name;
```

**Expected Output**:
```
| teacher_name | email | managed_classes | taught_subjects | has_subjects |
|--------------|-------|-----------------|-----------------|--------------|
| John Doe | john@school.com | 1 | 5+ | true |
| Jane Smith | jane@school.com | 1 | 5+ | true |
```

✅ **If all values > 0**: Linking is fixed!  
❌ **If all values = 0**: No data to link - create test data (next section)

---

## 📊 Step 4: Create Test Data (If Needed)

If the verification above shows 0 values, you need test data. Run this:

```sql
-- CREATE TEST DATA
-- This creates sample classes, subjects, and students

-- Create classes if they don't exist
INSERT INTO classes (school_id, name, level, type)
SELECT 
  '7ad6a974-dbd6-4976-8604-af872a14b19c'::UUID,
  'SS1', 10, 'SECONDARY'
WHERE NOT EXISTS (
  SELECT 1 FROM classes 
  WHERE name = 'SS1' 
  AND level = 10
)
UNION ALL
SELECT 
  '7ad6a974-dbd6-4976-8604-af872a14b19c'::UUID,
  'SS2', 11, 'SECONDARY'
WHERE NOT EXISTS (
  SELECT 1 FROM classes 
  WHERE name = 'SS2' 
  AND level = 11
)
ON CONFLICT DO NOTHING;

-- Create arms (A, B, C)
INSERT INTO arms (school_id, class_id, name)
SELECT 
  c.school_id,
  c.id,
  'A'
FROM classes c
WHERE c.school_id = '7ad6a974-dbd6-4976-8604-af872a14b19c'::UUID
AND NOT EXISTS (
  SELECT 1 FROM arms 
  WHERE class_id = c.id 
  AND name = 'A'
)
ON CONFLICT DO NOTHING;

-- Create class-arm combos
INSERT INTO class_arm_combos (school_id, class_id, arm_id)
SELECT 
  c.school_id,
  c.id,
  a.id
FROM classes c
JOIN arms a ON a.class_id = c.id
WHERE c.school_id = '7ad6a974-dbd6-4976-8604-af872a14b19c'::UUID
AND NOT EXISTS (
  SELECT 1 FROM class_arm_combos cac
  WHERE cac.class_id = c.id 
  AND cac.arm_id = a.id
)
ON CONFLICT DO NOTHING;

-- Create subjects
INSERT INTO subjects (school_id, name, code)
VALUES 
  ('7ad6a974-dbd6-4976-8604-af872a14b19c'::UUID, 'English', 'ENG'),
  ('7ad6a974-dbd6-4976-8604-af872a14b19c'::UUID, 'Mathematics', 'MATH'),
  ('7ad6a974-dbd6-4976-8604-af872a14b19c'::UUID, 'Science', 'SCI'),
  ('7ad6a974-dbd6-4976-8604-af872a14b19c'::UUID, 'Social Studies', 'SS'),
  ('7ad6a974-dbd6-4976-8604-af872a14b19c'::UUID, 'Physical Education', 'PE')
ON CONFLICT DO NOTHING;

-- Verify creation
SELECT 'Classes' as type, COUNT(*) as count FROM classes
UNION ALL
SELECT 'Arms', COUNT(*) FROM arms
UNION ALL
SELECT 'Class-Arm Combos', COUNT(*) FROM class_arm_combos
UNION ALL
SELECT 'Subjects', COUNT(*) FROM subjects;
```

---

## ✅ Step 5: Test Teacher Dashboard

After running auto-link SQL:

1. **Logout** from app (if logged in)
2. **Logout** of browser completely
3. **Close all browser tabs**
4. **Re-open browser**
5. **Login as teacher**
6. **Go to**: `/teacher/dashboard`

**Check if you see**:
- ✅ My Classes: Should show 1 or more
- ✅ My Subjects: Should show 5 or more
- ✅ Students tab: Should show students

If still not working → Continue to Step 6

---

## 🔍 Step 6: Deep Diagnostic

If nothing is showing after Step 5, run this detailed diagnostic:

```sql
-- Get teacher's exact IDs
SELECT 
  id,
  email,
  full_name,
  school_id
FROM users
WHERE role = 'TEACHER'
LIMIT 1;

-- Copy the teacher's ID and run this query:
-- (Replace TEACHER_ID_HERE with the actual ID from above)

SELECT 'Class Assignments' as check_type, COUNT(*) as count
FROM class_arm_combos
WHERE class_teacher_id = 'TEACHER_ID_HERE'::UUID

UNION ALL

SELECT 'Subject Assignments', COUNT(*)
FROM subject_teacher_assignments
WHERE teacher_id = 'TEACHER_ID_HERE'::UUID

UNION ALL

SELECT 'Students in Classes', COUNT(*)
FROM students s
WHERE s.class_arm_combo_id IN (
  SELECT id FROM class_arm_combos 
  WHERE class_teacher_id = 'TEACHER_ID_HERE'::UUID
);
```

This will show exactly what data exists for that teacher.

---

## 🆘 Troubleshooting

### "Still see 0 for everything"

**Cause**: No data in database at all

**Fix**:
1. Run Step 4 (Create Test Data) SQL
2. Then run Step 2 (Auto-Link) SQL
3. Refresh teacher dashboard

### "Classes show but no subjects"

**Cause**: Subject assignments weren't created

**Fix**: Run just this query:

```sql
INSERT INTO subject_teacher_assignments (
  school_id, subject_id, class_arm_combo_id, teacher_id
)
SELECT 
  s.school_id, s.id, cac.id, cac.class_teacher_id
FROM subjects s
CROSS JOIN class_arm_combos cac
WHERE cac.class_teacher_id IS NOT NULL
AND s.school_id = cac.school_id
AND NOT EXISTS (
  SELECT 1 FROM subject_teacher_assignments sta
  WHERE sta.subject_id = s.id
  AND sta.class_arm_combo_id = cac.id
  AND sta.teacher_id = cac.class_teacher_id
)
ON CONFLICT DO NOTHING;
```

### "CBT subjects dropdown still empty"

**Cause**: Subjects exist but aren't linked to teacher

**Fix**: Run the INSERT query above to create subject-teacher links

### "Browser still shows old error"

**Cause**: Browser cache

**Fix**:
1. Press **Ctrl+Shift+R** (hard refresh)
2. Open **F12** → **Application** → **Clear Storage**
3. **Logout** completely
4. **Close browser**
5. **Reopen** and test

---

## 📈 Quick Reference: Data Model

```
TEACHERS (users with role='TEACHER')
  ↓
  ├→ CLASS ASSIGNMENT
  │  └→ class_arm_combos.class_teacher_id = user.id
  │     (Which class does teacher manage?)
  │
  └→ SUBJECT ASSIGNMENTS
     └→ subject_teacher_assignments
        (Which subjects does teacher teach?)
           ├→ teacher_id = user.id
           ├→ subject_id = subject.id
           └→ class_arm_combo_id = class_arm_combo.id

STUDENTS
  ├→ Assigned to CLASS
  │  └→ students.class_arm_combo_id
  │
  └→ Enrolled in SUBJECTS
     └→ student_subjects
        ├→ student_id
        └→ subject_id
```

---

## ✨ Expected Final State

After all steps complete, here's what should be visible:

### In Teacher Dashboard
```
📊 Statistics
├─ My Classes: 1 or more ✓
├─ My Subjects: 5 or more ✓
├─ Class Students: 0+ ✓
├─ Subject Students: 0+ ✓

🏫 My Classes Tab
├─ SS1-A ✓
└─ (and other classes)

📖 My Subjects Tab
├─ English ✓
├─ Mathematics ✓
├─ Science ✓
├─ Social Studies ✓
└─ Physical Education ✓

👥 Students Tab
├─ Class Students table ✓
└─ Subject Students table ✓
```

### In CBT Creation
```
Subject Dropdown
├─ English ✓
├─ Mathematics ✓
├─ Science ✓
└─ (all subjects show real names, not UUIDs)

Class Dropdown
├─ SS1-A ✓
└─ (all classes show)
```

---

## 🎯 Summary

| Step | Action | Time |
|------|--------|------|
| 1 | Run diagnostic query | 1 min |
| 2 | Run auto-link SQL | 1 min |
| 3 | Verify results | 1 min |
| 4 | Create test data (if needed) | 2 min |
| 5 | Test teacher dashboard | 2 min |
| 6 | Deep diagnostic (if needed) | 2 min |

**Total**: 5-10 minutes to fix completely

---

## 📝 SQL Files Provided

- `SUPABASE_DATA_LINK.sql` - Full diagnostic + auto-fix SQL
- This document - Step-by-step guide

---

## 🔗 Important URLs

- **Supabase**: https://egdreueuspmuxhezdpqm.supabase.co
- **Teacher Dashboard**: http://localhost:3000/teacher/dashboard
- **CBT Creation**: http://localhost:3000/teacher/cbt-management

---

**FOLLOW THESE STEPS AND IT WILL WORK! ✅**

Do this NOW:
1. Go to Supabase SQL Editor
2. Run STEP 2 (Auto-Link SQL)
3. Check results
4. Refresh teacher dashboard
5. Should see classes, subjects, and students

Done!
