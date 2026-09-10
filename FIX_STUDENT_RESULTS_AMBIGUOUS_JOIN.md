# Fix: Student Results - Ambiguous Join Error

## The Problem

Error: `Could not embed because more than one relationship was found for 'students' and 'users'`

**Root Cause:** The `students` table has multiple foreign keys to the `users` table, making the implicit join ambiguous when using `.select('users(...)')` syntax.

**Affected queries:**
1. `ResultAggregationService.getStudentResult()` - Line 77
2. `ResultAggregationService.getClassResult()` - Line 279
3. `ResultAggregationService.getSubjectResults()` - Line 403

## The Solution

Instead of using embedded selects `users(full_name)`, we now:
1. **Query student data separately** - no embedded joins
2. **Fetch user data in a separate query** - explicit, non-ambiguous
3. **Combine the results** - manual join instead of implicit

### Changes Made

**File: `src/services/result-aggregation.service.ts`**

#### Change 1: getStudentResult() method
```typescript
// BEFORE: Ambiguous embedded join
.select('id, admission_number, user_id, class_arm_combo_id, users(full_name)')

// AFTER: Separate queries
.select('id, admission_number, user_id, class_arm_combo_id')
// Then query users separately:
const { data: userData } = await supabase
  .from('users')
  .select('full_name')
  .eq('id', student.user_id)
  .single()
```

#### Change 2: getClassResult() method
```typescript
// BEFORE: Ambiguous embedded join
.select('id, admission_number, user_id, users(full_name)')
.order('users(full_name)', { ascending: true })

// AFTER: Separate queries
.select('id, admission_number, user_id')
.order('admission_number', { ascending: true })
// User data fetched via getStudentResult() for each student
```

#### Change 3: getSubjectResults() method
```typescript
// BEFORE: Double-nested ambiguous join
.select('*, subjects(name), students(admission_number, users(full_name))')
.order('students(users(full_name))', { ascending: true })

// AFTER: Separate queries with Promise.all()
.select('*, subjects(name), students(id, admission_number, user_id)')
.order('students(admission_number)', { ascending: true })
// Then fetch user names for each student:
const scoresWithNames = await Promise.all(
  scores.map(async (score) => {
    const { data: userData } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', score.students.user_id)
      .single()
    return { ...score, student_name: userData?.full_name || 'Unknown' }
  })
)
```

## How to Test

1. **Refresh browser** (Ctrl + F5)
2. **Go to Student Dashboard**
3. **Click on "Results"**
4. **Check browser console** - should see:
   ```
   [ResultAgg] ✅ Fetched X score sheets
   [StudentResults] Result loaded: X subjects
   ```

5. **Verify results display**:
   - ✅ Student name shows correctly
   - ✅ All subjects display with scores
   - ✅ Overall grade and score calculation correct
   - ✅ No errors in console

## Expected Behavior After Fix

**Student Results Page:**
- ✅ Shows student name (from users table)
- ✅ Shows admission number
- ✅ Shows class name
- ✅ Lists all subjects with scores:
  - CA1, CA2, CA3, CA4 scores
  - Exam score
  - Total marks
  - Grade (A, B, C, etc.)
  - Teacher name
- ✅ Shows overall score and grade
- ✅ Pass/Fail status

**No errors in console:**
- ✅ No "Could not embed" errors
- ✅ No Supabase PGRST201 errors
- ✅ All logs show successful queries

## If Still Not Working

Check the browser console (F12) for:
1. **Are there any Supabase errors?** 
   - If yes, note the exact error
2. **Are there any "Student not found" messages?**
   - This means the student record is missing or student_id is wrong
3. **Check if score_sheets table has data:**
   ```sql
   SELECT COUNT(*) FROM score_sheets 
   WHERE school_id = 'your-school-id' 
   AND student_id = 'student-id'
   AND term_id = 'term-id';
   ```

---

**The fix is complete. Refresh browser and test student results now!** ✅
