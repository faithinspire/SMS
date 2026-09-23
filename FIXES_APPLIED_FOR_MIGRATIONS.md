# Migration Fixes Applied

## Migration 138 - School Deletion Cascade

**Issues Fixed:**
1. ✅ Changed `cbt_tests` → `cbt_exams` (cbt_tests table doesn't exist)
2. ✅ Updated RLS DISABLE for `cbt_exams` instead of `cbt_tests`

**Root Cause:**
- Database uses `cbt_exams` table, not `cbt_tests`
- All CBT tables properly reference schools(id) with ON DELETE CASCADE

**Status:** Ready to deploy ✅

---

## Migration 139 - Subject Population

**Issues Fixed:**
1. ✅ Removed reference to non-existent `subject_applicable_levels` table
2. ✅ Uses existing `description` column (added in Migration 050)
3. ✅ Uses existing `level` column for grade levels (Prep=0, JSS=7, SSS=10)
4. ✅ Updated INSERT to use `ON CONFLICT (school_id, name) DO NOTHING`
5. ✅ Populates existing `section`, `level`, `department`, `is_active`, `subject_type` columns

**Root Cause:**
- Subject population attempted to use a many-to-many junction table that was never created
- Subjects table already had all necessary columns from Migration 050

**Fixed Approach:**
- Master subjects (school_id = NULL) created first
- Level column set for each subject type
- Subjects auto-linked to all existing schools

**Status:** Ready to deploy ✅

---

## Deploy Commands

```bash
cd c:\Users\OLU\Desktop\SMS

git add database/migrations/137_rebuild_broadcasts_clean.sql
git add database/migrations/138_fix_school_deletion_cascade.sql
git add database/migrations/139_populate_all_subjects_prep_to_ss3.sql
git add src/app/api/broadcasts/send/route.ts
git add src/app/api/schools/delete/route.ts

git commit -m "Deploy: Fixed migrations 138 & 139 + broadcast rebuild + school deletion + subjects"

git push -u origin main
```

All migrations should now execute without errors.
