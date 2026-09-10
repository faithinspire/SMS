# Debug Student Loading Issue

## What I Changed
Updated all three pages with **fallback queries** that will try multiple approaches to find students:

1. Try with `school_id` filter
2. If that fails, try without `school_id` filter
3. Log debug information to help identify the problem

## How to Diagnose

### Step 1: Open Browser Console
- Press `F12` to open Developer Tools
- Go to **Console** tab
- Look for messages starting with `[ClassTeacher]`, `[ClassSheet]`, or `[SubjectSheet]`

### Step 2: Navigate to Pages and Check Console

**For Class Teacher Results:**
- Go to http://localhost:3001/teacher/results
- Look in console for:
  - `[ClassTeacher] Loading results for class: {id}` ✓
  - `[ClassTeacher] Found students with both filters: X` ✓ (if students found)
  - OR `[ClassTeacher] No results with school_id filter, trying without...`
  - Then look for: `[ClassTeacher] Found students without school_id filter: X` ✓
  - OR debug info: `[ClassTeacher] Debug - All students in DB: X`

**For Class Score Sheet:**
- Go to http://localhost:3001/teacher/class-score-sheet
- Look in console for:
  - `[ClassSheet] Found students with school filter: X` ✓ (if students found)
  - OR `[ClassSheet] Found students without school filter: X` ✓
  - OR debug info: `[ClassSheet] Debug - Sample students: [...]`

**For Subject Score Sheet:**
- Go to http://localhost:3001/teacher/subject-score-sheet
- Select a subject and class
- Look in console for:
  - `[SubjectSheet] Found enrollments: X` ✓ (if enrollments found)
  - OR `[SubjectSheet] Found enrollments without school filter: X` ✓

### Step 3: Analyze Console Output

#### Scenario A: "Found X students" (students ARE appearing)
✅ **Problem is fixed!** Students are being loaded. If they're not showing on the page, it's a different issue (UI rendering).

#### Scenario B: "No results with school_id filter, trying without... Found X students"
⚠️ **Issue identified:** Students exist but don't have a `school_id` matching the teacher's school.
- This suggests data structure mismatch
- Students might be from a different school or school_id is null

#### Scenario C: "No students found - getting debug info... Debug - All students in DB: 0"
❌ **No students in database:** The students table is empty or filtered correctly but has no data.
- Check if students were created in the database
- Check if they have the right class_arm_combo_id

#### Scenario D: "Debug - All students in DB: [...], Looking for class_arm_combo_id: {...}"
⚠️ **Students exist but class_arm_combo_id doesn't match:**
- Look at the debug output: what class_arm_combo_ids do the students have?
- What class_arm_combo_id are we looking for?
- They likely don't match

---

## What to Do Based on Debug Output

### If students are found ✅
- Refresh the page
- Students should appear on screen

### If students NOT found but exist in DB
Two possibilities:

**Option 1: school_id mismatch**
```sql
-- Check what school_id students have
SELECT DISTINCT school_id FROM students LIMIT 5;

-- Check what school_id the teacher is using
SELECT school_id FROM users WHERE id = 'TEACHER_ID';
```

**Option 2: class_arm_combo_id mismatch**
```sql
-- Check what class_arm_combo_ids students have
SELECT DISTINCT class_arm_combo_id FROM students LIMIT 5;

-- Check what class_arm_combo_id the teacher is assigned to
SELECT id FROM class_arm_combos WHERE class_teacher_id = 'TEACHER_ID';
```

### If no students in DB
Create test data or check if students were actually created.

---

## After Fixing

1. **Refresh the page** (Ctrl+R or Cmd+R)
2. **Check console** for success messages
3. **Verify students appear** on screen
4. **Test entering scores** to verify the full flow works

---

## Summary

The system now has **intelligent fallback logic** that will:
1. Try the original query first
2. If it fails, try without school_id filter
3. Log exactly what's happening
4. Help us identify the exact data structure mismatch

**Check your console output and reply with what you see.**
