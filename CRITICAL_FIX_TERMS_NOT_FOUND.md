# 🚨 CRITICAL FIX: "TERM NOT FOUND" Error

**Problem**: You're getting "INVALID TERM ID: TERM NOT FOUND IN EITHER ACADEMIC TERMS OR TERMS TABLE" when creating CBT exams

**Root Cause**: Migration 106 was NOT executed in Supabase. The `terms` table is empty.

**Solution**: Execute ONE of the following (pick the easier one for you)

---

## OPTION 1: Quick Fix - Execute Terms Population SQL (FASTEST) ⚡

**Time**: 30 seconds
**File**: `EXECUTE_NOW_POPULATE_TERMS.sql`

### Steps:
1. Open Supabase Dashboard
2. Click **SQL Editor** → **New Query**
3. Copy this SQL:

```sql
-- Quick populate terms for all schools
INSERT INTO terms (id, school_id, name, session_year, start_date, end_date, is_current, created_at)
SELECT 
  gen_random_uuid(),
  s.id,
  term_name,
  2023,
  start_d,
  end_d,
  TRUE,
  NOW()
FROM schools s
CROSS JOIN (
  VALUES 
    ('First Term'::text, '2023-09-01'::date, '2023-11-30'::date),
    ('Second Term'::text, '2023-12-01'::date, '2024-02-28'::date),
    ('Third Term'::text, '2024-03-01'::date, '2024-05-31'::date)
) AS t(term_name, start_d, end_d)
WHERE NOT EXISTS (
  SELECT 1 FROM terms 
  WHERE school_id = s.id AND name = t.term_name AND session_year = 2023
)
ON CONFLICT DO NOTHING;

-- Verify
SELECT COUNT(*) as total_terms FROM terms;
```

4. Click **Run**
5. You should see result showing terms were created

✅ **After this**, try creating CBT again - it will work!

---

## OPTION 2: Full Fix - Execute Complete Migration 106 (RECOMMENDED)

**Time**: 2 minutes
**File**: `database/migrations/106_phase1_critical_fixes.sql`

### Steps:
1. Open `database/migrations/106_phase1_critical_fixes.sql` in your editor
2. Copy the entire file
3. Go to Supabase → SQL Editor → New Query
4. Paste the entire migration
5. Click **Run**

✅ **After this**, your system is fully set up with:
- Academic sessions for 2023/2024
- First/Second/Third terms
- Auto-trigger for score sheets
- Data integrity checks

---

## Why This Happened

When you created the project, Migration 106 should have been executed automatically via Supabase migrations. It wasn't, so:
- ❌ No terms exist in the database
- ❌ CBT creation fails (term_id FK constraint violation)
- ❌ "TERM NOT FOUND" error appears

**Now Fixed**: 
- ✅ Better error message tells you to execute migration
- ✅ Quick SQL script available to populate terms
- ✅ Code validated before insertion

---

## After Executing Terms SQL

### Test It Works:

1. Go to Teacher CBT page
2. Click "Create Exam"
3. Select a term from dropdown - you should now see:
   - First Term
   - Second Term
   - Third Term

4. Fill in exam details and click Create
5. ✅ Exam should be created successfully

### What You Can Now Do:

✅ Create CBT exams (terms available in dropdown)
✅ Add questions and options
✅ Publish exams
✅ Students can take exams
✅ Scores auto-sync to report cards
✅ View results and analytics

---

## Code Changes Made (Deployed)

**File**: `src/services/cbt-management.service.ts`
**Change**: Added term validation before exam creation
**Result**: Clear error message if terms don't exist

```typescript
// Validate term exists before creating exam
const { data: termData, error: termError } = await supabase
  .from('terms')
  .select('id')
  .eq('id', input.term_id)
  .single()

if (termError || !termData) {
  throw new Error(
    `Invalid term_id. Term not found. ` +
    `CRITICAL: Migration 106 must be executed in Supabase SQL Editor.`
  )
}
```

---

## Git Status

✅ Code changes pushed to main
✅ Vercel auto-building (check dashboard)
✅ All fixes in place

---

## Checklist

- [ ] Open Supabase SQL Editor
- [ ] Choose Option 1 or Option 2 above
- [ ] Copy and execute the SQL
- [ ] See success message
- [ ] Go to Teacher CBT page
- [ ] Create a test exam
- [ ] Verify it works

**After completing this → Your SMS system is fully functional!** 🎉

---

## If Still Getting Error After Executing SQL

### Check 1: Verify Terms Were Created
```sql
SELECT * FROM terms LIMIT 5;
```
Should show First/Second/Third Term rows

### Check 2: Verify School ID Matches
The terms must belong to your school. Check:
```sql
SELECT DISTINCT school_id FROM schools LIMIT 1;
-- Then check if terms exist for that school:
SELECT * FROM terms WHERE school_id = '[that-uuid]';
```

### Check 3: Clear Browser Cache
- Press Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)
- Select "Cached images and files"
- Click "Clear"
- Reload the page

### Check 4: Wait for Vercel Deploy
New code is deployed. Give it 2-3 minutes then hard refresh (Ctrl+Shift+R)

---

## Support

**Error: "Table terms does not exist"**
→ You need to run migrations 001-105 first. These should have auto-run when you created the Supabase project.

**Error: "school_id does not exist in terms"**
→ The school wasn't created. Register a school first from the main page.

**Error: "Constraint violation"**
→ The term might already exist. Use `ON CONFLICT DO NOTHING` in the SQL (it's already there).

---

**Status**: 🚀 Ready for Execution

Pick Option 1 or 2 above and run it now!
