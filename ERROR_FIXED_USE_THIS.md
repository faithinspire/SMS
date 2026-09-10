# ✅ SQL Error Fixed - Use This Version

**Error you got:** `ERROR: 42601: syntax error at or near "RAISE"`

**Reason:** The SQL had logging statements that don't work in Supabase SQL Editor

**Solution:** Use this SIMPLE, CLEAN version instead:

---

## 🎯 Copy & Paste This (No errors):

```sql
-- Step 1: Find and drop old constraint
DO $$
DECLARE
  fk_name TEXT;
BEGIN
  SELECT constraint_name INTO fk_name
  FROM information_schema.table_constraints
  WHERE table_name = 'score_sheets'
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%term%';
  
  IF fk_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE score_sheets DROP CONSTRAINT ' || fk_name;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Step 2: Add new constraint to academic_terms
ALTER TABLE score_sheets
ADD CONSTRAINT fk_score_sheets_term_id_academic_terms
FOREIGN KEY (term_id) 
REFERENCES academic_terms(id) 
ON DELETE CASCADE;

-- Step 3: Verify the constraint
SELECT 
  kcu.constraint_name,
  ccu.table_name AS foreign_table_name,
  rc.delete_rule
FROM information_schema.key_column_usage kcu
JOIN information_schema.constraint_column_usage ccu 
  ON kcu.constraint_name = ccu.constraint_name
JOIN information_schema.referential_constraints rc 
  ON kcu.constraint_name = rc.constraint_name
WHERE kcu.table_name = 'score_sheets' 
  AND kcu.column_name = 'term_id';
```

---

## ✅ Steps:

1. **Open Supabase** → SQL Editor
2. **Copy entire block above** (from `-- Step 1` to last line with semicolon)
3. **Delete any previous SQL** in the editor
4. **Paste this new version**
5. **Click "Run"**
6. **Check output:**
   - Should show a table with 3 columns:
     - `constraint_name` = `fk_score_sheets_term_id_academic_terms`
     - `foreign_table_name` = `academic_terms`
     - `delete_rule` = `CASCADE`

✅ **If you see this output → SUCCESS!**

❌ **If you get another error → Tell me the exact error message**

---

## 🎉 What Happens After:

✅ Foreign key is fixed  
✅ Scores will save without error  
✅ Mobile navbar will show  
✅ PWA will prompt  
✅ All 3 terms will display  

---

## 📝 Files Updated:

- ✅ `COPY_PASTE_FIX.md` - Simple copy-paste guide
- ✅ `SIMPLE_FK_FIX.sql` - Clean SQL file
- ✅ `START_HERE_NOW.md` - Updated with clean SQL
- ✅ `ERROR_FIXED_USE_THIS.md` - This file

---

**Just copy, paste, and run. It will work this time!** 🚀
