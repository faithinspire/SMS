# Remaining Tasks - Quick Implementation Guide

## Task 3: Results Page - Auto-Select First Class

**File:** `src/app/teacher/results/page.tsx`  
**Location:** Line 89 (in `loadData` function)

### Current Code:
```typescript
setClasses(uniqueClasses)
```

### Replace With:
```typescript
setClasses(uniqueClasses)
if (uniqueClasses.length > 0) {
  setSelectedClass(uniqueClasses[0].id)
}
```

**Why:** This automatically selects and loads the first class when page opens, so students display immediately instead of waiting for user selection.

---

## Task 4: Create CBT Exam Answer Interface

**File:** Create new - `/src/app/student/cbt-take-exam/[examId]/page.tsx`

### Step 1: Create Directory
```bash
mkdir -p src/app/student/cbt-take-exam/[examId]
```

### Step 2: Copy Full Implementation
See `COMPREHENSIVE_FIXES_IMPLEMENTATION.md` Task #4 for complete 450+ line implementation

### Key Features:
- ✅ Question display (Multiple Choice, True/False, Short Answer)
- ✅ Timer with auto-submit on timeout
- ✅ Navigation (Previous/Next buttons)
- ✅ Question summary with status indicators
- ✅ Auto-calculation of final score
- ✅ Submission to database
- ✅ Redirect to results page after submit

### Database Tables Needed:
```sql
-- If not existing, create these:
CREATE TABLE IF NOT EXISTS cbt_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cbt_exam_id UUID NOT NULL REFERENCES cbt_exams(id),
  student_id UUID NOT NULL REFERENCES students(id),
  school_id UUID NOT NULL REFERENCES schools(id),
  total_score NUMERIC(5,2),
  submitted_at TIMESTAMP,
  is_submitted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cbt_submissions_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES cbt_submissions(id),
  question_id UUID NOT NULL REFERENCES cbt_questions(id),
  answer_text TEXT,
  selected_option_id UUID,
  is_correct BOOLEAN,
  marks_obtained NUMERIC(5,2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add is_correct column to cbt_options if not existing:
ALTER TABLE cbt_options ADD COLUMN is_correct BOOLEAN DEFAULT FALSE;
```

---

## Task 5: Attendance Page - Fix Student Fetching

**File:** `src/app/teacher/attendance/page.tsx`  
**Location:** Line 147 (in `loadStudents` useEffect)

### Current Code (BROKEN):
```typescript
const { data: studentData } = await supabase
  .from('class_arm_combo_students')  // ❌ TABLE DOESN'T EXIST
  .select('student_id, first_name, last_name')
  .eq('class_arm_combo_id', selectedClass)

// Wrong column names - students table doesn't have first_name/last_name
const studentsWithAttendance = (studentData || []).map((student: any) => ({
  id: student.id,
  name: `${student.first_name} ${student.last_name}`,  // ❌ WRONG COLUMNS
  admission_no: student.admission_no,  // ❌ WRONG COLUMN NAME
  present: attendance?.status === 'PRESENT',
}))
```

### Replace With (CORRECT):
```typescript
// Step 1: Get students in the class
const { data: classStudents } = await supabase
  .from('students')
  .select('id, admission_number, user_id')
  .eq('class_arm_combo_id', selectedClass)
  .eq('school_id', user.school_id)

if (!classStudents || classStudents.length === 0) {
  setStudents([])
  return
}

// Step 2: Get user details (names)
const userIds = classStudents.map(s => s.user_id)
const { data: usersData } = await supabase
  .from('users')
  .select('id, full_name')
  .in('id', userIds)

const userMap = new Map(usersData?.map(u => [u.id, u.full_name]) || [])

// Step 3: Get existing attendance records for today
const { data: attendanceData } = await supabase
  .from('attendance')
  .select('student_id, status')
  .eq('class_arm_combo_id', selectedClass)
  .eq('date', selectedDate)

// Step 4: Combine data
const studentsWithAttendance = (classStudents || []).map((student: any) => {
  const attendance = attendanceData?.find(
    (a: any) => a.student_id === student.id
  )
  return {
    id: student.id,
    name: userMap.get(student.user_id) || 'Unknown',
    admission_no: student.admission_number,
    present: attendance?.status === 'PRESENT',
  }
})

setStudents(studentsWithAttendance)
```

**Why:** 
- `class_arm_combo_students` table doesn't exist
- Students are linked directly via `class_arm_combo_id` foreign key
- User names are in `users` table, not `students` table
- Admission number column is `admission_number`, not `admission_no`

---

## Summary Table

| Task | File | Line | Change | Difficulty |
|------|------|------|--------|------------|
| #3 | `teacher/results/page.tsx` | 89 | Auto-select first class | ⭐ Easy (1 line) |
| #4 | `student/cbt-take-exam/[examId]/page.tsx` | New | Create exam answer UI | ⭐⭐⭐ Complex (450 lines) |
| #5 | `teacher/attendance/page.tsx` | 147 | Fix table/column refs | ⭐⭐ Medium (12 lines) |

---

## Testing After Fixes

### Task 3: Results Page
```
1. Go to /teacher/results
2. Verify class dropdown is pre-selected with first class
3. Verify student result cards load automatically
```

### Task 4: CBT Exam
```
1. Go to /student/cbt-portal
2. Find a published exam
3. Click "Take Exam"
4. Answer questions
5. Verify timer counts down
6. Verify auto-submit on time expiry
7. Check /student/cbt-results for score
```

### Task 5: Attendance
```
1. Go to /teacher/attendance
2. Select a class
3. Verify students load (with names, not IDs)
4. Mark attendance
5. Click "Save Attendance"
6. Verify data saves (check database or reload page)
```

---

## Database Migrations Needed

Run these in Supabase before testing CBT:

```sql
-- Add to cbt_options table
ALTER TABLE cbt_options ADD COLUMN IF NOT EXISTS is_correct BOOLEAN DEFAULT FALSE;

-- Create submissions table
CREATE TABLE IF NOT EXISTS cbt_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cbt_exam_id UUID NOT NULL REFERENCES cbt_exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  total_score NUMERIC(5,2),
  submitted_at TIMESTAMP WITH TIME ZONE,
  is_submitted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(cbt_exam_id, student_id)
);

-- Create submissions_answers table
CREATE TABLE IF NOT EXISTS cbt_submissions_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES cbt_submissions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES cbt_questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  selected_option_id UUID REFERENCES cbt_options(id) ON DELETE SET NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  marks_obtained NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS if needed
ALTER TABLE cbt_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cbt_submissions_answers ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all (if RLS is disabled globally)
CREATE POLICY "Allow all access to cbt_submissions" ON cbt_submissions FOR ALL USING (true);
CREATE POLICY "Allow all access to cbt_submissions_answers" ON cbt_submissions_answers FOR ALL USING (true);
```

---

## Estimated Time to Complete

- Task 3: **5 minutes** (1 line change + test)
- Task 4: **45 minutes** (copy 450 lines + create file + test)
- Task 5: **15 minutes** (replace code block + test)

**Total: ~65 minutes** for all three tasks

---

## Quick Checklist

- [ ] Task 3: Results auto-select implemented
- [ ] Task 4: CBT exam page created
- [ ] Task 5: Attendance page fixed
- [ ] Migrations deployed to Supabase
- [ ] All three tested and working
- [ ] Database data verified
- [ ] Users can test full workflow

---

*Reference: Full code templates in COMPREHENSIVE_FIXES_IMPLEMENTATION.md*
