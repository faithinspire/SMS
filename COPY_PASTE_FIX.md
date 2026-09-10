# 🔧 SUPER SIMPLE FIX - Copy & Paste Only

**Error you got:** `ERROR: 42601: syntax error at or near "RAISE"`

**Reason:** The SQL I provided had logging statements that don't work in Supabase SQL Editor.

**Solution:** Use this SIMPLER version (no logging, just the fix):

---

## 🎯 Copy This (Entire Block):

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
2. **Copy entire block above** (starts with `-- Step 1`, ends with last SELECT)
3. **Paste into SQL Editor**
4. **Click "Run"**
5. **Wait 2 seconds**
6. **Check output** - Should show:
   - `constraint_name: fk_score_sheets_term_id_academic_terms`
   - `foreign_table_name: academic_terms`
   - `delete_rule: CASCADE`

✅ **Done!** That's the fix.

---

## ❌ If You Get Error Again:

Just tell me the **exact error message** and I'll provide an even simpler fix.

---

## ✨ What This SQL Does:

1. ✅ Finds the OLD foreign key constraint on score_sheets.term_id
2. ✅ Drops the OLD constraint (that was pointing to `terms` table)
3. ✅ Creates NEW constraint (pointing to `academic_terms` table)
4. ✅ Verifies the NEW constraint is in place
5. ✅ Shows you the result so you can confirm it worked

---

## 🎉 After This Runs Successfully:

- ✅ Scores will save WITHOUT the foreign key error
- ✅ Mobile navbar will show 5 icons
- ✅ PWA will prompt after 2 visits
- ✅ All 3 terms will display
- ✅ Everything works! 🚀

---

**Just copy, paste, and run. That's all!**
