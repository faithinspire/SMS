# Score Sheets Foreign Key Migration - Execution Guide

## Overview
This migration updates the `score_sheets.term_id` foreign key constraint to reference the `academic_terms` table instead of the `terms` table, with proper ON DELETE CASCADE handling.

## Quick Summary

| Step | Action | Constraint |
|------|--------|-----------|
| 1 | Check current FK | Identifies what table term_id currently references |
| 2 | Drop old FK | Removes constraint pointing to `terms` table |
| 3 | Add new FK | Creates constraint pointing to `academic_terms` with CASCADE |
| 4 | Verify FK | Confirms new constraint is in place and correct |
| 5 | Success Report | Final validation and status confirmation |

---

## Execution Instructions

### Option A: Execute Full Migration (Recommended)

1. Open **Supabase SQL Editor** for your project
2. Copy the entire contents of `MIGRATE_SCORE_SHEETS_FK.sql`
3. Paste into the Supabase SQL Editor
4. Click **Run** to execute the entire transaction

This will:
- ✅ Check the current foreign key constraint
- ✅ Drop the old constraint (if pointing to `terms`)
- ✅ Add the new constraint (pointing to `academic_terms` with ON DELETE CASCADE)
- ✅ Verify the constraint is correct
- ✅ Display success confirmation with detailed status

---

## Individual SQL Commands (If Needed)

### Command 1: Check Current Foreign Key

```sql
SELECT 
  kcu.constraint_name,
  kcu.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule,
  rc.update_rule
FROM information_schema.key_column_usage kcu
JOIN information_schema.constraint_column_usage ccu 
  ON kcu.constraint_name = ccu.constraint_name 
  AND kcu.table_schema = ccu.table_schema
JOIN information_schema.referential_constraints rc 
  ON kcu.constraint_name = rc.constraint_name
  AND kcu.table_schema = rc.constraint_schema
WHERE kcu.table_name = 'score_sheets' 
  AND kcu.column_name = 'term_id'
  AND kcu.constraint_type = 'FOREIGN KEY';
```

**Expected Output:**
- If currently references `terms` table: `foreign_table_name = 'terms'`
- If already references `academic_terms`: `foreign_table_name = 'academic_terms'`

---

### Command 2: Drop Existing Foreign Key Constraint

```sql
ALTER TABLE score_sheets
DROP CONSTRAINT fk_score_sheets_term_id;
```

**Note:** The constraint name might vary. Replace `fk_score_sheets_term_id` with the actual constraint name from Command 1 output.

---

### Command 3: Add New Foreign Key Constraint

```sql
ALTER TABLE score_sheets
ADD CONSTRAINT fk_score_sheets_term_id_academic_terms
FOREIGN KEY (term_id) 
REFERENCES academic_terms(id) 
ON DELETE CASCADE;
```

**This constraint ensures:**
- ✅ `term_id` can only reference valid `academic_terms.id` values
- ✅ When an academic_term is deleted, all related score_sheets are automatically deleted
- ✅ Data integrity is maintained across the relationship

---

### Command 4: Verify New Constraint

```sql
SELECT 
  kcu.constraint_name,
  kcu.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule,
  rc.update_rule
FROM information_schema.key_column_usage kcu
JOIN information_schema.constraint_column_usage ccu 
  ON kcu.constraint_name = ccu.constraint_name 
  AND kcu.table_schema = ccu.table_schema
JOIN information_schema.referential_constraints rc 
  ON kcu.constraint_name = rc.constraint_name
  AND kcu.table_schema = rc.constraint_schema
WHERE kcu.table_name = 'score_sheets' 
  AND kcu.column_name = 'term_id'
  AND kcu.constraint_type = 'FOREIGN KEY';
```

**Expected Output (After Migration):**
```
constraint_name                        | table_name   | column_name | foreign_table_name | foreign_column_name | delete_rule | update_rule
---------------------------------------|--------------|-------------|-------------------|-------------------|-------------|------------
fk_score_sheets_term_id_academic_terms | score_sheets | term_id     | academic_terms    | id                | CASCADE     | RESTRICT
```

---

### Command 5: Final Success Confirmation

```sql
DO $$
DECLARE
  constraint_exists BOOLEAN;
  references_academic_terms BOOLEAN;
  has_cascade_delete BOOLEAN;
BEGIN
  -- Check if constraint exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.key_column_usage kcu
    WHERE kcu.table_name = 'score_sheets' 
      AND kcu.column_name = 'term_id'
      AND kcu.constraint_type = 'FOREIGN KEY'
  ) INTO constraint_exists;

  -- Check if it references academic_terms
  SELECT EXISTS (
    SELECT 1 FROM information_schema.key_column_usage kcu
    JOIN information_schema.constraint_column_usage ccu 
      ON kcu.constraint_name = ccu.constraint_name
    WHERE kcu.table_name = 'score_sheets' 
      AND kcu.column_name = 'term_id'
      AND kcu.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'academic_terms'
  ) INTO references_academic_terms;

  -- Check if it has ON DELETE CASCADE
  SELECT EXISTS (
    SELECT 1 FROM information_schema.referential_constraints rc
    JOIN information_schema.key_column_usage kcu 
      ON rc.constraint_name = kcu.constraint_name
    WHERE kcu.table_name = 'score_sheets' 
      AND kcu.column_name = 'term_id'
      AND rc.delete_rule = 'CASCADE'
  ) INTO has_cascade_delete;

  RAISE NOTICE '📋 CONSTRAINT STATUS:';
  RAISE NOTICE '  ✓ FK Constraint exists: %', constraint_exists;
  RAISE NOTICE '  ✓ References academic_terms: %', references_academic_terms;
  RAISE NOTICE '  ✓ Has ON DELETE CASCADE: %', has_cascade_delete;
  
  IF constraint_exists AND references_academic_terms AND has_cascade_delete THEN
    RAISE NOTICE '✅ SUCCESS! All requirements met';
  ELSE
    RAISE WARNING '❌ VERIFICATION FAILED!';
  END IF;
END $$;
```

---

## What This Migration Does

### Problem Solved
- ✅ Updates outdated foreign key reference from `terms` → `academic_terms`
- ✅ Ensures proper cascade deletion for data consistency
- ✅ Maintains referential integrity in the database

### Data Safety
- ✅ No data is deleted during this migration
- ✅ Existing score_sheets remain intact
- ✅ Only the constraint relationship is updated

### After Migration
- When an `academic_term` is deleted, all associated `score_sheets` are automatically deleted
- New `score_sheets` can only reference valid `academic_terms` IDs
- Database maintains referential integrity

---

## Troubleshooting

### Issue: "Constraint does not exist" error
**Solution:** The constraint might have a different name. Run Command 1 first to check the actual constraint name.

### Issue: "Cannot drop constraint because it is referenced"
**Solution:** This shouldn't happen, but if it does, check for any views or functions that depend on the constraint.

### Issue: "Foreign key violation" when adding new constraint
**Solution:** There might be `score_sheets.term_id` values that don't exist in `academic_terms`. Run:
```sql
SELECT COUNT(*) as orphaned_records
FROM score_sheets ss
WHERE NOT EXISTS (SELECT 1 FROM academic_terms at WHERE at.id = ss.term_id);
```
If count > 0, these records need to be handled first.

---

## Files Provided

1. **MIGRATE_SCORE_SHEETS_FK.sql** - Complete migration script (run this in Supabase)
2. **MIGRATION_INSTRUCTIONS.md** - This file with detailed instructions and commands

---

## Next Steps After Migration

1. ✅ Verify the constraint is in place (Command 4)
2. ✅ Run application tests to ensure score sheets functionality works
3. ✅ Monitor database logs for any constraint violations
4. ✅ Document the change in your changelog

---

**Status:** Ready to execute
**Last Updated:** 2024
**Target Table:** score_sheets.term_id
**Target Reference:** academic_terms.id
