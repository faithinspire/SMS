# ⚠️ EXECUTE THIS NOW - CBT Foreign Key Fix

## The Problem
Your `cbt_exams` table has a foreign key pointing to a non-existent table `terms_backup_old_schema`. This breaks ALL CBT creation.

Error you see:
```
Foreign key constraint "cbt_exams_term_id_fkey"
Key (term_id)=... is not present in table "terms_backup_old_schema"
```

## The Solution - DO THIS NOW

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com
2. Select your project
3. Go to **SQL Editor** on the left sidebar
4. Click **New Query**

### Step 2: Run This SQL (Copy & Paste)

```sql
-- STEP 1: Drop the broken foreign key
ALTER TABLE cbt_exams DROP CONSTRAINT IF EXISTS cbt_exams_term_id_fkey CASCADE;

-- STEP 2: Create proper terms table if missing
CREATE TABLE IF NOT EXISTS terms (
  id UUID PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  session_year INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, session_year, name)
);

-- STEP 3: Populate terms table from academic_terms (if academic_terms exists)
INSERT INTO terms (id, school_id, name, session_year, start_date, end_date, is_current)
SELECT 
  at.id,
  at.school_id,
  at.term_name,
  EXTRACT(YEAR FROM COALESCE(at.start_date, NOW()))::INT,
  COALESCE(at.start_date, NOW()::DATE),
  COALESCE(at.end_date, (NOW() + INTERVAL '3 months')::DATE),
  at.is_active
FROM academic_terms at
WHERE NOT EXISTS (SELECT 1 FROM terms t WHERE t.id = at.id)
ON CONFLICT (id) DO NOTHING;

-- STEP 4: Create the NEW foreign key constraint pointing to correct table
ALTER TABLE cbt_exams
ADD CONSTRAINT cbt_exams_term_id_fkey 
FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE SET NULL;

-- STEP 5: Drop the old backup table
DROP TABLE IF EXISTS terms_backup_old_schema CASCADE;

-- VERIFY: Check if it worked
SELECT COUNT(*) as total_terms FROM terms;
SELECT COUNT(*) as total_exams FROM cbt_exams;
```

### Step 3: Click "Run"
- You should see ✅ **2 rows** at the bottom (from the SELECT statements)
- If you see errors, scroll down to see what went wrong

### Step 4: Verify Success
You should see output like:
```
total_terms: 3
total_exams: 0 (or some number)
```

If you see:
- ❌ **Error about constraint**, try running just the first 2 steps
- ❌ **Error about academic_terms not found**, that's OK - academic_terms may be empty

### Step 5: Hard Refresh Browser
1. Close browser tab
2. Open a new tab and go to your app
3. Go to **Teacher Dashboard → CBT Management**
4. Try creating a CBT

### Step 6: Expected Result
You should see:
```
✅ CBT "Test Title" created successfully with 1 questions
```

---

## If It Still Doesn't Work

### Option A: Check if terms table has data
Run this in SQL Editor:
```sql
SELECT COUNT(*) FROM terms;
SELECT COUNT(*) FROM academic_terms;
SELECT COUNT(*) FROM academic_sessions;
```

If all are 0, you need to create sample data:
```sql
-- Create sample session
INSERT INTO academic_sessions (school_id, session_year)
SELECT id, '2025/2026' FROM schools LIMIT 1;

-- Create sample terms
INSERT INTO academic_terms (school_id, session_id, term_name, term_order, is_active)
SELECT 
  s.id, 
  a.id, 
  'First Term', 
  1, 
  true
FROM schools s
CROSS JOIN academic_sessions a LIMIT 1;

-- Sync to terms table
INSERT INTO terms (id, school_id, name, session_year, start_date, end_date)
SELECT 
  at.id,
  at.school_id,
  at.term_name,
  2025,
  NOW()::DATE,
  (NOW() + INTERVAL '3 months')::DATE
FROM academic_terms at;
```

Then try CBT creation again.

### Option B: If you still get the same error
1. Open F12 console in browser (Press F12)
2. Look for error messages in the **Console** tab
3. Copy the exact error and send it

---

**⏰ DO THIS RIGHT NOW! Execute the SQL in Supabase, then test CBT creation.**

Let me know when you've done it and what happens! 🚀
