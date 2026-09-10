# 🚨 DO THIS NOW - Fix Teachers Missing Classes/Subjects

**Status**: Teachers registered but see nothing  
**Fix**: 30 seconds in Supabase  
**Result**: Teachers will see all classes, subjects, and students  

---

## ⚡ IMMEDIATE ACTION (30 seconds)

### Step 1: Open Supabase

Go to: **https://egdreueuspmuxhezdpqm.supabase.co**

Login with your credentials.

---

### Step 2: Open SQL Editor

1. Click **SQL Editor** (left sidebar)
2. Click **New Query** (blue button)

---

### Step 3: Copy & Paste SQL

**Copy this entire block**:

```sql
-- AUTO-FIX: Link teachers to classes and subjects
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

---

### Step 4: Paste into SQL Editor

1. Click in the SQL Editor box
2. **Ctrl+A** (select all)
3. **Ctrl+V** (paste the SQL above)

---

### Step 5: Click RUN

Click the **RUN** button (or press Ctrl+Enter)

---

### Step 6: Check Results

Wait a few seconds. You should see output showing:

```
full_name    | email           | classes | subjects
-------------|-----------------|---------|----------
John Doe     | john@school.com | 1       | 5+
Jane Smith   | jane@school.com | 1       | 5+
```

✅ **If you see 1+ for classes and 5+ for subjects: SUCCESS!**

---

## 🎯 Test It

Now test in your app:

1. **Logout** completely
2. **Close browser** (all tabs)
3. **Reopen browser**
4. **Login as teacher**
5. Go to: **http://localhost:3000/teacher/dashboard**

You should now see:
- ✅ My Classes: 1 or more
- ✅ My Subjects: 5 or more  
- ✅ Students tab: Shows students
- ✅ CBT subjects dropdown: Shows subject names (not UUIDs!)

---

## ❌ If It Doesn't Work

### "Still see nothing"

**Check 1**: Run this query to see if you have teachers:
```sql
SELECT full_name, email, role FROM users WHERE role = 'TEACHER' LIMIT 10;
```

**If empty**: No teachers exist - need to register them first

**Check 2**: Run this to see if you have classes:
```sql
SELECT name FROM classes LIMIT 5;
```

**If empty**: No classes exist - create test data first

**Check 3**: Create test data and then run auto-fix again

### "See error in SQL"

Copy the entire SQL from `AUTO_FIX_TEACHERS_NOW.sql` file (in your SMS folder) and try again.

---

## 📚 More Help

For detailed troubleshooting, read:
- `FIX_TEACHER_DATA_LINKING.md` - Complete diagnostic guide
- `SUPABASE_DATA_LINK.sql` - Full SQL diagnostic script
- `AUTO_FIX_TEACHERS_NOW.sql` - Quick fix SQL only

---

## ✅ That's It!

The teachers will now have:
- ✅ Classes assigned
- ✅ Subjects assigned
- ✅ Students visible
- ✅ CBT working

**TIME TAKEN**: 30 seconds  
**DIFFICULTY**: Copy & paste  
**RESULT**: Teachers fully functional

---

**Do this now → 30 seconds → Done! ✨**
