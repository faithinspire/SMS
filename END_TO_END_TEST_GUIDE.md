# End-to-End Test Guide - All Features for All Schools

**Objective:** Verify that all 7 production fixes work correctly for BOTH new AND old schools

**What to Test:**
1. ✅ Broadcasts (admin sends → staff receives)
2. ✅ Lesson Notes (teacher submits → principal reviews)
3. ✅ Assignments (teacher creates → student sees)
4. ✅ CBT (student submits → score in scoresheet)
5. ✅ All APIs return success (no errors)
6. ✅ All databases have correct schema
7. ✅ All schools have complete base data

**Time Required:** 20-30 minutes
**Prerequisites:** 
- Migration 127 executed (broadcasts schema fix)
- Migration 130 executed (school data backfill)
- Code deployed to Vercel
- Access to both old and new schools

---

## TEST 1: Database Schema Verification

**Objective:** Confirm all required tables exist with correct schema

### 1.1 Verify Broadcasts Schema

Run in Supabase SQL Editor:

```sql
\d broadcasts;
```

**Expected output should show:**
```
Column      | Type           | Modifiers
-----------|----------------|----------
id         | uuid           | primary key
school_id  | uuid           | FK → schools
sender_id  | uuid           | FK → users
message    | text           | 
broadcast_type | varchar(50)| 
created_at | timestamp      | 
updated_at | timestamp      | 
```

**Mark:** ✅ if correct, ❌ if missing columns

---

### 1.2 Verify broadcast_recipients Schema

```sql
\d broadcast_recipients;
```

**Expected output should show:**
```
Column       | Type      | Modifiers
------------|-----------|----------
id          | uuid      | primary key
broadcast_id| uuid      | FK → broadcasts
user_id     | uuid      | FK → users
is_read     | boolean   | 
read_at     | timestamp | 
created_at  | timestamp | 
```

**Mark:** ✅ if correct, ❌ if missing

---

### 1.3 Verify lesson_notes Schema

```sql
\d lesson_notes;
```

**Expected to have these columns (from Migration 083):**
- teacher_id (UUID)
- topic (TEXT) — NOT "title"
- content_summary (TEXT) — NOT "content"
- lesson_date (DATE)
- file_path, file_name (TEXT)
- status (TEXT)
- reviewed_by, reviewed_at, reviewer_comments
- subject_id, class_arm_combo_id, school_id (UUIDs)

**Mark:** ✅ if all present, ❌ if using wrong column names

---

### 1.4 Verify All Schools Have Base Data

```sql
-- Check that ALL schools have the required data
SELECT 
  COUNT(DISTINCT s.id) as total_schools,
  COUNT(DISTINCT CASE WHEN ast.id IS NOT NULL THEN s.id END) as schools_with_sessions,
  COUNT(DISTINCT CASE WHEN at.id IS NOT NULL THEN s.id END) as schools_with_terms,
  COUNT(DISTINCT CASE WHEN st.id IS NOT NULL THEN s.id END) as schools_with_streams,
  COUNT(DISTINCT CASE WHEN c.id IS NOT NULL THEN s.id END) as schools_with_classes,
  COUNT(DISTINCT CASE WHEN sub.id IS NOT NULL THEN s.id END) as schools_with_subjects
FROM schools s
LEFT JOIN academic_sessions ast ON s.id = ast.school_id
LEFT JOIN academic_terms at ON s.id = at.school_id
LEFT JOIN streams st ON s.id = st.school_id
LEFT JOIN classes c ON s.id = c.school_id
LEFT JOIN subjects sub ON s.id = sub.school_id;
```

**Expected:** All counts should be EQUAL (e.g., 5 5 5 5 5 5 if you have 5 schools)

**Mark:** ✅ if equal, ❌ if any are different

---

## TEST 2: Broadcasts Feature

**Objective:** Admin sends broadcast → Staff receives message

### 2.1 Test with NEW School

1. **Login as School Admin** (new school registered recently)
   - Open app: http://localhost:3000/auth/admin/login
   - Or production URL
   - Use credentials for a NEW school

2. **Navigate to Broadcast Feature**
   - Go to dashboard → Find "Send Broadcast" or "Broadcasts"
   - Or click menu → "Broadcasts" or "Send Message"

3. **Send Test Broadcast**
   - Enter message: "TEST NEW SCHOOL BROADCAST"
   - Select recipients: "All Staff" or "All Teachers"
   - Click "Send"
   - **Expected result:** ✅ "Broadcast sent to X recipients"
   - **Mark:** ✅ if success, ❌ if error

4. **Verify Broadcast Was Created in Database**
   ```sql
   SELECT * FROM broadcasts 
   WHERE school_id = (SELECT id FROM schools WHERE name LIKE '%new_school_name%' LIMIT 1)
   ORDER BY created_at DESC LIMIT 1;
   ```
   **Expected:** 1 row with your test message
   **Mark:** ✅ if found, ❌ if not

5. **Staff Receives Broadcast**
   - Logout from admin
   - Login as teacher in SAME school
   - Go to dashboard → "Broadcast Inbox" or "Messages"
   - **Expected:** See the broadcast message you just sent
   - **Mark:** ✅ if visible, ❌ if not

---

### 2.2 Test with OLD School

Repeat steps 2.1 but with an OLD school (registered before migrations):

1. Login as School Admin from OLD school
2. Send broadcast message: "TEST OLD SCHOOL BROADCAST"
3. Check success message
4. Verify in database
5. Login as teacher, check inbox

**Mark:** ✅ if all steps pass for old school, ❌ if any fail

---

## TEST 3: Lesson Notes Feature

**Objective:** Teacher submits lesson note → Principal reviews it

### 3.1 Test with NEW School

1. **Login as Teacher** (new school)
   - Go to teacher dashboard

2. **Submit Lesson Note**
   - Click "Submit Lesson Note" or "Create Lesson"
   - Fill form:
     - Title: "TEST NEW SCHOOL LESSON"
     - Content: "Test lesson content for new school"
     - Select Subject: Any subject (e.g., Mathematics)
     - Select Class: Any class (e.g., JSS 1A)
   - Click "Submit"
   - **Expected:** ✅ "Lesson note submitted successfully"
   - **Mark:** ✅ if success, ❌ if error

3. **Verify in Database**
   ```sql
   SELECT * FROM lesson_notes 
   WHERE school_id = (SELECT id FROM schools WHERE name LIKE '%new_school_name%' LIMIT 1)
   ORDER BY created_at DESC LIMIT 1;
   ```
   **Expected:** 1 row with status='SUBMITTED' and your test topic
   **Mark:** ✅ if found, ❌ if not

4. **Principal Reviews Lesson Note**
   - Logout from teacher
   - Login as principal in SAME school
   - Go to dashboard → "Lesson Notes Review" or "Lesson Notes"
   - **Expected:** See the lesson note you submitted
   - Click note to view details
   - Click "Approve" with feedback: "APPROVED - Test comment"
   - **Expected:** ✅ "Lesson note approved"
   - **Mark:** ✅ if visible and approvable, ❌ if not

---

### 3.2 Test with OLD School

Repeat steps 3.1 with an OLD school:

1. Login as teacher from old school
2. Submit lesson note: "TEST OLD SCHOOL LESSON"
3. Check success message
4. Verify in database
5. Login as principal, check review page
6. Approve with comment

**Mark:** ✅ if all steps pass for old school, ❌ if any fail

---

## TEST 4: Assignments Feature

**Objective:** Teacher creates assignment → Student sees it

### 4.1 Test with NEW School

1. **Login as Teacher** (new school)
   - Go to teacher dashboard

2. **Create Assignment**
   - Click "Create Assignment" or "New Assignment"
   - Fill form:
     - Title: "TEST NEW SCHOOL ASSIGNMENT"
     - Description: "Test assignment for new school"
     - Due Date: (pick date 1 week from now)
     - Max Marks: 10
     - Select Subject: Any subject
     - Select Class: Any class (e.g., Primary 2A)
   - Click "Create"
   - **Expected:** ✅ "Assignment created successfully"
   - **Mark:** ✅ if success, ❌ if error

3. **Verify in Database**
   ```sql
   SELECT * FROM assignments 
   WHERE school_id = (SELECT id FROM schools WHERE name LIKE '%new_school_name%' LIMIT 1)
   ORDER BY created_at DESC LIMIT 1;
   ```
   **Expected:** 1 row with status='ACTIVE' and your test title
   **Mark:** ✅ if found, ❌ if not

4. **Student Sees Assignment**
   - Logout from teacher
   - Login as student in SAME class
   - Go to dashboard → "Assignments"
   - **Expected:** See the assignment you created
   - Click to view details
   - **Mark:** ✅ if visible, ❌ if not

---

### 4.2 Test with OLD School

Repeat steps 4.1 with an OLD school:

1. Login as teacher from old school
2. Create assignment: "TEST OLD SCHOOL ASSIGNMENT"
3. Check success message
4. Verify in database
5. Login as student in that class
6. Check assignments page

**Mark:** ✅ if all steps pass for old school, ❌ if any fail

---

## TEST 5: CBT (Computer Based Test) Feature

**Objective:** Student submits CBT → Score appears in scoresheet

### 5.1 Test with NEW School

1. **Login as Student** (new school)
   - Go to student dashboard

2. **Take CBT Exam**
   - Click "Take Exam" or "CBT" or "Computer Based Test"
   - Select an exam (create one if none exist)
   - Answer questions (or just select answers)
   - Click "Submit"
   - **Expected:** ✅ "Exam submitted successfully"
   - **Mark:** ✅ if success, ❌ if error

3. **Verify in Database**
   ```sql
   SELECT * FROM cbt_submissions 
   WHERE school_id = (SELECT id FROM schools WHERE name LIKE '%new_school_name%' LIMIT 1)
   ORDER BY created_at DESC LIMIT 1;
   ```
   **Expected:** 1 row with student_id (NOT student_name) filled
   **Mark:** ✅ if found and uses student_id, ❌ if not

4. **Check Score Appears in Scoresheet**
   - Logout from student
   - Login as subject teacher in SAME school
   - Go to dashboard → "Score Sheets"
   - Select class and subject
   - **Expected:** Student's CBT score already filled (auto-populated)
   - **Mark:** ✅ if visible without manual entry, ❌ if not

---

### 5.2 Test with OLD School

Repeat steps 5.1 with an OLD school:

1. Login as student from old school
2. Submit CBT: "TEST OLD SCHOOL EXAM"
3. Check success message
4. Verify in database
5. Login as subject teacher
6. Check scoresheet shows auto-populated score

**Mark:** ✅ if all steps pass for old school, ❌ if any fail

---

## TEST 6: API Endpoints Verification

**Objective:** All APIs return success (no schema errors)

### 6.1 Test Broadcast API

```bash
curl -X POST http://localhost:3000/api/broadcasts/send-to-recipients \
  -H "Content-Type: application/json" \
  -d '{
    "school_id": "YOUR_SCHOOL_UUID",
    "message": "API Test Broadcast",
    "sender_id": "YOUR_USER_UUID",
    "recipient_roles": ["TEACHER"]
  }'
```

**Expected response:**
```json
{
  "success": true,
  "broadcast_id": "UUID",
  "recipients_added": 5,
  "message": "Broadcast sent to 5 recipients"
}
```

**Mark:** ✅ if success=true, ❌ if error or false

---

### 6.2 Test Lesson Notes API

```bash
curl -X POST http://localhost:3000/api/teacher/lessons/submit \
  -H "Content-Type: application/json" \
  -d '{
    "school_id": "YOUR_SCHOOL_UUID",
    "subject_id": "YOUR_SUBJECT_UUID",
    "class_arm_combo_id": "YOUR_CLASS_UUID",
    "teacher_id": "YOUR_USER_UUID",
    "title": "API Test Lesson",
    "content": "Test lesson content"
  }'
```

**Expected response:**
```json
{
  "success": true,
  "lesson_note_id": "UUID",
  "status": "SUBMITTED",
  "message": "Lesson note submitted successfully for principal review"
}
```

**Mark:** ✅ if success=true, ❌ if error or false

---

### 6.3 Test Assignments API

```bash
curl -X POST http://localhost:3000/api/teacher/assignments/create \
  -H "Content-Type: application/json" \
  -d '{
    "school_id": "YOUR_SCHOOL_UUID",
    "teacher_id": "YOUR_USER_UUID",
    "subject_id": "YOUR_SUBJECT_UUID",
    "class_arm_combo_id": "YOUR_CLASS_UUID",
    "title": "API Test Assignment",
    "description": "Test assignment",
    "due_date": "2026-10-31",
    "max_marks": 10
  }'
```

**Expected response:**
```json
{
  "success": true,
  "assignment_id": "UUID",
  "message": "Assignment created successfully"
}
```

**Mark:** ✅ if success=true, ❌ if error or false

---

### 6.4 Test School Data Backfill API

```bash
curl -X POST http://localhost:3000/api/admin/ensure-complete-school-data \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected response:**
```json
{
  "success": true,
  "schools_processed": 10,
  "sessions_created": 360,
  "terms_created": 1080,
  "streams_created": 40,
  "classes_created": 140,
  "arms_created": 420,
  "combos_created": 420,
  "subjects_created": 230,
  "message": "✅ Ensured complete data for 10 school(s)"
}
```

**Mark:** ✅ if success=true, ❌ if error or false

---

## TEST 7: Compare OLD vs NEW Schools

**Objective:** Both old and new schools have identical feature functionality

Create a comparison table:

| Feature | NEW School | OLD School | Status |
|---------|-----------|-----------|--------|
| Send Broadcast | ✅/❌ | ✅/❌ | Same? |
| Submit Lesson Note | ✅/❌ | ✅/❌ | Same? |
| Principal Sees Lesson | ✅/❌ | ✅/❌ | Same? |
| Create Assignment | ✅/❌ | ✅/❌ | Same? |
| Student Sees Assignment | ✅/❌ | ✅/❌ | Same? |
| Submit CBT | ✅/❌ | ✅/❌ | Same? |
| Score in Scoresheet | ✅/❌ | ✅/❌ | Same? |

**Expected:** All checkmarks in NEW and OLD columns should match (both ✅)

---

## Final Verification Checklist

- [ ] All 7 database schema checks pass (✅)
- [ ] Broadcasts work for NEW school (✅)
- [ ] Broadcasts work for OLD school (✅)
- [ ] Lesson notes work for NEW school (✅)
- [ ] Lesson notes work for OLD school (✅)
- [ ] Assignments work for NEW school (✅)
- [ ] Assignments work for OLD school (✅)
- [ ] CBT works for NEW school (✅)
- [ ] CBT works for OLD school (✅)
- [ ] All API endpoints return success (✅)
- [ ] NEW and OLD schools have identical functionality (✅)
- [ ] No API errors in logs (✅)
- [ ] No database errors in logs (✅)

**Overall Status:**
- ✅ PASS - All checks marked ✅
- ⚠️ PARTIAL - Some checks marked ❌
- ❌ FAIL - Multiple checks marked ❌

---

## Troubleshooting

### Broadcasts not appearing in staff inbox

**Check:**
1. Is `broadcast_recipients` table populated?
   ```sql
   SELECT COUNT(*) FROM broadcast_recipients;
   ```
2. Does staff user exist?
   ```sql
   SELECT COUNT(*) FROM users WHERE role='TEACHER' AND school_id='SCHOOL_UUID';
   ```
3. Check API logs for errors

**Fix:** Re-execute Migration 127

---

### Lesson notes not visible to principal

**Check:**
1. Are lesson notes being inserted?
   ```sql
   SELECT COUNT(*) FROM lesson_notes;
   ```
2. Does principal have `reviewed_by` permission?
3. Check if query is using correct column names (topic, not title)

**Fix:** Re-execute lesson notes API test

---

### Assignments not showing for students

**Check:**
1. Is assignment created?
   ```sql
   SELECT * FROM assignments WHERE status='ACTIVE';
   ```
2. Is student enrolled in that class?
   ```sql
   SELECT * FROM students WHERE class_arm_combo_id='CLASS_UUID';
   ```
3. Is term_id NULL or matching?

**Fix:** Verify student's class_arm_combo_id matches assignment's class_arm_combo_id

---

### CBT score not in scoresheet

**Check:**
1. Was CBT submitted?
   ```sql
   SELECT * FROM cbt_submissions;
   ```
2. Is score_sheet created?
   ```sql
   SELECT * FROM score_sheets;
   ```
3. Check if auto-sync trigger executed (Migration 120)

**Fix:** Manually create score sheet or re-execute Migration 120

---

## Success Criteria

✅ **PASSED** if:
- All database schemas correct
- NEW schools: All features work
- OLD schools: All features work  
- NEW and OLD schools have identical functionality
- No API errors
- No database errors

❌ **FAILED** if:
- Any feature doesn't work for either NEW or OLD schools
- Schema mismatches
- API returns errors
- NEW and OLD schools have different functionality

