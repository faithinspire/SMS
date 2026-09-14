# Duplicate Subject Prevention and Cleanup

## Overview

This document explains the mechanisms in place to prevent duplicate subjects and provides cleanup procedures if duplicates are found.

## Duplicate Scenarios

### Scenario 1: Duplicate Subject Records in `subjects` Table

**Definition**: Two or more subject records with same name, code, and school_id
**Cause**: Multiple migrations running or manual data insertion
**Impact**: Dropdown shows same subject twice, confusion in UI
**Prevention**: Database UNIQUE constraint

### Scenario 2: Duplicate Student Subject Enrollments

**Definition**: Same student enrolled in same subject multiple times
**Cause**: Accidental re-submission or multiple registration attempts
**Impact**: Subject appears in student's list multiple times
**Prevention**: Database UNIQUE constraint

### Scenario 3: Duplicate Teacher Subject Assignments

**Definition**: Teacher assigned to same subject in same class multiple times
**Cause**: Multiple teacher registrations or accidental re-assignment
**Impact**: Subject appears multiple times in teacher's assignment list
**Prevention**: Database UNIQUE constraint

### Scenario 4: Duplicate Levels in `applicable_to_levels`

**Definition**: Same level appears twice in applicable_to_levels array
**Cause**: Manual array manipulation or buggy migration
**Impact**: Filtering may behave unexpectedly
**Prevention**: Not prevented at database level (requires application logic)

## Prevention Mechanisms

### 1. Database UNIQUE Constraints

#### subjects table
```sql
UNIQUE(school_id, name)
-- Prevents duplicate subject names within same school
```

**What it prevents**:
- ✅ Two subjects with name="English Language" and same school_id

**What it doesn't prevent**:
- ❌ Same subject name in different schools (allowed)
- ❌ Same subject with different names (e.g., "English" vs "English Language")

#### student_subjects table
```sql
UNIQUE(student_id, subject_id)
-- Prevents same student from enrolling in same subject twice
```

**What it prevents**:
- ✅ Student 123 enrolled in Subject ABC twice

**Implementation**:
```sql
CREATE TABLE student_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, subject_id)  -- ✅ Prevents duplicates
);
```

#### subject_teacher_assignments table
```sql
UNIQUE(school_id, subject_id, class_arm_combo_id, teacher_id)
-- Prevents teacher from being assigned same subject in same class twice
```

**Implementation**:
```sql
CREATE TABLE subject_teacher_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_arm_combo_id UUID NOT NULL REFERENCES class_arm_combos(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, subject_id, class_arm_combo_id, teacher_id)  -- ✅ Prevents duplicates
);
```

### 2. Migration Safety: INSERT ... ON CONFLICT DO UPDATE

Migration 107 uses safe upsert pattern:

```sql
INSERT INTO subjects (school_id, name, code, applicable_to_levels, ...)
SELECT s.id, 'English Language', 'ENG', ARRAY[...], ...
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE school_id = s.id 
    AND name = 'English Language' 
    AND applicable_to_levels @> ARRAY[0]
)
ON CONFLICT (school_id, name) DO UPDATE 
SET applicable_to_levels = ARRAY[...];
```

**What it does**:
- ✅ Checks if subject already exists (NOT EXISTS clause)
- ✅ If exists, updates it (ON CONFLICT DO UPDATE)
- ✅ If not exists, inserts it
- ✅ Idempotent: safe to run multiple times

**Result**: No duplicates created even if migration runs twice

### 3. Application-Level Validation

#### StudentRegistrationModal.tsx
```typescript
// Verify no duplicate subjects selected
const toggleSubject = (subjectId: string) => {
  setSelectedSubjects(prev =>
    prev.includes(subjectId)
      ? prev.filter(id => id !== subjectId)
      : [...prev, subjectId]  // Only added if not already in array
  )
}

// Verify at least one subject selected
if (selectedSubjects.length === 0) {
  setError('Please select at least one subject')
  return
}
```

**What it prevents**:
- ✅ User can't select same subject twice in UI
- ✅ Form won't submit without at least one subject

#### TeacherRegistrationModal.tsx
```typescript
const toggleSubject = (subjectId: string) => {
  setSelectedSubjects(prev =>
    prev.includes(subjectId)
      ? prev.filter(id => id !== subjectId)
      : [...prev, subjectId]  // Only added if not already in array
  )
}
```

**What it prevents**:
- ✅ Teacher can't select same subject twice in UI

### 4. Verification Before Insert

#### StudentRegistrationModal.tsx
```typescript
// Verify all subject IDs are valid before insert
const selectedSubjects: string[] = [...]  // User selected
const enrollments = selectedSubjects.map(subjectId => ({
  student_id: studentId,
  subject_id: subjectId,
  school_id: schoolId,
  created_at: new Date().toISOString(),
}))

const { error: enrollError } = await supabase
  .from('student_subjects')
  .insert(enrollments)
```

**What it does**:
- ✅ Supabase validates all subject_id values exist (foreign key)
- ✅ Supabase enforces UNIQUE(student_id, subject_id)
- ❌ If duplicate slips through, insert fails with error message

#### TeacherService.assignSubjectsToTeacher()
```typescript
const assignments = subjectIds.map((subjectId) => ({
  teacher_id: userId,
  subject_id: subjectId,
  class_arm_combo_id: comboId,
  school_id: school_id,
  created_at: new Date().toISOString(),
}))

const { error } = await supabase
  .from('subject_teacher_assignments')
  .insert(assignments)

if (error) {
  console.error('❌ Subject assignment error:', error)
  throw error
}
```

**What it does**:
- ✅ Supabase validates all IDs exist (foreign keys)
- ✅ Supabase enforces UNIQUE constraint
- ✅ Returns error if duplicate found

## Duplicate Detection Queries

### Query 1: Duplicate Subjects in Same School

```sql
SELECT 
  school_id,
  name,
  COUNT(*) as count,
  ARRAY_AGG(id) as subject_ids
FROM subjects
GROUP BY school_id, name
HAVING COUNT(*) > 1
ORDER BY school_id, name;
```

**Expected Result**: No rows (0 duplicates)

**If duplicates found**:
```
school_id | name | count | subject_ids
-----------|------|-------|-------------
abc-123 | English Language | 2 | {uuid1, uuid2}
```

### Query 2: Duplicate Student Subject Enrollments

```sql
SELECT 
  student_id,
  subject_id,
  COUNT(*) as count
FROM student_subjects
GROUP BY student_id, subject_id
HAVING COUNT(*) > 1;
```

**Expected Result**: No rows (0 duplicates)

### Query 3: Duplicate Teacher Assignments

```sql
SELECT 
  teacher_id,
  subject_id,
  class_arm_combo_id,
  COUNT(*) as count
FROM subject_teacher_assignments
GROUP BY teacher_id, subject_id, class_arm_combo_id
HAVING COUNT(*) > 1;
```

**Expected Result**: No rows (0 duplicates)

### Query 4: Duplicate Levels in applicable_to_levels Array

```sql
SELECT 
  id,
  name,
  applicable_to_levels,
  ARRAY_LENGTH(applicable_to_levels, 1) as array_length,
  ARRAY_LENGTH(ARRAY(SELECT DISTINCT UNNEST(applicable_to_levels)), 1) as unique_length
FROM subjects
WHERE ARRAY_LENGTH(applicable_to_levels, 1) != 
      ARRAY_LENGTH(ARRAY(SELECT DISTINCT UNNEST(applicable_to_levels)), 1);
```

**Expected Result**: No rows (no duplicate levels within arrays)

## Duplicate Cleanup Procedures

### If Duplicates Found: Subjects Table

**Step 1: Identify duplicates**
```sql
SELECT 
  school_id,
  name,
  ARRAY_AGG(id) as ids,
  COUNT(*) as count
FROM subjects
GROUP BY school_id, name
HAVING COUNT(*) > 1;
```

**Step 2: Keep only the first, delete others**
```sql
DELETE FROM subjects
WHERE id NOT IN (
  SELECT DISTINCT ON (school_id, name) id
  FROM subjects
  ORDER BY school_id, name, created_at ASC
);
```

**Explanation**:
- Uses `DISTINCT ON` to select first occurrence per (school_id, name)
- Deletes all others via NOT IN
- Assumes first created is the "canonical" one

**Verify**:
```sql
SELECT COUNT(*) FROM subjects
GROUP BY school_id, name
HAVING COUNT(*) > 1;
-- Should return: (no rows)
```

### If Duplicates Found: student_subjects Table

**Step 1: Identify duplicates**
```sql
SELECT 
  student_id,
  subject_id,
  ARRAY_AGG(id) as ids,
  COUNT(*) as count
FROM student_subjects
GROUP BY student_id, subject_id
HAVING COUNT(*) > 1;
```

**Step 2: Keep only the first, delete others**
```sql
DELETE FROM student_subjects
WHERE id NOT IN (
  SELECT DISTINCT ON (student_id, subject_id) id
  FROM student_subjects
  ORDER BY student_id, subject_id, created_at ASC
);
```

**Verify**:
```sql
SELECT COUNT(*)
FROM student_subjects
GROUP BY student_id, subject_id
HAVING COUNT(*) > 1;
-- Should return: (no rows)
```

### If Duplicates Found: subject_teacher_assignments Table

**Step 1: Identify duplicates**
```sql
SELECT 
  teacher_id,
  subject_id,
  class_arm_combo_id,
  ARRAY_AGG(id) as ids,
  COUNT(*) as count
FROM subject_teacher_assignments
GROUP BY teacher_id, subject_id, class_arm_combo_id
HAVING COUNT(*) > 1;
```

**Step 2: Keep only the first, delete others**
```sql
DELETE FROM subject_teacher_assignments
WHERE id NOT IN (
  SELECT DISTINCT ON (teacher_id, subject_id, class_arm_combo_id) id
  FROM subject_teacher_assignments
  ORDER BY teacher_id, subject_id, class_arm_combo_id, created_at ASC
);
```

**Verify**:
```sql
SELECT COUNT(*)
FROM subject_teacher_assignments
GROUP BY teacher_id, subject_id, class_arm_combo_id
HAVING COUNT(*) > 1;
-- Should return: (no rows)
```

## Test Cases for Duplicate Prevention

### Test D1: Cannot Create Duplicate Subject via UI

**Objective**: Verify UI prevents selecting same subject twice
**Steps**:
1. Go to Student Registration
2. In Step 4, try to click same subject checkbox twice
3. Verify it's either:
   - Unchecked on second click (toggle behavior)
   - Already checked and can't be clicked again (disabled)

**Expected**: Toggle behavior (click = select, click again = deselect)

**Result**: [ ] PASS [ ] FAIL

---

### Test D2: Cannot Create Duplicate Enrollment via API

**Objective**: Verify database prevents duplicate student_subjects
**Steps**:
1. Register student with subjects: English, Math, Science
2. Manually try to insert duplicate:
   ```sql
   INSERT INTO student_subjects (student_id, subject_id, school_id)
   VALUES ('STUDENT_ID', 'ENGLISH_SUBJECT_ID', 'SCHOOL_ID');
   INSERT INTO student_subjects (student_id, subject_id, school_id)
   VALUES ('STUDENT_ID', 'ENGLISH_SUBJECT_ID', 'SCHOOL_ID');
   ```

**Expected**: Second insert fails with UNIQUE constraint error

**Actual Error**:
```
ERROR: duplicate key value violates unique constraint "student_subjects_student_id_subject_id_key"
```

**Result**: [ ] PASS (constraint works) [ ] FAIL

---

### Test D3: Cannot Create Duplicate Teacher Assignment via API

**Objective**: Verify database prevents duplicate teacher_subject_assignments
**Steps**:
1. Register teacher with subjects
2. Manually try to insert duplicate assignment:
   ```sql
   INSERT INTO subject_teacher_assignments 
     (school_id, subject_id, class_arm_combo_id, teacher_id)
   VALUES ('SCHOOL_ID', 'SUBJECT_ID', 'COMBO_ID', 'TEACHER_ID');
   INSERT INTO subject_teacher_assignments 
     (school_id, subject_id, class_arm_combo_id, teacher_id)
   VALUES ('SCHOOL_ID', 'SUBJECT_ID', 'COMBO_ID', 'TEACHER_ID');
   ```

**Expected**: Second insert fails with UNIQUE constraint error

**Result**: [ ] PASS (constraint works) [ ] FAIL

---

### Test D4: Migration 107 Idempotent

**Objective**: Verify running migration 107 twice doesn't create duplicates
**Steps**:
1. Run migration 107 in Supabase (Step 1)
2. Count subjects:
   ```sql
   SELECT COUNT(*) FROM subjects WHERE school_id = 'TEST_SCHOOL_ID';
   -- Result: 45
   ```
3. Run migration 107 again (paste and execute again)
4. Count subjects again:
   ```sql
   SELECT COUNT(*) FROM subjects WHERE school_id = 'TEST_SCHOOL_ID';
   -- Result: Should still be 45 (not 90)
   ```

**Expected**: Same subject count before and after re-running

**Result**: [ ] PASS (idempotent) [ ] FAIL

---

### Test D5: No Duplicate Levels in applicable_to_levels Array

**Objective**: Verify no subject has duplicate levels in array
**Steps**:
1. Query for duplicates:
   ```sql
   SELECT * FROM subjects
   WHERE ARRAY_LENGTH(applicable_to_levels, 1) != 
         ARRAY_LENGTH(ARRAY(SELECT DISTINCT UNNEST(applicable_to_levels)), 1);
   ```

**Expected**: No rows (all arrays have unique levels)

**Result**: [ ] PASS [ ] FAIL

---

## Summary Table

| Duplicate Type | Prevention | Detection | Cleanup |
|---|---|---|---|
| Subjects (same name) | UNIQUE(school_id, name) | Query 1 | Delete duplicates query |
| Student enrollments | UNIQUE(student_id, subject_id) | Query 2 | Delete duplicates query |
| Teacher assignments | UNIQUE(..., teacher_id, subject_id, ...) | Query 3 | Delete duplicates query |
| Levels in array | Application logic | Query 4 | Re-run migration 107 |

## Verification Checklist

After migration 107 execution and code deployment:

- [ ] Run Query 1: No subject duplicates
- [ ] Run Query 2: No student enrollment duplicates
- [ ] Run Query 3: No teacher assignment duplicates
- [ ] Run Query 4: No duplicate levels in arrays
- [ ] Run Test D1: UI toggle works
- [ ] Run Test D2: Database rejects duplicate enrollments
- [ ] Run Test D3: Database rejects duplicate assignments
- [ ] Run Test D4: Migration is idempotent
- [ ] Run Test D5: No level duplicates in arrays

**Overall Status**: [ ] All checks passed [ ] Some checks failed

## Rollback if Duplicates Found

If duplicates are discovered:

1. **Do NOT delete yet** - verify which is the correct record
2. **Run cleanup query** with WHERE conditions to identify the records to keep
3. **Test the query** first (wrap in transaction):
   ```sql
   BEGIN;
   -- Run cleanup query (see above)
   -- Verify row count affected
   ROLLBACK;  -- Don't commit yet
   ```
4. **If correct**, run again with COMMIT:
   ```sql
   BEGIN;
   -- Run cleanup query
   COMMIT;
   ```

## Recommendations

✅ **Current system is well-protected**:
- Database UNIQUE constraints prevent duplicates at storage layer
- Application validation prevents duplicates at UI layer
- Migration uses safe INSERT ... ON CONFLICT DO UPDATE pattern
- All inserts are append-only (no updates that could duplicate levels)

⚠️ **Optional enhancements**:
- Add de-duplication logic to applicable_to_levels arrays (though not necessary currently)
- Add audit log for all subject creation/updates
- Add admin dashboard view showing duplicate subjects (for manual review)

✅ **No immediate action needed** - system is designed well

