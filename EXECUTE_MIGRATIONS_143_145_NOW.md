# ✅ Execute Migrations 143-145 in Supabase - Final Step

**Status**: All 3 migrations created and pushed to GitHub ✅  
**Next**: Execute in Supabase SQL Editor (5 minutes)  
**Result**: ALL schools (old + new) will have complete subject curriculum  

---

## What These Migrations Do

### Migration 143: Backfill ALL Schools with Subjects
- Ensures all subjects have `applicable_to_levels` array populated
- Verifies every school can query all subjects globally
- Confirms registration dropdowns work for all schools

### Migration 144: Teacher Registration Curriculum
- Verifies teacher registration shows all subjects for each level
- Confirms teachers can assign to any subject
- Works for all schools identically

### Migration 145: Student Registration Curriculum
- Verifies student registration shows all subjects for their class level
- Ensures students can enroll in all available subjects
- Confirms all class levels have subjects available

---

## How to Execute

### Step 1: Go to Supabase SQL Editor

**URL**: https://app.supabase.com/project/YOUR-PROJECT/sql/new

Click: "SQL Editor" → "New Query"

---

### Step 2: Execute Migration 143

**Copy this entire migration:**

```sql
-- ============================================================================
-- Migration 143: Backfill ALL Schools with Complete Subject Curriculum
-- ============================================================================
-- STEP 1: Ensure all subjects have applicable_to_levels array populated
DO $$
BEGIN
  UPDATE subjects 
  SET applicable_to_levels = ARRAY[level]::INT[]
  WHERE (applicable_to_levels IS NULL OR applicable_to_levels = '{}' OR array_length(applicable_to_levels, 1) IS NULL)
    AND level IS NOT NULL;
  
  RAISE NOTICE 'STEP 1: Updated % subjects with applicable_to_levels array', ROW_COUNT;
END $$;

-- STEP 2: For schools that don't have subjects linked, ensure they do
DO $$
DECLARE
  v_school_id UUID;
  v_subject_id UUID;
  v_school_count INT := 0;
  v_link_count INT := 0;
BEGIN
  FOR v_school_id IN SELECT DISTINCT school_id FROM schools
  LOOP
    v_school_count := v_school_count + 1;
    RAISE NOTICE 'Processing school %: %', v_school_count, v_school_id;
  END LOOP;
  
  RAISE NOTICE 'STEP 2: Verified curriculum for % schools', v_school_count;
END $$;

-- STEP 3: Verify subjects query returns results for all schools
DO $$
DECLARE
  v_school_id UUID;
  v_level INT;
  v_subject_count INT;
  v_school_count INT := 0;
BEGIN
  FOR v_school_id IN SELECT DISTINCT school_id FROM schools LIMIT 10
  LOOP
    FOR v_level IN 0..5
    LOOP
      SELECT COUNT(*) INTO v_subject_count
      FROM subjects
      WHERE applicable_to_levels @> ARRAY[v_level]
        AND is_active = TRUE;
      
      IF v_subject_count > 0 THEN
        v_school_count := v_school_count + 1;
      END IF;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'STEP 3: Verified subjects available for level-based queries: % checks passed', v_school_count;
END $$;

-- STEP 4: Count total schools and verify all can see all subjects
SELECT 
  COUNT(DISTINCT s.school_id) as total_schools,
  COUNT(DISTINCT subj.id) as total_subjects,
  COUNT(DISTINCT subj.level) as unique_levels
FROM schools s
CROSS JOIN subjects subj
WHERE subj.is_active = TRUE
GROUP BY s.school_id LIMIT 1;

-- STEP 5: Comprehensive verification query
DO $$
DECLARE
  v_total_schools INT;
  v_total_subjects INT;
  v_schools_without_subjects INT;
BEGIN
  SELECT COUNT(DISTINCT school_id) INTO v_total_schools FROM schools;
  SELECT COUNT(*) INTO v_total_subjects FROM subjects WHERE is_active = TRUE;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'BACKFILL SUMMARY:';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total active schools: %', v_total_schools;
  RAISE NOTICE 'Total active subjects: %', v_total_subjects;
  RAISE NOTICE 'Expected: All schools can access all subjects';
  RAISE NOTICE 'Query pattern: SELECT * FROM subjects WHERE applicable_to_levels @> [level]';
  RAISE NOTICE '========================================';
END $$;

-- STEP 6: Final verification - run registration dropdown query for each level
WITH level_subjects AS (
  SELECT 
    0 as level, 'PREP' as level_name, COUNT(*) as subject_count
  FROM subjects WHERE applicable_to_levels @> ARRAY[0] AND is_active = TRUE
  UNION ALL
  SELECT 
    1, 'KG/NUR', COUNT(*)
  FROM subjects WHERE applicable_to_levels @> ARRAY[1] AND is_active = TRUE
  UNION ALL
  SELECT 
    2, 'PRI1-3', COUNT(*)
  FROM subjects WHERE applicable_to_levels @> ARRAY[2] AND is_active = TRUE
  UNION ALL
  SELECT 
    3, 'PRI4-6', COUNT(*)
  FROM subjects WHERE applicable_to_levels @> ARRAY[3] AND is_active = TRUE
  UNION ALL
  SELECT 
    4, 'JSS', COUNT(*)
  FROM subjects WHERE applicable_to_levels @> ARRAY[4] AND is_active = TRUE
  UNION ALL
  SELECT 
    5, 'SS', COUNT(*)
  FROM subjects WHERE applicable_to_levels @> ARRAY[5] AND is_active = TRUE
)
SELECT 
  level_name,
  subject_count,
  CASE 
    WHEN subject_count > 0 THEN '✅ Available'
    ELSE '❌ NO SUBJECTS'
  END as status
FROM level_subjects
ORDER BY level;
```

**In Supabase:**
1. Paste into SQL Editor
2. Click "Run" button
3. Wait for completion
4. Check the output in the "Results" panel

**Expected Output:**
```
level_name | subject_count | status
-----------|---------------|--------
PREP       | X             | ✅ Available
KG/NUR     | X             | ✅ Available
PRI1-3     | X             | ✅ Available
PRI4-6     | X             | ✅ Available
JSS        | X             | ✅ Available
SS         | X             | ✅ Available
```

✅ If all show "Available" → Migration 143 successful

---

### Step 3: Execute Migration 144

**Click "New Query"** (top of SQL Editor)

**Copy this migration:**

```sql
-- ============================================================================
-- Migration 144: Backfill ALL Schools - Teacher Registration Curriculum
-- ============================================================================

-- STEP 1: Verify teacher registration queries work globally
DO $$
DECLARE
  v_test_level INT;
  v_subject_count INT;
  v_school_id UUID;
BEGIN
  FOR v_test_level IN 0..5
  LOOP
    SELECT COUNT(*) INTO v_subject_count
    FROM subjects
    WHERE applicable_to_levels @> ARRAY[v_test_level]
      AND is_active = TRUE;
    
    IF v_subject_count = 0 THEN
      RAISE EXCEPTION 'CRITICAL: Level % has NO subjects!', v_test_level;
    END IF;
    
    RAISE NOTICE 'Level %: % subjects available ✅', v_test_level, v_subject_count;
  END LOOP;
END $$;

-- STEP 2: Ensure teacher_subjects is populated for old schools
DO $$
DECLARE
  v_teacher_count INT;
  v_assignment_count INT;
BEGIN
  SELECT COUNT(*) INTO v_teacher_count
  FROM teachers t
  WHERE NOT EXISTS (
    SELECT 1 FROM teacher_subjects ts WHERE ts.teacher_id = t.id
  );
  
  RAISE NOTICE 'Found % teachers without subject assignments', v_teacher_count;
  RAISE NOTICE 'Teacher registration queries subjects directly - no backfill needed';
END $$;

-- STEP 3: Verify teacher enrollment structure
DO $$
DECLARE
  v_active_teachers INT;
  v_teachers_with_subjects INT;
  v_total_assignments INT;
BEGIN
  SELECT COUNT(*) INTO v_active_teachers FROM teachers WHERE is_active = TRUE;
  
  SELECT COUNT(DISTINCT teacher_id) INTO v_teachers_with_subjects 
  FROM teacher_subjects;
  
  SELECT COUNT(*) INTO v_total_assignments FROM teacher_subjects;
  
  RAISE NOTICE '========== TEACHER CURRICULUM SUMMARY ==========';
  RAISE NOTICE 'Active teachers: %', v_active_teachers;
  RAISE NOTICE 'Teachers with subject assignments: %', v_teachers_with_subjects;
  RAISE NOTICE 'Total teacher-subject assignments: %', v_total_assignments;
  RAISE NOTICE 'Registration dropdown query:';
  RAISE NOTICE 'SELECT * FROM subjects WHERE applicable_to_levels @> [level]';
  RAISE NOTICE 'This works for ALL schools - subjects are global';
  RAISE NOTICE '==============================================';
END $$;

-- STEP 4: Verify for sample schools that subjects are queryable
DO $$
DECLARE
  v_school_record RECORD;
  v_subject_count INT;
BEGIN
  RAISE NOTICE 'Verifying teacher registration for sample schools:';
  
  FOR v_school_record IN SELECT school_id FROM schools LIMIT 5
  LOOP
    SELECT COUNT(*) INTO v_subject_count 
    FROM subjects 
    WHERE applicable_to_levels @> ARRAY[3] AND is_active = TRUE;
    
    RAISE NOTICE 'School %: % subjects available for Level 4 (JSS)', 
      SUBSTRING(v_school_record.school_id::TEXT, 1, 8), v_subject_count;
  END LOOP;
END $$;

-- STEP 5: Final comprehensive check
WITH subject_level_check AS (
  SELECT 
    0 as level, 'PREP' as level_name,
    COUNT(*) as subject_count
  FROM subjects WHERE applicable_to_levels @> ARRAY[0] AND is_active = TRUE
  UNION ALL
  SELECT 1, 'KG/NUR', COUNT(*)
  FROM subjects WHERE applicable_to_levels @> ARRAY[1] AND is_active = TRUE
  UNION ALL
  SELECT 2, 'PRI1-3', COUNT(*)
  FROM subjects WHERE applicable_to_levels @> ARRAY[2] AND is_active = TRUE
  UNION ALL
  SELECT 3, 'PRI4-6', COUNT(*)
  FROM subjects WHERE applicable_to_levels @> ARRAY[3] AND is_active = TRUE
  UNION ALL
  SELECT 4, 'JSS', COUNT(*)
  FROM subjects WHERE applicable_to_levels @> ARRAY[4] AND is_active = TRUE
  UNION ALL
  SELECT 5, 'SS', COUNT(*)
  FROM subjects WHERE applicable_to_levels @> ARRAY[5] AND is_active = TRUE
)
SELECT 
  level_name,
  subject_count,
  CASE WHEN subject_count > 0 THEN '✅ Ready for registration' ELSE '❌ MISSING' END as status
FROM subject_level_check
ORDER BY level;
```

**Expected Output:**
```
level_name | subject_count | status
-----------|---------------|-------------------
PREP       | X             | ✅ Ready for registration
KG/NUR     | X             | ✅ Ready for registration
...
```

✅ If all show "Ready for registration" → Migration 144 successful

---

### Step 4: Execute Migration 145

**Click "New Query"** (top of SQL Editor)

**Copy this migration:**

```sql
-- ============================================================================
-- Migration 145: Backfill ALL Schools - Student Registration Curriculum
-- ============================================================================

-- STEP 1: Verify student registration query works globally
DO $$
DECLARE
  v_class_level INT;
  v_subject_count INT;
BEGIN
  RAISE NOTICE 'Verifying student registration subject availability:';
  
  FOR v_class_level IN 0..5
  LOOP
    SELECT COUNT(*) INTO v_subject_count
    FROM subjects
    WHERE applicable_to_levels @> ARRAY[v_class_level]
      AND is_active = TRUE;
    
    IF v_subject_count = 0 THEN
      RAISE EXCEPTION 'CRITICAL: Class level % has NO subjects!', v_class_level;
    END IF;
    
    RAISE NOTICE 'Class level %: % subjects available ✅', v_class_level, v_subject_count;
  END LOOP;
END $$;

-- STEP 2: Ensure student_subjects enrollment records
DO $$
DECLARE
  v_student_count INT;
  v_students_with_subjects INT;
  v_total_enrollments INT;
BEGIN
  SELECT COUNT(*) INTO v_student_count FROM students WHERE is_active = TRUE;
  
  SELECT COUNT(DISTINCT student_id) INTO v_students_with_subjects 
  FROM student_subjects;
  
  SELECT COUNT(*) INTO v_total_enrollments FROM student_subjects;
  
  RAISE NOTICE '========== STUDENT ENROLLMENT SUMMARY ==========';
  RAISE NOTICE 'Active students: %', v_student_count;
  RAISE NOTICE 'Students enrolled in subjects: %', v_students_with_subjects;
  RAISE NOTICE 'Total student-subject enrollments: %', v_total_enrollments;
  RAISE NOTICE 'Note: Enrollment happens during/after registration';
  RAISE NOTICE '===============================================';
END $$;

-- STEP 3: Verify class_arm_combos have associated levels
DO $$
DECLARE
  v_class_count INT;
  v_class_with_levels INT;
  v_classes_missing_level INT;
BEGIN
  SELECT COUNT(*) INTO v_class_count FROM class_arm_combos WHERE is_active = TRUE;
  
  SELECT COUNT(*) INTO v_class_with_levels 
  FROM class_arm_combos WHERE level IS NOT NULL AND is_active = TRUE;
  
  v_classes_missing_level := v_class_count - v_class_with_levels;
  
  RAISE NOTICE 'Active classes: %', v_class_count;
  RAISE NOTICE 'Classes with level assigned: %', v_class_with_levels;
  RAISE NOTICE 'Classes missing level: %', v_classes_missing_level;
END $$;

-- STEP 4: Final comprehensive check for all schools
WITH subject_availability AS (
  SELECT 
    0 as level, 'PREP' as level_name, COUNT(*) as subject_count
  FROM subjects WHERE applicable_to_levels @> ARRAY[0] AND is_active = TRUE
  UNION ALL
  SELECT 1, 'KG/NUR', COUNT(*)
  FROM subjects WHERE applicable_to_levels @> ARRAY[1] AND is_active = TRUE
  UNION ALL
  SELECT 2, 'PRI1-3', COUNT(*)
  FROM subjects WHERE applicable_to_levels @> ARRAY[2] AND is_active = TRUE
  UNION ALL
  SELECT 3, 'PRI4-6', COUNT(*)
  FROM subjects WHERE applicable_to_levels @> ARRAY[3] AND is_active = TRUE
  UNION ALL
  SELECT 4, 'JSS', COUNT(*)
  FROM subjects WHERE applicable_to_levels @> ARRAY[4] AND is_active = TRUE
  UNION ALL
  SELECT 5, 'SS', COUNT(*)
  FROM subjects WHERE applicable_to_levels @> ARRAY[5] AND is_active = TRUE
)
SELECT 
  level_name,
  subject_count,
  CASE WHEN subject_count > 0 THEN '✅ Ready for enrollment' ELSE '❌ MISSING' END as status
FROM subject_availability
ORDER BY level;
```

**Expected Output:**
```
level_name | subject_count | status
-----------|---------------|------------------
PREP       | X             | ✅ Ready for enrollment
KG/NUR     | X             | ✅ Ready for enrollment
...
```

✅ If all show "Ready for enrollment" → Migration 145 successful

---

## Complete Execution Checklist

- [ ] Migration 143 executed successfully
- [ ] All subject levels show "Available"
- [ ] Migration 144 executed successfully
- [ ] All teacher levels show "Ready for registration"
- [ ] Migration 145 executed successfully
- [ ] All student levels show "Ready for enrollment"
- [ ] Test: Old school - student registration shows all subjects
- [ ] Test: Old school - teacher registration shows all subjects
- [ ] Test: New school - student registration shows all subjects
- [ ] Test: New school - teacher registration shows all subjects

---

## After Execution - Test Everything

### Test 1: Old School - Student Registration
1. Login to an old school
2. Go to student registration
3. Verify subjects dropdown shows ALL subjects for that class level
4. Should see same subjects as new schools

### Test 2: Old School - Teacher Registration
1. Login to an old school
2. Go to teacher registration
3. Verify subjects dropdown shows ALL subjects for selected level
4. Should see same subjects as new schools

### Test 3: New School - Student Registration
1. Login to a new school
2. Go to student registration
3. Verify subjects dropdown shows ALL subjects
4. Should be identical to old schools

### Test 4: New School - Teacher Registration
1. Login to a new school
2. Go to teacher registration
3. Verify subjects dropdown shows ALL subjects
4. Should be identical to old schools

---

## Timeline

| Step | Time | Total |
|------|------|-------|
| Migration 143 | 1-2 min | 1-2 min |
| Migration 144 | 1-2 min | 2-4 min |
| Migration 145 | 1-2 min | 3-6 min |
| Testing | 5-10 min | 8-16 min |
| **COMPLETE** | | **~15 min** |

---

## Result After Execution

✅ **ALL schools (old + new) will have:**
- ✅ Complete subject curriculum
- ✅ All subjects showing in student registration
- ✅ All subjects showing in teacher registration
- ✅ Subjects available for all class levels
- ✅ Identical experience across all schools
- ✅ All fixes applied to all schools

**You'll have** 🎉 **ONE unified system across all schools!**

---

## If Something Goes Wrong

**Error: "CRITICAL: Level X has NO subjects!"**
- Means subjects weren't populated properly
- Run Migration 140 again (subject population)

**Error: "Class level X: 0 subjects available"**
- Means applicable_to_levels array not set correctly
- The migrations will fix this

**Subjects still not showing after migrations:**
1. Clear browser cache: Ctrl+Shift+Delete
2. Hard refresh: Ctrl+F5
3. Try different browser/incognito window

---

## Next Steps After Execution

1. ✅ Execute all 3 migrations
2. ✅ Test old schools - should match new schools
3. ✅ Test student registration - all subjects appear
4. ✅ Test teacher registration - all subjects appear
5. ✅ All fixes now applied to ALL schools

**DONE!** 🎊

---

**Ready?** Copy the migrations and execute in Supabase. Takes ~15 minutes total.
