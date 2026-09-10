# DELETE STORAGE FILES (Storage API Method)

**Problem:** Supabase blocks direct SQL deletion from storage.objects  
**Solution:** Use the Storage API to delete files

---

## Option 1: Via Supabase Dashboard (Easiest)

1. **Open:** Supabase Dashboard → Your Project → **Storage**
2. **Click on each bucket:** `student_photos`, `uploads`, `photos`, `documents`
3. **Select all files** (check box at top)
4. **Click Delete** button
5. **Confirm deletion**

⏱️ **Time:** ~5 minutes per bucket

---

## Option 2: Via JavaScript (Programmatic)

Create a cleanup script and run in your Node.js environment:

```javascript
// cleanup-storage.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanupStorage() {
  const buckets = ['student_photos', 'uploads', 'photos', 'documents', 'files'];
  
  for (const bucket of buckets) {
    console.log(`Cleaning bucket: ${bucket}`);
    
    // List all files in bucket
    const { data: files, error: listError } = await supabase
      .storage
      .from(bucket)
      .list('', { limit: 10000 });
    
    if (listError) {
      console.error(`Error listing ${bucket}:`, listError);
      continue;
    }
    
    if (!files || files.length === 0) {
      console.log(`✓ ${bucket} is empty`);
      continue;
    }
    
    // Delete all files
    const fileNames = files.map(f => f.name);
    const { error: deleteError } = await supabase
      .storage
      .from(bucket)
      .remove(fileNames);
    
    if (deleteError) {
      console.error(`Error deleting from ${bucket}:`, deleteError);
    } else {
      console.log(`✓ Deleted ${fileNames.length} files from ${bucket}`);
    }
  }
}

cleanupStorage().catch(console.error);
```

**To run:**

```bash
npm install @supabase/supabase-js
node cleanup-storage.js
```

---

## Option 3: Via cURL (Command Line)

```bash
# List files in bucket
curl -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  "https://YOUR_PROJECT_ID.supabase.co/storage/v1/object/list/student_photos"

# Delete a single file
curl -X DELETE \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  "https://YOUR_PROJECT_ID.supabase.co/storage/v1/object/student_photos/FILENAME"
```

---

## How Much Space?

Deleting all storage files typically frees:
- **Without cleanup:** ~4.9GB / 5GB (FULL) ❌
- **After storage cleanup:** ~2-3GB / 5GB ✓

---

## Next: Run Database Cleanup

After cleaning storage, run the SQL cleanup:

**File:** `SUPABASE_CLEANUP_NO_STORAGE.sql`

This will delete:
- Old test records
- Orphaned data
- Old audit logs
- Compact the database

Expected: Another **200-500MB freed**

---

## Final: VACUUM FULL

**Warning:** Locks database for 5-30 minutes

```sql
VACUUM FULL ANALYZE;
```

This reclaims fragmented space (30-50% of remaining).

---

## Expected Result After All Cleanup

- **Before:** 4.9GB / 5GB (100% FULL) ❌
- **After storage delete:** 2.5GB / 5GB ✓
- **After VACUUM FULL:** 1.5-2GB / 5GB ✓✓

Now you have plenty of room for migrations!
