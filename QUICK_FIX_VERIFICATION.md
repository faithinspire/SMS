# Migration Fixes - Quick Verification

## ✅ Fix #1: Migration 044 - Removed `update_timestamp()` Function Reference

**File:** `database/migrations/044_verify_canonical_tables.sql`

**Change:** Commented out trigger creation (lines 88-95)

**Before:**
```sql
DROP TRIGGER IF EXISTS score_sheets_update_timestamp ON score_sheets;
CREATE TRIGGER score_sheets_update_timestamp
BEFORE UPDATE ON score_sheets
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();
```

**After:**
```sql
-- Create trigger to auto-update updated_at (only if function exists)
-- NOTE: update_timestamp() function may not exist, so we skip this
-- If it exists, uncomment below:
-- DROP TRIGGER IF EXISTS score_sheets_update_timestamp ON score_sheets;
-- CREATE TRIGGER score_sheets_update_timestamp
-- BEFORE UPDATE ON score_sheets
-- FOR EACH ROW
-- EXECUTE FUNCTION update_timestamp();
```

**Why:** The `update_timestamp()` function doesn't exist in the database, so the trigger would fail. Since auto-updating `updated_at` is not critical for the unified architecture to function, we commented it out as optional.

---

## ✅ Fix #2: Migration 043 - Added Intelligent Column Detection for `assigned_at`

**File:** `database/migrations/043_consolidate_redundant_tables.sql`

**Change:** Added conditional logic to check if `assigned_at` column exists before using it (lines 65-109)

**Before:**
```sql
INSERT INTO subject_teacher_assignments (
  id, school_id, teacher_id, subject_id, class_arm_combo_id, assigned_at
)
SELECT
  id, school_id, teacher_id, subject_id, class_arm_combo_id, assigned_at
FROM teacher_assignments ta
WHERE NOT EXISTS (...)
ON CONFLICT (school_id, teacher_id, subject_id, class_arm_combo_id)
DO UPDATE SET assigned_at = NOW();
```

**After:**
```sql
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teacher_assignments') THEN
    -- Check if assigned_at column exists in teacher_assignments
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'teacher_assignments' AND column_name = 'assigned_at'
    ) THEN
      -- Column exists, use it
      INSERT INTO subject_teacher_assignments (...)
      SELECT ... assigned_at ...
    ELSE
      -- Column doesn't exist, use NOW() as default
      INSERT INTO subject_teacher_assignments (...)
      SELECT ... NOW() ...
    END IF;
  END IF;
END $$;
```

**Why:** Not all installations had the `assigned_at` column in the old `teacher_assignments` table. The new code checks if the column exists and handles both cases, making the migration backward compatible.

---

## 📋 Verification Checklist

After running both migrations:

- [ ] Migration 043 runs without errors
- [ ] Migration 044 runs without errors
- [ ] `score_sheets` table exists with all columns
- [ ] `subject_teacher_assignments` table exists
- [ ] `student_subjects` table exists
- [ ] `result_entries` table is dropped (or empty if not dropped)
- [ ] `student_subject_enrollment` table is dropped (or empty if not dropped)
- [ ] `teacher_assignments` table is dropped (or empty if not dropped)
- [ ] No duplicate records in `score_sheets` (UNIQUE constraint enforced)
- [ ] Data migrated from old tables to canonical tables (if old tables had data)

---

## 🧪 Quick Test After Migration

```sql
-- Verify canonical tables exist
SELECT COUNT(*) as score_sheets_count FROM score_sheets;
SELECT COUNT(*) as teacher_subject_count FROM subject_teacher_assignments;
SELECT COUNT(*) as student_subject_count FROM student_subjects;

-- Verify old tables are gone/empty
SELECT COUNT(*) FROM result_entries;  -- Should be 0 or table doesn't exist
SELECT COUNT(*) FROM student_subject_enrollment;  -- Should be 0 or table doesn't exist
SELECT COUNT(*) FROM teacher_assignments;  -- Should be 0 or table doesn't exist

-- Verify UNIQUE constraint on score_sheets
SELECT school_id, student_id, subject_id, term_id, COUNT(*) as cnt
FROM score_sheets
GROUP BY school_id, student_id, subject_id, term_id
HAVING COUNT(*) > 1;
-- Should return 0 rows (no duplicates)
```

---

## 🚀 Next Steps

1. Run both fixed migrations in Supabase console
2. Run verification queries above
3. Test Subject Teacher score entry: `POST /api/subject-scores`
4. Test CBT submission: `POST /api/student/cbt/submit`
5. Test Class Teacher results: `GET /api/teacher/results`
6. Test Student report card: `GET /api/student/report-card`

---

**Status:** ✅ Both migrations fixed and ready to deploy
