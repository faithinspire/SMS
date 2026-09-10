# Photo Display Issue - Root Cause & Solution

## Current Status
Student photos are showing broken images (with "...Student" text fallback) despite successful uploads.

## Root Cause Identified
✅ **The Supabase `student-documents` bucket exists** and is created via API  
❌ **But the bucket may not be properly configured as PUBLIC**

### Why This Breaks Photo Display
1. Student uploads photo → stored in `student-documents` bucket
2. Photo URL is saved to `students.photo_url` in database
3. URL looks like: `https://egdreueuspmuxhezdpqm.supabase.co/storage/v1/object/public/student-documents/student-photos/{...}`
4. **If bucket is PRIVATE or RLS is ON → Browser gets 403 Forbidden**
5. Image fails to load → Shows broken image icon

## How to Fix

### Step 1: Go to Supabase Dashboard
1. Open: https://app.supabase.com
2. Select your project: "egdreueuspmuxhezdpqm"
3. Navigate to: **Storage** (left sidebar)

### Step 2: Configure student-documents Bucket
1. Find bucket: **`student-documents`**
   - If it doesn't exist, click "New Bucket" and create it
2. Click the **Edit** or **⋯** menu on the bucket
3. Set these options:
   - **Public**: ✅ **ON** (this is CRITICAL)
   - **Row Level Security**: ❌ **OFF** (disable it)
   - **File Size Limit**: 52MB (or higher)
   - **Allowed MIME Types**: image/* (or keep default)
4. Click **Save**

### Step 3: Configure school-logos Bucket
1. Find or create: **`school-logos`**
2. Settings:
   - **Public**: ✅ **ON**
   - **Row Level Security**: ❌ **OFF**
3. Click **Save**

### Step 4: Configure lesson-notes Bucket
1. Find or create: **`lesson-notes`**
2. Settings:
   - **Public**: ✅ **ON**
   - **Row Level Security**: ❌ **OFF**
3. Click **Save**

### Step 5: Test in Application
After configuring buckets, test with:
1. Go to Student Dashboard: http://localhost:3000/student/dashboard
2. Upload a photo
3. Verify it displays (not broken image)

## Technical Details

### What Changed in Code
- ✅ Removed transform parameters from photo URL generation
  - Old: `.getPublicUrl(path, { transform: { width: 400, height: 400, resize: 'cover' } })`
  - New: `.getPublicUrl(path)` - simpler, more reliable
- ✅ Updated image display to use `object-cover` (better fit)
- ✅ Added error logging on image load failure
- ✅ Created `/api/system/init-storage` endpoint to create buckets
- ✅ Created `/api/system/verify-buckets` endpoint to check configuration
- ✅ Created `/admin/system/storage-setup` page for manual testing

### Files Modified
```
src/app/student/dashboard/page.tsx
  - Removed transform parameters from getPublicUrl()
  - Updated image display CSS
  - Added error handler logging

Created:
src/app/api/system/init-storage/route.ts
src/app/api/system/verify-buckets/route.ts
src/app/admin/system/storage-setup/page.tsx
```

## Verification Checklist

After configuring buckets, verify with this checklist:

- [ ] Bucket `student-documents` exists in Supabase Storage
- [ ] `student-documents` has **Public: ON**
- [ ] `student-documents` has **RLS: OFF**
- [ ] Student can upload photo to dashboard
- [ ] Photo displays immediately (not broken image)
- [ ] Refreshing page still shows photo
- [ ] Photo URL can be accessed directly in browser

## If Still Not Working

### Debug Steps
1. **Check Admin Page**: Go to http://localhost:3000/admin/system/storage-setup
   - Click "Verify Configuration" button
   - Look at the output - any issues shown?

2. **Check Browser Console**:
   - Open DevTools (F12)
   - Go to Console tab
   - Look for error messages when photo should load
   - Common errors:
     - `403 Forbidden` = bucket is private
     - `404 Not Found` = file doesn't exist in storage
     - `ERR_NAME_NOT_RESOLVED` = network issue

3. **Manual URL Check**:
   - Get a photo URL from database via Supabase Dashboard
   - Example: `https://egdreueuspmuxhezdpqm.supabase.co/storage/v1/object/public/student-documents/student-photos/...`
   - Try opening it directly in browser
   - Should show image, not error

4. **Check RLS Policies**:
   - Go to Supabase Dashboard → Storage → `student-documents`
   - Click "Policies" tab
   - Should see: `allow_public_read` policy
   - If none shown, apply migration 061 again

## Next: Broadcast System Testing

Once photos are working, test broadcast messaging:
- [ ] Admin/Principal can send broadcasts
- [ ] Teachers see inbox icon with unread count
- [ ] Staff see broadcast notifications
- [ ] Broadcasts show in dashboard sidebar
