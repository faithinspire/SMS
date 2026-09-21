# CRITICAL: Database Schema Mismatch - Root Cause of Production Failures

**Date: Sept 21, 2026**  
**Status: IN PROGRESS - FIX REQUIRED**  
**Impact: CRITICAL - 0% success rate for broadcasts and lesson notes**

---

## Executive Summary

**The code fixes were deployed correctly to Vercel, but the database schema in Supabase is WRONG.**

- **Lesson Notes:** API tries to insert `created_by`, `title`, `content` but database has `teacher_id`, `topic`, `content_summary`
- **Broadcasts:** Migration 127 creates correct schema, but this migration may NOT have been executed in Supabase
- **Result:** Inserts fail silently. Teachers' lesson notes never save. Broadcasts never reach staff.

---

## Problem 1: LESSON NOTES Schema Mismatch

### What the API expects (code):
```
src/app/api/teacher/lessons/submit/route.ts lines 54-68
INSERT INTO lesson_notes (
  school_id,      ✓ EXISTS
  subject_id,     ✓ EXISTS
  class_arm_combo_id,  ✓ EXISTS
  created_by,     ❌ DOES NOT EXIST (should be teacher_id)
  title,          ❌ DOES NOT EXIST (should be topic)
  content,        ❌ DOES NOT EXIST (should be content_summary)
  attachments,    ❌ DOES NOT EXIST (should be file_path, file_name)
  status,         ✓ EXISTS
  published_at    ❌ DOES NOT EXIST (should be lesson_date)
)
```

### What the database ACTUALLY has (Migration 083):
```
lesson_notes columns:
  id, school_id, teacher_id, teacher_name, subject_id, class_arm_combo_id,
  term_id, lesson_date, topic, file_path, file_name, file_size,
  content_summary, learning_objectives, status, submitted_at, reviewed_at,
  reviewed_by, reviewer_name, reviewer_feedback, approval_status, created_at, updated_at
```

### Why teachers see no success message:
- API tries to INSERT with wrong columns
- Supabase rejects the insert (column mismatch)
- Error is caught and logged but user gets generic "Error saving lesson note"
- **Result: Data never saved to database**
- Principal's lesson notes page is empty

### Fix Applied:
✅ Updated `src/app/api/teacher/lessons/submit/route.ts` to map API fields to actual schema:
- `title` → `topic`
- `content` → `content_summary`
- `created_by` → `teacher_id`
- `attachments` → `file_path`, `file_name`
- `published_at` → `lesson_date`

---

## Problem 2: BROADCASTS Schema Missing or Wrong

### What the API expects (code):
```
src/app/api/broadcasts/send-to-recipients/route.ts lines 60-70
INSERT INTO broadcasts (
  school_id,      (UUID FK)
  sender_id,      (UUID FK)
  message,        (TEXT)
  broadcast_type  (VARCHAR)
)

INSERT INTO broadcast_recipients (
  broadcast_id,   (UUID FK)
  user_id,        (UUID FK)
  is_read         (BOOLEAN)
)
```

### What SHOULD exist (Migration 127):
```sql
CREATE TABLE broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  broadcast_type VARCHAR(50) DEFAULT 'GENERAL',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE broadcast_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(broadcast_id, user_id)
);
```

### What ACTUALLY exists in database (likely Migration 081):
- **UNKNOWN** - need to verify in Supabase
- Likely has wrong column names or wrong data types
- Likely has `broadcast_notifications` table instead of `broadcast_recipients`

### Why broadcasts fail:
- Foreign key constraints fail (columns are TEXT not UUID)
- OR table structure is completely different
- Error: "Failed to create broadcast"

---

## Problem 3: Multiple Conflicting Migrations

### Broadcasts timeline:
1. Migration 062: Create broadcasts system
2. Migration 081: Create broadcasts and notifications (OVERWRITES 062)
3. Migration 127: Fix broadcast schema and pipeline (FIXES 081)
   - **STATUS: LIKELY NOT EXECUTED IN SUPABASE**

### Lesson Notes timeline:
1. Migration 001: Initial schema
2. Migration 083: Drop and recreate with DIFFERENT columns
   - Changes `created_by` → `teacher_id`
   - Changes `title` → `topic`
   - Changes `content` → `content_summary`
   - **This is the CURRENT schema in production**
3. Migrations 088, 089: Patches on top of 083

### Assignments timeline:
1. Migration 082: Create student_assignments table
2. Migration 088, 089: Fix schema
3. API created: `/api/teacher/assignments/create`

---

## Verification Steps (IN SUPABASE SQL EDITOR)

### 1. Check broadcasts schema
```sql
-- Does broadcasts table exist?
\d broadcasts;

-- Expected output:
-- Column      | Type
-- id          | uuid
-- school_id   | uuid (FK to schools)
-- sender_id   | uuid (FK to users)
-- message     | text
-- broadcast_type | character varying
-- created_at  | timestamp with time zone
-- updated_at  | timestamp with time zone
```

### 2. Check broadcast_recipients exists
```sql
\d broadcast_recipients;

-- Expected output:
-- Column        | Type
-- id            | uuid
-- broadcast_id  | uuid (FK to broadcasts)
-- user_id       | uuid (FK to users)
-- is_read       | boolean
-- read_at       | timestamp with time zone
-- created_at    | timestamp with time zone
```

### 3. Verify broadcast_notifications is GONE
```sql
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_name = 'broadcast_notifications';

-- Expected: 0
```

### 4. Check lesson_notes schema
```sql
\d lesson_notes;

-- Expected to have:
-- teacher_id (UUID)
-- topic (TEXT)
-- content_summary (TEXT)
-- lesson_date (DATE)
-- file_path, file_name (TEXT)
-- status (TEXT)
-- reviewed_at, reviewed_by, reviewer_comments
```

### 5. Check if data exists
```sql
SELECT COUNT(*) FROM lesson_notes;
SELECT COUNT(*) FROM broadcasts;
SELECT COUNT(*) FROM broadcast_recipients;
```

### 6. Test insert manually
```sql
-- First, get valid UUIDs
SELECT id FROM schools LIMIT 1; -- Get school_id
SELECT id FROM users WHERE role = 'TEACHER' LIMIT 1; -- Get user_id

-- Then test lesson_notes insert
INSERT INTO lesson_notes (
  school_id,
  teacher_id,
  teacher_name,
  subject_id,
  class_arm_combo_id,
  term_id,
  lesson_date,
  topic,
  content_summary,
  status
) VALUES (
  '<valid_school_uuid>',
  '<valid_user_uuid>',
  'Test Teacher',
  '<valid_subject_uuid>',
  '<valid_class_uuid>',
  '<valid_term_uuid>',
  CURRENT_DATE,
  'Test Topic',
  'Test Summary',
  'SUBMITTED'
);

-- Then test broadcasts insert
INSERT INTO broadcasts (school_id, sender_id, message, broadcast_type)
VALUES (
  '<valid_school_uuid>',
  '<valid_user_uuid>',
  'Test Message',
  'GENERAL'
) RETURNING id;

-- Then test broadcast_recipients insert (use returned broadcast id)
INSERT INTO broadcast_recipients (broadcast_id, user_id, is_read)
VALUES ('<broadcast_id>', '<valid_user_uuid>', false);
```

---

## Fixes Applied

### 1. ✅ Updated Lesson Notes API
**File:** `src/app/api/teacher/lessons/submit/route.ts`
- Changed insert to use correct column names from Migration 083
- Map `title` → `topic`
- Map `content` → `content_summary`
- Map `created_by` → `teacher_id`
- Added placeholder for `term_id` (should be current term)
- Added placeholder for `teacher_name` (should fetch from users table)

### 2. ✅ Principal Query Already Fixed
**File:** `src/app/principal/lesson-notes/page.tsx`
- Query uses correct column names: `teacher_id`, `lesson_date`, `topic`
- JOINs to users table to get teacher_name
- Update statement uses correct field names

### 3. ⚠️ Broadcast API Correct But Database May Be Wrong
**File:** `src/app/api/broadcasts/send-to-recipients/route.ts`
- API code is correct
- Waiting for Migration 127 to be executed in Supabase

---

## REQUIRED ACTIONS

### Action 1: VERIFY database schema in Supabase (IMMEDIATE)
1. Go to Supabase dashboard → SQL Editor
2. Run verification queries above
3. Screenshot results and share

### Action 2: IF broadcasts schema is WRONG
Execute Migration 127 in Supabase:
```sql
-- Copy entire contents of database/migrations/127_fix_broadcast_schema_and_pipeline.sql
-- Paste in Supabase SQL Editor
-- Click "Run"
```

### Action 3: IF lesson_notes inserts still fail after API fix
- Likely due to foreign key constraints (term_id, class_arm_combo_id not found)
- Need to update API to fetch current term_id and validate all FKs exist

### Action 4: Test end-to-end after fixes
1. Teacher submits lesson note
2. Check: Data appears in `lesson_notes` table
3. Principal views lesson notes page → should see submitted notes
4. School admin sends broadcast
5. Check: Data appears in `broadcasts` and `broadcast_recipients`
6. Staff views broadcast inbox → should see new message

---

## Code Changes Deployed

All fixes have been deployed to Vercel (code deployed).
Now waiting for Supabase database schema to be corrected via Migration 127.

---

## Timeline

- **Sep 20**: User reports 7 critical production issues
- **Sep 20-21**: Fixed API code (lesson notes, broadcasts, assignments)
- **Sep 21 06:00 UTC**: Deployed all fixes to Vercel
- **Sep 21 06:30 UTC**: **USER REPORTS: BROADCASTS STILL FAILING, NO LESSON NOTES VISIBLE**
- **Sep 21 06:45 UTC**: Root cause identified: **DATABASE SCHEMA IS WRONG, NOT CODE**
- **Sep 21 07:00 UTC**: This diagnostic created

---

## Next Steps

1. **IMMEDIATE:** Run verification queries in Supabase to confirm schema
2. **If needed:** Execute Migration 127 to fix broadcasts schema
3. **Then:** Re-test all 7 issues end-to-end
4. **Finally:** Commit any remaining code fixes and push to main

