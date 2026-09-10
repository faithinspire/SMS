# HARD REBUILD: Subject Catalog Complete Replacement

**Date**: August 31, 2026  
**Status**: 🔴 IN PROGRESS - Implementation Started  
**Objective**: Replace old subject system with comprehensive canonical catalog  
**Scope**: Database + API + Frontend + All Integration Points

---

## WHAT'S BEEN DONE

### ✅ PHASE 1: Database Schema & Migrations

**Created**: 
- `047_hard_rebuild_subject_catalog.sql` - Safety migration (preserves historical data)
- `048_canonical_subject_catalog.sql` - Idempotent subject insertion

**What these do**:
- ✅ Preserve all existing student/teacher/score/CBT data
- ✅ Remove old DEFAULT subjects (no longer used)
- ✅ Insert 37 canonical subjects covering:
  - 4-5 Early Years subjects (Prep, KG, Nursery)
  - 12+ Primary subjects (Primary 1-6)
  - 12+ Junior Secondary (JSS1-3)
  - 15+ Senior Secondary (SS1-3, all departments)
  - Technical/Vocational subjects
- ✅ Use `applicable_to_levels` array for multi-level applicability
- ✅ NO DUPLICATE SUBJECTS (one Math record, one Physics record, etc.)
- ✅ Idempotent (safe to run multiple times)

**Subjects Inserted** (Partial List):
```
English Language (3-14)
Mathematics (3-14)
General Science (3-8)
Basic Science (9-11)
Physics (12-14)
Chemistry (12-14)
Biology (12-14)
Accounting (12-14)
Commerce (12-14)
Economics (12-14)
Literature in English (12-14)
Government (12-14)
History (12-14)
Agricultural Science (12-14)
Technical Drawing (12-14)
... [22 more core subjects]
```

**Verification Queries Included**:
```sql
-- Check total subjects per school
SELECT school_name, total_subjects, unique_levels FROM ... 

-- Verify no duplicates
SELECT name, COUNT(*) FROM subjects GROUP BY name HAVING COUNT(*) > 1

-- Check level coverage
SELECT level, subject_count FROM ... GROUP BY level
```

### ✅ PHASE 2: Canonical Subject Service

**Created**: `/src/services/canonical-subject.service.ts`

**This is the NEW SINGLE SOURCE OF TRUTH for all subject operations:**

```typescript
// ✅ Get subjects for a class level
CanonicalSubjectService.getSubjectsForLevel(schoolId, level)
// Returns: Only subjects applicable to that level

// ✅ Get subjects for a specific class
CanonicalSubjectService.getSubjectsForClass(classArmComboId, schoolId)
// Returns: Subjects filtered by class level

// ✅ Get subjects taught by a teacher
CanonicalSubjectService.getSubjectsTaughtByTeacher(teacherId, schoolId)
// Returns: Subjects from subject_teacher_assignments

// ✅ Get subjects enrolled by student
CanonicalSubjectService.getSubjectsEnrolledByStudent(studentId, schoolId)
// Returns: Subjects from student_subjects

// ✅ Verify subjects exist
CanonicalSubjectService.verifySubjectsExist(subjectIds, schoolId)
// Returns: Only valid subject IDs

// ✅ Get all subjects for school
CanonicalSubjectService.getAllSubjectsForSchool(schoolId)
// Returns: All 37 subjects for admin management

// ✅ Level helpers
CanonicalSubjectService.getLevelLabel(3)  // "Primary 3"
CanonicalSubjectService.getLevelsForSection('SECONDARY')  // [9,10,11,12,13,14]
```

**Key Features**:
- Always uses `subject_id` (UUID) internally
- Never displays UUIDs to users
- Filters by `applicable_to_levels` array
- Returns `subject.name` for display
- Idempotent queries (safe for concurrent calls)
- Error handling for missing subjects

---

## NEXT STEPS (WHAT YOU NEED TO DO)

### 📋 STEP 1: Execute Database Migrations

**In Supabase SQL Editor**:

1. Copy `/database/migrations/048_canonical_subject_catalog.sql`
2. Run in Supabase
3. Verify output:
   ```
   ✓ "Populated X subjects for school: Frontier School"
   ✓ "total_subjects: 37" per school
   ✓ "No duplicates found"
   ```

**Check Result**:
```sql
-- Run this verification
SELECT name, COUNT(*) as count 
FROM subjects 
WHERE school_id = (SELECT id FROM schools WHERE name LIKE '%frontier%')
GROUP BY name
ORDER BY count DESC;

-- Expected: Each subject appears ONCE per school (no duplicates)
-- Expected: ~37 rows returned
```

---

### 📋 STEP 2: Update Teacher Registration

**File**: `/src/components/admin/TeacherRegistrationModal.tsx`

**Current Code** (❌ NEEDS FIX):
```typescript
// Hardcoded subjects:
const subjects = ['English', 'Mathematics', 'Physics', ...]
```

**Replace With** (✅ NEW):
```typescript
import CanonicalSubjectService from '@/services/canonical-subject.service'

// When class selected:
const handleClassChange = async (comboId) => {
  const subjectsForClass = await CanonicalSubjectService.getSubjectsForClass(
    comboId,
    schoolId
  )
  setSubjects(subjectsForClass)
}

// When teacher registers:
const handleRegister = async () => {
  // Verify all selected subjects exist
  const verified = await CanonicalSubjectService.verifySubjectsExist(
    selectedSubjectIds,
    schoolId
  )
  if (verified.length !== selectedSubjectIds.length) {
    throw new Error('Some subjects are invalid')
  }
  // Proceed with registration using verified IDs
}
```

---

### 📋 STEP 3: Update Student Registration

**File**: `/src/components/forms/StudentRegistrationForm.tsx`

**Current Code** (❌ NEEDS FIX):
```typescript
// Hardcoded filter:
const subjects = NIGERIAN_SUBJECTS.PRIMARY
```

**Replace With** (✅ NEW):
```typescript
import CanonicalSubjectService from '@/services/canonical-subject.service'

// When class selected:
const handleClassChange = async (comboId) => {
  const subjectsForClass = await CanonicalSubjectService.getSubjectsForClass(
    comboId,
    schoolId
  )
  setSubjects(subjectsForClass)
  // Checkbox list now shows filtered subjects
}

// When student registers:
const handleRegister = async () => {
  // Only store subject_id (UUID), never store name
  const registration = {
    ...studentData,
    subject_ids: selectedSubjects, // Array of UUIDs
  }
  await StudentService.registerStudent(registration)
}
```

---

### 📋 STEP 4: Update Score Sheet

**File**: `/src/app/teacher/subject-score-sheet/page.tsx`

**Current Code** (❌ NEEDS FIX):
```typescript
// Hardcoded dropdown:
const subjects = NIGERIAN_SUBJECTS.SECONDARY
setSubjects(subjects)
```

**Replace With** (✅ NEW):
```typescript
import CanonicalSubjectService from '@/services/canonical-subject.service'

// Load teacher's subjects:
useEffect(() => {
  const loadSubjects = async () => {
    const taught = await CanonicalSubjectService.getSubjectsTaughtByTeacher(
      teacherId,
      schoolId
    )
    setSubjects(taught) // Only subjects teacher actually teaches
  }
  loadSubjects()
}, [teacherId, schoolId])

// When subject selected:
const handleSubjectSelect = (subjectId) => {
  // Use UUID, not name
  setSelectedSubjectId(subjectId)
  // Fetch students from DB using this UUID
}
```

---

### 📋 STEP 5: Update CBT Subject Selection

**File**: `/src/app/teacher/cbt/CreateCBT.tsx`

**Current Code** (❌ NEEDS FIX):
```typescript
// Hardcoded dropdown:
const subjects = NIGERIAN_SUBJECTS.SECONDARY
```

**Replace With** (✅ NEW):
```typescript
import CanonicalSubjectService from '@/services/canonical-subject.service'

// Load teacher's subjects:
useEffect(() => {
  const loadSubjects = async () => {
    const taught = await CanonicalSubjectService.getSubjectsTaughtByTeacher(
      teacherId,
      schoolId
    )
    setSubjects(taught)
  }
  loadSubjects()
}, [])

// When creating CBT:
const handleCreateCBT = async () => {
  const cbtData = {
    subject_id: selectedSubjectId, // UUID from DB, not name
    class_arm_combo_id: selectedClass,
    title: cbtTitle,
    duration: cbtDuration,
    total_marks: totalMarks,
  }
  await CBTService.createExam(cbtData)
}
```

---

### 📋 STEP 6: Remove Hardcoded Subject Arrays

**Files to Update/Delete**:

1. ❌ `/src/constants/nigerian-subjects.ts` - **DELETE THIS FILE**
   - Entire file is hardcoded subjects
   - No longer needed - use CanonicalSubjectService instead

2. ❌ `/src/lib/school-seeding.ts` - **Remove subject initialization**
   - Search for `PRIMARY_SUBJECTS`, `SECONDARY_SUBJECTS`
   - Delete those arrays
   - Database handles subject seeding now

3. ❌ `/src/app/api/setup/init-school-data/route.ts` - **Update subject creation**
   - Currently inserts hardcoded subjects
   - Change to: Call migration 048 instead
   - Subjects now auto-seeded for all schools

---

### 📋 STEP 7: Update Frontend Components to NEVER Display UUIDs

**Search codebase for UUID display**:
```bash
# Find any places showing raw UUIDs
grep -r "subject.id" src/components --include="*.tsx"
grep -r "subjectId" src/components --include="*.tsx" | grep -v "const\|props\|=>"
```

**Rule: NEVER show UUIDs**

❌ Wrong:
```jsx
<span>{subject.id}</span> // Shows: b9e1884d-6fae-40ca-86a7-54301ea73620
```

✅ Right:
```jsx
<span>{subject.name}</span> // Shows: "Mathematics"
```

---

### 📋 STEP 8: Update All Subject Dropdowns

**Find all subject <select> elements**:
```bash
grep -r "availableSubjects" src/components --include="*.tsx"
grep -r "subjects.map" src/components --include="*.tsx"
```

**Update each dropdown**:

❌ Old:
```jsx
<select onChange={(e) => setSelectedSubject(e.target.value)}>
  {subjects.map(s => (
    <option key={s.id} value={s.name}> {/* WRONG: storing name */}
      {s.name}
    </option>
  ))}
</select>
```

✅ New:
```jsx
<select onChange={(e) => setSelectedSubjectId(e.target.value)}>
  {subjects.map(s => (
    <option key={s.id} value={s.id}> {/* CORRECT: storing UUID */}
      {s.name}
    </option>
  ))}
</select>
```

---

### 📋 STEP 9: API Endpoints Update

**APIs that reference subjects**:

| Endpoint | Change |
|----------|--------|
| `/api/teacher/my-subjects` | Already correct (uses subject_id) |
| `/api/teacher/subject-students` | Already correct |
| `/api/subject-scores` | Update to use CanonicalSubjectService.verifySubjectsExist() |
| `/api/setup/init-school-data` | Remove hardcoded insertion, call migration instead |
| `/api/cbt/create` | Use UUID, not subject name |
| `/api/score-sheet` | Use UUID, filter by subject_id |

---

### 📋 STEP 10: Cache Cleanup

**Clear old subject caches**:

```typescript
// In your main app initialization:
localStorage.removeItem('subjects_cache')
localStorage.removeItem('teacher_subjects_cache')
sessionStorage.clear()

// Clear React Query caches:
queryClient.invalidateQueries({ queryKey: ['subjects'] })
queryClient.invalidateQueries({ queryKey: ['teacher-subjects'] })
```

---

## VERIFICATION CHECKLIST

### Database Level ✓
- [ ] Run migration 048 in Supabase
- [ ] Verify 37 subjects per school
- [ ] Verify no duplicate subjects
- [ ] Verify applicable_to_levels is populated
- [ ] Verify no UUIDs in subject names
- [ ] Verify historical results/CBT/scores preserved

### Code Level ✓
- [ ] Delete `/src/constants/nigerian-subjects.ts`
- [ ] Update `/src/components/admin/TeacherRegistrationModal.tsx`
- [ ] Update `/src/components/forms/StudentRegistrationForm.tsx`
- [ ] Update `/src/app/teacher/subject-score-sheet/page.tsx`
- [ ] Update `/src/app/teacher/cbt/CreateCBT.tsx`
- [ ] Remove hardcoded subjects from `/src/lib/school-seeding.ts`
- [ ] Update `/src/app/api/setup/init-school-data/route.ts`
- [ ] All dropdowns use `subject.id`, display `subject.name`
- [ ] All API calls use UUID, not name

### Frontend Level ✓
- [ ] Teacher registration loads subjects from DB
- [ ] Student registration loads subjects from DB
- [ ] Score sheet loads subjects from DB
- [ ] CBT subject selection loads from DB
- [ ] No UUIDs displayed anywhere
- [ ] No hardcoded subject arrays
- [ ] No "Unknown Subject" messages
- [ ] No blank dropdowns

### Integration Level ✓
- [ ] Teacher assigns subjects → Uses subject_id
- [ ] Student enrolls subjects → Uses subject_id
- [ ] Subject teacher gets correct students → Queries by subject_id
- [ ] Class teacher gets correct students → Queries by subject_id
- [ ] Score sheet saves scores → Uses subject_id
- [ ] CBT creates exam → Uses subject_id
- [ ] CBT results sync → Uses subject_id
- [ ] Report card → Uses subject_id

### End-to-End Test ✓
- [ ] Register new teacher (Primary 3)
  - [ ] Subject dropdown shows only Primary subjects
  - [ ] Can select English, Math, Science
  - [ ] Subjects saved with UUID, not name
- [ ] Register new student (Primary 3A)
  - [ ] Subject dropdown matches teacher's subjects
  - [ ] Can select Math, English, Science
  - [ ] Student linked to subject teachers correctly
- [ ] Teacher enters scores
  - [ ] Subject dropdown shows only assigned subjects
  - [ ] Can select students taking that subject
  - [ ] Scores saved correctly
- [ ] CBT exam
  - [ ] Teacher creates CBT for Math
  - [ ] Student takes Math CBT
  - [ ] Results sync to score sheet
- [ ] Report card
  - [ ] Shows correct subjects
  - [ ] Shows scores from manual + CBT

---

## FILE CHANGES SUMMARY

### Migrations Created
```
📝 048_canonical_subject_catalog.sql (NEW - Run this)
```

### Services Created
```
📝 canonical-subject.service.ts (NEW - Core logic)
```

### Files to Update
```
🔄 TeacherRegistrationModal.tsx
🔄 StudentRegistrationForm.tsx
🔄 subject-score-sheet/page.tsx
🔄 CreateCBT.tsx
🔄 school-seeding.ts
🔄 init-school-data/route.ts
```

### Files to Delete
```
❌ nigerian-subjects.ts (DELETE - hardcoded)
```

### APIs to Update
```
🔄 /api/setup/init-school-data
🔄 /api/subject-scores
🔄 /api/cbt/create
```

---

## ACCEPTANCE CRITERIA (Must ALL Be True)

✅ **Database**
- [ ] Old subjects removed/deactivated
- [ ] New subjects inserted (37 per school)
- [ ] No duplicate subjects
- [ ] All levels covered (0-14)
- [ ] Historical data preserved

✅ **Code**
- [ ] No hardcoded subject arrays remain
- [ ] All dropdowns use DB service
- [ ] All APIs use subject_id (UUID)
- [ ] No raw UUIDs in UI

✅ **UI/UX**
- [ ] Subject names display correctly
- [ ] Dropdowns filter by level
- [ ] No errors on page load
- [ ] No "Unknown Subject"
- [ ] No blank/loading forever

✅ **Functionality**
- [ ] Teacher can register with subjects
- [ ] Student can register with subjects
- [ ] Score sheet works
- [ ] CBT works
- [ ] Subject teacher dashboard works
- [ ] Class teacher dashboard works
- [ ] Report cards work

✅ **System-Wide**
- [ ] Works for Frontier School
- [ ] Works for all schools
- [ ] New schools auto-get subjects
- [ ] No per-school configuration needed

---

## CRITICAL REMINDERS

🔴 **DO NOT**:
- Delete student/teacher/result data
- Store subject names in database
- Display raw UUIDs
- Keep hardcoded subject arrays
- Create duplicate subjects
- Run old seed scripts

🟢 **DO**:
- Use CanonicalSubjectService for all subject lookups
- Store subject_id (UUID) in all relationships
- Display subject.name in UI
- Run new idempotent migration
- Delete old hardcoded constants
- Test end-to-end before deployment

---

## TIMELINE

| Step | Task | Time | Status |
|------|------|------|--------|
| 1 | Run migration 048 | 5 min | 👉 START HERE |
| 2 | Update teacher registration | 10 min | After #1 |
| 3 | Update student registration | 10 min | After #1 |
| 4 | Update score sheet | 10 min | After #1 |
| 5 | Update CBT | 10 min | After #1 |
| 6 | Remove hardcoded arrays | 10 min | After #1 |
| 7 | Update APIs | 10 min | After #1 |
| 8 | Test end-to-end | 20 min | After all |
| **TOTAL** | **Hard rebuild complete** | **~85 min** | |

---

## SUPPORT

If any step fails:

1. **Check error message** - Read it carefully
2. **Check migration logs** - Verify subjects were inserted
3. **Verify schema** - Make sure `applicable_to_levels` exists
4. **Check service import** - Make sure service is imported correctly
5. **Test single component** - Update one dropdown first
6. **Check browser console** - Look for fetch/API errors

---

**READY TO START? Run migration 048 first! 🚀**
