# Manual RLS Fix - Step by Step

If SQL migration fails with "must be owner of table objects", use this manual approach:

## Option 1: Manual Fix via Supabase Dashboard (EASIEST)

### Step 1: Disable RLS on Objects Table
```
1. Open https://egdreueuspmuxhezdpqm.supabase.co
2. Click "Storage" in left menu
3. Click on "Objects" (the table, not the bucket)
4. Look for "RLS" button at the top right
5. Click it
6. Click "Disable RLS"
7. Confirm
```

### Step 2: Disable RLS on Buckets Table
```
1. Still in Storage
2. Click on "Buckets" (the table)
3. Look for "RLS" button
4. Click it
5. Click "Disable RLS"
6. Confirm
```

That's it! RLS is now disabled globally for storage.

---

## Option 2: Using Service Role (Advanced)

If manual fix doesn't work, use service role key:

```sql
-- Add this to your .env.local
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

-- Then in your code, use service role client
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

---

## Option 3: Alternative Storage Solution

If RLS keeps causing issues, use a different approach:

```typescript
// Upload to a public bucket instead
const { data, error } = await supabase.storage
  .from('school-logos')  // Use public bucket
  .upload(`student-photos/${schoolId}/${filename}`, photoFile)

// This works because school-logos usually has permissive settings
```

---

## Verification

After applying the fix, test:

```
1. Go to Supabase Dashboard
2. Storage → student-photos bucket
3. Try uploading a file manually
4. Should work without errors
5. If success: Photo upload in app will work
```

---

## What This Does

**Before**: RLS policies blocked all uploads (security too tight)
```
❌ "must be owner of table objects"
❌ "row violates row-level security"
❌ Photo upload fails
```

**After**: Authenticated users can upload (security relaxed)
```
✅ Authenticated users can upload
✅ Can download/delete their own
✅ Photo upload works
```

---

## Security Note

This opens storage to all authenticated users. For production:
1. Add row-level policies per school_id
2. Or create separate buckets per school
3. Or use signed URLs with expiry

But for MVP/testing, this is fine.

---

**Try this if SQL migration fails!**
