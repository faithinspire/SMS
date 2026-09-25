# MIGRATION DEPLOYMENT - Execute in Supabase (IN ORDER)

## CRITICAL: Execute Migrations in Order

1. **Migration 145 FIRST** - Adds schema columns
2. **Migration 146 SECOND** - Populates complete curriculum

---

## Step 1: Execute Migration 145 (Schema)

Copy and run in Supabase SQL Editor:
`database/migrations/145_add_subject_type_and_department.sql`

This adds:
- `subject_type` column (CORE, ELECTIVE, VOCATIONAL)
- `department` column (for SS stream filtering)
- `is_active` column (status flag)
- Indices for better query performance

**Expected Result:** ✅ Columns added successfully

---

## Step 2: Execute Migration 146 (Data)

Copy and run in Supabase SQL Editor:
`database/migrations/146_complete_nigerian_curriculum_all_schools.sql`

This:
- Creates complete Nigerian curriculum (130+ subjects)
- Links all subjects to ALL existing schools
- Populates applicable_to_levels for each subject
- Creates auto-init trigger for new schools

### Step 3: Verify Success
After execution completes, run this verification query:

```sql
-- Verify all schools have subjects
SELECT 
  COUNT(DISTINCT school_id) as schools_with_subjects,
  COUNT(*) as total_subject_links,
  (SELECT COUNT(*) FROM schools) as total_schools
FROM subjects
WHERE is_active = TRUE;

-- Sample verification: Check one school's curriculum
SELECT 
  level,
  COUNT(*) as subject_count
FROM (
  SELECT DISTINCT 
    UNNEST(applicable_to_levels) as level,
    code
  FROM subjects
  WHERE school_id = (SELECT id FROM schools LIMIT 1)
  AND is_active = TRUE
) t
GROUP BY level
ORDER BY level;
```

### Step 4: Test Registrations

#### Test 1: Teacher Registration
1. Go to /auth/staff/register
2. Select a school
3. Select a class (e.g., Primary 1)
4. Verify subjects appear for that class level
5. Subjects should be filtered by class level (not ALL subjects)

#### Test 2: Student Registration (Admin Modal)
1. Go to school admin dashboard
2. Click "Register New Student"
3. Select a class
4. Verify subjects appear filtered by class level
5. For SS classes, department dropdown should appear

### Step 5: Create Test School
1. Go to Super Admin dashboard
2. Create a new test school
3. Go to teacher registration on that school
4. Select a class
5. Verify all subjects appear (auto-initialized by trigger)

## Success Criteria

✅ All existing schools have complete curriculum
✅ Teacher registration shows subjects filtered by class level
✅ Student registration shows subjects filtered by class level
✅ SS classes show department selection
✅ New schools auto-initialize with complete curriculum
✅ No manual admin work needed to populate subjects
✅ All registrations show proper subjects immediately

## Rollback (if needed)

If you need to revert this migration:

```sql
-- DELETE all subject links created by this migration
-- This preserves the subjects table structure but removes old data
BEGIN;

DELETE FROM subjects 
WHERE created_at >= NOW() - INTERVAL '1 hour'
AND is_active = TRUE;

COMMIT;
```

Note: Adjust the time interval as needed based on when the migration was executed.

## Important Notes

- Migration 146 uses PostgreSQL array operators for proper filtering
- All subjects have `applicable_to_levels` array for level-based filtering
- Department filtering works for SS classes (levels 6-8)
- The trigger automatically initializes curriculum for new schools
- No manual subject population needed anymore

## Questions or Issues?

If subjects don't appear in registrations:
1. Verify Migration 146 executed successfully
2. Check that subjects table has rows for your school_id
3. Confirm `applicable_to_levels` array contains the class level
4. Verify `is_active = true`
5. Check CanonicalSubjectService is being used (not direct Supabase queries)
