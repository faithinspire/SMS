# CRITICAL: RLS DISABLE INSTRUCTIONS

## The Problem
Classes and subjects dropdowns are empty during registration because **Row Level Security (RLS) policies are blocking data access** to the database tables.

## The Solution
**Disable RLS across all tables in Supabase**

## STEP-BY-STEP INSTRUCTIONS

### Step 1: Open Supabase Console
1. Go to: https://supabase.com/dashboard
2. Log in with your credentials
3. Select your project: **egdreueuspmuxhezdpqm** (Faith Inspire SMS)

### Step 2: Open SQL Editor
1. Click on **SQL Editor** in the left sidebar
2. Click **New Query** button

### Step 3: Copy and Execute the Master RLS Disable SQL

Copy the entire contents of this file:
```
database/migrations/012_master_disable_rls_all_tables.sql
```

Then:
1. Paste it into the SQL Editor
2. Click **Run** (or press Ctrl+Enter)
3. Wait for execution to complete (should take 10-30 seconds)

### Step 4: Verify RLS is Disabled

Run this verification query in SQL Editor:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

**Expected result:** All tables should show `rowsecurity = false`

### Step 5: Test Data Loading

1. Go to: http://localhost:3000
2. Open the registration modal (Student or Teacher)
3. Open Browser DevTools (F12)
4. Go to **Console** tab
5. Check for console.log messages showing:
   - "Loading data for schoolId: ..."
   - "Combos: [...]"
   - "Classes: [...]"
   - "Subjects: [...]"
6. Check the **Network** tab for successful Supabase API calls

### Step 6: Verify Dropdowns Show Data

1. In Student Registration Step 2:
   - **Classes dropdown should show multiple options** (e.g., "Primary 1 - A", "Primary 2 - B", etc.)
   - **Subjects dropdown should show list of subjects** (e.g., "English", "Mathematics", "Science", etc.)

2. In Teacher Registration Step 4:
   - **Classes dropdown should show multiple options**
   - **Subjects dropdown should show list of subjects**

---

## WHAT THIS FIXES

✅ Classes dropdown populated with data from `class_arm_combos` table
✅ Subjects dropdown populated with data from `subjects` table
✅ Student admission number auto-generates on class selection
✅ Teacher can select classes and subjects for assignment
✅ All registration data loads properly from database

---

## MANUAL SQL EXECUTE (If UI fails)

If clicking Run in Supabase console doesn't work:

1. Open your Supabase project
2. Go to SQL Editor
3. For each table, execute manually:

```sql
ALTER TABLE class_arm_combos DISABLE ROW LEVEL SECURITY;
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE arms DISABLE ROW LEVEL SECURITY;
ALTER TABLE subjects DISABLE ROW LEVEL SECURITY;
```

Then grant permissions:

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON class_arm_combos TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON classes TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON arms TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON subjects TO anon, authenticated;
```

---

## TROUBLESHOOTING

**Problem:** Dropdowns still show "No data available"
**Solution:** Refresh browser (Ctrl+F5) and check browser console for errors

**Problem:** Getting "permission denied" errors in console
**Solution:** RLS is still blocking access - make sure SQL executed without errors

**Problem:** "No subjects available" message
**Solution:** 
1. Check that subjects exist in Supabase (dashboard > subjects table)
2. Verify school_id matches the current school
3. Check that `applicable_to_levels` array is not empty

---

## NEXT STEP AFTER RLS DISABLE

Once RLS is disabled and dropdowns show data:
1. Complete student/teacher registration
2. Commit changes: `git commit -m "Fixed: RLS disabled for registration data access"`
3. Push to GitHub: `git push origin main`

---

**Status:** ✋ WAITING FOR YOU TO EXECUTE SUPABASE SQL COMMANDS
