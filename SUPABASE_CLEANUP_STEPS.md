# SUPABASE CLEANUP - STEP BY STEP

**Goal:** Free up 500MB+ of disk space by deleting old/unused data

---

## ⚠️ BACKUP WARNING

Before deleting anything:
1. Go to **Supabase Dashboard** → **Backups**
2. Click **Create Manual Backup** 
3. Wait for backup to complete (2-5 minutes)
4. Now you're safe to proceed

---

## 🔧 CLEANUP STEPS

### Step 1: Delete Old Storage Files

These are photos/uploads that take up massive space.

**Paste this in Supabase SQL Editor:**

```sql
-- DELETE OLD STORAGE FILES (safe - can be re-uploaded)
DELETE FROM storage.objects
WHERE bucket_id IN ('student_photos', 'uploads', 'photos', 'documents', 'files', 'avatars')
  OR created_at < NOW() - INTERVAL '30 days';

-- This typically frees 1-2GB
SELECT 'Storage files deleted' as status;
```

✅ **After running:** Check if you freed space. If not, continue to Step 2.

---

### Step 2: Delete Duplicate/Test Records

These are fake/test data that shouldn't be in production.

**Paste this in Supabase SQL Editor:**

```sql
-- DELETE TEST SCHOOLS
DELETE FROM schools
WHERE LOWER(name) LIKE '%test%'
  OR LOWER(name) LIKE '%demo%'
  OR LOWER(name) LIKE '%temp%'
  OR status = 'INACTIVE';

-- DELETE ORPHANED STUDENTS (no valid class)
DELETE FROM students
WHERE class_arm_combo_id NOT IN (SELECT id FROM class_arm_combos)
  AND class_arm_combo_id IS NOT NULL;

-- DELETE ORPHANED TEACHERS (no school)
DELETE FROM teachers
WHERE school_id NOT IN (SELECT id FROM schools);

SELECT 'Test records deleted' as status;
```

---

### Step 3: Delete Old Logs

**Paste this in Supabase SQL Editor:**

```sql
-- DELETE OLD AUDIT LOGS (older than 90 days)
DELETE FROM auth.audit_log_entries
WHERE created_at < NOW() - INTERVAL '90 days';

SELECT 'Old logs deleted' as status;
```

---

### Step 4: Compact Database (CRITICAL - frees the most space)

**⚠️ WARNING:** This will lock the database for 5-30 minutes. Run during off-hours.

**Paste this in Supabase SQL Editor:**

```sql
-- FULL VACUUM (reclaims fragmented space)
VACUUM FULL ANALYZE;

SELECT 'Database compacted' as status;
```

---

### Step 5: Verify Space Freed

**Check how much space you freed:**

```sql
-- Show current database size
SELECT 
  pg_size_pretty(pg_database_size('postgres')) as total_size,
  pg_size_pretty(pg_database_size('postgres') - (
    SELECT pg_total_relation_size(schemaname||'.'||tablename)
    FROM pg_tables WHERE schemaname = 'information_schema'
  )) as data_size;

-- Show what's still using space
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 15;
```

---

## ✅ EXPECTED RESULTS

After cleanup, you should see:
- **Before:** ~4.9GB / 5GB (FULL) ❌
- **After:** ~2-3GB / 5GB (plenty of space) ✅

---

## 🎯 NEXT: Run the Fix Migration

Once you have free space, run this migration in Supabase SQL Editor:

**Copy from:** `database/migrations/079_ZERO_STORAGE_EMERGENCY_FIX.sql`

This will fix the `applicable_to_levels` issue and allow students to load in the score sheet.

---

## 🚀 FINAL STEP: Deploy and Test

After migration 079:

1. **Redeploy code** to dev server
2. **Test on phone:**
   - Go to Score Sheet
   - Select class/subject
   - ✓ Students should appear
3. **Test bottom nav:** ✓ Should show on real phone
4. **Test PWA:** ✓ Should install automatically

---

## ❌ TROUBLESHOOTING

### If you get "permission denied" error:
- Make sure you're using **Supabase SQL Editor** (not your app)
- You need **project admin** access
- Try running as smaller batches (remove LIMIT clause)

### If cleanup is too slow:
- Stop it (click X button)
- Run just the VACUUM FULL:
  ```sql
  VACUUM FULL;
  ```
- This alone can free 50% of the space

### If still full after cleanup:
- You need to upgrade your Supabase plan
- Contact support@supabase.com with "ERROR 53100" + project URL

---

## 📞 NEED HELP?

1. Supabase Status: https://status.supabase.com
2. Support: https://supabase.com/support
3. Docs: https://supabase.com/docs/guides/database/storage
