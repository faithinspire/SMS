# IMMEDIATE ACTION: Fix CBT Foreign Key Error

## The Root Cause
Your database has a broken foreign key constraint:
- `cbt_exams` table references `terms_backup_old_schema` table
- That table doesn't exist or has no data
- This causes ALL CBT creation to fail

## SOLUTION: Run This SQL NOW

Go to **Supabase SQL Editor** and run this exact SQL:

```sql
-- Step 1: Drop the broken foreign key
ALTER TABLE cbt_exams
DROP CONSTRAINT IF EXISTS cbt_exams_term_id_fkey CASCADE;

-- Step 2: Ensure terms table exists
CREATE TABLE IF NOT EXISTS terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  session_year INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, session_year, name)
);

-- Step 3: Copy data from academic_terms to terms
INSERT INTO terms (school_id, name, session_year, start_date, end_date, is_current, id)
SELECT 
  at.school_id,
  at.term_name,
  EXTRACT(YEAR FROM COALESCE(at.start_date, NOW()))::INT,
  COALESCE(at.start_date, NOW()::DATE),
  COALESCE(at.end_date, (NOW() + INTERVAL '3 months')::DATE),
  at.is_active,
  at.id
FROM academic_terms at
WHERE NOT EXISTS (
  SELECT 1 FROM terms t 
  WHERE t.id = at.id
)
ON CONFLICT DO NOTHING;

-- Step 4: Re-create the proper foreign key
ALTER TABLE cbt_exams
ADD CONSTRAINT cbt_exams_term_id_fkey 
FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE SET NULL;

-- Step 5: Drop the old backup table
DROP TABLE IF EXISTS terms_backup_old_schema CASCADE;

-- Verify it worked
SELECT COUNT(*) as terms_total FROM terms;
SELECT COUNT(*) as cbt_exams_total FROM cbt_exams;
```

## Expected Result
- ✅ Both queries return a count (if > 0, it worked!)
- ✅ No error messages

## After Running SQL

1. **Refresh your browser** (Ctrl + F5)
2. **Go to CBT Management**
3. **Try creating a CBT**
4. **It should work now!** ✅

## Verification

If it worked, you'll see:
```
✅ CBT "Title" created with X questions
```

## If It Still Doesn't Work

1. Go to **Supabase SQL Editor**
2. Run this:
   ```sql
   -- Check if terms table has data
   SELECT COUNT(*) FROM terms;
   
   -- Check academic_terms table
   SELECT COUNT(*) FROM academic_terms;
   
   -- Check for any orphaned cbt_exams
   SELECT COUNT(*) FROM cbt_exams WHERE term_id IS NULL;
   ```

3. If all counts are 0 or low, create sample data:
   ```sql
   INSERT INTO academic_sessions (school_id, session_year, start_year, end_year, is_active)
   SELECT id, '2025/2026', 2025, 2026, true FROM schools
   ON CONFLICT DO NOTHING;
   
   INSERT INTO academic_terms (school_id, session_id, term_name, term_order, is_active)
   SELECT 
     s.id, 
     a.id, 
     t.name, 
     t.ord, 
     true
   FROM schools s
   CROSS JOIN academic_sessions a
   CROSS JOIN (VALUES ('First Term', 1), ('Second Term', 2), ('Third Term', 3)) as t(name, ord)
   WHERE a.session_year = '2025/2026'
   ON CONFLICT DO NOTHING;
   
   -- Then re-run the sync from step 3 above
   ```

---

**Execute the first SQL block NOW and try creating a CBT!** 🚀
