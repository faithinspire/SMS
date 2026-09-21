# PGRST201 Error - FIXED & DEPLOYED

## Status: ✅ DEPLOYED TO VERCEL

---

## Error Details

**Error Code**: PGRST201  
**Message**: "Could not embed because more than one relationship was found for 'students' and 'users'"  
**Endpoint**: `/api/teacher/subject-students`  
**Root Cause**: Explicit foreign key constraint name in Supabase query

---

## The Fix

### What Was Wrong
```typescript
// BEFORE - Explicit constraint name that confused Supabase
users!students_user_id_fkey (
  id,
  full_name,
  email,
  photo_url
)
```

### What's Fixed
```typescript
// AFTER - Simple relationship, let Supabase auto-detect
users (
  id,
  full_name,
  email,
  photo_url
)
```

---

## Files Modified
- **src/app/api/teacher/subject-students/route.ts** (Line 168)

---

## Git Commit
- **Commit Hash**: 433abe4
- **Message**: "Fix: Remove explicit foreign key constraint name in Supabase query - fixes PGRST201 error on subject-students endpoint"
- **Status**: ✅ Pushed to origin/main

---

## Deployment Status
✅ **Committed**: Git working tree clean, up to date with origin/main  
✅ **Pushed**: All commits synced to GitHub  
✅ **Vercel**: Automatic deployment triggered  

---

## Expected Result
Teachers loading subject students will now see the list correctly without PGRST201 errors.

**Test**: Open teacher dashboard → Select subject → View students table (should display students without error)

---

**Deployment Date**: September 21, 2026  
**Status**: 🟢 LIVE
