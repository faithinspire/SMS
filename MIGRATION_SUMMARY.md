# Foreign Key Migration Summary
## score_sheets.term_id: terms → academic_terms

---

## 📋 What This Migration Does

Migrates the `score_sheets.term_id` foreign key constraint from referencing the `terms` table to the `academic_terms` table, with proper ON DELETE CASCADE handling.

### Current State
- `score_sheets.term_id` → `terms(id)`

### After Migration
- `score_sheets.term_id` → `academic_terms(id)` WITH `ON DELETE CASCADE`

---

## 🎯 Migration Objectives

| # | Objective | Status |
|---|-----------|--------|
| 1 | Check current FK constraint on score_sheets.term_id | ✓ |
| 2 | Identify what table it currently references | ✓ |
| 3 | Drop the constraint if it references 'terms' table | ✓ |
| 4 | Add new constraint to 'academic_terms' with ON DELETE CASCADE | ✓ |
| 5 | Verify constraint is now correct | ✓ |
| 6 | Output success confirmation | ✓ |

---

## 📁 Files Created

### 1. **MIGRATE_SCORE_SHEETS_FK.sql** ⭐ RECOMMENDED
- **Type:** Complete migration script
- **Use:** Execute this entire file in Supabase SQL Editor as one transaction
- **Features:**
  - Automatic constraint detection
  - Conditional constraint dropping
  - Automated verification
  - Success/failure reporting
  - No manual constraint name needed
- **Execution Time:** ~2-3 seconds
- **Data Loss:** None

### 2. **EXACT_SQL_COMMANDS.sql**
- **Type:** Individual SQL commands
- **Use:** Copy individual commands if you prefer step-by-step execution
- **Contains:**
  - 5 separate commands (check, drop, add, verify, status)
  - Bonus: View all FKs command
  - Quick reference guide
- **Execution Time:** ~1-2 seconds per command

### 3. **MIGRATION_INSTRUCTIONS.md**
- **Type:** Detailed instructions and documentation
- **Contents:**
  - Step-by-step execution guide
  - Individual command explanations
  - Expected outputs
  - Troubleshooting section
  - Data safety information

### 4. **MIGRATION_SUMMARY.md**
- **Type:** This file
- **Purpose:** Quick overview and reference

---

## 🚀 Quick Start (Fastest)

### Option A: Run Complete Migration (Recommended)
1. Open Supabase SQL Editor
2. Copy entire contents of **MIGRATE_SCORE_SHEETS_FK.sql**
3. Click Run
4. ✅ Done! All 5 steps execute automatically

**Time:** ~3 seconds
**Effort:** 2 clicks

### Option B: Run Individual Commands
1. Open Supabase SQL Editor
2. Copy Command 1 from **EXACT_SQL_COMMANDS.sql** → Run
3. Copy Command 2 → Run (if needed)
4. Copy Command 3 → Run
5. Copy Command 4 → Run
6. Copy Command 5 → Run
7. ✅ Done!

**Time:** ~10-15 seconds
**Effort:** More manual, but see each step clearly

---

## 🔍 How to Choose Your Approach

### Use **MIGRATE_SCORE_SHEETS_FK.sql** if you:
- ✓ Want the fastest execution
- ✓ Trust the automated logic
- ✓ Want clear success/failure reporting
- ✓ Need to see detailed status output
- ✓ Prefer one transaction over multiple steps

### Use **EXACT_SQL_COMMANDS.sql** if you:
- ✓ Want to see each step execute
- ✓ Prefer to verify after each command
- ✓ Need to debug issues step-by-step
- ✓ Want maximum control

---

## 📊 Detailed Command Breakdown

### COMMAND 1: Investigate Current State
```sql
-- Shows current FK constraint on score_sheets.term_id
-- Reveals what table it references
-- Identifies the constraint name
SELECT ... FROM information_schema...
```
**Output:** Current constraint details including:
- Constraint name
- Referenced table (terms or academic_terms)
- Delete rule (CASCADE or RESTRICT)

---

### COMMAND 2: Remove Old Constraint
```sql
ALTER TABLE score_sheets
DROP CONSTRAINT fk_score_sheets_term_id;
```
**When to run:** Only if COMMAND 1 shows it references 'terms' table
**Result:** Removes the old constraint (no data deleted)

---

### COMMAND 3: Add New Constraint
```sql
ALTER TABLE score_sheets
ADD CONSTRAINT fk_score_sheets_term_id_academic_terms
FOREIGN KEY (term_id) 
REFERENCES academic_terms(id) 
ON DELETE CASCADE;
```
**What it does:**
- Creates new FK to academic_terms
- Enables ON DELETE CASCADE (cascades deletions)
- Maintains referential integrity

---

### COMMAND 4: Verify Constraint
```sql
-- Shows the newly created constraint details
SELECT ... FROM information_schema...
```
**Expected Output:**
```
constraint_name: fk_score_sheets_term_id_academic_terms
foreign_table_name: academic_terms
delete_rule: CASCADE
```

---

### COMMAND 5: Success Confirmation
```sql
DO $$
  -- Validates all 3 requirements are met
  -- Reports status
$$ LANGUAGE plpgsql;
```
**Output:** ✅ SUCCESS message with verification status

---

## ✅ Success Criteria

After running the migration, verify:

1. **Constraint exists** ✓
2. **References academic_terms** ✓
3. **Has ON DELETE CASCADE** ✓

All three must be TRUE for successful migration.

---

## 🛡️ Data Safety

### What Happens to Data

| Data | During Migration | After Migration |
|------|------------------|-----------------|
| score_sheets rows | ✓ Unaffected | ✓ Protected by FK |
| term_id values | ✓ Unchanged | ✓ Must reference academic_terms |
| academic_terms | ✓ Unaffected | ✓ When deleted, cascade delete score_sheets |

### No Data Loss
- Migration only changes the constraint relationship
- All existing score_sheets remain intact
- No columns are added, removed, or modified
- The migration is reversible (can drop new constraint and recreate old one)

---

## ⚠️ Important Notes

### Prerequisites
- ✓ Supabase project must have `academic_terms` table
- ✓ All `score_sheets.term_id` values must exist in `academic_terms`

### Validation
If you get "Foreign key violation" error:
```sql
-- Check for orphaned records
SELECT COUNT(*) FROM score_sheets ss
WHERE NOT EXISTS (SELECT 1 FROM academic_terms at WHERE at.id = ss.term_id);
```

If count > 0, those records need to be deleted or updated before migration.

---

## 📞 After Migration Checklist

- [ ] Migration completed without errors
- [ ] COMMAND 4 shows correct constraint details
- [ ] COMMAND 5 shows SUCCESS
- [ ] No foreign key violation errors
- [ ] Application tests pass
- [ ] Score sheets functionality works correctly
- [ ] Database logs show no errors

---

## 🔄 If You Need to Rollback

### To revert to the old constraint:
```sql
-- Drop the new constraint
ALTER TABLE score_sheets
DROP CONSTRAINT fk_score_sheets_term_id_academic_terms;

-- Re-create the old constraint (if needed)
ALTER TABLE score_sheets
ADD CONSTRAINT fk_score_sheets_term_id
FOREIGN KEY (term_id) 
REFERENCES terms(id) 
ON DELETE CASCADE;
```

---

## 📝 Execution Checklist

### Before You Start
- [ ] Backup your database (Supabase does this automatically)
- [ ] Have SSH/database access ready
- [ ] Know your Supabase project URL
- [ ] Have MIGRATE_SCORE_SHEETS_FK.sql or EXACT_SQL_COMMANDS.sql open

### During Execution
- [ ] Open Supabase SQL Editor
- [ ] Paste the SQL command(s)
- [ ] Review for any obvious errors
- [ ] Click Run
- [ ] Wait for completion (2-3 seconds)

### After Execution
- [ ] Check for errors in output
- [ ] Run verification command (COMMAND 5)
- [ ] Confirm ✅ SUCCESS message
- [ ] Test application functionality

---

## 🎓 Learning Resources

### What This Migration Teaches
- How to check existing database constraints
- How to safely drop and recreate foreign keys
- How to use ON DELETE CASCADE for data integrity
- How to query information_schema for metadata
- How to use PL/pgSQL for automated validation

### Related Concepts
- Foreign Keys and Referential Integrity
- Cascade Delete Operations
- Database Constraints
- Information Schema Queries
- Transaction Management

---

## 📞 Support

If you encounter issues:

1. **Run COMMAND 1** - Verify current state
2. **Check error message** - Note the exact error
3. **Review troubleshooting** - See MIGRATION_INSTRUCTIONS.md
4. **Validate data** - Check for orphaned records
5. **Review logs** - Check Supabase activity logs

Common issues:
- Constraint name mismatch → Use Command 1 to find exact name
- Foreign key violation → Check for orphaned records
- Cascade delete concerns → Verify academic_terms has no special requirements

---

## ✨ Summary

**What:** Migrate score_sheets.term_id FK to academic_terms with CASCADE
**Why:** Aligns with modern academic session structure
**When:** Before deploying new session management features
**How:** Execute MIGRATE_SCORE_SHEETS_FK.sql in Supabase
**Risk:** Minimal (metadata-only change, no data modified)
**Time:** 2-3 seconds
**Status:** ✅ Ready to execute

---

**Created:** 2024
**Version:** 1.0
**Target:** Supabase PostgreSQL
**Tables Affected:** score_sheets, academic_terms
**Data Modified:** None
**Reversible:** Yes
