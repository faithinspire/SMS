# Migration Execution Guide

## Overview

This guide explains how to execute the subject master data migration that fixes the subject selection system for all class levels.

## Migration Files

### Migration 107: `107_comprehensive_subject_master_list.sql`

**Purpose**: Populate all subjects with correct `applicable_to_levels` arrays

**What it does**:
1. ✅ Removes broken records from migration 105 (had invalid `level` column reference)
2. ✅ Adds all Early Years subjects (Nursery, Prep, KG - levels 0-2)
3. ✅ Adds all Primary subjects (Primary 1-6 - levels 3-8)
4. ✅ Adds all JSS subjects (JSS1-3 - levels 9-11)
5. ✅ Adds all SS subjects (SS1-3 - levels 12-14) with department mapping
6. ✅ Ensures `applicable_to_levels` is properly populated (no empty `{}` arrays)
7. ✅ Adds department field for stream-based filtering in SS classes

**Subjects Added**: ~45+ total

**Execution Time**: 2-5 seconds per school

## Pre-Migration Verification

Before running the migration, check the current state:

```sql
-- Check how many subjects have empty applicable_to_levels (broken records)
SELECT COUNT(*) as broken_records
FROM subjects
WHERE applicable_to_levels = '{}' OR applicable_to_levels IS NULL;

-- Should show a significant number (20-50+)

-- Check total subjects per school
SELECT 
  school_id,
  COUNT(*) as total,
  COUNT(CASE WHEN applicable_to_levels = '{}' THEN 1 END) as empty_levels
FROM subjects
GROUP BY school_id;
```

## Migration Execution Steps

### Option 1: Supabase SQL Editor (Recommended)

1. Go to Supabase Dashboard
2. Navigate to SQL Editor
3. Click "New Query"
4. Copy entire contents of `database/migrations/107_comprehensive_subject_master_list.sql`
5. Paste into editor
6. Click "Run" button
7. Wait for execution to complete (should see ✅ success message)

### Option 2: Via Supabase CLI

```bash
# Ensure you're in the project directory
cd /path/to/SMS

# Push migrations to Supabase
supabase db push

# This will automatically run migration 107 if it hasn't been run yet
```

### Option 3: Direct SQL (if needed)

```bash
# Connect to Supabase PostgreSQL directly
psql "postgresql://[user]:[password]@[host]:[port]/[database]"

# Copy and paste the migration SQL
\i database/migrations/107_comprehensive_subject_master_list.sql

# Or just copy-paste the entire contents
```

## Post-Migration Verification

After running migration 107, verify the results:

```sql
-- Check that all subjects now have populated applicable_to_levels
SELECT 
  COUNT(*) as total_subjects,
  COUNT(CASE WHEN applicable_to_levels = '{}' THEN 1 END) as still_broken,
  COUNT(CASE WHEN applicable_to_levels IS NULL THEN 1 END) as null_levels
FROM subjects;

-- Should show: total_subjects = 45+, still_broken = 0, null_levels = 0

-- Check subjects by level (sample for level 5 = Primary 3)
SELECT name, code, applicable_to_levels
FROM subjects
WHERE applicable_to_levels @> ARRAY[5]
ORDER BY name;

-- Should show: English Language, Mathematics, Science, Social Studies, 
-- Physical Education, Arts & Crafts, Music, Computer Studies, etc.

-- Check SS subjects with departments
SELECT name, code, department, applicable_to_levels
FROM subjects
WHERE applicable_to_levels @> ARRAY[12]
AND department IS NOT NULL
ORDER BY department, name;

-- Should show: Biology, Chemistry, Physics (SCIENCE), Economics, Accounting (COMMERCIAL), etc.
```

## Troubleshooting

### Issue: "No subjects appear for Primary classes after migration"

**Cause**: Migration didn't execute successfully, or subjects table is empty

**Fix**: 
1. Check execution result in Supabase SQL editor for errors
2. Re-run migration 107
3. Verify with post-migration verification queries above

### Issue: "Subjects still showing empty applicable_to_levels"

**Cause**: Migration ran but didn't find/update the records

**Fix**: 
1. Manually update a sample record to verify the field works:
   ```sql
   UPDATE subjects 
   SET applicable_to_levels = ARRAY[3,4,5,6,7,8]
   WHERE name = 'English Language'
   AND school_id = '[YOUR_SCHOOL_ID]'
   LIMIT 1;
   ```
2. Re-run migration 107 for remaining subjects

### Issue: "Duplicate subjects created after migration"

**Cause**: Migration ran multiple times on same database

**Fix**: 
1. Check for duplicate subjects:
   ```sql
   SELECT name, school_id, COUNT(*)
   FROM subjects
   GROUP BY name, school_id
   HAVING COUNT(*) > 1;
   ```
2. If duplicates exist, delete and re-run migration in a transaction

## Testing Subject Selection After Migration

### Test 1: Student Registration - Primary Class

1. Go to School Admin Dashboard
2. Click "Register Student"
3. Select "PRIMARY" section
4. Select "Primary 5" class
5. Verify Step 4 shows: English Language, Mathematics, Science, Social Studies, Physical Education, Arts & Crafts, Music, Computer Studies
6. Should show 8+ subjects

### Test 2: Student Registration - JSS Class

1. Repeat steps 1-3 but select "SECONDARY" section
2. Select "JSS2" class
3. Verify Step 4 shows: English Language, Mathematics, Basic Science, Basic Technology, Civic Education, Biology, Chemistry, Physics, History, Geography, French Language, Physical Education, Computer Studies, Agricultural Science
4. Should show 14+ subjects

### Test 3: Student Registration - SS1 Science Stream

1. Repeat steps 1-3 but select "SS1" class
2. In Step 3, select "Science" department
3. Verify Step 4 shows ONLY science-related subjects:
   - English Language (general)
   - Mathematics (general)
   - Biology (science)
   - Chemistry (science)
   - Physics (science)
   - Further Mathematics (science)
   - Civic Education (general)
   - Physical Education (general)
4. Should NOT show: Economics, Accounting, Business Studies, Government, Literature
5. Should show 8+ subjects total

### Test 4: Teacher Registration - Verify Department Selection

1. Go to School Admin Dashboard
2. Click "Register Teacher"
3. Select "SECONDARY" level
4. In Step 4, select an SS1 class
5. Verify "Department (Stream)" selector appears
6. Select "Commercial" department
7. Verify subjects list shows ONLY commercial subjects:
   - Economics
   - Accounting
   - Business Studies
   - Plus general subjects (English, Math, PE, Civic)
8. Should NOT show science subjects

## Migration Success Criteria

✅ All 4 criteria must be met:

1. **No Broken Records**: `SELECT COUNT(*) FROM subjects WHERE applicable_to_levels = '{}' OR applicable_to_levels IS NULL` returns 0

2. **Complete Subject Coverage**: 
   - Early Years (0-2): 6+ subjects
   - Primary (3-8): 10+ subjects
   - JSS (9-11): 14+ subjects
   - SS (12-14): 18+ subjects

3. **Department Mapping**: SS subjects have correct department values
   - SCIENCE: Biology, Chemistry, Physics, Further Mathematics
   - COMMERCIAL: Economics, Accounting, Business Studies
   - HUMANITIES: Government, Literature in English

4. **Registration Components Work**:
   - Student registration shows correct subjects for selected class
   - Student registration shows correct subjects for selected department (SS)
   - Teacher registration shows correct subjects for selected class
   - Teacher registration shows correct subjects for selected department (SS)

## Rollback (if needed)

If migration causes issues, revert by:

1. Delete all subjects that have `is_active = FALSE` (from migration cleanup)
2. Or delete all subjects and re-run migrations 100, 105 in sequence

However, this should not be necessary as migration 107 uses INSERT ... ON CONFLICT DO UPDATE pattern to safely upsert records.

## Timeline

- **Total migration time**: 2-5 seconds
- **Testing time**: 5-10 minutes (to verify all 4 test cases above)
- **Deployment risk**: LOW (uses safe INSERT ... ON CONFLICT pattern)

## Next Steps After Migration

1. Execute migration 107 in Supabase
2. Run post-migration verification queries
3. Test student/teacher registration with all class levels
4. Verify subjects are properly filtered by department for SS classes
5. Commit changes to git
6. Document completion

