# Supabase Next Steps - Exact Instructions

**Status:** Code deployed to Vercel. Now fix database schema.  
**Time Required:** 5 minutes  
**Actions:** Execute 1 migration in Supabase

---

## STEP 1: Open Supabase SQL Editor

1. Go to: https://app.supabase.com
2. Select your project
3. Click left sidebar: **SQL Editor**
4. Click: **New Query**

---

## STEP 2: Copy Migration 127 SQL

Open this file in your IDE:
```
database/migrations/127_fix_broadcast_schema_and_pipeline.sql
```

Select ALL content (Ctrl+A) and copy (Ctrl+C).

---

## STEP 3: Paste in Supabase

1. In Supabase SQL Editor, click in the query box
2. Paste (Ctrl+V)
3. Click: **Run** button (or Cmd+Enter)
4. Wait for execution to complete
5. Check: Should see "completed" or "succeeded" message
6. Screenshot result

---

## STEP 4: Verify Migration Worked

Create NEW queries (click "New Query" each time) to verify:

### Query 1: Check broadcasts table exists
```sql
\d broadcasts;
```
**Expected output:**
```
                                      Table "public.broadcasts"
      Column      |           Type           |                      Modifiers
------------------+-----------+-------------------------------------------
 id               | uuid                     | not null default gen_random_uuid()
 school_id        | uuid                     | not null
 sender_id        | uuid                     | not null
 message          | text                     | not null
 broadcast_type   | character varying        | default 'GENERAL'::character varying
 created_at       | timestamp with time zone | default now()
 updated_at       | timestamp with time zone | default now()
```

### Query 2: Check broadcast_recipients table exists
```sql
\d broadcast_recipients;
```
**Expected output:**
```
                                 Table "public.broadcast_recipients"
    Column    |           Type           |           Modifiers
--------------+---------------------------+-----------------------------------
 id           | uuid                     | not null default gen_random_uuid()
 broadcast_id | uuid                     | not null
 user_id      | uuid                     | not null
 is_read      | boolean                  | default false
 read_at      | timestamp with time zone |
 created_at   | timestamp with time zone | default now()
```

### Query 3: Confirm old table is deleted
```sql
SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'broadcast_notifications';
```
**Expected output:** `0` (zero)

### Query 4: Check lesson_notes table
```sql
\d lesson_notes;
```
**Expected output:** Should have these columns:
- `teacher_id` (UUID)
- `teacher_name` (TEXT)
- `topic` (TEXT)
- `content_summary` (TEXT)
- `lesson_date` (DATE)
- `file_path` (TEXT)
- `file_name` (TEXT)
- `status` (TEXT)
- `reviewed_by` (UUID)
- `reviewed_at` (TIMESTAMP)
- `reviewer_comments` (TEXT)

---

## STEP 5: Test Manual Inserts (Verify FKs Work)

### Test 1: Insert into broadcasts
```sql
INSERT INTO broadcasts (school_id, sender_id, message, broadcast_type) 
VALUES (
  (SELECT id FROM schools LIMIT 1),
  (SELECT id FROM users WHERE role='TEACHER' LIMIT 1),
  'Test message',
  'GENERAL'
);
```
**Expected:** No error, row inserted

### Test 2: Insert into lesson_notes
```sql
INSERT INTO lesson_notes (
  school_id, teacher_id, teacher_name, subject_id, class_arm_combo_id,
  term_id, lesson_date, topic, content_summary, status
) VALUES (
  (SELECT id FROM schools LIMIT 1),
  (SELECT id FROM users WHERE role='TEACHER' LIMIT 1),
  'Test Teacher',
  (SELECT id FROM subjects LIMIT 1),
  (SELECT id FROM class_arm_combos LIMIT 1),
  (SELECT id FROM academic_terms LIMIT 1),
  CURRENT_DATE,
  'Test Topic',
  'Test Summary',
  'SUBMITTED'
);
```
**Expected:** No error, row inserted

---

## STEP 6: Test End-to-End (From Your App)

### Test Lesson Notes:
1. Go to teacher dashboard
2. Click "Submit Lesson Note"
3. Fill: Title, Content, Subject, Class
4. Click "Submit"
5. **Should see:** ✅ "Lesson note submitted successfully"
6. Go to principal dashboard
7. Click "Lesson Notes Review"
8. **Should see:** The note you just submitted

### Test Broadcasts:
1. Go to school admin dashboard
2. Click "Send Broadcast"
3. Enter message, select "All Staff"
4. Click "Send"
5. **Should see:** ✅ "Broadcast sent to X recipients"
6. Go to any teacher dashboard
7. Click "Broadcast Inbox" or "Messages"
8. **Should see:** The message you just sent

### Test Assignments:
1. Go to teacher dashboard
2. Click "Create Assignment"
3. Fill: Title, Description, Due Date, Max Marks
4. Select Subject and Class
5. Click "Create"
6. **Should see:** ✅ "Assignment created successfully"
7. Go to student dashboard (in that class)
8. Click "Assignments"
9. **Should see:** The assignment you just created

### Test CBT:
1. Go to student dashboard
2. Click "Take Exam"
3. Select exam and submit
4. **Should see:** ✅ "Exam submitted successfully"
5. Go to subject teacher dashboard
6. Click "Score Sheets"
7. **Should see:** Student's score auto-populated (no manual entry)

---

## If You Get Errors

### Error: "Relation broadcasts does not exist"
**Means:** Migration 127 didn't run. Execute it again.

### Error: "Column X does not exist"
**Means:** Schema mismatch. Check table structure with `\d broadcasts;` and re-run migration.

### Error: "Foreign key constraint violated"
**Means:** The UUIDs don't exist in related tables. Make sure:
- School ID exists in `schools` table
- User ID exists in `users` table
- Subject ID exists in `subjects` table
- Class ID exists in `class_arm_combos` table

### Error: "Duplicate key value violates unique constraint"
**Means:** Data already exists. This is fine - just means your test data is there.

---

## Troubleshooting: If Lesson Notes Still Don't Show

Check:
1. **Is data being inserted?**
   ```sql
   SELECT COUNT(*) FROM lesson_notes WHERE status='SUBMITTED';
   ```
   Should return > 0 if teachers submitted.

2. **Are FKs working?**
   ```sql
   SELECT * FROM lesson_notes LIMIT 1;
   ```
   Should show all columns with data.

3. **Can principal query find them?**
   ```sql
   SELECT ln.id, ln.topic, u.full_name, ln.lesson_date
   FROM lesson_notes ln
   LEFT JOIN users u ON ln.teacher_id = u.id
   WHERE ln.school_id = (SELECT id FROM schools LIMIT 1)
   LIMIT 10;
   ```
   Should return notes from that school.

---

## Troubleshooting: If Broadcasts Still Fail

Check:
1. **Does broadcasts table exist?**
   ```sql
   SELECT COUNT(*) FROM broadcasts;
   ```
   Should return > 0 if admin sent.

2. **Do recipients exist?**
   ```sql
   SELECT COUNT(*) FROM broadcast_recipients;
   ```
   Should return > 0.

3. **Check foreign keys:**
   ```sql
   SELECT * FROM broadcasts LIMIT 1;
   SELECT * FROM broadcast_recipients LIMIT 1;
   ```
   Should show UUIDs (not NULL or text values).

4. **Manual query to test delivery:**
   ```sql
   SELECT br.id, br.broadcast_id, u.full_name, br.is_read
   FROM broadcast_recipients br
   LEFT JOIN users u ON br.user_id = u.id
   LIMIT 10;
   ```
   Should show teachers/staff receiving broadcasts.

---

## Summary

**In 5 minutes:**
1. Copy Migration 127 SQL
2. Paste in Supabase SQL Editor
3. Run migration
4. Verify with 4 queries
5. Test end-to-end in app
6. ✅ All 7 issues resolved

**No code changes needed.**  
**Database schema fixes only.**

