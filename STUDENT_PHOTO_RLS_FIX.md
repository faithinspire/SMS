# Fix Student Photo Upload - RLS Policy Violation

## Problem
```
❌ Photo upload failed: Error: Upload failed: new row violates row-level security policy
```

## Root Cause
RLS (Row-Level Security) is **enabled on the Supabase Storage bucket**, blocking anonymous uploads.

---

## Quick Fix (2 Steps)

### Step 1: Check Storage Configuration

Go to: http://localhost:3000/api/test/check-storage

This will show:
- ✅ What buckets exist
- ❌ Which ones are private/RLS-protected
- 🔧 What needs to be fixed

### Step 2: Disable RLS on Storage Bucket

**In Supabase Dashboard:**

1. Go to https://app.supabase.com → Your Project
2. Click **Storage** (left menu)
3. Find `student-documents` bucket
4. Click the bucket name to open it
5. Click **Settings** or **Edit Bucket**
6. Ensure:
   - ✅ **Public bucket** is toggled ON
   - ✅ **Row Level Security** is toggled OFF
7. Click **Save**

**Verify in the bucket policies:**
- Should show: **No policies** or **0 policies**
- If policies exist, delete them all:
  - Click **...** next to each policy
  - Select **Delete Policy**
  - Confirm

---

## What Changed in Code

### Updated Error Handling (src/services/student.service.ts)

The code now:
1. **Detects RLS violations** specifically:
   ```typescript
   if (uploadError.message?.includes('violates')) {
     console.error('❌ RLS Policy Violation on storage bucket')
     console.error('   SOLUTION: Disable RLS on student-documents bucket')
     return null // Continue without photo
   }
   ```

2. **Logs clear instructions**:
   ```
   ❌ RLS Policy Violation on storage bucket
   The storage bucket has RLS policies that block uploads
   SOLUTION: Disable RLS on "student-documents" bucket OR use service role
   Photo upload skipped - student registration continues
   ```

3. **Continues registration gracefully**:
   - Photo upload fails ❌
   - Student registration succeeds ✅
   - Admin can retry photo upload later

### Updated Form UI (src/components/forms/StudentRegistrationForm.tsx)

Now shows:
```
Student Photo (Optional)
[Choose File]

Note: Photo upload is optional. If it fails, student registration will still complete.
```

---

## How to Fix (Detailed Steps)

### Option A: Disable RLS (Recommended for Public Photos)

1. **Open Supabase Dashboard**
   - https://app.supabase.com

2. **Select Your Project**
   - Click on your SMS project

3. **Navigate to Storage**
   - Left sidebar → Storage

4. **Click "student-documents" Bucket**
   - If it doesn't exist, create it first

5. **Open Bucket Settings**
   - Click the bucket name, then "Settings"
   - OR: Click the three dots (...) → "Edit bucket"

6. **Update Settings**
   ```
   Bucket Name: student-documents
   Public: ✅ ON
   Row Level Security: ❌ OFF (disabled)
   ```

7. **Delete All Policies**
   - Click "Policies" tab
   - For each policy, click (...) → Delete
   - Confirm all deletions
   - Result: "No policies" or empty list

8. **Save Changes**
   - Click Update/Save

9. **Verify**
   - Refresh page
   - Bucket should show: Public ✅, RLS ❌

### Option B: Use Service Role Key (For RLS-Protected Buckets)

If you **must keep RLS** for security:

**Update src/services/student.service.ts:**

```typescript
import { createClient } from '@supabase/supabase-js'

// Use service role key (only on backend)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

private static async uploadStudentPhoto(...) {
  // Use supabaseAdmin instead of supabase
  const { data, error } = await supabaseAdmin.storage
    .from('student-documents')
    .upload(filePath, photoFile, { upsert: true })
    // ... rest of code
}
```

**IMPORTANT:** 
- ⚠️ Only use service role key on **backend/API routes**
- ❌ NEVER expose service role key in frontend code
- ⚠️ Requires moving upload to an API endpoint

---

## Testing the Fix

### Test 1: Check Storage Config

**URL:** http://localhost:3000/api/test/check-storage

**Expected Response:**
```json
{
  "status": "success",
  "buckets": [
    {
      "name": "student-documents",
      "public": true
    }
  ],
  "errors": [],
  "recommendations": [
    "✅ Storage configuration looks correct"
  ]
}
```

### Test 2: Upload Student Photo

1. Go to: http://localhost:3000/school-admin/dashboard
2. Click **Students** tab
3. Click **Register New Student**
4. Fill out form
5. Select photo file
6. Submit

**Expected:**
```
✅ Student registered successfully!
Admission Number: 2026-SSA-0001
Student PIN: 123456

✅ Photo uploaded successfully
✅ Photo public URL: https://...
```

### Test 3: Verify Photo Appears

1. Go to student profile
2. Photo should display
3. Refresh page
4. Photo still visible

---

## Troubleshooting

### Issue: Still Getting "RLS Policy Violation"

**Solution:**
1. Check Supabase Dashboard again
2. Verify ALL policies are deleted
3. Verify RLS toggle is OFF
4. Verify Public toggle is ON
5. Wait 10 seconds for changes to propagate
6. Hard refresh browser: Ctrl+Shift+Del
7. Try upload again

### Issue: Can't Find Bucket Settings

**Solution:**
1. Go to Supabase Dashboard
2. Click **Storage** in left sidebar
3. See list of buckets
4. Right-click on "student-documents"
5. Select **Edit bucket**

### Issue: "Bucket not found" Error

**Solution:**
1. Bucket doesn't exist yet
2. Create it:
   - Storage → Create Bucket
   - Name: `student-documents`
   - Public: ON
   - Create
3. Then disable RLS policies

### Issue: Photo Uploads but Doesn't Display

**Solution:**
1. Verify bucket is PUBLIC
2. Verify photo URL in database
3. Try accessing URL directly in browser
4. If 403 Forbidden → bucket is still private
5. If 200 OK → photo exists but code issue

---

## Understanding the Error

### Why "Row-Level Security Policy" Matters

```
Supabase Storage RLS:
├── Enables fine-grained access control
├── Can restrict based on:
│   ├── User ID
│   ├── User role
│   ├── User school
│   └── Custom claims
└── For public photos: SHOULD BE DISABLED

Public Storage Bucket (No RLS):
├── Anyone can read files
├── Authenticated users can upload (if configured)
├── Best for: Avatars, public PDFs, profile pictures
└── Our use case: Student photos on profiles
```

### When to Keep RLS

Keep RLS ON for:
- ❌ Private documents (contracts, invoices)
- ❌ Sensitive files (medical records, grades)
- ❌ Payroll information
- ❌ Employee-only resources

Keep RLS OFF for:
- ✅ Public avatars
- ✅ Profile pictures
- ✅ Public documents
- ✅ Downloadable resources

---

## Summary

| Issue | Cause | Fix |
|-------|-------|-----|
| RLS Policy Violation | RLS enabled on bucket | Disable RLS in Supabase |
| Bucket not found | Bucket doesn't exist | Create bucket in Supabase |
| Upload fails silently | Network issue or permissions | Check browser console |
| Photo doesn't display | Wrong bucket name or permissions | Verify bucket is public |

---

## What Works After Fix

✅ Student registration form loads  
✅ Photo file selection works  
✅ Upload succeeds without error  
✅ Photo displays on student profile  
✅ Photo persists after page refresh  
✅ Student can be registered without photo (optional)  
✅ Console shows helpful error messages if upload fails  

---

## Next Steps

1. ✅ Check storage config: http://localhost:3000/api/test/check-storage
2. ✅ Fix RLS in Supabase Dashboard (2 minutes)
3. ✅ Try student registration with photo
4. ✅ Verify photo displays
5. ✅ Done!

---

**Time to Fix:** 5 minutes  
**Difficulty:** Very Easy (clicking in Supabase Dashboard)  
**Result:** Student photos upload and display correctly ✅
