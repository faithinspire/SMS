# DEPLOYMENT INSTRUCTIONS - Steps 1-6 Complete

**Date:** August 19, 2026
**Current Status:** All code changes applied ✅ | Build verification pending | Database migration ready 

---

## BEFORE YOU START

**Backup Requirements:**
- Backup your `.env.local` file
- Backup current Supabase database (export SQL dump)
- Take note of current school_id values if manually populating

**Prerequisites:**
- Supabase project active and reachable
- Admin access to Supabase dashboard
- npm or yarn installed locally
- Node.js v18+ required

---

## DEPLOYMENT SEQUENCE

### PHASE 1: DATABASE MIGRATION (Required First)

#### 1.1 Apply Migration 030 to Supabase

This migration is CRITICAL and must be applied BEFORE using any new features.

**Option A: Via Supabase Dashboard (Recommended)**

1. Go to https://app.supabase.com → Your Project
2. Click "SQL Editor" in left sidebar
3. Click "+ New Query"
4. Copy the entire contents of:
   ```
   database/migrations/030_master_cbt_results_canonical_architecture.sql
   ```
5. Paste into the SQL editor
6. Click "Run"
7. Wait for completion (should show "✓ Success")

**Option B: Via Supabase CLI**

```bash
cd c:\Users\OLU\Desktop\SMS
supabase migration list
supabase db push
```

**Verify Migration Applied:**

After migration, run this query in Supabase SQL Editor:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('cbt_answers', 'teacher_class_assignments') 
AND table_schema = 'public';
```

**Expected Result:**
```
table_name
-----------
cbt_answers
teacher_class_assignments
```

Also verify new columns:

```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'cbt_submissions' 
AND column_name IN ('status', 'assessment_type', 'term_id', 'percentage')
AND table_schema = 'public';
```

**Expected Result:**
```
column_name
-----------
status
assessment_type
term_id
percentage
```

---

### PHASE 2: APPLICATION BUILD & DEPLOYMENT

#### 2.1 Build Locally (Verify No Errors)

```bash
cd c:\Users\OLU\Desktop\SMS
npm install  # Install any new dependencies (if needed)
npm run build
```

**Expected Output:**
```
✓ Creating an optimized production build ...
✓ Compiled successfully
  
```

**If build fails:** Check error message and resolve TypeScript errors

#### 2.2 Test Locally (Optional but Recommended)

```bash
npm run dev
```

Visit http://localhost:3000 and navigate to:
- Student Dashboard → CBT
- Teacher Dashboard → CBT

#### 2.3 Deploy to Vercel (or Your Hosting)

If using Vercel:
```bash
# Ensure you have Vercel CLI installed
npm i -g vercel

# Deploy
vercel --prod
```

If using manual deployment:
1. Commit changes to git
2. Push to your deployment branch
3. Run build in production environment

---

### PHASE 3: DATABASE SCHEMA VERIFICATION

After deployment, verify schema is correct:

#### 3.1 Check CBT Answers Table

Query in Supabase SQL Editor:

```sql
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'cbt_answers'
AND table_schema = 'public'
ORDER BY ordinal_position;
```

Expected columns:
- id (uuid) - PK
- school_id (uuid) - FK
- submission_id (uuid) - FK
- question_id (uuid) - FK
- selected_option_id (uuid) - nullable
- answer_text (text) - nullable
- marks_awarded (numeric) - default 0
- is_correct (boolean) - default false
- created_at (timestamp) - auto now
- updated_at (timestamp) - auto now

#### 3.2 Check CBT Submissions Columns

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'cbt_submissions'
AND table_schema = 'public'
AND column_name IN ('status', 'assessment_type', 'term_id', 'percentage', 'passed', 'graded_at')
ORDER BY ordinal_position;
```

#### 3.3 Check Indices

```sql
SELECT * FROM information_schema.statistics
WHERE table_schema = 'public'
AND table_name IN ('cbt_answers', 'cbt_submissions', 'score_sheets')
ORDER BY table_name, index_name;
```

---

### PHASE 4: APPLICATION TESTING

After deployment, run these tests in order:

#### Test 4.1: Create CBT Exam (Teacher)

1. Log in as teacher
2. Go to Dashboard → CBT
3. Click "Create New Exam"
4. Fill in:
   - Subject: Mathematics
   - Class: SS1A  
   - Assessment Type: CA1
   - Term: First Term
   - Duration: 30 minutes
   - Total Marks: 30
   - Title: "Mathematics Assessment"
5. Click Create
6. ✅ **PASS**: Exam created with ID in URL, status = DRAFT

#### Test 4.2: Add Questions (Teacher)

1. While still on exam, click "Add Questions"
2. Add 5 MCQ questions:
   - Question 1: "What is 2+2?" 
     - Options: A: 4 (correct), B: 5, C: 3, D: 6
   - Marks: 6 each
3. Click Save
4. ✅ **PASS**: Questions saved, exam status changed to ACTIVE

#### Test 4.3: Student Views Eligible Exams

1. Log in as student from SS1A who offers Mathematics
2. Go to Dashboard → CBT
3. ✅ **PASS**: See "Mathematics Assessment" in list
4. ❌ **FAIL if**: See exams for subjects student doesn't offer

#### Test 4.4: Student Does NOT See Ineligible Exams

1. Log in as student from JSS1 (not SS1A)
2. Go to Dashboard → CBT
3. ✅ **PASS**: "Mathematics Assessment" is NOT visible
4. ❌ **FAIL if**: See exams from other classes

#### Test 4.5: Student Starts Exam - HEADER VERIFICATION ✅✅✅

1. Eligible student clicks "Take Exam"
2. ✅ **VERIFY STUDENT HEADER** at top shows:
   - School Name: [School Name]
   - Student: [Full Name]
   - Admission No: [Admission Number]
   - Class: SS1A
   - Arm: A (if applicable)
   - Subject: Mathematics
   - Assessment: CA1
   - Term: First Term
   - Time Remaining: [MM:SS countdown]

3. ✅ **PASS**: Header visible at top, sticky/stays during scroll

#### Test 4.6: Student Takes Exam

1. Answer 4 questions correctly (4 × 6 = 24 marks)
2. Answer 1 question incorrectly (0 marks)
3. Click Next/Previous navigation
4. ✅ **PASS**: Navigation works, answers saved
5. ✅ **VERIFY**: Question status indicators show answered (✓)

#### Test 4.7: Student Submits Exam

1. Click "Submit Exam"
2. Confirm submission
3. Wait for grading
4. ✅ **PASS**: See results page showing:
   - Score: 24/30
   - Percentage: 80%
   - Status: GRADED

#### Test 4.8: Auto-Grading Verification

In Supabase SQL Editor:

```sql
SELECT 
  cs.id,
  cs.score,
  cs.percentage,
  cs.assessment_type,
  ss.test1,
  ss.exam
FROM cbt_submissions cs
LEFT JOIN score_sheets ss ON ss.exam_cbt_source = cs.id
WHERE cs.assessment_type = 'CA1'
LIMIT 5;
```

✅ **VERIFY**:
- score = 24 (not percentage)
- percentage = 80.00
- test1 = 8.00 (24/30 × 10)
- assessment_type = 'CA1'

#### Test 4.9: Teacher Sees Result

1. Log in as teacher
2. Go to Dashboard → Results
3. Select: Term, Subject, Class
4. ✅ **PASS**: See student name, admission #, score (8/10 for CA1)
5. ✅ **VERIFY**: See "CA1" not UUID

#### Test 4.10: Student Sees Result

1. Log in as student
2. Go to Dashboard → Results
3. Click "First Term"
4. ✅ **PASS**: See Mathematics | CA1: 8 | Total: 8
5. ✅ **VERIFY**: Matches teacher view score

---

### PHASE 5: EDGE CASE TESTING

#### Test 5.1: Student Cannot Re-Submit

1. Student who already submitted tries to start exam again
2. ✅ **PASS**: Get error "You have already submitted this exam"

#### Test 5.2: Time Auto-Submit

1. Student starts exam with 2 minute duration
2. Wait for timer to reach 0:00
3. ✅ **PASS**: Exam auto-submitted, locked

#### Test 5.3: Empty IDs Don't Break Queries

API calls with missing IDs should return 400 error:

```bash
curl -X GET "http://localhost:3000/api/student/cbt/exams" \
  -H "Content-Type: application/json"
  
# Expected: 400 error "Missing required query parameters"
```

✅ **PASS**: Proper error, no server crash

#### Test 5.4: Cross-School Isolation

1. Create exams for School A and School B
2. Student from School A logs in
3. ✅ **PASS**: Only see exams from School A
4. ❌ **FAIL if**: Can see School B exams

---

### PHASE 6: ROLLBACK PLAN (If Issues)

If critical issues found:

#### Option A: Database Rollback (Fastest)

```sql
-- Run BEFORE migration 030
-- This drops the new tables/columns
DROP TABLE IF EXISTS cbt_answers;
DROP TABLE IF EXISTS teacher_class_assignments;
ALTER TABLE cbt_submissions DROP COLUMN IF EXISTS status;
ALTER TABLE cbt_submissions DROP COLUMN IF EXISTS assessment_type;
ALTER TABLE cbt_submissions DROP COLUMN IF EXISTS term_id;
-- etc...
```

#### Option B: Code Rollback

1. Revert git to previous commit
2. Redeploy application

#### Option C: Keep Both (Safe)

Keep both old and new code running, disable new endpoints:
1. Comment out new route files
2. Redeploy
3. Investigate issues

---

## TROUBLESHOOTING

### Issue: "Could not find the table 'public.cbt_answers'"

**Cause:** Migration 030 not applied

**Fix:** 
1. Go to Supabase dashboard
2. Run migration 030 in SQL Editor
3. Verify table exists
4. Restart application

### Issue: Student sees exam from different subject

**Cause:** subject_teacher_assignments missing or student_subjects not properly linked

**Fix:**
1. Check student_subjects table for student
2. Verify student has subject_id entries
3. Re-link subjects if needed:
   ```sql
   INSERT INTO student_subjects (student_id, subject_id, school_id)
   VALUES ('student-uuid', 'subject-uuid', 'school-uuid');
   ```

### Issue: Score not appearing in score_sheets

**Cause:** Auto-population didn't work or assessment_type mismatch

**Fix:**
1. Verify cbt_submission.assessment_type is set (CA1, CA2, etc.)
2. Check if score_sheets entry was created
3. Manually create if missing:
   ```sql
   INSERT INTO score_sheets 
   (school_id, student_id, subject_id, term_id, test1)
   VALUES ('...', '...', '...', '...', 8.00);
   ```

### Issue: UUID appearing in UI instead of name

**Cause:** Format helpers not called

**Fix:**
1. Use getSubjectName(), getClassArmName() functions
2. Example:
   ```typescript
   const subjectName = await getSubjectName(exam.subject_id, schoolId)
   ```

### Issue: Build failing with TypeScript errors

**Fix:**
```bash
npm install --save-dev @types/node
npm run build
```

---

## POST-DEPLOYMENT CHECKLIST

After all tests pass:

- [ ] Migration 030 applied to production Supabase
- [ ] All new API endpoints tested
- [ ] Student header displays on exam page
- [ ] Auto-grading calculates correctly
- [ ] Score sheets populated automatically
- [ ] Both teacher and student see same results
- [ ] No UUID rendering in UI
- [ ] Empty ID protection working
- [ ] Cross-school data isolation verified
- [ ] Rollback plan documented
- [ ] Team trained on new features
- [ ] Monitoring alerts configured
- [ ] Database backup taken post-deployment

---

## MONITORING

Monitor these queries post-deployment:

### Score Sheet Population

```sql
SELECT 
  COUNT(*) as total_submissions,
  COUNT(ss.id) as score_sheets_created,
  COUNT(CASE WHEN ss.test1 IS NOT NULL THEN 1 END) as ca1_scores,
  COUNT(CASE WHEN ss.exam IS NOT NULL THEN 1 END) as exam_scores
FROM cbt_submissions cs
LEFT JOIN score_sheets ss ON ss.exam_cbt_source = cs.id OR ss.test1_cbt_source = cs.id;
```

### Auto-Grading Accuracy

```sql
SELECT 
  COUNT(*) as total_answers,
  COUNT(CASE WHEN is_correct THEN 1 END) as marked_correct,
  COUNT(CASE WHEN is_correct = false THEN 1 END) as marked_incorrect,
  COUNT(CASE WHEN is_correct IS NULL THEN 1 END) as unmarked
FROM cbt_answers;
```

### Error Rate

Check application logs for 400/500 errors on new endpoints:
- `/api/teacher/cbt/*`
- `/api/student/cbt/*`
- `/api/results/*`

---

## SUPPORT

If encountering issues:

1. Check this deployment guide
2. Review troubleshooting section
3. Check Supabase logs: https://app.supabase.com/project/[id]/logs
4. Check application logs in Vercel/hosting platform
5. Run verification queries in SQL Editor

---

**Next Steps After Successful Deployment:**
1. ✅ Steps 1-6 deployed and tested
2. → STEP 7: Build verification complete
3. → STEP 8: Teacher CBT Dashboard UI
4. → STEP 9: Student Results Dashboard UI
5. → STEP 10: End-to-end testing & UAT

---

**Deployment Status:** Ready to apply migration 030 and deploy

Contact development team if issues encountered during deployment.
