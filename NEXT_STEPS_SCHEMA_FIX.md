# Next Steps: Apply Database Schema Fixes

## Overview

Two critical PostgreSQL error codes have been fixed:
- **42703**: "column 'session_year' does not exist"
- **42P10**: "there is no unique or exclusion constraint matching the ON CONFLICT specification"

These errors were preventing super admin from registering schools. The fixes are now ready.

## What Was Changed

### Files Modified
1. **`database/migrations/155_fix_on_conflict_constraints.sql`**
   - Replaced with idempotent version using DO/EXCEPTION blocks
   - All `ALTER TABLE ADD CONSTRAINT` statements are now safe to re-run

2. **`database/migrations/156_complete_schema_fix.sql`**
   - Completely rewritten as comprehensive schema fixer
   - Ensures all required columns exist
   - Ensures all required constraints exist
   - Tests that ON CONFLICT statements work
   - Fully idempotent (safe to run multiple times)

### What Was NOT Changed
- TypeScript API code (no changes needed - uses Supabase client layer)
- Existing migrations (preserved for history/traceability)
- Table data (migrations only add columns/constraints, don't modify data)

---

## How to Apply the Fixes

### Option 1: Use Supabase SQL Editor (Recommended for immediate testing)

1. **Open Supabase Console**
   - Go to: https://app.supabase.com/project/[PROJECT_ID]/sql/new
   - Replace `[PROJECT_ID]` with your actual Supabase project ID

2. **Copy the SQL**
   - Open file: `APPLY_SCHEMA_FIXES_NOW.sql` (in workspace root)
   - Copy ALL content

3. **Execute in Supabase**
   - Paste into Supabase SQL Editor
   - Click the **"RUN"** button (or press Ctrl+Enter)
   - Wait for execution to complete

4. **Check the Notices**
   - Click the "Notices" tab in the results panel
   - You should see messages like:
     ```
     Migration 155 - Step 1: Added unique constraint on schools(email)
     Migration 155 - Step 2: Added unique constraint on academic_sessions(school_id, session_year)
     ...
     Step 13: Verification - Found 2 required constraints
     Step 13: academic_sessions has 3 of 3 required columns
     ```
   - Look for any **ERROR** messages (warnings/notices are fine)

5. **Verify the Results**
   - Run this verification query in Supabase:
   ```sql
   SELECT 
     'SCHEMA FIX' as check,
     (SELECT COUNT(*) FROM information_schema.columns 
      WHERE table_name = 'academic_sessions' 
      AND column_name = 'session_year') as has_session_year,
     (SELECT COUNT(*) FROM information_schema.table_constraints
      WHERE constraint_name = 'academic_sessions_school_session_unique') as has_constraint,
     (SELECT COUNT(*) FROM schools) as school_count;
   ```
   - Expected: `1, 1, [any number]`

---

### Option 2: Use Migration System (Recommended for production/CI/CD)

If your deployment system supports automated migrations:

1. **Migrations are in correct files**:
   - `database/migrations/155_fix_on_conflict_constraints.sql`
   - `database/migrations/156_complete_schema_fix.sql`

2. **Run your standard migration command**, e.g.:
   ```bash
   npm run migrate
   # or
   supabase migration up
   # or
   your-deploy-script.sh
   ```

3. **Monitor the logs** for any errors

---

## After Applying the Fix

### Test School Registration API

1. **Call the API** (e.g., using Postman or curl):
   ```bash
   curl -X POST http://localhost:3000/api/superadmin/register-school \
     -H "Content-Type: application/json" \
     -d '{
       "school_name": "Test School",
       "school_email": "test@school.com",
       "admin_email": "admin@school.com",
       "admin_password": "SecurePass123!",
       "admin_name": "Admin Name",
       "phone": "+234-8000000000",
       "address": "123 Main Street",
       "subscription_plan": "premium",
       "school_type": "BOTH"
     }'
   ```

2. **Expected Response**:
   ```json
   {
     "success": true,
     "school_id": "uuid-here",
     "school_name": "Test School",
     "message": "School registered successfully with Nigerian curriculum",
     "seeding": {
       "success": true,
       "classesCreated": 12,
       "armsCreated": 36,
       "combosCreated": 36
     }
   }
   ```

3. **Check Browser Console**:
   - Should NOT see errors like:
     - "42703: column 'session_year' does not exist"
     - "42P10: there is no unique or exclusion constraint..."
     - "invalid input syntax for type uuid"

4. **Verify in Supabase**:
   - Check `schools` table - new school should exist
   - Check `academic_sessions` table - should have sessions for the new school
   - Check `academic_terms` table - should have terms for each session
   - Check `classes` and `arms` tables - should be populated

---

## Rollback Plan

**If something goes wrong**, you can:

1. **Do NOT delete anything** - the migrations only ADD columns and constraints
2. **Identify the specific issue** from error messages
3. **Re-run the migration** - it's idempotent (safe to run multiple times)
4. **Contact support** with:
   - The error message
   - The constraint names that failed
   - A screenshot of the Supabase console notices

---

## Verification Queries

Run these in Supabase SQL Editor to verify the fix worked:

### Check 1: Columns Exist
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'academic_sessions' 
AND column_name IN ('session_year', 'start_year', 'end_year', 'is_active')
ORDER BY column_name;
```
Expected: 4 rows (`end_year`, `is_active`, `session_year`, `start_year`)

### Check 2: Constraints Exist
```sql
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints
WHERE table_name IN ('academic_sessions', 'academic_terms', 'schools')
AND constraint_type = 'UNIQUE'
ORDER BY table_name, constraint_name;
```
Expected: Should include:
- `academic_sessions_school_session_unique`
- `academic_terms_school_session_term_unique`
- `schools_email_unique`

### Check 3: ON CONFLICT Works
```sql
-- This should NOT produce error 42P10
INSERT INTO academic_sessions (school_id, session_year, start_year, is_active)
SELECT id, '2024/2025', 2024, false FROM schools LIMIT 1
ON CONFLICT (school_id, session_year) DO NOTHING;

SELECT 'ON CONFLICT test passed' as result;
```
Expected: "ON CONFLICT test passed"

### Check 4: Data Integrity
```sql
SELECT 
  COUNT(*) as total_sessions,
  SUM(CASE WHEN session_year IS NULL THEN 1 ELSE 0 END) as null_sessions,
  SUM(CASE WHEN session_year = '' THEN 1 ELSE 0 END) as empty_sessions
FROM academic_sessions;
```
Expected: `null_sessions` and `empty_sessions` should be 0 (all filled)

---

## Troubleshooting

### If you see "duplicate_object" in notices
- **This is OK!** It means the constraint already existed from a previous attempt
- The migration is idempotent and skipped the duplicate

### If you see "Error adding..." messages
- **Check the SQLERRM** text that follows
- This tells you exactly what went wrong
- Common causes:
  - Missing parent table
  - Wrong column type
  - Data violates new constraint

### If school registration still fails
1. Run all 4 verification queries above
2. Check the exact error in browser console
3. If it's still 42703 or 42P10, re-run the migration
4. If it's a different error, consult the API logs

### If school registration succeeds but no sessions/terms created
- Check the `/api/superadmin/register-school` response
- The `seeding` object should show `success: true`
- If `success: false`, check the error message
- Run this query to see if sessions were created:
  ```sql
  SELECT school_id, session_year, COUNT(*) 
  FROM academic_sessions 
  GROUP BY school_id, session_year;
  ```

---

## Summary

**Before**: Super admin couldn't register schools (42703 and 42P10 errors)
**After**: Super admin can register schools, which auto-create classes, arms, and curriculum

**Files to deploy**:
- ✅ `database/migrations/155_fix_on_conflict_constraints.sql` (updated)
- ✅ `database/migrations/156_complete_schema_fix.sql` (updated)

**Time to apply**: ~30 seconds in Supabase SQL Editor

**Risk level**: Very low (only adds columns/constraints, doesn't delete data)

---

## Questions?

Refer to:
- `SCHEMA_FIX_SUMMARY.md` - Detailed technical explanation
- `APPLY_SCHEMA_FIXES_NOW.sql` - Ready-to-paste SQL
- Migration files themselves - Full comments explaining each step
