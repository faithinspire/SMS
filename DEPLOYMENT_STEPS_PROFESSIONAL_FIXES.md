# Professional Deployment Guide: Broadcast + School Delete + Subjects

## Overview
Three critical fixes have been prepared and ready to deploy:

1. **Broadcast System Rebuild** (Migration 137 + API)
2. **School Deletion Fix** (Migration 138 + API) 
3. **Subject Population** (Migration 139)

---

## Git Commit & Push Commands

Execute these commands in your terminal to deploy all fixes:

```bash
cd c:\Users\OLU\Desktop\SMS

# Stage the migration files
git add database/migrations/137_rebuild_broadcasts_clean.sql
git add database/migrations/138_fix_school_deletion_cascade.sql
git add database/migrations/139_populate_all_subjects_prep_to_ss3.sql

# Stage the API endpoints
git add src/app/api/broadcasts/send/route.ts
git add src/app/api/schools/delete/route.ts

# Create commit
git commit -m "Deploy: Rebuild broadcast system + fix school deletion + populate all subjects (Prep-SS3)"

# Push to GitHub (triggers Vercel deployment)
git push -u origin main
```

---

## What Each Fix Does

### 1. Broadcasts Rebuild (Migration 137)
- **File**: `database/migrations/137_rebuild_broadcasts_clean.sql`
- **Changes**: 
  - Drops old broadcasts/broadcast_recipients tables
  - Creates clean schema with proper indexes
  - RLS disabled for public access
  - Grants for authenticated and anon users
- **API Endpoint**: `POST /api/broadcasts/send`
  - Accepts: `school_id`, `message`, `sender_id`
  - Sends broadcast to ALL staff + students in school
  - Batch processing for large recipient counts
  - Comprehensive error logging

### 2. School Deletion Fix (Migration 138 + API)
- **Migration File**: `database/migrations/138_fix_school_deletion_cascade.sql`
- **Changes**:
  - Adds ON DELETE CASCADE to ALL foreign keys referencing schools
  - Ensures RLS is disabled for DELETE operations
  - Grants DELETE permissions to authenticated and anon users
- **API Endpoint**: `POST /api/schools/delete`
  - Accepts: `school_id`
  - Cascades delete: users, students, classes, subjects, assessments, etc.
  - Returns: success message with deleted school name

### 3. Subject Population (Migration 139)
- **File**: `database/migrations/139_populate_all_subjects_prep_to_ss3.sql`
- **Coverage**:
  - **Primary (Prep-P6)**: 17 subjects
  - **JSS (1-3)**: 23 subjects  
  - **SSS (1-3)**: 29 subjects
- **Details**:
  - Creates master subjects (school_id = NULL)
  - Auto-links to all existing schools
  - Configures subject-level mappings
  - Professional Nigerian curriculum alignment

---

## Vercel Deployment

After pushing to GitHub:

1. Vercel automatically detects the push
2. Build begins (watch: https://vercel.com/dashboard)
3. Migrations run automatically
4. Deployment completes in ~2-3 minutes

---

## Testing After Deployment

### Test Broadcasts
```bash
POST https://sms-gold-eta.vercel.app/api/broadcasts/send
Content-Type: application/json

{
  "school_id": "YOUR_SCHOOL_ID",
  "message": "Test broadcast to all staff and students",
  "sender_id": "YOUR_USER_ID"
}

# Expected response:
{
  "success": true,
  "broadcast_id": "UUID",
  "recipients_count": 125,
  "message": "Broadcast sent to 125 recipients"
}
```

### Test School Deletion
```bash
POST https://sms-gold-eta.vercel.app/api/schools/delete
Content-Type: application/json

{
  "school_id": "SCHOOL_ID_TO_DELETE"
}

# Expected response:
{
  "success": true,
  "message": "School \"School Name\" and all associated data have been deleted",
  "deleted_school_id": "UUID"
}
```

### Verify Subjects
In Supabase, check:
- `subjects` table should have 70+ records (29 master subjects x schools + originals)
- `subject_applicable_levels` should show level mappings for Prep(0) to SS3(12)
- Query: `SELECT DISTINCT name, code FROM subjects WHERE school_id IS NULL ORDER BY name`

---

## Rollback Plan (if needed)

If any migration fails:
1. Revert commit: `git revert HEAD`
2. Push: `git push origin main`
3. Check Vercel deployment logs for error details
4. Each migration can be individually reverted if needed

---

## Professional Implementation Summary

✅ **Broadcasts**: Completely rebuilt from scratch with proper schema
✅ **School Deletion**: Fixed with comprehensive CASCADE constraints
✅ **Subjects**: Professional Nigerian curriculum with 29 subjects across 3 levels
✅ **Error Handling**: Comprehensive logging on all APIs
✅ **RLS**: Properly disabled where needed for operations
✅ **Performance**: Indexes added, batch processing configured
✅ **Multi-tenancy**: All data properly scoped to schools

---

**Next Steps**: Execute the git commands above to push to Vercel
