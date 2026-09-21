# EXECUTE MIGRATION 126 (FIXED VERSION)

## ⚠️ IMPORTANT FIX
The original migration failed because `cbt_results` table doesn't exist in your database.

**This fixed version safely handles the missing table.**

---

## 🚀 EXECUTE NOW

### Step 1: Use Fixed SQL
👉 Use: **`MIGRATION_126_FIXED.sql`** (NOT the old version)

### Step 2: Copy & Paste
1. Open Supabase console
2. Go to SQL Editor
3. Create new query
4. Copy **entire** contents of `MIGRATION_126_FIXED.sql`
5. Paste into editor
6. Click **RUN**

### Step 3: Wait for Completion
- Should complete successfully
- Should see verification results
- Should show backfill count

---

## ✅ What Changed
- Added error handling for missing `cbt_results` table
- Now gracefully skips cleanup if table doesn't exist
- Rest of migration remains the same
- Trigger still created on `cbt_submissions` (correct table)
- Backfill still runs for existing submissions

---

## 📊 Expected Results
After running, you should see output like:
```
status                                      | total_graded_submissions | score_sheets_from_cbt | eligible_for_sync
CBT Results Pipeline Verification           | 15                       | 12                     | 15
```

---

## ✨ Next Steps
1. Run verification queries (same as before)
2. Test with real CBT submission
3. Verify scores appear everywhere
4. Monitor for any errors

---

## 🆘 If It Still Fails
Please share the error message and we'll diagnose further.

**Most likely:** If migration runs successfully but scores don't appear, it's a different issue (data integrity, enrollment, etc.) not a database connection issue.
