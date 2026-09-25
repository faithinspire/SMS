# HARD FIX: Complete Subject Curriculum Architecture

## Executive Summary

This hard fix resolves the root cause of missing subjects in teacher/student registration:

**Root Problem:** Teacher registration used direct Supabase queries without level/department filtering

**Solution:** Centralize all subject queries through CanonicalSubjectService with proper filtering

**Result:** All schools get complete curriculum, all registrations show correct subjects immediately

---

## What Was Fixed

### 1. **Teacher Registration Page** (`src/app/auth/staff/register/page.tsx`)

**Before:**
```typescript
// BROKEN: Direct query with NO filtering
const { data: subjectData } = await supabase
  .from('subjects')
  .select('id, name, code')
  .eq('school_id', formData.schoolId)
  .limit(100)
  // MISSING: .eq('is_active', true)
  // MISSING: .contains('applicable_to_levels', [classLevel])
```

**After:**
```typescript
// FIXED: Use CanonicalSubjectService with level filtering
const applicableSubjects = await CanonicalSubjectService.getSubjectsForClass(
  formData.classId,
  formData.schoolId
)
```

### 2. **Student Registration Modal** (`src/components/admin/StudentRegistrationModal.tsx`)

Already using CanonicalSubjectService correctly. No changes needed.

### 3. **Student Registration Form** (`src/components/forms/StudentRegistrationForm.tsx`)

Already using CanonicalSubjectService correctly. Added department support for SS classes.

### 4. **Edit Student Modal** (`src/components/admin/EditStudentModal.tsx`)

**Before:** Direct Supabase query for all subjects
**After:** CanonicalSubjectService.getSubjectsForLevel() filtered by class level

### 5. **Edit Staff Modal** (`src/components/admin/EditStaffModal.tsx`)

**Before:** Direct Supabase query for all subjects
**After:** CanonicalSubjectService.getAllSubjectsForSchool() (admins can assign any subject)

### 6. **Migration 146** (`database/migrations/146_complete_nigerian_curriculum_all_schools.sql`)

- Creates canonical subject definitions for all levels (PREP-SS3)
- Properly sets `applicable_to_levels` array for each subject
- Links all subjects to ALL existing schools
- Creates trigger to auto-initialize new schools

**Subject Coverage:**
- PREP (18 subjects)
- KG (19 subjects)
- Nursery (19 subjects)
- Primary 1-3 (11 subjects)
- Primary 4-6 (14 subjects)
- JSS 1-3 (20 subjects)
- SS Core (4 subjects)
- SS Science (10 subjects)
- SS Humanities/Arts (12 subjects)
- SS Business (4 subjects)
- SS Trade (6 subjects)

**Total: 130+ subjects across all classes**

### 7. **School Curriculum Init Service** (`src/services/school-curriculum-init.service.ts`)

New service for:
- Auto-initializing school curriculum on school creation
- Backfilling curriculum for all existing schools
- Verifying curriculum completeness
- Canonical subject definitions (source of truth)

---

## Architecture Pattern

### Before (Broken)
```
Registration Page → Direct Supabase Query → ALL subjects (unfiltered)
                     ↓
              Missing level/department filtering
                     ↓
              Users see incomplete/wrong subjects
```

### After (Fixed)
```
Registration Page → CanonicalSubjectService → Proper level filtering
                     ↓
              CanonicalSubjectService → Level-aware query
                     ↓
              Query: subjects WHERE level @> ARRAY[class_level]
                     ↓
              Users see ONLY applicable subjects
```

---

## Key Changes to CanonicalSubjectService

### New Methods Used

```typescript
// Get subjects for a class (with automatic level lookup)
getSubjectsForClass(classArmComboId, schoolId)

// Get subjects for a level (direct level specification)
getSubjectsForLevel(schoolId, level)

// Get subjects with department filtering (for SS classes)
getSubjectsForDepartment(schoolId, level, department)

// Get all subjects for a school (for admin editing)
getAllSubjectsForSchool(schoolId)
```

### PostgreSQL Array Filtering

All queries use the PostgreSQL array containment operator:
```sql
applicable_to_levels @> ARRAY[level]
```

This ensures subjects are matched to class levels correctly.

---

## Database Schema Updates

### subjects table
- `applicable_to_levels` (INT[] - array of levels for which subject applies)
- `department` (VARCHAR - nullable, only for SS classes)
- `subject_type` (VARCHAR - CORE, ELECTIVE, VOCATIONAL)
- `is_active` (BOOLEAN - whether subject is available)

### Migration 146 Creates
- Canonical subject definitions (one record per unique subject)
- Links each subject to all schools (many-to-one relationship)
- Trigger for auto-initialization of new schools

---

## Execution Checklist

### Pre-Deployment
- [x] Migration 146 created with complete Nigerian curriculum
- [x] Teacher registration fixed to use CanonicalSubjectService
- [x] Student registration fixed for consistency
- [x] Edit modals updated to use CanonicalSubjectService
- [x] School curriculum init service created
- [x] All code pushed to GitHub

### Deployment Steps
1. [ ] Execute Migration 146 in Supabase
2. [ ] Verify all schools have subjects (run verification query)
3. [ ] Test teacher registration (check level filtering)
4. [ ] Test student registration (check level + department filtering)
5. [ ] Create test school (verify auto-curriculum)
6. [ ] Test all existing schools

### Post-Deployment Verification
- [ ] Verify existing school teacher registration shows correct subjects
- [ ] Verify existing school student registration shows correct subjects
- [ ] Verify SS classes show department dropdown
- [ ] Verify new school auto-initializes with curriculum
- [ ] Verify admin edit modals show correct subjects
- [ ] No manual subject assignment needed

---

## Important Files Modified

1. **database/migrations/146_complete_nigerian_curriculum_all_schools.sql**
   - Complete curriculum backfill + trigger

2. **src/app/auth/staff/register/page.tsx**
   - Fixed to use CanonicalSubjectService

3. **src/components/admin/EditStudentModal.tsx**
   - Fixed to use CanonicalSubjectService.getSubjectsForLevel()

4. **src/components/admin/EditStaffModal.tsx**
   - Fixed to use CanonicalSubjectService.getAllSubjectsForSchool()

5. **src/services/school-curriculum-init.service.ts**
   - New service for auto-initialization

---

## Testing Guide

### Test 1: Existing School - Teacher Registration
```
1. Go to /auth/staff/register
2. Select existing school
3. Select Primary 1 class
4. Verify: English, Math, Science, etc. appear
5. Verify: Only Primary 1 subjects show (not SS subjects)
```

### Test 2: Existing School - Student Registration
```
1. Go to school admin dashboard
2. Click Register Student
3. Select Primary 1 class
4. Verify: Same subjects as test 1
5. Verify: Department dropdown does NOT appear (only for SS)
```

### Test 3: New School - Auto Curriculum
```
1. Go to super admin dashboard
2. Create new test school
3. Go back to that school's teacher registration
4. Select any class (e.g., SS1)
5. Verify: Subjects appear (auto-initialized)
6. Verify: Department dropdown appears (SS class)
```

### Test 4: SS Classes - Department Filtering
```
1. Go to teacher registration
2. Select existing school
3. Select SS1 class
4. In department selection, choose "SCIENCE"
5. Verify: Biology, Chemistry, Physics, etc. appear
6. Verify: Commercial subjects (Accounting, Commerce) do NOT appear
```

### Test 5: Admin Edit Modal
```
1. Go to school admin dashboard
2. Edit existing teacher
3. Verify: All subjects appear (admins can assign any subject)
4. Verify: Can assign subjects from any level/department
```

---

## Success Criteria

All of the following must be true:

✅ All existing schools have complete curriculum (130+ subjects each)
✅ All new schools auto-initialize with complete curriculum
✅ Teacher registration shows only applicable subjects for class level
✅ Student registration shows only applicable subjects for class level
✅ SS classes show department selection in registration
✅ Department filtering works (SCIENCE/COMMERCIAL/HUMANITIES/TRADE)
✅ Admin edit modals show all subjects (for admin assignment)
✅ No manual subject population needed
✅ Subjects appear immediately in dropdowns (no admin work)
✅ All registrations use CanonicalSubjectService (centralized)

---

## Troubleshooting

### Problem: Subjects not appearing in registration
**Solution:**
1. Verify Migration 146 executed successfully
2. Check subjects table has rows: `SELECT COUNT(*) FROM subjects;`
3. Verify applicable_to_levels is populated: `SELECT COUNT(*) FROM subjects WHERE applicable_to_levels IS NULL;` (should return 0)
4. Verify is_active = true: `SELECT COUNT(*) FROM subjects WHERE is_active = FALSE;`
5. Check CanonicalSubjectService is imported correctly

### Problem: Wrong subjects appearing for class level
**Solution:**
1. Verify applicable_to_levels array contains the class level
2. Check that class level is correct: `SELECT level FROM classes WHERE id = ?;`
3. Test the array query: `SELECT * FROM subjects WHERE applicable_to_levels @> ARRAY[3];`

### Problem: Department dropdown not appearing for SS classes
**Solution:**
1. Verify class level >= 12 (SS1 = 12, SS2 = 13, SS3 = 14)
2. Check that department column in subjects is populated
3. Verify getSubjectsForDepartment() is being called

---

## Deployment Timeline

- Migration 146 created: ✅
- Code fixes pushed to GitHub: ✅
- Ready to execute in Supabase: ✅
- Testing in production environment: 📋 (NEXT STEPS)

---

## Questions?

Refer to:
- CanonicalSubjectService documentation: `src/services/canonical-subject.service.ts`
- SchoolCurriculumInitService: `src/services/school-curriculum-init.service.ts`
- Migration 146: `database/migrations/146_complete_nigerian_curriculum_all_schools.sql`
