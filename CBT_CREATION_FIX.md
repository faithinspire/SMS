# CBT Creation Error - Complete Fix Guide

## Problem
When trying to create a CBT (Computer-Based Test), the system shows an error and the CBT is not created.

## Root Causes Identified

### 1. Missing Database Tables
- `academic_sessions` table doesn't exist
- `academic_terms` table doesn't exist
- These are required by the CBT creation API

### 2. CBT Exams Schema Mismatch
The `cbt_exams` table is missing columns that the API tries to insert:
- `assessment_type` (CA1, CA2, CA3, CA4, MIDTERM, EXAM)
- `teacher_id` (foreign key to users)
- `status` (DRAFT, PUBLISHED, CLOSED, ARCHIVED)
- `academic_session_id` (link to academic session)

### 3. CBT Creation Code Issues
The teacher CBT management page was directly inserting to `cbt_exams` without:
- Validating teacher assignment to subject/class
- Using the proper API endpoint
- Including required fields

## Solution

### Step 1: Run Database Migrations

Execute these migrations in Supabase SQL Editor **in order**:

```sql
-- First run migration 071 to create academic tables
-- File: database/migrations/071_create_academic_sessions_and_terms.sql
```

Then:

```sql
-- Then run migration 072 for comprehensive CBT fix
-- File: database/migrations/072_comprehensive_cbt_fix.sql
```

### Step 2: Create Initial Academic Sessions

After running migrations, create at least one academic session:

```sql
-- Insert a sample academic session for 2025/2026
INSERT INTO academic_sessions (school_id, session_year, start_year, end_year, is_active, is_current)
SELECT id, '2025/2026', 2025, 2026, true, true
FROM schools
WHERE name = 'Your School Name'  -- Replace with actual school name
ON CONFLICT (school_id, session_year) DO NOTHING;

-- Insert terms for the session
INSERT INTO academic_terms (school_id, session_id, term_name, term_order, is_active)
SELECT 
  s.id as school_id,
  as.id as session_id,
  t.term_name,
  t.term_order,
  true as is_active
FROM academic_sessions as
JOIN schools s ON s.id = as.school_id
CROSS JOIN (
  VALUES 
    ('First Term', 1),
    ('Second Term', 2),
    ('Third Term', 3)
) as t(term_name, term_order)
WHERE as.session_year = '2025/2026'
ON CONFLICT (school_id, session_id, term_name) DO NOTHING;
```

### Step 3: Verify Teacher Assignments

Teachers must be assigned to the subject/class combination before they can create a CBT:

```sql
-- Check if teacher is assigned to a subject/class
SELECT * FROM subject_teacher_assignments
WHERE teacher_id = 'TEACHER_UUID'
  AND subject_id = 'SUBJECT_UUID'
  AND class_arm_combo_id = 'CLASS_UUID';
```

### Step 4: Test CBT Creation

1. Log in as a Teacher
2. Navigate to CBT Management (from dashboard)
3. Click "Create New CBT"
4. Fill in:
   - Title: "Test CBT"
   - Subject: Select a subject you're assigned to
   - Class: Select a class
   - Session: Should now show available sessions
   - Term: Should show terms for selected session
   - Exam Type: TEST or EXAM
   - Duration: 60 minutes
   - Total Marks: 100
   - Add at least one question
5. Click "Create CBT"

## Code Changes Made

### File: `src/app/teacher/cbt-management/page.tsx`

Changed from direct Supabase insert to API endpoint:

```typescript
// OLD CODE (BROKEN):
const { data: examData, error: examError } = await supabase
  .from('cbt_exams')
  .insert({
    // ... fields
  })
  .select()
  .single()

// NEW CODE (FIXED):
const createResponse = await fetch('/api/teacher/cbt/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    school_id: user.school_id,
    subject_id: formData.subject_id,
    class_arm_combo_id: formData.class_arm_combo_id,
    teacher_id: user.id,
    term_id: formData.term_id,
    title: formData.title,
    assessment_type: formData.exam_type === 'EXAM' ? 'EXAM' : 'CA1',
    description: '',
    duration_minutes: formData.duration_minutes,
    total_marks: formData.total_marks,
    passing_percentage: formData.passing_percentage,
  }),
})
```

### Benefits:
✅ Validates teacher assignment to subject/class
✅ Uses proper schema with all required fields
✅ Automatically fetches academic session from term
✅ Provides clear error messages if validation fails

## Database Migrations Created

### Migration 071: Create Academic Sessions and Terms
- Creates `academic_sessions` table
- Creates `academic_terms` table
- Adds proper indexes

### Migration 072: Comprehensive CBT Fix
- Ensures all tables exist
- Adds missing columns to `cbt_exams`
- Creates performance indexes
- Updates existing data where possible

## Troubleshooting

### Error: "Teacher not assigned to this subject/class combination"
**Solution**: 
- Go to School Admin Dashboard
- Navigate to Subject Management
- Ensure the teacher is assigned to the subject for that class

### Error: "Invalid term_id: term not found"
**Solution**:
- Run the academic session creation SQL above
- Verify the term exists in `academic_terms` table

### Error: "Subject not found or not available for this school"
**Solution**:
- Verify the subject is created in the school
- Check the `subjects` table in Supabase

### CBT Created but Questions Not Showing
**Solution**:
- Check that at least one question was added before saving
- Verify questions were inserted to `cbt_questions` table
- Check for any database errors in the console

## Verification Checklist

- [ ] Run migration 071
- [ ] Run migration 072
- [ ] Create academic sessions for your schools
- [ ] Create academic terms
- [ ] Verify teacher assignments exist
- [ ] Test CBT creation from teacher dashboard
- [ ] Verify CBT appears in "My CBTs" list
- [ ] Verify questions appear in CBT
- [ ] Test that students can see and take the CBT

## Next Steps After CBT Creation Works

1. **Student CBT Taking**: Students should be able to navigate to CBT and take exams
2. **Auto-Scoring**: CBT results should auto-calculate and save to score_sheets
3. **Results Display**: Teachers and students should see CBT scores in results
4. **Grade Integration**: CBT scores should integrate with overall grading

## Support

If the error persists after these fixes:
1. Check browser console (F12) for detailed error messages
2. Check Supabase logs for database errors
3. Verify all migrations ran successfully
4. Ensure academic sessions and terms exist
5. Verify teacher assignment to subject/class

---

**All fixes are ready to deploy. Execute the migrations and test the CBT creation process.**
