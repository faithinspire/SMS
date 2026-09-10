# MIGRATION 017: Create Bridge Tables

## Status
✅ CREATED but NOT YET APPLIED TO DATABASE

## What This Migration Does
Creates the missing bridge tables that link students to their class teachers and subject teachers:
- `student_class_teachers` - Links each student to their class teacher
- `student_subject_teachers` - Links each student to each of their subject teachers

These tables are CRITICAL for the system to work properly. Without them:
- Teachers cannot see their students in the dashboard
- Students cannot access exams for their subjects
- Student-teacher relationships don't exist

## File Location
```
database/migrations/017_create_bridge_tables.sql
```

## How to Apply (Supabase SQL Editor)

### Option 1: Manual SQL Execution
1. Go to: https://app.supabase.com → Your Project → SQL Editor
2. Click "New Query"
3. Copy the content of `database/migrations/017_create_bridge_tables.sql`
4. Paste it into the SQL editor
5. Click "Run"
6. Verify success (green checkmark)

### Option 2: Using Supabase CLI (if installed)
```bash
supabase db pull  # Pull latest schema
supabase db push  # Push migrations
```

## Verification After Application

Run these queries in SQL Editor to verify:

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('student_class_teachers', 'student_subject_teachers');

-- Should return 2 rows:
-- student_class_teachers
-- student_subject_teachers

-- Check indexes
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('student_class_teachers', 'student_subject_teachers')
ORDER BY tablename, indexname;

-- Should see multiple indexes for both tables
```

## Next Steps After Migration Applied

Once this migration is applied, the following will work:

1. **Student Registration**
   - Students will be automatically linked to class teachers
   - Students will be automatically linked to subject teachers based on their subject selection

2. **Teacher Dashboard**
   - Teachers will see their class students
   - Teachers will see their subject students separately

3. **CBT Exams**
   - Students will only see exams for subjects they're registered for

4. **Data Integrity**
   - Multi-tenancy isolation will be maintained
   - No cross-school data leakage

## Current Code Status

✅ All code already references these tables:
- `src/services/user-registration.service.ts` - Creates links on student registration
- `src/services/teacher.service.ts` - Queries to get student lists
- `src/services/cbt.service.ts` - Determines exam eligibility
- Migration 017 created - Ready to apply

## DO THIS BEFORE ATTEMPTING TO REGISTER STUDENTS

1. Apply migration 015 (if not already applied) - Creates classes and subjects
2. Apply migration 017 (this file) - Creates bridge tables
3. Populate school data using: `POST /api/setup/init-school-data`
4. Now you can register students and teachers

## Questions?

Check these files for context:
- COMPLETE_SYSTEM_GUIDE.md - Full system overview
- ARCHITECTURE.md - Database architecture
- `database/migrations/015_auto_create_school_data.sql` - School data structure
