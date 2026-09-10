# ✅ ACTIVATE SCORE SHEET - 2 MINUTES

## 🎯 What This Does
Automatically creates:
- ✅ Teacher → Classes → Subjects assignments
- ✅ Student → Subject enrollments
- ✅ 60 days of attendance records

## 📋 Steps

### 1️⃣ Open Supabase Dashboard
Go to: **https://supabase.com/dashboard**

### 2️⃣ Open SQL Editor
- Click your project
- Left sidebar → **SQL Editor**
- Click **+ New Query**

### 3️⃣ Copy-Paste SQL
- Open: **`EXECUTE_THIS_IN_SUPABASE.sql`**
- Copy ALL content (Ctrl+A, Ctrl+C)
- Paste into Supabase (Ctrl+V)

### 4️⃣ Run It
Click **RUN** button (top right)

**Wait for success message ✅**

---

## 🚀 Then Refresh Score Sheet

Go to: **http://localhost:3000/teacher/score-sheet**

**Press F5 to refresh**

You should now see:
✅ Classes dropdown populated
✅ Student cards showing students
✅ [ENTER SCORES] button on each student

---

## ✅ Test It Works

1. **Click [ENTER SCORES]** on any student
2. **Enter test scores:**
   - CA1: 8
   - CA2: 9
   - CA3: 7
   - CA4: 9
   - Exam: 52

3. **Watch auto-calculate:**
   - CA Total: 33/40 ✓
   - Total: 85/100 ✓
   - Grade: B ✓
   - %: 85% ✓

4. **Click [✅ Save Scores]**
5. **See toast:** "✅ Scores saved successfully!"

---

## 📱 View in Student Results

1. Log in as STUDENT
2. Go to: **http://localhost:3000/student/view-results**
3. See same scores + attendance + comments

---

## ❌ If You Get Errors

**Try running just the first section first:**

```sql
INSERT INTO teacher_assignments (school_id, teacher_id, subject_id, class_arm_combo_id)
SELECT DISTINCT
  u.school_id,
  u.id,
  s.id,
  cac.id
FROM users u
CROSS JOIN subjects s
CROSS JOIN class_arm_combos cac
WHERE u.role = 'TEACHER'
  AND u.school_id IS NOT NULL
  AND s.id IS NOT NULL
  AND cac.id IS NOT NULL
ON CONFLICT (teacher_id, subject_id, class_arm_combo_id) DO NOTHING;
```

If this works, then try the student enrollment section.

---

**That's it! Score Sheet is ready to use.** 🎉
