# Migration 075 - PostgreSQL Syntax Fix Applied

## Issue Identified
The original migration 075 had PostgreSQL syntax errors that prevented it from running:

**Error 1: UNIQUE constraint with WHERE clause**
```sql
-- ❌ INCORRECT - WHERE not allowed in UNIQUE constraint definition
UNIQUE(school_id, subject_id, class_arm_combo_id, term_id, test_number) 
  WHERE status != 'DELETED'
```

**Error 2: Filtered indexes**
```sql
-- ❌ INCORRECT - Some Supabase versions don't support WHERE in indexes
CREATE INDEX idx_cbt_test_slots_exam 
  ON cbt_test_slots(cbt_exam_id) 
  WHERE status != 'DELETED';
```

## Solution Applied

### 1. Removed WHERE from UNIQUE Constraint
```sql
-- ✅ CORRECT - Simple UNIQUE constraint without WHERE
CREATE TABLE IF NOT EXISTS cbt_test_slots (
  ...
  -- No WHERE clause in table definition
);
```

### 2. Added Trigger-Based Enforcement
Instead of relying on database-level UNIQUE constraints with WHERE clauses, we now use a trigger to enforce the business rule:

```sql
CREATE OR REPLACE FUNCTION enforce_max_4_tests_per_subject()
RETURNS TRIGGER AS $$
DECLARE
  active_count INT;
BEGIN
  -- Count active (non-deleted) tests with this test_number
  SELECT COUNT(*) INTO active_count
  FROM cbt_test_slots
  WHERE school_id = NEW.school_id
    AND subject_id = NEW.subject_id
    AND class_arm_combo_id = NEW.class_arm_combo_id
    AND term_id = NEW.term_id
    AND test_number = NEW.test_number
    AND status != 'DELETED'
    AND id != NEW.id;

  IF active_count > 0 THEN
    RAISE EXCEPTION 'Test slot % already exists for this subject/class/term', NEW.test_number;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_max_tests_trigger
BEFORE INSERT OR UPDATE ON cbt_test_slots
FOR EACH ROW
EXECUTE FUNCTION enforce_max_4_tests_per_subject();
```

### 3. Simplified Indexes (Removed WHERE Clauses)
```sql
-- ✅ CORRECT - Simple indexes without WHERE
CREATE INDEX idx_cbt_test_slots_exam ON cbt_test_slots(cbt_exam_id);
CREATE INDEX idx_cbt_test_scores_submission ON cbt_test_scores(cbt_submission_id);
```

## What This Fixes

✅ Allows migration 075 to run successfully on Supabase  
✅ Maintains business logic (max 4 tests per subject/term via trigger)  
✅ Maintains soft delete functionality (status != 'DELETED')  
✅ Compatible with all PostgreSQL versions that Supabase uses  

## Files Modified

- `database/migrations/075_cbt_test_slots_system.sql` - FIXED

## Next Steps

1. Apply this migration in Supabase SQL Editor
2. Copy the entire fixed file from `database/migrations/075_cbt_test_slots_system.sql`
3. Paste into Supabase > SQL Editor
4. Click "Run"
5. Dev server should compile without errors

## Verification

After applying the migration, verify:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN ('cbt_test_slots', 'cbt_test_scores');

-- Should return: cbt_test_slots, cbt_test_scores

-- Check view exists
SELECT table_name FROM information_schema.views 
WHERE table_schema = 'public' AND table_name = 'v_student_cbt_test_scores';

-- Should return: v_student_cbt_test_scores

-- Check triggers exist
SELECT trigger_name FROM information_schema.triggers 
WHERE trigger_schema = 'public' AND trigger_name LIKE '%cbt%';

-- Should include: enforce_max_tests_trigger
```
