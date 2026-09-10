# NEXT STEP: Execute Migration 049 in Supabase

## Status
All code changes are complete. Now you need to run the database migration to populate the canonical subjects.

## How to Execute

### Step 1: Open Supabase SQL Editor
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your SMS project
3. Click **SQL Editor** in the left sidebar
4. Click **+ New Query** or paste into existing query window

### Step 2: Copy and Run Migration 049
Open file: `database/migrations/049_canonical_subjects_simple.sql`

Copy the entire contents and paste into Supabase SQL Editor, then click **RUN**.

The migration will:
- ✅ Get all schools from your database
- ✅ Insert 37 canonical subjects for EACH school
- ✅ Skip duplicates (idempotent, safe to run multiple times)
- ✅ Handle any school structure without errors

### Expected Output
```
Query succeeded
Rows affected: 37 per school
```

## Verify Migration Worked

### Query 1: Check Total Subjects
```sql
SELECT school_id, COUNT(*) as subject_count
FROM subjects
GROUP BY school_id;
```
**Expected**: 37 subjects per school

### Query 2: Check All Subject Names
```sql
SELECT DISTINCT name, code
FROM subjects
ORDER BY name;
```
**Expected**: 37 rows with subjects like:
- English Language (ENG)
- Mathematics (MATH)
- Physics (PHY)
- Chemistry (CHM)
- etc.

### Query 3: Verify Applicable Levels
```sql
SELECT name, code, applicable_to_levels
FROM subjects
LIMIT 5;
```
**Expected**: Each subject has array of level numbers, e.g., `{3,4,5,6,7,8,9,10,11,12,13,14}`

## After Running Migration

1. **Refresh Application**
   - Open your SMS app
   - Go to Teacher Registration or Student Registration
   - You should now see all 37 subjects in dropdowns

2. **Test Registration**
   - Register a new teacher
   - Select a subject from dropdown
   - Should show "English Language", "Mathematics", etc. (no UUIDs)
   - Submit and verify saves correctly

3. **Test Student Registration**
   - Register a new student
   - Select class "Primary 3A"
   - Subject checkboxes should show only Primary subjects
   - Select "English Language" (not UUID)

4. **Check Teacher Dashboard**
   - Login as teacher
   - Go to Score Sheet
   - If students assigned, you should see them listed
   - Subjects should show names, not UUIDs

## Troubleshooting

### If you see "column doesn't exist" error
✅ **This is fixed in migration 049**
- Previous version looked for `is_active` column (which doesn't exist)
- New version uses correct schema with just `schools.id` and `schools.name`

### If you see duplicate key errors
✅ **This is handled**
- Migration uses `ON CONFLICT` to skip duplicates
- Safe to run multiple times

### If subjects don't appear in dropdowns
1. Clear browser cache: `Ctrl+Shift+Delete` → Clear all
2. Hard refresh app: `Ctrl+F5`
3. Check Supabase query above to verify subjects were inserted

## Migration File Location
**Path**: `database/migrations/049_canonical_subjects_simple.sql`

This file contains the complete SQL to insert all 37 subjects with correct applicable levels.

## Once Complete ✅
All tasks are done:
- ✅ Code updated to use CanonicalSubjectService
- ✅ Hardcoded subjects deleted
- ✅ Components migrated
- ✅ API endpoints verified
- ✅ Ready for production use

Just run migration 049 to activate the system!
