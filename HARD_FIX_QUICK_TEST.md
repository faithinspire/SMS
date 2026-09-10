# HARD FIX REBUILD - QUICK TEST GUIDE

**Test the complete hard rebuild in 5 minutes**

---

## ✅ WHAT WAS FIXED

| Issue | Before | After |
|-------|--------|-------|
| Dashboard "No class students" | Error | Shows students in table with key prop |
| Dashboard "No subject students" | Error | Shows students in table with key prop |
| Attendance PGRST201 | `Error loading students: {code: 'PGRST201'...}` | Students load successfully |
| Score sheet filters | Empty dropdowns | Populated from database |
| CBT answer selection | No marking system | Checkboxes for correct/incorrect |
| React warnings | "Each child should have unique key" | All lists have key props |

---

## 🚀 QUICK TEST WORKFLOW

### Prerequisites
```bash
# Server must be running
npm run dev  # Terminal 1

# Data must exist in your Supabase
# Test teacher: "Ella Jacobs" at "Frontier School"
# Test student: A student in SS2A class
# Make sure these are configured in your Supabase
```

---

### TEST 1: Dashboard (2 min)

1. Go to: `http://localhost:3000/teacher/dashboard`
2. Login as Ella Jacobs
3. **Check stats**:
   - ✅ "My Classes" shows a number > 0
   - ✅ "My Subjects" shows a number > 0
   - ✅ "Class Students" shows a number > 0 or 0 (not error)
   - ✅ "Subject Students" shows a number > 0 or 0 (not error)

4. **Click "👥 Students" tab**
5. **Class Students section**:
   - ✅ "Filter by Class" dropdown shows class names
   - ✅ Select a class
   - ✅ Table appears with student names (not UUIDs)
   - ✅ No error in browser console

6. **Subject Students section**:
   - ✅ "Filter by Subject" dropdown shows subject names
   - ✅ Select a subject
   - ✅ Table appears with student names (not UUIDs)
   - ✅ No error in browser console

**Expected Result**: Dashboard loads with filters working, students displaying correctly.

---

### TEST 2: Attendance (2 min)

1. Go to: `http://localhost:3000/teacher/attendance`
2. **Check class dropdown**:
   - ✅ Shows teacher's classes
3. **Select a class**:
   - ✅ Students load in grid (not "Error loading students")
   - ✅ Students show names, not UUIDs
   - ✅ No PGRST201 error in console

4. **Toggle student status**:
   - ✅ Click a student → status changes ABSENT → PRESENT → LATE → EXCUSED
   - ✅ Color changes (red → green → yellow → orange)

5. **Save attendance**:
   - ✅ Click "Save" button
   - ✅ Green success message appears
   - ✅ No error in console

**Expected Result**: Attendance page loads, students display, can toggle status, saves successfully.

---

### TEST 3: Score Sheet (1.5 min)

1. Go to: `http://localhost:3000/teacher/score-sheet`
2. **Check filters**:
   - ✅ Class dropdown shows classes
   - ✅ Subject dropdown shows subjects
   - ✅ Term dropdown shows terms
   - ✅ Session field is empty (optional input)

3. **Select filters**:
   - Select a Class
   - Select a Subject
   - Select a Term
   - ✅ Students table appears

4. **Enter scores**:
   - ✅ Click on Test 1 input, enter 8
   - ✅ Click on Exam input, enter 45
   - ✅ Total auto-calculates
   - ✅ Grade auto-calculates

5. **Save scores**:
   - ✅ Click "Save X Scores" button
   - ✅ Green success message appears
   - ✅ No error in console

**Expected Result**: Score sheet loads with all dropdowns, can enter scores, saves successfully.

---

### TEST 4: CBT Management (1.5 min)

1. Go to: `http://localhost:3000/teacher/cbt-management`
2. **Click "+ Create New CBT"**
3. **Fill in form**:
   - Title: "Math Quiz"
   - Type: "TEST"
   - Subject: Select a subject
   - Class: Select a class
   - Duration: 60

4. **Add a question**:
   - Question Text: "What is 2 + 2?"
   - Type: "Multiple Choice"
   - Marks: 1
   - Option 1: "4" → **CHECK CHECKBOX** (mark correct)
   - Option 2: "5" → leave unchecked
   - Option 3: "3" → leave unchecked
   - Option 4: "6" → leave unchecked
   - ✅ Click "Add Question"

5. **Verify question added**:
   - ✅ Question appears in list above

6. **Create CBT**:
   - ✅ Click "Create CBT Exam" button
   - ✅ Green success message: "✅ CBT 'Math Quiz' created with 1 questions"
   - ✅ Form clears, shows CBT in list

**Expected Result**: Can create CBT with explicit answer selection (checkboxes), saves successfully.

---

## 🔍 BROWSER CONSOLE CHECKS

### After Dashboard loads:
```javascript
// Should show NO errors about "PGRST201"
// Should show logs like:
// [TeacherDataService] Profile loaded: Ella Jacobs
// [TeacherDataService] Loaded 1 classes: SSS 2 A
// [TeacherDataService] Loaded 5 subjects: Math, English, ...
```

### After Attendance loads:
```javascript
// Should show NO errors with PGRST201
// Should show logs like:
// [Attendance] Loading students for class {classId}
// [Attendance] Loaded {count} class students
```

### After Score Sheet loads:
```javascript
// Should show logs like:
// [ScoreSheet] Loading students for subject {subjectId}
// [ScoreSheet] Loaded {count} subject students
```

### After CBT creates:
```javascript
// Should show no errors
// Should show success message in UI
```

---

## ❌ ERROR CHECKLIST

### If you see PGRST201 error:
```
Error loading students: {code: 'PGRST201', message: "Could not embed because..."}
```
**PROBLEM**: Still using ambiguous joins  
**FIX**: Verify attendance page is using `TeacherDataService.getClassStudents()`

### If Dashboard shows "No class students":
**PROBLEM**: Teacher has no class assignments  
**CHECK**: In Supabase, verify `class_arm_combos.class_teacher_id = user_id`

### If dropdown shows UUIDs:
**PROBLEM**: Not using proper data mapping  
**CHECK**: Verify TeacherDataService is returning formatted data with names

### If React warns "Each child should have a key":
**PROBLEM**: Missing key prop  
**CHECK**: All `.map()` calls should have `key={uniqueId}`

---

## 📊 TEST DATA VERIFICATION

Before testing, verify this exists in your Supabase:

```sql
-- Check teacher
SELECT id, full_name, role FROM users WHERE full_name = 'Ella Jacobs' AND role = 'TEACHER';

-- Check school
SELECT id, name FROM schools WHERE name = 'Frontier School';

-- Check class assignment
SELECT cac.id, cac.class_teacher_id, u.full_name, c.name
FROM class_arm_combos cac
JOIN users u ON cac.class_teacher_id = u.id
JOIN classes c ON cac.class_id = c.id
WHERE u.full_name = 'Ella Jacobs';

-- Check student in class
SELECT s.id, u.full_name, u.id as user_id, s.admission_number, cac.id
FROM students s
JOIN users u ON s.user_id = u.id
JOIN class_arm_combos cac ON s.class_arm_combo_id = cac.id
WHERE cac.class_teacher_id = 'teacher_id_here';

-- Check subject assignments
SELECT sta.id, subj.name, cac.id
FROM subject_teacher_assignments sta
JOIN subjects subj ON sta.subject_id = subj.id
JOIN class_arm_combos cac ON sta.class_arm_combo_id = cac.id
WHERE sta.teacher_id = 'teacher_id_here';
```

---

## ✅ FINAL VERIFICATION

After all 4 tests pass, you should see:

| Component | Status |
|-----------|--------|
| Dashboard loads with context | ✅ |
| Class students tab shows students | ✅ |
| Subject students tab shows students | ✅ |
| Attendance loads without PGRST201 | ✅ |
| Can toggle attendance status | ✅ |
| Attendance saves to database | ✅ |
| Score sheet has all dropdowns | ✅ |
| Can enter scores and calc totals | ✅ |
| Scores save to database | ✅ |
| CBT creation has explicit answer marking | ✅ |
| No React key warnings | ✅ |
| No UUIDs displayed | ✅ |

---

## 🐛 DEBUGGING

If something fails:

1. **Check browser console** for JavaScript errors
2. **Check browser Network tab** for failed requests
3. **Check server terminal** for API errors
4. **Check Supabase logs** for database errors

Common issue locations:
- `src/services/teacher-data.service.ts` - Query logic
- `src/services/teacher-context.service.ts` - Context loading
- `src/app/teacher/dashboard/page.tsx` - Dashboard filters
- `src/app/teacher/attendance/page.tsx` - Attendance queries
- `src/app/teacher/score-sheet/page.tsx` - Score entry
- `src/app/teacher/cbt-management/page.tsx` - CBT creation

---

**Time to complete all tests**: ~5-7 minutes  
**Success criteria**: All 4 tests pass with no errors  
**Expected outcome**: Hard rebuild verified working end-to-end
