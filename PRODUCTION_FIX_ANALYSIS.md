# Production Fix Analysis - School Management System

## ROOT CAUSES IDENTIFIED

### 1. TEACHER REGISTRATION - CLASSES NOT LOADING
**Root Cause**: `RegistrationConfigService.getClassArmCombos()` returns data with nested relationships where `classes` and `arms` are returned as objects with `name` properties, but the modal UI incorrectly tries to access `combo.arm.name` instead of `combo.arms.name` (plural).

**Location**: `src/components/admin/TeacherRegistrationModal.tsx`, line ~380
```tsx
// WRONG - accesses combo.arm
{(combo.arm as any)?.name}
// CORRECT - should access combo.arms
{(combo.arms as any)?.name}
```

**Data Flow**:
```
Supabase query selects:
  - classes (id, name, level, type)
  - arms (id, name)  ← returns as "arms" not "arm"

Modal tries:
  - combo.arm.name  ← FAILS

Should be:
  - combo.arms.name ← WORKS
```

### 2. TEACHER REGISTRATION - SUBJECTS NOT LOADING
**Root Cause**: Multiple issues:
1. `getRelevantSubjects()` filters by `applicable_to_levels` which is stored as PostgreSQL INT[] but may need type coercion
2. No default filter when no class is selected - returns ALL subjects, which is confusing
3. Service returns correct data, but filtering logic may have edge cases with level comparison

**Location**: `src/components/admin/TeacherRegistrationModal.tsx`, lines ~151-188

### 3. UUID DISPLAY IN UI
**Root Cause**: Components display `subject_id` or `class_id` directly instead of resolving to names via joins.

**Examples**:
- Student subjects page shows UUID instead of subject name
- Class assignment shows UUID instead of class name
- Service queries return nested objects but components don't use them

**Solution**: Query should include joins to get names, then always display the `name` field, never the `id`.

### 4. STUDENT PHOTO UPLOAD - BUCKET NOT FOUND
**Root Cause**: Code references bucket `student-documents` but it may not exist or have wrong permissions. Also, no check if bucket exists before attempting upload.

**Location**: `src/app/student/dashboard/page.tsx` (added in previous session)

### 5. ADMISSION NUMBER - 2026-UNK-undefined
**Root Cause**: Admission number generation is incomplete. The format generation logic either:
1. Missing school code configuration
2. Sequence number not being generated
3. Type checking issues with undefined values

**Likely Location**: `src/lib/credential-generator.ts` or `src/services/student.service.ts`

### 6. STUDENT ASSIGNMENT PAGE REDIRECT
**Root Cause**: Route exists but either:
1. Route protection logic incorrectly redirects authenticated users
2. API fails and no error state handling exists
3. Route doesn't exist and 404 isn't caught

**Location**: Routing logic in `/src/app/student/assignment/*` or auth middleware

### 7. LESSON NOTES PAGE REDIRECT
**Root Cause**: Same as above - either route protection or data loading error causes redirect

**Location**: Routing logic in `/src/app/teacher/lesson-notes/*`

---

## DATABASE SCHEMA ANALYSIS

### Actual Tables (from 001_initial_schema.sql):
- ✅ `schools` - exists, stores school data
- ✅ `users` - exists, stores all users
- ✅ `classes` - exists, stores class data with `name`, `level`, `type`
- ✅ `arms` - exists, references `class_id`, stores arm names
- ✅ `class_arm_combos` - exists, combines class+arm with `class_teacher_id`
- ✅ `subjects` - exists, stores subjects with `applicable_to_levels INT[]`
- ✅ `subject_teacher_assignments` - exists, links teacher+subject+class+arm
- ✅ `students` - exists, has `class_arm_combo_id`, `admission_number`
- ✅ `student_subjects` - exists, links student to subjects
- ❌ `class_teachers` - DOES NOT EXIST (referenced in StudentService)
- ❌ `student_class_teachers` - DOES NOT EXIST (referenced in StudentService)
- ❌ `student_subject_teachers` - DOES NOT EXIST (referenced in StudentService)

### Issues:
1. Services reference tables that don't exist in actual schema
2. Schema should use `subject_teacher_assignments` directly, not non-existent intermediate tables
3. Class teacher relationship stored in `class_arm_combos.class_teacher_id`

---

## SERVICE ISSUES

### class.service.ts
- ✅ `getClassArmCombos()` returns correct structure
- ✅ Queries use school_id filter
- ✅ Returns joined data

### teacher.service.ts
- ❌ References `student_class_teachers` table (doesn't exist)
- ❌ References `student_subject_teachers` table (doesn't exist)
- ✅ `assignSubjects()` uses correct `subject_teacher_assignments` table
- ❌ Data model mismatch with actual schema

### student.service.ts
- ❌ References `class_teachers` table (doesn't exist)
- ❌ References `student_class_teachers` table (doesn't exist)
- ❌ References `student_subject_teachers` table (doesn't exist)
- ❌ Entire service needs refactoring

### user-registration.service.ts
- ✅ `registerTeacher()` correctly updates `class_arm_combos.class_teacher_id`
- ✅ `registerTeacher()` correctly inserts into `subject_teacher_assignments`
- ✅ Overall flow looks correct

---

## STORAGE ISSUES

### Student Photo Upload
- Bucket name: `student-documents` (assumed, not verified)
- Path structure: `student-photos/{schoolId}/{studentId}/profile.jpg`
- Issue: Bucket may not exist or may have wrong settings

---

## REQUIRED FIXES (IN ORDER)

1. **Fix TeacherRegistrationModal - Arm Name Access**
   - Change `combo.arm.name` → `combo.arms.name`
   - Impact: Classes dropdown will display properly

2. **Fix Teacher Subject Filtering**
   - Improve level comparison logic in `RegistrationConfigService.filterSubjectsByLevel()`
   - Add logging to debug filtering
   - Impact: Subjects dropdown will work

3. **Refactor Services to Use Correct Tables**
   - teacher.service.ts: Remove references to non-existent tables
   - student.service.ts: Complete refactor to use actual schema
   - Impact: Dashboard data loading will work correctly

4. **Fix UUID Display**
   - Ensure all SELECT queries include necessary JOINs
   - Update components to display `.name` not `.id`
   - Create utility functions to prevent UUID display
   - Impact: UI will show readable data

5. **Fix Student Photo Storage**
   - Verify/create `student-documents` bucket
   - Test upload path structure
   - Impact: Photo upload will work

6. **Fix Admission Number Generation**
   - Identify generation logic
   - Fix undefined/null values
   - Impact: Valid admission numbers

7. **Fix Navigation Redirects**
   - Add proper error handling in dashboards
   - Prevent redirects on data load errors
   - Impact: Pages will display properly

---

## IMPLEMENTATION STRATEGY

Phase 1: Core Data Access Fixes (Services)
- Fix service queries to use correct tables
- Fix joins to return names, not UUIDs
- Test with sample queries

Phase 2: Frontend Display Fixes (Components)
- Fix modal dropdowns
- Fix UUID display
- Add proper error states

Phase 3: Feature Implementations
- Photo storage
- Admission number generation
- Navigation fixes

Phase 4: Testing
- End-to-end flow testing
- Data validation
- Error case handling

---
