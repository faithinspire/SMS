# Fix RLS Policy Violation on Supabase Storage

## Problem

You're getting this error when uploading student photos:

```
❌ Photo upload failed: Error: Upload failed: new row violates row-level security policy
```

This means **RLS (Row-Level Security) is still enabled on the storage bucket**, even though you disabled it for database tables.

---

## Root Cause

Supabase Storage has **separate RLS policies** from the database. They must be configured independently:

- ✅ Database RLS: Can be disabled via `ALTER TABLE ... DISABLE ROW LEVEL SECURITY`
- ⚠️ Storage RLS: Must be disabled via Storage Policies in the Supabase Dashboard

---

## Solution: Disable RLS on Storage Bucket

### Step 1: Go to Supabase Dashboard

1. Open https://app.supabase.com
2. Select your project
3. Click **Storage** (left sidebar)

### Step 2: Select the Bucket

1. Find `student-documents` bucket
2. Click on it to open settings
3. Look for **Policies** tab

### Step 3: View Current Policies

You should see RLS policies like:
- `Policy 1: Public read`
- `Policy 2: Authenticated uploads`
- etc.

### Step 4: Delete All RLS Policies

For each policy:
1. Click the **...** menu
2. Select **Delete**
3. Confirm deletion

### Step 5: Set Bucket to Public (No RLS)

1. Go back to bucket list
2. Right-click the `student-documents` bucket
3. Select **Edit bucket**
4. Toggle **Public bucket** to ON
5. Ensure **Row Level Security** is OFF/DISABLED
6. Click **Save**

### Step 6: Verify No RLS

After saving:
- Public: **ON**
- Row Level Security: **OFF**
- Policies: **None** (all deleted)

---

## Alternative: Use Service Role Key (If You Can't Disable RLS)

If you **must keep RLS enabled**, use the service role key instead of anonymous access:

```typescript
import { createClient } from '@supabase/supabase-js'

// Create client with SERVICE ROLE KEY (not anon key)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // ← Use this, not anon key
)

// Then upload with:
const { data, error } = await supabaseAdmin.storage
  .from('student-documents')
  .upload(filePath, photoFile, { upsert: true })
```

**WARNING:** Service role key is extremely sensitive. Only use on backend/API routes, never in frontend code.

---

## Recommended Solution: Make Bucket Public (No RLS)

For a student photo bucket, the safest approach is:

1. **Make bucket PUBLIC** (no authentication required)
2. **Disable RLS** (no row-level security policies)
3. Use **anonymous key** (what your code already does)

This is standard for:
- Public avatars
- Public photos
- Public documents
- Public PDFs

### Why This Works

- Students need to upload photos during registration
- Photos should be publicly viewable on profiles
- No sensitive data in photos (just pictures)
- RLS is overkill for public student photos

---

## Verify the Fix

After disabling RLS on the bucket:

1. Try student registration again
2. Upload a test photo
3. Check browser console for:
   ```
   ✅ Photo uploaded successfully
   ✅ Photo public URL: https://...
   ```

4. Verify photo appears in student profile

---

## What Happens After Fix

### Before Fix:
```
❌ Upload fails
❌ RLS policy violation
❌ Student registration blocked
❌ Photo not stored
```

### After Fix:
```
✅ Upload succeeds
✅ Photo stored in Supabase Storage
✅ Student registration completes
✅ Photo displays on profile
```

---

## Prevention: Check Storage Settings First

For any Supabase bucket used for:
- User uploads
- Public documents
- Media storage

Always verify:
1. Bucket exists and is named correctly
2. Public access is enabled
3. RLS is disabled (unless specifically needed)
4. Your frontend has the correct bucket name

---

## Troubleshooting

### Still Getting "RLS Policy Violation"?

1. Verify you deleted ALL policies
2. Verify RLS toggle is OFF
3. Hard refresh browser (Ctrl+Shift+Del)
4. Wait 10 seconds for Supabase to update
5. Try upload again

### Bucket Still Says "Private"?

1. Go back to bucket settings
2. Click **Edit bucket**
3. Toggle **Make public** to ON
4. Check **Row Level Security** is OFF
5. Click **Update** or **Save**

### Upload Still Fails?

Check error message in browser console:
- `Bucket not found` → Bucket name incorrect or deleted
- `RLS policy violation` → RLS still enabled
- `Unauthorized` → Bucket is private, needs authentication
- `403 Forbidden` → Permissions issue

---

## After RLS Is Fixed

Your code in `src/services/student.service.ts` will work as-is:

```typescript
const { data: uploadData, error: uploadError } = await supabase.storage
  .from('student-documents')
  .upload(filePath, photoFile, { upsert: true })

if (!uploadError) {
  console.log('✅ Photo uploaded successfully')
  // Get public URL and store in database
  const { data: { publicUrl } } = supabase.storage
    .from('student-documents')
    .getPublicUrl(filePath)
  return publicUrl
}
```

---

## Summary

| Item | Setting |
|------|---------|
| Bucket Name | `student-documents` |
| Public | **YES** |
| RLS Enabled | **NO** |
| Policies | **None** |
| Accessible By | Anonymous users (public) |
| Use Case | Student photo uploads |

---

**Status:** Ready to fix once you disable RLS on storage bucket

**Time to Fix:** 2 minutes in Supabase Dashboard

**After Fix:** Student photo uploads will work ✅
