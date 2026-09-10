# Photo Display & Broadcast System Implementation Guide

## Executive Summary

This document covers the complete implementation of:
1. **Student Photo Upload & Display System** - With diagnostic tools
2. **Broadcast Message System** - For admin/principal to staff/teachers
3. **Broadcast Inbox** - For teachers and staff to view announcements

---

## PART 1: STUDENT PHOTO DISPLAY SYSTEM

### Problem Analysis

**Issue:** Students upload photos successfully, but images display as broken in dashboard.

**Root Cause:** Supabase storage bucket has **RLS (Row Level Security) master switch still ON**. While migration 061 creates permissive RLS policies via SQL, it cannot disable the master switch - that requires manual action in the Supabase Dashboard.

**Upload Flow Verification:**
- ✅ File upload to `student-documents/student-photos/{schoolId}/{filename}` - WORKING
- ✅ Public URL generation with transform parameters - WORKING  
- ✅ URL storage in `students.photo_url` - WORKING
- ✅ Frontend display logic - WORKING
- ❌ **RLS master switch ON** - BLOCKING PUBLIC ACCESS

### Solution: Manual Supabase Configuration

**CRITICAL STEPS (Must be done in Supabase Dashboard):**

1. Go to **Supabase Dashboard** → **Storage**
2. Find bucket: `student-documents`
3. Click **Edit** (gear icon or settings)
4. Set **Public = ON** ✓
5. Set **Row Level Security = OFF** ✓ (This is the master switch)
6. Click **Save**

After these steps, photos will display immediately because:
- Bucket is now public, so `/object/public/` URLs are accessible
- RLS master switch off allows all authenticated operations
- Permissive policies from migration 061 ensure uploads succeed

### Diagnostic Tool

**Endpoint:** `GET /api/student/photo-diagnostic`

**Purpose:** Automatically check storage configuration and identify specific issues.

**Response includes:**
- ✅/❌ Supabase configuration check
- ✅/❌ Bucket exists check
- ✅/❌ Bucket is public check
- ✅/❌ RLS policy configuration check
- ✅/❌ Sample photo URL accessibility check
- Specific recommendations for fixes

**Usage:**
```bash
curl http://localhost:3000/api/student/photo-diagnostic
```

**Example Response:**
```json
{
  "status": "needs_attention",
  "checks": {
    "supabaseConfig": { "status": "success", "details": "..." },
    "bucketExists": { "status": "success", "details": "..." },
    "bucketPublic": { "status": "failed", "details": "Bucket is PRIVATE..." },
    "bucketRLS": { "status": "warning", "details": "..." }
  },
  "recommendations": [
    "CRITICAL FIX: In Supabase Dashboard...",
    "1. Storage → student-documents",
    "2. Click Edit/Settings",
    "3. Set Public: ON",
    "4. Set Row Level Security: OFF"
  ],
  "solutions": ["SET_BUCKET_PUBLIC", "DISABLE_RLS_MASTER_SWITCH"]
}
```

### Implementation Files

**Photo Upload Logic:**
- `src/app/student/dashboard/page.tsx` (lines 226-317)
  - `handlePhotoUpload()` function
  - File validation, upload, URL generation, database storage
  - Retry logic with exponential backoff

**Photo Display:**
- `src/app/student/dashboard/page.tsx` (line 369)
  - `<img src={profile.photo_url} />` with CSS transforms
  - Fallback emoji if no photo

**Storage Configuration:**
- `database/migrations/061_final_storage_rls_complete_fix.sql`
  - Creates permissive RLS policies
  - Cannot disable master switch (requires Dashboard action)

**Diagnostic Endpoint:**
- `src/app/api/student/photo-diagnostic/route.ts`
  - Checks all aspects of storage configuration
  - Provides actionable recommendations

---

## PART 2: BROADCAST MESSAGE SYSTEM

### Architecture

**Components:**

1. **Database Schema** (Migration 062)
   - `broadcasts` table - Message storage
   - `broadcast_recipients` table - Tracking read status
   - RLS policies - Role-based access control
   - `send_broadcast_to_staff()` function - Helper for bulk sending

2. **Frontend Components**
   - `BroadcastInbox` - Display broadcasts, mark as read
   - `BroadcastSender` - Create and send broadcasts
   - Dashboard integration - Icon with unread badge

3. **API Routes**
   - `POST /api/broadcasts/send` - Send broadcast (auth required)
   - Real-time updates via Supabase channels

### Database Schema

**broadcasts table:**
```sql
id (UUID, PK)
school_id (UUID, FK to schools)
created_by (UUID, FK to users)
title (VARCHAR 255) - Broadcast subject
message (TEXT) - Announcement text
broadcast_type (VARCHAR 50) - GENERAL|URGENT|HOLIDAY
recipient_type (VARCHAR 50) - STAFF|TEACHERS|ALL_STAFF
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
is_archived (BOOLEAN)
```

**broadcast_recipients table:**
```sql
id (UUID, PK)
broadcast_id (UUID, FK)
user_id (UUID, FK)
is_read (BOOLEAN) - Has user seen this?
read_at (TIMESTAMP)
created_at (TIMESTAMP)
```

### RLS Policy Overview

**Broadcasts table:**
- SELECT: Users can view broadcasts for their school
- INSERT: Only SCHOOL_ADMIN, PRINCIPAL, HEAD_TEACHER
- UPDATE: Only creator of broadcast

**Broadcast_recipients table:**
- SELECT: Users see their own records + admins see all
- UPDATE: Users can mark their own as read
- INSERT: Only admins/principals creating broadcasts

### Components

#### BroadcastInbox Component

**Location:** `src/components/BroadcastInbox.tsx`

**Props:**
```typescript
userId: string
userRole: 'TEACHER' | 'STAFF' | 'PRINCIPAL' | 'SCHOOL_ADMIN'
schoolId: string
unreadCount?: number
onUnreadCountChange?: (count: number) => void
```

**Features:**
- 📬 Bell icon with unread count badge
- 📋 Modal with broadcast list
- 🔍 Filter by unread/all
- ✅ Mark as read when opened
- 🔄 Real-time updates via Supabase channels
- 📱 Responsive design

**Usage in Dashboard:**
```typescript
<BroadcastInbox
  userId={user.id}
  userRole={user.role}
  schoolId={school.id}
  unreadCount={unreadCount}
  onUnreadCountChange={setUnreadCount}
/>
```

#### BroadcastSender Component

**Location:** `src/components/BroadcastSender.tsx`

**Props:**
```typescript
schoolId: string
userId: string
onBroadcastSent?: () => void
```

**Features:**
- 📢 Send broadcast button
- 📝 Modal form with title, message, recipient type
- 🎯 Select audience: All Staff, Teachers Only, Non-Teaching Staff
- 🏷️ Announcement type: General, Urgent, Holiday
- 👀 Live preview
- ✅ Success notifications

**Usage:**
```typescript
<BroadcastSender
  schoolId={school.id}
  userId={user.id}
  onBroadcastSent={refreshBroadcasts}
/>
```

### API Endpoint

**POST /api/broadcasts/send**

**Authentication:** Required (checks user.role)

**Authorization:** Only SCHOOL_ADMIN, PRINCIPAL, HEAD_TEACHER

**Request Body:**
```json
{
  "title": "Important Announcement",
  "message": "This is the announcement text...",
  "recipient_type": "ALL_STAFF",
  "broadcast_type": "GENERAL"
}
```

**Response (Success):**
```json
{
  "success": true,
  "broadcast_id": "uuid-here",
  "recipients_count": 25,
  "message": "Broadcast sent successfully to 25 recipients"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Unauthorized: TEACHER cannot send broadcasts"
}
```

**Status Codes:**
- 200: Broadcast sent successfully
- 400: Missing/invalid parameters
- 401: Not authenticated
- 403: Not authorized (wrong role)
- 500: Server error

### Dashboard Integration

**Teacher Dashboard:**
- `src/app/teacher/dashboard/page.tsx`
- Header includes BroadcastInbox icon
- Shows unread count badge
- Real-time updates

**Staff Dashboard:**
- `src/app/staff/dashboard/page.tsx` (NEW)
- Full dashboard for non-teaching staff
- BroadcastInbox integration
- Account management links

**School Admin/Principal:**
- Can add BroadcastSender to their dashboard
- Full control over announcements
- See delivery status

---

## PART 3: IMPLEMENTATION CHECKLIST

### Before Deployment

**Student Photo System:**
- [ ] Run `/api/student/photo-diagnostic` to verify storage config
- [ ] In Supabase Dashboard: student-documents bucket → Public: ON
- [ ] In Supabase Dashboard: student-documents bucket → RLS: OFF
- [ ] Test photo upload in student dashboard
- [ ] Verify photos display in CBT exam header

**Broadcast System:**
- [ ] Run database migration 062: `CREATE TABLE broadcasts...`
- [ ] Verify migrations created tables with correct schema
- [ ] Test API endpoint: `POST /api/broadcasts/send`
- [ ] Test BroadcastInbox component displays messages
- [ ] Verify unread count updates correctly
- [ ] Test marking broadcasts as read

### Testing Scenarios

**Photo Display:**
1. Login as student
2. Navigate to student dashboard
3. Click "Choose Photo" button
4. Select image file (< 5MB)
5. Verify upload completes successfully
6. Verify photo displays in profile card
7. Verify photo displays in CBT exam header
8. Hard refresh (Ctrl+Shift+R) to clear cache
9. Verify photo still displays after refresh

**Broadcast System:**
1. Login as principal/admin
2. Access dashboard with BroadcastSender
3. Click "Send Broadcast" button
4. Fill in title, message, recipient type
5. Click "Send Broadcast"
6. Verify success toast
7. Login as teacher
8. Check broadcast inbox icon has unread badge
9. Click inbox icon
10. See broadcast in unread filter
11. Click broadcast to read
12. Verify marked as read (badge removed)
13. Verify broadcast appears in "All" filter

---

## PART 4: TROUBLESHOOTING

### Photo Not Displaying

**Check List:**
1. Run `/api/student/photo-diagnostic` endpoint
2. Check Supabase Dashboard: Storage → student-documents
   - Is it set to Public? If NO → Set to ON
   - Is RLS OFF? If NO → Set RLS to OFF
3. Hard refresh browser (Ctrl+Shift+R)
4. Check browser console for specific error messages
5. Verify storage path: `student-photos/{schoolId}/{filename}`
6. Check database: `SELECT photo_url FROM students` - is URL valid?

### Broadcasts Not Appearing

**Check List:**
1. Verify migration 062 was applied
2. Check database: `SELECT * FROM broadcasts`
3. Check permissions: Is sender SCHOOL_ADMIN/PRINCIPAL?
4. Test API directly: `POST /api/broadcasts/send`
5. Check if recipient has correct role (TEACHER/STAFF)
6. Verify broadcast_recipients table has records
7. Check RLS policies on broadcast tables

### Unread Count Not Updating

**Check List:**
1. Verify broadcast_recipients.is_read column updated
2. Check Supabase real-time subscription active
3. Verify channel name: `broadcasts_{schoolId}`
4. Check browser console for subscription errors
5. Try manual page refresh

---

## PART 5: FILE REFERENCE

### New Files Created

**Storage & Diagnostics:**
- `src/app/api/student/photo-diagnostic/route.ts` - Diagnostic endpoint

**Broadcast System:**
- `database/migrations/062_create_broadcasts_system.sql` - Database schema
- `src/components/BroadcastInbox.tsx` - Inbox component
- `src/components/BroadcastSender.tsx` - Sender component
- `src/app/api/broadcasts/send/route.ts` - Send API endpoint
- `src/app/staff/dashboard/page.tsx` - Staff dashboard

### Modified Files

**Photo System:**
- `src/app/student/dashboard/page.tsx` - Enhanced with transform parameters
- `src/components/ExamHeader.tsx` - Added photo and logo display

**Dashboard Integrations:**
- `src/app/teacher/dashboard/page.tsx` - Added BroadcastInbox

---

## PART 6: MIGRATION INSTRUCTIONS

### Step 1: Deploy Code Changes

1. Pull latest code
2. Run: `npm install` (if new dependencies)
3. Verify no TypeScript errors: `npm run build`
4. Start dev server: `npm run dev`

### Step 2: Apply Database Migrations

In Supabase SQL Editor, run:
```sql
-- Migration 062: Create broadcasts system
-- (Copy entire contents of database/migrations/062_create_broadcasts_system.sql)
```

### Step 3: Configure Storage Bucket

In Supabase Dashboard:
1. Storage → student-documents
2. Edit → Public: ON, RLS: OFF
3. Save

### Step 4: Verify Configuration

1. Open browser console
2. Navigate to `/api/student/photo-diagnostic`
3. Check all tests pass
4. Verify broadcast tables created: `SELECT * FROM broadcasts LIMIT 1`

### Step 5: Test End-to-End

1. Test student photo upload/display
2. Test broadcast sending
3. Test broadcast inbox viewing
4. Test real-time updates

---

## Performance & Security

### Performance

- **Photo display:** Images cached by CDN with transform parameters
- **Broadcasts:** Real-time sync via Supabase channels
- **Storage:** Indexed queries on school_id, user_id, created_at

### Security

- **Photo upload:** File type validation (image/* only), size limit (5MB)
- **Broadcasts:** RLS policies enforce role-based access
- **API:** Authorization checks on all endpoints
- **Data:** End-to-end encrypted via Supabase

---

## Future Enhancements

1. **Photo Features:**
   - Image cropping tool
   - Photo compression
   - Multiple photos (gallery)

2. **Broadcast Features:**
   - Scheduled broadcasts
   - Attachment support
   - Delivery confirmation
   - Read receipt tracking

3. **Analytics:**
   - Broadcast delivery metrics
   - Photo view statistics
   - User engagement tracking

---

## Support & Debugging

For issues:
1. Check `/api/student/photo-diagnostic` for photo problems
2. Review browser console for error messages
3. Check Supabase project logs for RLS violations
4. Verify user roles and permissions
5. Run database queries to verify data integrity

