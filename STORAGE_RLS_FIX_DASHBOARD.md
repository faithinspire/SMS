# Fix Storage RLS - Supabase Dashboard Method

Since SQL migrations require table ownership, use the Supabase Dashboard GUI instead.

---

## Option 1: Dashboard GUI (RECOMMENDED - Easiest)

### Step 1: Go to Supabase Storage
1. Open https://app.supabase.com
2. Select your project
3. Click **Storage** in the left sidebar

### Step 2: Fix the `student-documents` Bucket

1. Click on `student-documents` bucket
2. Click the **Policies** tab
3. **Delete ALL policies** - for each one:
   - Click the **...** (three dots) menu
   - Select **Delete**
   - Confirm
4. When all policies are deleted, you should see: "No policies yet"

### Step 3: Make Bucket Public

1. Go back to bucket list (click Storage)
2. Find `student-documents` bucket
3. Click the **...** (three dots) menu next to it
4. Select **Edit bucket**
5. Toggle **Public bucket** to **ON** (it should turn blue)
6. Make sure **Row Level Security** is **OFF** (toggle should be OFF/grey)
7. Click **Save** button

### Step 4: Repeat for Other Buckets

Repeat Steps 2-3 for these buckets if they exist:
- `student-photos`
- `teacher-photos`
- `school-logos`
- `documents`

---

## Option 2: Run Updated Migration

If you want to use SQL, run the updated migration 061:

```sql
-- Copy entire contents of:
database/migrations/061_final_storage_rls_complete_fix.sql

-- Paste in Supabase → SQL Editor
-- Click Run
```

This updated version:
- Only drops policies (doesn't try to alter tables)
- Creates permissive policies instead
- Should work without ownership errors

---

## Troubleshooting

### If you still get "must be owner" error with SQL:

Use the **Dashboard method** (Option 1) instead. It's actually faster:
1. Takes ~2 minutes
2. No SQL required
3. You can see exactly what you're changing
4. Can't get permission errors

### If "Edit bucket" option is grayed out:

1. Make sure you're in the **Storage** section (not Tables)
2. Right-click on the bucket name
3. Select "Edit bucket" from context menu
4. Or click the bucket name to open it, then look for settings

### If policies won't delete:

1. Refresh the page (F5)
2. Try deleting again
3. If still stuck, try Option 2 (SQL migration)

---

## Verification: After Fixing

Once you've fixed the bucket, verify by trying to upload a photo:

1. Go to http://localhost:3000/student/dashboard
2. Log in as a student
3. Click "📤 Choose Photo"
4. Select an image file
5. **Expected result:** Photo uploads successfully ✅

If it works, you should see:
- Spinner: "⏳ Uploading..."
- Success: "✅ Photo uploaded successfully!"
- Photo appears in your profile

---

## Quick Visual Guide

```
Dashboard Method:
┌─────────────────────────────────────┐
│ Storage → student-documents         │
│ [Policies tab]                      │
│ ✓ Delete all policies               │
│ [Edit bucket]                       │
│ ✓ Public bucket: ON                 │
│ ✓ Row Level Security: OFF           │
│ [Save]                              │
└─────────────────────────────────────┘
     ↓
  Photo uploads work!
```

---

## SQL Method (If preferred)

If you prefer command-line/SQL:

1. Copy contents of `database/migrations/061_final_storage_rls_complete_fix.sql`
2. Go to https://app.supabase.com → SQL Editor
3. Click **New Query**
4. Paste the SQL
5. Click **Run**
6. Wait for "Query executed successfully"

---

## After Fix: What Changes

**Before:**
- ❌ Photo upload fails
- ❌ Error: "row violates row-level security policy"
- ❌ Storage bucket private with restrictive policies

**After:**
- ✅ Photo upload succeeds
- ✅ All authenticated users can upload files
- ✅ Storage bucket public with permissive policies

---

## Why This Works

The error came from:
1. Storage bucket had RLS enabled
2. RLS policies were too restrictive
3. Frontend code couldn't bypass them

This fix:
1. Removes restrictive policies
2. Adds permissive policies (allows all authenticated users)
3. Makes bucket public (anyone can read, authenticated can write)

Result: Photo uploads work! 📸
