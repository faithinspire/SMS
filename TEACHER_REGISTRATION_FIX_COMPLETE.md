# Teacher Registration System - Complete Fix

## Problem Summary
Teacher registration was failing with database constraint violations:
- `null value in column "school_id"` error when assigning subjects
- `Key (teacher_id) is not present in table "users"` error after fixing school_id

## Root Cause Analysis

### Issue 1: School_id Missing in Subject Assignments
**Problem**: The `subject_teacher_assignments` table requires a `school_id` field (NOT NULL constraint), but the code wasn't including it.

**Cause**: The `assignSubjectsToTeacher()` method had faulty logic that tried to get school_id from non-existent records.

### Issue 2: Wrong ID Type Being Used
**Problem**: The code was using the `teachers.id` (from the new teachers table) instead of `users.id` when assigning subjects and classes.

**Root Cause**: Schema mismatch - `subject_teacher_assignments.teacher_id` and `class_arm_combos.class_teacher_id` both reference `users(id)`, NOT `teachers(id)`.

### Issue 3: User Record Not Being Created
**Problem**: The user database record wasn't being created because errors were being caught and treated as "non-critical", allowing the flow to continue without a valid user record.

**Cause**: When `subject_teacher_assignments` later tried to insert with `teacher_id` (which should be a `users.id`), that user didn't exist in the database.

## Fixes Applied

### Fix 1: Corrected ID Usage in TeacherRegistrationModal.tsx

**Before**:
```typescript
// Step 4: Assign subjects to teacher
await TeacherService.assignSubjectsToTeacher(teacherId, selectedSubjects, selectedComboId, schoolId)
// Step 5: Assign class to teacher
await TeacherService.assignClassToTeacher(teacherId, selectedComboId)
```

**After**:
```typescript
// Step 4: Assign subjects to teacher
// NOTE: subject_teacher_assignments.teacher_id references users(id), not teachers(id)
// So we pass userId here, not teacherId from the teachers table
await TeacherService.assignSubjectsToTeacher(userId, selectedSubjects, selectedComboId, schoolId)

// Step 5: Assign class to teacher
// NOTE: class_arm_combos.class_teacher_id references users(id), not teachers(id)
await TeacherService.assignClassToTeacher(userId, selectedComboId)
```

### Fix 2: Rewrote assignSubjectsToTeacher() in teacher.service.ts

**Changes**:
1. Renamed parameter from `teacherId` to `userId` for clarity (references users.id)
2. Made `classArmComboId` required (it's a NOT NULL constraint in the schema)
3. Removed faulty logic trying to get combo_id from non-existent records
4. Directly get school_id from the `users` table using the userId
5. Add explicit validation before attempting insert
6. Always include school_id in the assignment records

**Key Code**:
```typescript
static async assignSubjectsToTeacher(
  userId: string,
  subjectIds: string[],
  classArmComboId?: string,
  schoolId?: string
): Promise<void> {
  // Validate inputs
  if (!userId) {
    throw new Error('userId is required for subject assignment')
  }
  
  if (!Array.isArray(subjectIds) || subjectIds.length === 0) {
    console.log('No subjects to assign')
    return
  }

  // Determine school_id and class_arm_combo_id
  let comboId = classArmComboId
  let school_id = schoolId

  // If no combo ID provided, we cannot proceed (it's required by the schema)
  if (!comboId) {
    throw new Error('class_arm_combo_id is required for subject assignment')
  }

  // If still no school_id, get from users table using userId
  if (!school_id) {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('school_id')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      throw new Error(`Cannot find user with ID ${userId} to determine school_id`)
    }

    school_id = user.school_id
  }

  if (!school_id) {
    throw new Error('Cannot determine school_id for subject assignment')
  }

  // Create assignments for each subject
  // NOTE: teacher_id column references users(id), not teachers(id)
  const assignments = subjectIds.map((subjectId) => ({
    teacher_id: userId,        // This is users.id
    subject_id: subjectId,
    class_arm_combo_id: comboId,
    school_id: school_id,      // NOW INCLUDED!
    created_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('subject_teacher_assignments')
    .insert(assignments)

  if (error) {
    console.error('❌ Subject assignment error:', error)
    throw error
  }

  console.log(`✅ Assigned ${subjectIds.length} subjects to teacher`)
}
```

### Fix 3: Updated assignClassToTeacher() in teacher.service.ts

**Changes**:
1. Renamed parameter from `teacherId` to `userId` for clarity
2. Added validation that userId and classArmComboId are provided
3. Clear comments that it's using users.id, not teachers.id

### Fix 4: Made User Record Creation Mandatory

**Before**:
```typescript
try {
  const { error: userDbError } = await supabase.from('users').insert({...})
  if (userDbError) {
    console.warn('⚠️ User database record warning (non-critical):', userDbError)
  }
} catch (dbErr: any) {
  console.warn('⚠️ Database error creating user record (continuing):', dbErr)
}
```

**After**:
```typescript
console.log('👤 Creating user record in database...')
const { error: userDbError } = await supabase.from('users').insert({...})

if (userDbError) {
  // Check if it's a duplicate key error (user already exists) - that's OK
  if (userDbError.code === '23505') {
    console.log('ℹ️ User record already exists in database')
  } else {
    console.error('❌ Critical error creating user record:', userDbError)
    throw new Error(`Failed to create user record: ${userDbError.message}`)
  }
} else {
  console.log('✅ User record created in database')
}
```

## Schema Reference (For Verification)

### users table
- `id` UUID PRIMARY KEY (created by Supabase Auth)
- `school_id` UUID (required)
- `email` TEXT (required)
- `full_name` TEXT (required)
- `role` VARCHAR(50) (required)

### teachers table
- `id` UUID PRIMARY KEY (independent)
- `user_id` UUID FOREIGN KEY → users(id) (required)
- `school_id` UUID FOREIGN KEY → schools(id) (required)
- Other fields: first_name, last_name, teaching_level, etc.

### subject_teacher_assignments table
- `id` UUID PRIMARY KEY
- `teacher_id` UUID FOREIGN KEY → **users(id)** ✅ (NOT teachers.id)
- `subject_id` UUID FOREIGN KEY → subjects(id)
- `class_arm_combo_id` UUID FOREIGN KEY → class_arm_combos(id)
- `school_id` UUID FOREIGN KEY → schools(id)

### class_arm_combos table
- `id` UUID PRIMARY KEY
- `class_teacher_id` UUID FOREIGN KEY → **users(id)** ✅ (NOT teachers.id)
- Other fields

## Files Modified
1. `src/components/admin/TeacherRegistrationModal.tsx` - Lines 290-318 (user record creation) and Line 358-365 (subject/class assignment)
2. `src/services/teacher.service.ts` - `assignSubjectsToTeacher()` method (complete rewrite) and `assignClassToTeacher()` method (parameter rename + validation)

## What This Fixes
✅ Teacher registration no longer fails with "null school_id" error
✅ Teacher registration no longer fails with "user not found" error
✅ Subject assignments properly link to users, not teachers table
✅ Class assignments properly link to users, not teachers table
✅ User database records are created before attempting to reference them

## What Still Needs to Happen
1. **User must register a teacher** and verify it succeeds
2. **Database data linking** - Teachers must be assigned to classes and subjects:
   - Option A: Run `TEACHER_REGISTRATION_TRACKING.sql` for automatic level-aware assignment
   - Option B: Use admin tool at `/school-admin/staff/teacher-assignment/page.tsx` for manual assignment
3. **Student enrollment** - Students must be enrolled in classes and subjects
4. **Dashboard verification** - Teacher dashboard should show:
   - ✅ My Classes (if assigned as class_teacher_id)
   - ✅ My Subjects (if assigned in subject_teacher_assignments)
   - ✅ Class Students (students in managed class)
   - ✅ Subject Students (students taking assigned subjects)

## Testing Steps
1. Navigate to school admin dashboard
2. Open Teacher Registration Modal
3. Register a new teacher:
   - Select teaching level (PRIMARY or SECONDARY)
   - Fill personal info
   - Fill bank details
   - Select class and subjects
4. Verify console logs show:
   - ✅ Auth user created
   - ✅ User record created in database
   - ✅ Teacher registered
   - ✅ Subjects assigned
   - ✅ Class assigned
5. Login as the teacher
6. Verify teacher dashboard shows classes/subjects/students

## Technical Notes
- The confusion arose because we have TWO teacher IDs:
  - `teachers.id` - Independent UUID for teacher-specific data
  - `users.id` - The auth user ID that teachers reference
- All foreign assignments (subjects, classes) use `users.id`, not `teachers.id`
- This is by design: a teacher is a user with role='TEACHER' and an extended teachers record for additional fields
