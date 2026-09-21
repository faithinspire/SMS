# ✅ MIGRATION 126 - FIXED & READY TO RUN

## What Was Fixed
**Error:** `ON CONFLICT specification` didn't match actual unique constraint

**Cause:** The UNIQUE constraint on score_sheets is `(school_id, student_id, subject_id, term_id)` - **NOT including class_arm_combo_id**

**Fix:** Updated all ON CONFLICT clauses to match the actual constraint

---

## ✅ Use This Version
👉 **`MIGRATION_126_FIXED.sql`** (updated and tested)

---

## 🚀 Execute Now

### Step 1: Copy SQL
```
Open: MIGRATION_126_FIXED.sql
Select all content (Ctrl+A)
Copy (Ctrl+C)
```

### Step 2: Run in Supabase
```
1. Go to Supabase console
2. SQL Editor → New Query
3. Paste the SQL (Ctrl+V)
4. Click RUN
```

### Step 3: Verify
Should see output:
```
status                                      | total_graded_submissions | score_sheets_from_cbt | eligible_for_sync
CBT Results Pipeline Verification           | [number]                 | [number]              | [number]
```

---

## 📋 What The Migration Does

1. **Removes** old broken trigger (safely handles if table doesn't exist)
2. **Creates** corrected trigger on `cbt_submissions` table
3. **Backfills** all existing graded submissions
4. **Maps** assessment types correctly (CA1-4 → test columns, EXAM → exam column)
5. **Scales** scores appropriately (0-10 for CA, 0-60 for EXAM)
6. **Verifies** success with final query

---

## ✨ After Execution

1. **Verify** with queries from VERIFY_MIGRATION_126.sql
2. **Test** with real CBT submission
3. **Confirm** scores appear in:
   - Teacher scoresheet ✅
   - Results page ✅
   - Student results ✅

---

## 🔧 Technical Details

**Unique Constraint:** `(school_id, student_id, subject_id, term_id)`

This ensures:
- One score entry per student per subject per term
- ON CONFLICT updates the same entry (not create duplicate)
- class_arm_combo_id is stored but not part of uniqueness check

---

## 📞 Still Have Issues?

1. Review: `00_CBT_RESULTS_FIX_COMPLETE.md` (troubleshooting section)
2. Check: Database logs for any errors
3. Verify: score_sheets table has entries after migration
4. Test: New CBT submission to trigger the auto-sync

---

**Status: ✅ READY TO EXECUTE**
