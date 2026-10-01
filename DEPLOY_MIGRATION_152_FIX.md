# Deployment Instructions - Migration 152 Fix

## The Problem
Migration 152 was using `ON CONFLICT (column_list) DO NOTHING` with an `INSERT INTO ... SELECT` statement, but Supabase was reporting:
```
ERROR: 42P10: there is no unique or exclusion constraint matching the ON CONFLICT specification
```

This error occurs because the unique constraints don't exist yet when using `CREATE TABLE IF NOT EXISTS` with `ON CONFLICT` on a SELECT query.

## The Solution
Replaced the problematic `ON CONFLICT` clauses with PL/pgSQL `DO` blocks that:
1. Use `EXISTS` checks instead of `ON CONFLICT`
2. Properly handle school iteration
3. Create sessions for schools without them
4. Create default terms (First, Second, Third) for each session
5. Skip duplicates gracefully with `EXCEPTION WHEN others THEN NULL`

## How to Deploy

### Option 1: Manual Vercel Deployment (Recommended)
```bash
# 1. Push the fix
git push origin main

# 2. Go to Vercel Dashboard
# https://vercel.com/dashboard/projects/sms/deployments

# 3. Click "Redeploy" on latest commit
# Or use Vercel CLI:
vercel --prod --yes
```

### Option 2: Direct Supabase Migration (if needed)
1. Go to Supabase Dashboard → SQL Editor
2. Copy-paste the contents of `database/migrations/152_add_academic_core_tables.sql`
3. Run the migration
4. Check for successful completion (no errors)

## What Gets Created

### Tables
- `academic_sessions`: School academic years (e.g., "2024/2025")
- `academic_terms`: Terms within sessions (First/Second/Third)

### Indexes
- Fast queries by school_id, is_active flags, session references

### Data
- One session per school: "2024/2025" (starting Sept 2024)
- Three default terms per session with Nigerian calendar dates:
  - First Term: Sept 1 - Nov 30
  - Second Term: Dec 1 - Feb 28
  - Third Term: Mar 1 - May 31

## Verification

After deployment, verify:

```sql
-- Check sessions created
SELECT school_id, session_year, is_active FROM academic_sessions LIMIT 5;

-- Check terms created  
SELECT school_id, term_name, term_order, start_date, end_date 
FROM academic_terms 
LIMIT 10;

-- Count by school
SELECT COUNT(DISTINCT school_id) as schools_with_sessions 
FROM academic_sessions;
```

## Expected Results
✅ No SQL errors during migration
✅ Sessions table populated with one entry per school
✅ Terms table populated with 3 entries per session (9 per school)
✅ Results page can now fetch data without errors
✅ Academic page displays sessions and terms correctly

## Rollback (if needed)

If something goes wrong, simply drop the tables:
```sql
DROP TABLE IF EXISTS academic_terms CASCADE;
DROP TABLE IF EXISTS academic_sessions CASCADE;
```

Then re-run migration 152 with the fix.

---

**Status**: ✅ Ready for deployment
**Last Updated**: Sept 28, 2026
