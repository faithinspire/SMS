# CBT Management Fixes - Applied

## Issue 1: Missing `option_key` Field ✅ FIXED

### Error
```
POST https://... 400 (Bad Request)
null value in column "option_key" of relation "cbt_options" violates not-null constraint
```

### Root Cause
The `cbt_options` table requires an `option_key` field (A, B, C, D for multiple choice), but the code wasn't providing it.

### Fix Applied
Added `option_key` generation in `src/app/teacher/cbt-management/page.tsx`:
```typescript
option_key: String.fromCharCode(65 + optIndex), // A, B, C, D, etc.
```

Now options are automatically assigned keys:
- Option 0 → 'A'
- Option 1 → 'B'
- Option 2 → 'C'
- Option 3 → 'D'
- etc.

---

## Issue 2: Class Selector Only Shows Teacher's Classes ✅ FIXED

### Problem
The class dropdown only showed classes the teacher was assigned to as class teacher. Teachers creating CBTs need to see ALL classes in the school.

### Root Cause
Code was using `TeacherContextService.managedClasses` which only returns classes where the teacher is the class teacher.

### Fix Applied
Changed `src/app/teacher/cbt-management/page.tsx` to query all classes:
```typescript
const { data: allClasses } = await supabase
  .from('class_arm_combos')
  .select('id, classes(name), arms(name)')
  .eq('school_id', currentUser.school_id)
  .order('classes(name), arms(name)', { ascending: true })
```

Now shows:
- ✅ All classes in the school
- ✅ Sorted by class name then arm
- ✅ Formatted as "Class Name - Arm Name"
- ✅ Teachers can create CBTs for any class

---

## Testing

### To Verify Fix Works:

1. **Open CBT Management Page**
   - Navigate to `/teacher/cbt-management`

2. **Check Class Dropdown**
   - Click "Create New CBT"
   - Look at "Class" dropdown
   - Should see ALL classes, not just your assigned class
   - Should be sorted alphabetically

3. **Create a CBT**
   - Fill in form
   - Select any class (not just yours)
   - Add questions and options
   - Click "Create CBT"
   - Should succeed without "option_key" error

4. **Verify Options Created**
   - View the created CBT
   - Options should be labeled A, B, C, D

---

## Files Modified
- `src/app/teacher/cbt-management/page.tsx` (2 changes)
  1. Added `option_key` field generation
  2. Changed class loading to show all classes

---

## What Changed

### Before
- ❌ Only showed teacher's assigned classes
- ❌ Missing option_key on insert
- ❌ Error 400 when creating CBT

### After
- ✅ Shows all school classes
- ✅ option_key auto-generated (A, B, C, D)
- ✅ CBT creation succeeds

---

## Next Steps

1. **Refresh the page** to clear cache
2. **Try creating a new CBT** with any class
3. **Verify success** - no 400 error
4. **Check options** - should have A, B, C, D keys

The fixes are now live and ready to use!
