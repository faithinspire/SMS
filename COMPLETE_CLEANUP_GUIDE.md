# 🔧 COMPLETE STORAGE CLEANUP GUIDE

**Current Status:** Database 100% FULL (ERROR 53100)  
**Goal:** Free 1-2GB of space so migrations can run

---

## ⚡ FASTEST PATH (10 minutes total)

### Step 1: Delete Storage Files via Dashboard (3 min)

1. Go to: **Supabase Dashboard** → Your Project → **Storage**
2. Select each bucket: `student_photos`, `uploads`, `photos`, `documents`, `files`
3. Click checkbox to select ALL files (Ctrl+A if available)
4. Click **DELETE** button
5. Confirm

✅ **Result:** Frees ~1-2GB (depending on how many photos uploaded)

---

### Step 2: Delete Old Database Records (3 min)

1. Go to: **Supabase Dashboard** → Your Project → **SQL Editor**
2. **Copy-paste this file:** `SUPABASE_CLEANUP_FINAL.sql` (fixed UUID issue)
3. Click **Run**
4. Wait for completion

✅ **Result:** Frees another ~200-500MB

---

### Step 3: Compact Database (2 min)

Still in SQL Editor, run:

```sql
VACUUM FULL ANALYZE;
```

✅ **Result:** Frees ~30% of remaining fragmented space

---

## ✅ VERIFICATION

Check your storage:

```sql
SELECT pg_size_pretty(pg_database_size('postgres')) as database_size;
```

**Expected:**
- **Before:** ~4.9GB / 5GB ❌
- **After:** ~1.5-2.5GB / 5GB ✅

---

## 🎯 ALTERNATIVE: Automated Cleanup (if dashboard deletion is slow)

If manual deletion via dashboard is too slow, use the Node.js script:

```bash
# Make sure you have .env.local with:
# - NEXT_PUBLIC_SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY

node cleanup-storage.js
```

This will:
1. Connect to Supabase
2. Delete all files from all buckets
3. Report total files deleted

---

## 📊 WHAT GETS DELETED?

### ✅ SAFE TO DELETE (Student Upload Files)
- Student photos (from student profile uploads)
- Documents (PDFs, images uploaded)
- Old temporary files
- Unused avatars

### ❌ DO NOT DELETE (Application Data)
- `schools`, `students`, `teachers`, `classes` tables
- `subjects`, `student_subjects` tables
- `score_sheets`, `cbt_results`, `transactions` tables
- These stay intact

---

## 🚨 STEP BY STEP WITH SCREENSHOTS

### For Storage Deletion:

1. **Open Supabase Dashboard**
   - URL: https://app.supabase.com

2. **Select Your Project**
   - Click on project name

3. **Go to Storage**
   - Left sidebar → Storage

4. **Select Bucket**
   - Click on "student_photos"

5. **Select All Files**
   - Click checkbox next to search box (selects all)

6. **Delete**
   - Click "Delete" button
   - Confirm

7. **Repeat for other buckets**
   - `uploads`, `photos`, `documents`, `files`

---

## 📝 CLEANUP SCRIPTS PROVIDED

| File | Purpose |
|------|---------|
| `SUPABASE_CLEANUP_FINAL.sql` | Delete old records + compact database (FIXED UUID issue) |
| `STORAGE_CLEANUP_VIA_API.md` | Instructions for Storage API deletion |
| `cleanup-storage.js` | Automated Node.js cleanup script |
| `COPY_PASTE_CLEANUP_SQL.sql` | Individual SQL snippets (reference only) |

---

## ⚠️ WARNINGS

1. **VACUUM FULL locks database:** 
   - Don't run during active use
   - Database unavailable for 5-30 minutes
   - Run during off-hours

2. **Backup first:**
   - Before deleting anything
   - Go to: Supabase Dashboard → Backups → Create Manual Backup

3. **Storage deletion:**
   - Cannot directly delete via SQL
   - Must use Storage API or dashboard
   - That's why we can't run 078 migration yet

---

## 🎯 NEXT: Deploy Fixes

Once space is freed:

1. **Run migration 079** (zero-storage fix for applicable_to_levels)
2. **Test score sheet:** Should load students
3. **Deploy to production**

---

## 📞 STUCK?

1. Check Supabase status: https://status.supabase.com
2. Contact support: support@supabase.com
3. Include: Project URL + "ERROR 53100" in message

---

## ✅ CHECKLIST

- [ ] Created manual backup
- [ ] Deleted storage files via dashboard (or Node.js script)
- [ ] Ran SUPABASE_CLEANUP_NO_STORAGE.sql
- [ ] Ran VACUUM FULL ANALYZE
- [ ] Verified free space (pg_database_size shows 1.5-2.5GB used)
- [ ] Ready to run migration 079

Once all ✓, you're ready to deploy fixes!
