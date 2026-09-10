# 🖱️ Supabase Step-by-Step Guide (With Screenshots Description)

## Your Supabase Details

**Project URL**: https://egdreueuspmuxhezdpqm.supabase.co  
**Project Name**: egdreueuspmuxhezdpqm  
**Status**: ✅ Active and ready

---

## Step 1: Go to Supabase

1. **Open browser**
2. **Go to**: https://egdreueuspmuxhezdpqm.supabase.co
3. **Login** with your credentials
4. You should see dashboard with project name at top

---

## Step 2: Navigate to SQL Editor

### Location
- Look at **LEFT SIDEBAR** (vertical menu)
- Scroll down if needed
- Find **"SQL Editor"** section

### Click Sequence
```
LEFT SIDEBAR
  ↓
SQL Editor
  ↓
New Query (blue button)
```

### Visual Guide
```
┌─────────────────────────┐
│ Supabase Dashboard      │
├─────────────────────────┤
│ ← SIDEBAR               │
│  • Project Settings     │
│  • Authentication       │
│  • Database             │
│  • SQL Editor    ← CLICK │
│    • New Query   ← CLICK │
│  • Vector                │
│  • Storage              │
└─────────────────────────┘
```

---

## Step 3: Open New Query

After clicking "SQL Editor" → "New Query", you'll see:

```
┌─────────────────────────────────────────────────┐
│ SQL Editor                                      │
├─────────────────────────────────────────────────┤
│ [+ New Query] [Save] [Run] [Clear]              │
├─────────────────────────────────────────────────┤
│ │ SELECT * FROM users LIMIT 10;                │
│ │ (Large text area for SQL)                    │
│ │                                              │
│ └──────────────────────────────────────────────┤
│                                                 │
│ ✓ Query Results (will show here)               │
└─────────────────────────────────────────────────┘
```

---

## Step 4: Copy & Paste SQL

### What to Copy

The SQL block is in the file: `AUTO_FIX_TEACHERS_NOW.sql`

Or copy this here:

```sql
DO $$
DECLARE
  teacher_id UUID;
  school_id UUID;
  class_arm_combo_id UUID;
BEGIN
  FOR teacher_id, school_id IN
    SELECT u.id, u.school_id
    FROM users u
    WHERE u.role = 'TEACHER'
    AND NOT EXISTS (
      SELECT 1 FROM class_arm_combos cac 
      WHERE cac.class_teacher_id = u.id
    )
  LOOP
    SELECT id INTO class_arm_combo_id
    FROM class_arm_combos
    WHERE school_id = school_id
    AND class_teacher_id IS NULL
    LIMIT 1;
    
    IF class_arm_combo_id IS NOT NULL THEN
      UPDATE class_arm_combos
      SET class_teacher_id = teacher_id
      WHERE id = class_arm_combo_id;
    END IF;
  END LOOP;
END $$;

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

SELECT 
  u.full_name, u.email,
  COUNT(DISTINCT CASE WHEN cac.class_teacher_id = u.id THEN cac.id END) as classes,
  COUNT(DISTINCT sta.subject_id) as subjects
FROM users u
LEFT JOIN class_arm_combos cac ON cac.class_teacher_id = u.id
LEFT JOIN subject_teacher_assignments sta ON sta.teacher_id = u.id
WHERE u.role = 'TEACHER'
GROUP BY u.id, u.full_name, u.email
ORDER BY u.full_name;
```

### How to Paste

1. **Select all** SQL (Ctrl+A) above
2. **Copy** it (Ctrl+C)
3. **Click** in SQL Editor text area
4. **Select all** existing text (Ctrl+A)
5. **Paste** (Ctrl+V)

---

## Step 5: Run the Query

### Click RUN

In the SQL Editor toolbar, find the **RUN** button:

```
┌────────────────────────────────────────┐
│ [+ New Query] [Run] [Save] [Clear]    │  ← Click RUN
├────────────────────────────────────────┤
│ Executing SQL...                       │
└────────────────────────────────────────┘
```

Or just press: **Ctrl+Enter**

---

## Step 6: Check Results

After running, scroll down to see results:

### Success Result

```
┌──────────────────────────────────────────┐
│ Query Results                            │
├──────────────────────────────────────────┤
│ full_name  | email              | classes | subjects
│ John Doe   | john@school.com    | 1       | 5
│ Jane Smith | jane@school.com    | 1       | 5
│ ... more teachers ...                    │
└──────────────────────────────────────────┘
```

**✅ If you see names + numbers > 0: SUCCESS!**

### Error Result (if any)

If you see an error like:
```
ERROR: syntax error in SQL
```

**Fix**: 
1. Copy the entire SQL again
2. Make sure there are no extra characters
3. Try again

---

## Full Visual Workflow

```
START
  ↓
[1] Open https://egdreueuspmuxhezdpqm.supabase.co
  ↓
[2] Login
  ↓
[3] Click LEFT SIDEBAR → SQL Editor
  ↓
[4] Click "New Query" button
  ↓
[5] Copy SQL from AUTO_FIX_TEACHERS_NOW.sql
  ↓
[6] Paste into SQL Editor text area
  ↓
[7] Click RUN button (or Ctrl+Enter)
  ↓
[8] Wait for results...
  ↓
[9] See results table with teacher names ✓
  ↓
[10] Close Supabase
  ↓
[11] Refresh teacher dashboard at localhost:3000
  ↓
DONE ✅
```

---

## Troubleshooting

### "Can't find SQL Editor"

Look at left sidebar:
1. Scroll down if needed
2. Find icon that looks like `<>` or labeled "SQL Editor"
3. Click it

### "New Query button not visible"

1. Make sure you're in SQL Editor section
2. Look for blue "New Query" button at top
3. If not visible, refresh page

### "Getting error when running SQL"

Most likely causes:
1. **Incomplete copy**: SQL got cut off
2. **Wrong database**: Make sure you're in right project
3. **Syntax error**: Copy entire SQL again carefully

**Solution**: 
- Copy the entire SQL file: `AUTO_FIX_TEACHERS_NOW.sql`
- Paste completely
- Try again

### "Results show 0 for classes/subjects"

This means:
- Teachers exist ✓
- But no classes/subjects to link

**Solution**: Create test data first (see next section)

---

## Create Test Data (If Needed)

If results show 0 for everything, run this first:

### Create Classes

```sql
INSERT INTO classes (school_id, name, level, type)
VALUES 
  ('7ad6a974-dbd6-4976-8604-af872a14b19c'::UUID, 'SS1', 10, 'SECONDARY'),
  ('7ad6a974-dbd6-4976-8604-af872a14b19c'::UUID, 'SS2', 11, 'SECONDARY'),
  ('7ad6a974-dbd6-4976-8604-af872a14b19c'::UUID, 'SS3', 12, 'SECONDARY')
ON CONFLICT DO NOTHING;

SELECT 'Classes created' as status;
```

### Create Arms

```sql
INSERT INTO arms (school_id, class_id, name)
SELECT 
  c.school_id, c.id, 'A'
FROM classes c
WHERE c.school_id = '7ad6a974-dbd6-4976-8604-af872a14b19c'::UUID
ON CONFLICT DO NOTHING;

SELECT 'Arms created' as status;
```

### Create Class-Arm Combos

```sql
INSERT INTO class_arm_combos (school_id, class_id, arm_id)
SELECT c.school_id, c.id, a.id
FROM classes c
JOIN arms a ON a.class_id = c.id
WHERE c.school_id = '7ad6a974-dbd6-4976-8604-af872a14b19c'::UUID
ON CONFLICT DO NOTHING;

SELECT 'Class-Arm Combos created' as status;
```

### Create Subjects

```sql
INSERT INTO subjects (school_id, name, code)
VALUES 
  ('7ad6a974-dbd6-4976-8604-af872a14b19c'::UUID, 'English', 'ENG'),
  ('7ad6a974-dbd6-4976-8604-af872a14b19c'::UUID, 'Mathematics', 'MATH'),
  ('7ad6a974-dbd6-4976-8604-af872a14b19c'::UUID, 'Science', 'SCI'),
  ('7ad6a974-dbd6-4976-8604-af872a14b19c'::UUID, 'Social Studies', 'SS'),
  ('7ad6a974-dbd6-4976-8604-af872a14b19c'::UUID, 'Physical Education', 'PE')
ON CONFLICT DO NOTHING;

SELECT 'Subjects created' as status;
```

Run each one separately, then run the AUTO_FIX SQL again.

---

## Success Checklist

- [ ] Can open Supabase dashboard
- [ ] Can navigate to SQL Editor
- [ ] Can create New Query
- [ ] Pasted SQL successfully
- [ ] SQL runs without errors
- [ ] Results show teacher names
- [ ] Results show 1+ for classes
- [ ] Results show 5+ for subjects
- [ ] Logout and refresh teacher dashboard
- [ ] See classes in teacher dashboard
- [ ] See subjects in teacher dashboard
- [ ] See students in teacher dashboard

✅ **All checked? You're done!**

---

## Final Confirmation

After running AUTO_FIX SQL, you should see:

```
✓ BEFORE (what you had)
  Teachers: Registered ✓
  Classes in Dashboard: None ✗
  Subjects in Dashboard: None ✗
  Students in Dashboard: None ✗

✓ AFTER (what you get)
  Teachers: Registered ✓
  Classes in Dashboard: Showing ✓
  Subjects in Dashboard: Showing ✓
  Students in Dashboard: Showing ✓
  CBT Subject Dropdown: Working ✓
```

---

**TIME**: 5 minutes  
**DIFFICULTY**: Copy & paste  
**RESULT**: Everything works! ✨

---

**GO DO THIS NOW!**

https://egdreueuspmuxhezdpqm.supabase.co → SQL Editor → New Query → Paste SQL → Run

Done! ✅
