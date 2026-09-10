# ⚡ QUICK START: Verification & Testing

## 🎯 DO THIS NOW (5 minutes)

### Step 1: Clear Browser Cache
```
Windows:
- Press: Ctrl + Shift + Delete
- Select: "All time"
- Check: "Cookies", "Cached images and files"
- Click: "Clear data"

OR

- Press: Ctrl + Shift + R (hard refresh)
```

### Step 2: Verify Server is Running
```
Terminal should show:
✓ Ready in X.Xs
✓ compiled client and server successfully
```

**If NOT running:**
```bash
cd c:\Users\OLU\Desktop\SMS
npm run dev
```

### Step 3: Test CBT Exam Flow
```
1. Go to: http://localhost:3000/student/cbt-portal
2. See: List of exams by status
3. Click: "Start Exam" (on any active exam)
4. Expected: 
   ✅ Route: /student/cbt/[exam-id]
   ✅ Page loads (NOT 404)
   ✅ See exam questions
5. Select some answers
6. Click: "Submit Exam"
7. Expected:
   ✅ Redirect to results page
   ✅ See score, percentage, pass/fail
```

---

## ✅ Verification Checklist

### CBT Portal (/student/cbt-portal)
- [ ] Page loads without errors
- [ ] Sees exams by status (Active, Completed, Upcoming)
- [ ] Active exams have "Start Exam" button (red)
- [ ] Completed exams have "View Results" button (blue)
- [ ] Upcoming exams have "Coming Soon" button (disabled)

### Exam Taking (/student/cbt/[id])
- [ ] Page loads WITHOUT 404
- [ ] Exam title and subject visible
- [ ] Timer counting down
- [ ] Questions displayed with options
- [ ] Can select answer options
- [ ] Progress bar updates
- [ ] Question navigation works
- [ ] "Submit Exam" button visible
- [ ] Submit button works

### Exam Results (/student/cbt/[id]/results)
- [ ] Page loads after submission
- [ ] Score displays (e.g., 45/100)
- [ ] Percentage displays (e.g., 45%)
- [ ] Pass/fail status shows
- [ ] Can see correct answers
- [ ] Can see own answers
- [ ] Visual feedback (green/red for correct/wrong)

### Teacher Results (/teacher/results)
- [ ] Page loads without errors
- [ ] NO 400 error in network tab
- [ ] Students from class visible
- [ ] Students from subject visible
- [ ] CBT exam scores visible
- [ ] Can edit scores manually

### Photo Upload
- [ ] Register student with photo
- [ ] Photo uploads successfully
- [ ] Registration completes even if upload fails
- [ ] Student created in database

---

## 🔍 Debugging: If Something Breaks

### Issue: Still Getting 404 on Exam Start

**Diagnosis:**
```
1. Open DevTools: F12
2. Network tab → Look for failed /student/cbt/[id] request
3. Status should be 200 (not 404)
4. Console tab → Look for JavaScript errors
```

**Fix:**
```
1. Hard clear cache: Ctrl+Shift+Delete (all time)
2. Close browser completely
3. Reopen browser
4. Go to http://localhost:3000/student/cbt-portal
5. Try again
```

### Issue: Photo Upload Failing

**Expected behavior:**
```
✅ First bucket (student-photos) - if fails, try next
✅ Second bucket (school-logos) - if fails, try next
✅ Third bucket (documents) - if fails, try next
✅ Fourth bucket (teacher-photos) - if fails
✅ Registration STILL completes (photo is optional)
```

**Check DevTools Console:**
```
You should see:
📤 Attempting to upload photo...
📤 Trying bucket: student-photos
📤 Trying bucket: school-logos
📤 Trying bucket: documents
📤 Trying bucket: teacher-photos
⚠️ All storage buckets unavailable, continuing without photo
✅ Photo upload skipped - student registration continues
```

**If not working:**
```
1. Check server console for errors
2. Verify Supabase connection in .env.local
3. Verify storage buckets exist in Supabase
4. Registration should still complete (photo optional)
```

### Issue: 400 Error on Teacher Results

**Expected behavior:**
```
✅ Query returns students without error
✅ No 400 error in network tab
✅ Students filtered by class in-memory
```

**If still getting 400:**
```
1. Open DevTools F12 → Network tab
2. Find request to /rest/v1/students
3. Check URL parameters
4. Should NOT have multiple ?eq= filters
5. Refresh page
```

---

## 📊 Manual Database Verification

### Check Students Created
```sql
-- In Supabase SQL Editor:
SELECT id, admission_number, user_id, school_id, class_arm_combo_id
FROM students
WHERE school_id = 'YOUR_SCHOOL_ID'
LIMIT 10;
```

**Expected:**
- [ ] Multiple student records
- [ ] All have user_id
- [ ] All have school_id
- [ ] All have class_arm_combo_id

### Check Teachers Created
```sql
-- In Supabase SQL Editor:
SELECT id, user_id, school_id, subject_id, class_arm_combo_id
FROM teachers
WHERE school_id = 'YOUR_SCHOOL_ID'
LIMIT 10;
```

**Expected:**
- [ ] Multiple teacher records
- [ ] All have user_id
- [ ] All have school_id
- [ ] subject_id and class_arm_combo_id populated

### Check CBT Exams
```sql
-- In Supabase SQL Editor:
SELECT id, title, start_time, end_time, subject_id, school_id
FROM cbt_exams
WHERE school_id = 'YOUR_SCHOOL_ID'
LIMIT 10;
```

**Expected:**
- [ ] Exam records exist
- [ ] All have valid dates (start_time < end_time)
- [ ] All have school_id

### Check CBT Questions
```sql
-- In Supabase SQL Editor:
SELECT id, cbt_exam_id, question_text, marks
FROM cbt_questions
LIMIT 10;
```

**Expected:**
- [ ] Questions exist
- [ ] Linked to exams
- [ ] Have marks assigned

### Check CBT Submissions
```sql
-- In Supabase SQL Editor:
SELECT id, student_id, cbt_exam_id, score, status
FROM cbt_submissions
WHERE school_id = 'YOUR_SCHOOL_ID'
LIMIT 10;
```

**Expected:**
- [ ] Submission records exist
- [ ] Score is calculated
- [ ] Status is PASSED or FAILED

---

## 🚀 Complete Test Scenario

### Scenario: Student Takes Full CBT Exam

**Prerequisites:**
- [ ] School created
- [ ] Teacher registered and assigned to class + subject
- [ ] Student registered and assigned to class + subject
- [ ] CBT exam created with questions (in time window)

**Test Steps:**
```
1. Log in as student
   - Email: student-XXXX@school.local (from registration)
   - Password: Generated PIN from registration

2. Go to /student/cbt-portal
   - See exam listed under "Active Exams"

3. Click "Start Exam"
   - Route changes to /student/cbt/[id]
   - Exam interface loads
   - Timer shows duration remaining
   - Questions visible

4. Answer questions
   - Select options for multiple choice
   - Type answer for theory questions
   - Can navigate between questions
   - Can go back and change answers

5. Submit exam
   - Click "Submit Exam" button
   - Redirects to results page
   - Score calculated and displayed
   - Percentage shown
   - Pass/fail status shown

6. View results again
   - Go to /student/cbt-portal
   - See exam under "Completed Exams"
   - Click "View Results"
   - Results page loads with full details

7. As teacher, verify results
   - Go to /teacher/results
   - See student in list
   - See CBT exam score auto-populated
   - Can edit score if needed
```

**Expected Outcomes:**
```
✅ No 404 errors
✅ No 400 errors
✅ No JavaScript console errors
✅ Exam interface loads and works
✅ Timer works correctly
✅ Submission succeeds
✅ Score calculated accurately
✅ Results display properly
✅ Teacher can view student results
```

---

## 📋 Performance Targets

### Load Times
- CBT Portal: < 2 seconds
- Exam Taking: < 3 seconds
- Results: < 2 seconds
- Teacher Results: < 3 seconds

### Query Performance
- CBT Discovery: Single query (not N+1)
- Submission Save: Batch insert for answers
- Results Load: Two queries max (submission + answers)

---

## 🎓 What Each Fix Addresses

| Fix | Error | Solution |
|-----|-------|----------|
| **Route Fix** | GET /student/cbt-take 404 | Changed route from /cbt-take to /cbt |
| **Query Fix** | GET /rest/v1/students 400 | Single filter + in-memory school_id filter |
| **Storage Fix** | ERROR 42501 permission denied | 4-bucket fallback, graceful failure |
| **Teacher Reg** | Database constraint error | Fixed ID references (users.id) |
| **CBT System** | Columns don't exist | Fixed schema (end_time, passing_percentage) |

---

## ✨ Success Indicators

When everything is working:

```
✅ Students can:
   - See available CBTs for their subjects
   - Click "Start Exam" and load exam page
   - View exam questions and options
   - Select answers or type theory answers
   - Submit exam successfully
   - View results with score and feedback

✅ Teachers can:
   - Create CBT exams with questions
   - See student submissions
   - View exam scores and results
   - Edit scores manually if needed

✅ System shows:
   - No 404 errors
   - No 400 errors
   - No permission errors (42501)
   - No constraint errors
   - Clean database (no duplicates)
   - Correct calculations (scores, percentages)
```

---

## 📞 Emergency Checklist

If system breaks:
- [ ] Server still running: `npm run dev`
- [ ] No TypeScript errors: Check DevTools Console
- [ ] Browser cache cleared: Ctrl+Shift+Delete
- [ ] Database still accessible: Check Supabase
- [ ] All env vars set: Check .env.local
- [ ] Recent code changes: Run diagnostics

---

**Ready?** → Follow Step 1 (clear cache) → Test CBT flow → Report results!
