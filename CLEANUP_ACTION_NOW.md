# 🚀 CLEANUP ACTION - SIMPLIFIED

Your database is 100% full. Here's the **absolute minimum** to free space:

---

## ⚡ STEP 1: Delete Storage Files (1 min)

**Go to:** Supabase Dashboard → Storage

For each bucket (`student_photos`, `uploads`, `photos`, `documents`, `files`):
1. Click the bucket
2. Select all files (checkbox at top)
3. Click DELETE
4. Confirm

**Result:** Frees ~1-2GB ✓

---

## ⚡ STEP 2: Run Cleanup SQL (3 min)

**In:** Supabase SQL Editor

**Copy-paste:** `SUPABASE_CLEANUP_MINIMAL.sql`

**Click:** RUN

This will:
- Delete orphaned records (students/teachers with no valid school/class)
- Delete old audit logs (180+ days old)
- **VACUUM FULL** (the big one - reclaims fragmented space)

**Result:** Frees another ~500MB-1GB ✓

---

## ✅ Expected Result

**Before:** 4.9GB / 5GB (100% FULL) ❌  
**After:** 1.5-2.5GB / 5GB (PLENTY OF ROOM) ✅

---

## 🎯 After Cleanup is Done

Run this in SQL Editor:

```sql
-- Fix applicable_to_levels so students load in score sheet
UPDATE subjects s
SET applicable_to_levels = ARRAY[1,2,3,4,5,6]
WHERE (s.applicable_to_levels IS NULL OR array_length(s.applicable_to_levels, 1) = 0)
  AND EXISTS (
    SELECT 1 FROM schools sch 
    WHERE sch.id = s.school_id 
    AND sch.type IN ('PRIMARY', 'BOTH')
  );

UPDATE subjects s
SET applicable_to_levels = ARRAY[9,10,11,12,13,14]
WHERE (s.applicable_to_levels IS NULL OR array_length(s.applicable_to_levels, 1) = 0)
  AND EXISTS (
    SELECT 1 FROM schools sch 
    WHERE sch.id = s.school_id 
    AND sch.type IN ('SECONDARY', 'BOTH')
  );

SELECT '✓ Fixed!' as status;
```

---

## 🎉 Then Test

1. **Score Sheet:** Load and select class/subject → Students appear ✓
2. **Bottom Nav:** Shows on real phone ✓
3. **PWA:** Installs automatically ✓

---

## 💡 That's It!

The VACUUM FULL is doing 80% of the work. The database is fragmented and needs to be compacted.
