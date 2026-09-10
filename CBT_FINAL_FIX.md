# CBT Creation - Final Fix

## The Problem
The error `Foreign key constraint "cbt_exams_term_id_fkey"` means:
- The CBT system references the old `terms` table
- But the term selection dropdown shows terms from the new `academic_terms` table
- These term IDs don't match, causing the foreign key violation

## The Solution

### Step 1: Run This SQL in Supabase (CRITICAL)

Go to **Supabase Console** → **SQL Editor** and run:

```sql
-- Create/sync the old terms table with academic terms
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

-- Populate old terms from academic_terms
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
  WHERE t.school_id = at.school_id 
  AND t.name = at.term_name
)
ON CONFLICT DO NOTHING;

-- Verify the sync worked
SELECT COUNT(*) as terms_count FROM terms;
SELECT COUNT(*) as academic_terms_count FROM academic_terms;
```

**Expected output:** Both queries should return the same count (or similar numbers).

### Step 2: If Academic Terms Don't Exist Yet

If the above SQL returns 0 academic_terms, run this instead:

```sql
-- Create academic_sessions
CREATE TABLE IF NOT EXISTS academic_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  session_year VARCHAR(20) NOT NULL,
  start_year INT,
  end_year INT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, session_year)
);

-- Create academic_terms
CREATE TABLE IF NOT EXISTS academic_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  session_id UUID REFERENCES academic_sessions(id),
  term_name VARCHAR(50) NOT NULL,
  term_order INT DEFAULT 1,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert a sample session and terms
INSERT INTO academic_sessions (school_id, session_year, start_year, end_year)
SELECT id, '2025/2026', 2025, 2026 FROM schools
ON CONFLICT DO NOTHING;

-- Insert terms for that session
INSERT INTO academic_terms (school_id, session_id, term_name, term_order, is_active)
SELECT 
  s.id,
  as_.id,
  t.name,
  t.order,
  true
FROM schools s
CROSS JOIN academic_sessions as_
CROSS JOIN (
  VALUES 
    ('First Term', 1),
    ('Second Term', 2),
    ('Third Term', 3)
) as t(name, order)
WHERE as_.session_year = '2025/2026'
ON CONFLICT DO NOTHING;

-- Now sync the old terms table
INSERT INTO terms (school_id, name, session_year, start_date, end_date, is_current, id)
SELECT 
  at.school_id,
  at.term_name,
  EXTRACT(YEAR FROM NOW())::INT,
  NOW()::DATE,
  (NOW() + INTERVAL '3 months')::DATE,
  at.is_active,
  at.id
FROM academic_terms at
WHERE NOT EXISTS (
  SELECT 1 FROM terms t 
  WHERE t.school_id = at.school_id 
  AND t.name = at.term_name
);
```

### Step 3: Verify the Fix

Run this to confirm terms exist:

```sql
-- Check terms table
SELECT school_id, name, session_year, COUNT(*) 
FROM terms 
GROUP BY school_id, name, session_year;

-- Check academic_terms table
SELECT school_id, term_name, COUNT(*) 
FROM academic_terms 
GROUP BY school_id, term_name;
```

Both should show your terms.

### Step 4: Test CBT Creation Again

1. **Restart dev server** (if you haven't already):
   ```bash
   # In terminal: Ctrl + C to stop
   # Then: npm run dev
   ```

2. **Clear browser cache**: Ctrl + Shift + Delete → Clear all data

3. **Go to CBT Management page**

4. **Try creating a CBT**:
   - Title: "Test CBT"
   - Subject: Your assigned subject
   - Class: Any class
   - **Term: Should now show your newly synced terms**
   - Add 1 question
   - Click Create

### What Changed in the Code

**File: `src/app/api/teacher/cbt/create/route.ts`**

The API now:
1. Checks for the term in `academic_terms` (new system)
2. Falls back to `terms` table (old system) if not found
3. Accepts both old and new term IDs

This allows the system to work whether you're using old or new terms.

## Expected Success

After the fix, you should see:
```
✅ CBT "Test CBT" created with 1 questions
```

And you'll be able to:
- See the CBT in "My CBTs" list
- Edit and delete CBTs
- Students can view and take CBTs

## Troubleshooting

**Still getting foreign key error?**
- Make sure you ran **both** SQL scripts above
- Verify the terms table has data: `SELECT COUNT(*) FROM terms;`
- Check that the term_id matches a real term ID

**No terms showing in dropdown?**
- Make sure academic_sessions and academic_terms exist
- Run the second SQL script to create them

**Still showing "Error creating CBT"?**
- Open F12 console and look for the exact error message
- Share it and I'll provide further guidance

---

**Execute the SQL above and test again. CBT creation should work!** 🚀
