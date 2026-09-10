# Student Subjects Not Loading - Root Cause & Fix

## Problem
Students see empty subject lists on the dashboard, even though subjects exist in the database.

## Root Cause
The **`student_subjects` bridge table is empty** - students haven't been enrolled in any subjects. This table is the bridge between students and the subjects they take.

### Why It's Empty
The auto-linking trigger (`trg_auto_link_student_to_class_and_subjects` from migration 047) may not have fired properly if:
1. Students were created before the trigger was deployed
2. The migration 047 hasn't been fully applied to your database
3. Subjects don't have `applicable_to_levels` populated

## Solution

Execute these SQL scripts in your Supabase SQL editor (in this order):

### Step 1: Fix Subject Levels (If Needed)
**File**: `FIX_SUBJECT_LEVELS.sql`

This ensures all subjects have `applicable_to_levels` populated so the system knows which class levels can take each subject.

```sql
-- Primary subjects (levels 1-6)
UPDATE subjects 
SET applicable_to_levels = ARRAY[1,2,3,4,5,6]
WHERE (applicable_to_levels = '{}'::integer[] OR applicable_to_levels IS NULL)
  AND name IN (
    'English Language', 'Mathematics', 'Science', 'Social Studies', 
    'Civic Education', 'Physical Education', 'Art & Craft', 'Music', 
    'Home Economics', 'Information Technology'
  );

-- (Continue with secondary and senior secondary subjects)
-- See FIX_SUBJECT_LEVELS.sql for complete code
```

### Step 2: Enroll Students in Subjects
**File**: `ENROLL_STUDENTS_IN_SUBJECTS.sql`

This matches each student to all subjects applicable for their class level and creates the enrollments.

```sql
INSERT INTO student_subjects (student_id, subject_id, school_id)
SELECT DISTINCT
  st.id as student_id,
  s.id as subject_id,
  st.school_id
FROM students st
JOIN class_arm_combos cac ON st.class_arm_combo_id = cac.id
JOIN classes c ON cac.class_id = c.id
JOIN subjects s ON c.level = ANY(s.applicable_to_levels) AND s.school_id = st.school_id
WHERE NOT EXISTS (
  SELECT 1 FROM student_subjects ss
  WHERE ss.student_id = st.id AND ss.subject_id = s.id
)
ON CONFLICT DO NOTHING;
```

### Step 3: Verify
```sql
-- Check how many students and subject enrollments were created
SELECT 
  COUNT(DISTINCT student_id) as students_with_subjects,
  COUNT(*) as total_enrollments
FROM student_subjects;

-- Check a specific student
SELECT 
  s.admission_number,
  COUNT(ss.subject_id) as subject_count
FROM students s
LEFT JOIN student_subjects ss ON s.id = ss.student_id
GROUP BY s.id, s.admission_number;
```

## How This Works

### Database Structure
```
students
  ├── class_arm_combo_id → class_arm_combos
  │     └── class_id → classes
  │           └── level (1-6 for primary, 9-11 for JSS, 12-14 for SSS)
  
student_subjects (BRIDGE TABLE)
  ├── student_id → students
  └── subject_id → subjects
        └── applicable_to_levels (array of class levels)
```

### The Join Logic
When a student logs in:
1. Dashboard queries: `SELECT * FROM student_subjects WHERE student_id = ?`
2. Joins to `subjects` table via `subject_id`
3. Returns all subjects the student is enrolled in

The join works like:
```sql
FROM student_subjects ss
JOIN subjects s ON ss.subject_id = s.id
```

### Auto-Linking (What SHOULD Happen)
When a student is created or assigned to a class:

**Trigger**: `trg_auto_link_student_to_class_and_subjects`
1. Reads student's class_arm_combo_id
2. Gets the class level from the joined classes table
3. Finds all subjects where `applicable_to_levels` contains that level
4. Inserts rows into `student_subjects` for each matching subject

**When a subject is assigned to a class**:

**Trigger**: `trg_auto_enroll_students_on_subject_assignment`
1. Gets the class_arm_combo_id for that subject assignment
2. Finds all students in that class
3. Inserts them into that subject

## Files to Execute

1. **FIX_SUBJECT_LEVELS.sql** - Populates `applicable_to_levels` for all subjects
2. **ENROLL_STUDENTS_IN_SUBJECTS.sql** - Creates the student-subject enrollments

## After Fix
- Reload the student dashboard
- Subjects should now appear
- The automatic triggers will handle future students and subject assignments

## Debugging

If subjects STILL don't load after running these scripts:

### Check 1: Verify student_subjects was populated
```sql
SELECT COUNT(*) FROM student_subjects;
-- Should return > 0
```

### Check 2: Verify a specific student
```sql
SELECT ss.id, ss.student_id, s.name
FROM student_subjects ss
JOIN subjects s ON ss.subject_id = s.id
WHERE ss.student_id = '<STUDENT_ID>';
-- Should return multiple rows
```

### Check 3: Verify subjects have levels
```sql
SELECT name, applicable_to_levels 
FROM subjects 
WHERE applicable_to_levels = '{}' OR applicable_to_levels IS NULL;
-- Should return 0 rows (all have levels now)
```

### Check 4: Verify student's class has a level
```sql
SELECT s.admission_number, c.name, c.level
FROM students s
JOIN class_arm_combos cac ON s.class_arm_combo_id = cac.id
JOIN classes c ON cac.class_id = c.id
WHERE s.id = '<STUDENT_ID>';
-- Should show a level like 1-6, 9-11, or 12-14
```

## Technical Details

**Table**: `student_subjects`
- Columns: id, student_id, subject_id, school_id, subject_teacher_id, created_at
- Unique constraint: (student_id, subject_id)
- Foreign keys: ALL cascade on delete

**Query from dashboard**: 
```typescript
const { data: subjectsData } = await supabase
  .from('student_subjects')
  .select(`
    id,
    subject_id,
    subjects:subject_id (id, name)
  `)
  .eq('student_id', profileData.id)
```

This query:
- Is correctly structured ✅
- Has proper joins ✅  
- Will return [] if no student_subjects records exist ❌ (the actual issue)
