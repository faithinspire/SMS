# IMMEDIATE ACTION REQUIRED - Database Schema Fixes

**Status:** Code deployed to Vercel ✅ | Database schema fixes pending ⏳  
**Impact:** Blocking all 7 issues from working  
**Time to resolve:** 5 minutes in Supabase

---

## THE PROBLEM (Summary)

Your code was working correctly, but it was trying to insert data into the **wrong database columns**:

1. **Lesson Notes:** API sends `title`, database expects `topic`
2. **Broadcasts:** API needs `broadcasts` + `broadcast_recipients` tables, may have old schema
3. **Assignments:** Working (already has correct schema)
4. **CBT:** Working (parameter fix deployed)

**Result:** Teachers' lesson notes don't save. Broadcasts fail. Nothing reaches principals/staff.

---

## WHAT YOU NEED TO DO

### Step 1: Go to Supabase SQL Editor (2 minutes)

1. Open: https://app.supabase.com
2. Go to your project
3. Click: **SQL Editor** (left sidebar)
4. Click: **New Query**

### Step 2: Verify Current Database Schema (1 minute)

Copy and paste **EACH** of these queries ONE AT A TIME. Click **Run** after each one. Take screenshots of results:

```sql
-- Query 1: Check broadcasts table
\d broadcasts;
```

Expected result: Should show columns like `id`, `school_id`, `sender_id`, `message`, `broadcast_type`

```sql
-- Query 2: Check broadcast_recipients table  
\d broadcast_recipients;
```

Expected result: Should show columns like `id`, `broadcast_id`, `user_id`, `is_read`

```sql
-- Query 3: Check if old broadcast_notifications exists
SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'broadcast_notifications';
```

Expected result: Should return `0`

```sql
-- Query 4: Check lesson_notes table
\d lesson_notes;
```

Expected result: Should show `teacher_id`, `topic`, `content_summary`, `lesson_date`

---

### Step 3: If Schema Is WRONG - Execute Migration 127 (2 minutes)

**IF** the broadcasts table doesn't exist or has wrong columns:

1. Open file: `database/migrations/127_fix_broadcast_schema_and_pipeline.sql`
2. **Select ALL** the contents (Ctrl+A)
3. **Copy** (Ctrl+C)
4. Go back to Supabase SQL Editor
5. Click: **New Query**
6. **Paste** the migration (Ctrl+V)
7. Click: **Run**
8. Wait for completion
9. Screenshot the result

---

### Step 4: Re-run Verification Queries (1 minute)

After migration runs, re-run the verification queries from Step 2 to confirm schema is now correct.

---

## Expected Results After Fixes

### Test 1: Teacher Submits Lesson Note
1. Login as teacher: Go to teacher dashboard
2. Find: "Submit Lesson Note" or "Lesson Notes"
3. Fill: Title, Content, select subject and class
4. Click: "Submit"
5. **Should see:** ✅ Success message
6. **Database:** Appears in `lesson_notes` table

### Test 2: Principal Reviews Lesson Notes
1. Login as principal: Go to principal dashboard
2. Find: "Lesson Notes Review"
3. **Should see:** List of submitted notes from all teachers
4. Click: Any note to review
5. Can approve/reject with feedback

### Test 3: Admin Sends Broadcast
1. Login as school admin: Go to admin dashboard
2. Find: "Send Broadcast" or "Broadcast Messages"
3. Fill: Message, select recipients
4. Click: "Send"
5. **Should see:** ✅ Success message, number of recipients shown
6. **Database:** Appears in `broadcasts` and `broadcast_recipients`

### Test 4: Staff Receives Broadcast
1. Login as teacher: Go to teacher dashboard
2. Find: "Broadcast Inbox" or "Messages"
3. **Should see:** New message from admin
4. Can read and mark as read

### Test 5: Student Submits Assignment
1. Login as student: Go to student dashboard
2. Find: "Assignments"
3. **Should see:** List of active assignments for their class
4. Click: Assignment details
5. Can submit or view requirements

### Test 6: Student Takes CBT
1. Login as student: Go to student dashboard
2. Find: "Take Exam" or "CBT"
3. Start exam, submit answers
4. **Should see:** ✅ Success message
5. **Check Scoresheet:** Teacher sees score auto-populated (no manual entry needed)

---

## Files Changed (Already Deployed to Vercel)

✅ `src/app/api/teacher/lessons/submit/route.ts` - Fixed schema mapping  
✅ `src/app/api/broadcasts/send-to-recipients/route.ts` - Correct implementation  
✅ `src/app/api/teacher/assignments/create/route.ts` - New endpoint  
✅ `src/app/principal/lesson-notes/page.tsx` - Query fixed  
✅ `src/app/student/assignments/page.tsx` - Filter fixed  
✅ `src/app/student/cbt/exam-interface.tsx` - Parameter fixed  

---

## Database Migrations Ready (Need to Execute in Supabase)

⏳ `database/migrations/127_fix_broadcast_schema_and_pipeline.sql` - **CRITICAL - Execute this**  
⏳ `database/migrations/120_cbt_auto_populate_score_sheets.sql` - Optional but recommended  
⏳ `database/migrations/129_fix_cbt_subject_and_term_links.sql` - Optional enhancement

---

## If You Get Errors

### Error: "Column X does not exist"
**Means:** The database schema migration didn't run. Execute Migration 127 in SQL Editor.

### Error: "Foreign key constraint failed"
**Means:** The IDs you're using don't exist in related tables. Need to check:
- Is the teacher/student/subject actually created in the database?
- Is the school_id correct?

### Error: "Relation X does not exist"
**Means:** The table doesn't exist. Execute the migration to create it.

---

## Quick Checklist

- [ ] Opened Supabase SQL Editor
- [ ] Ran verification queries from Step 2
- [ ] Determined if broadcasts schema is wrong
- [ ] If wrong, executed Migration 127
- [ ] Re-ran verification queries to confirm
- [ ] Tested teacher lesson notes submission → appears in principal view
- [ ] Tested admin broadcast → appears in staff inbox
- [ ] Tested teacher assignment creation → appears in student list
- [ ] Tested student CBT submission → score appears in scoresheet

---

## Support Info

**If stuck:**
1. Copy the error message from Supabase
2. Check the SQL query that failed
3. Verify all referenced tables exist
4. Verify all IDs being used actually exist in those tables
5. Try a manual INSERT test with known good UUIDs

**All code is ready and deployed.**  
**Just need database schema corrections in Supabase.**

