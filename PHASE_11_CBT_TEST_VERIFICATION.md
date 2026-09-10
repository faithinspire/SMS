# PHASE 11: CBT System Test Verification

## Overview
This document guides manual testing of the CBT system fixes to verify:
1. ✅ Null term_id no longer blocking exam creation
2. ✅ Multi-choice questions display with all 4 options
3. ✅ Department constraint violations fixed
4. ✅ Score auto-updates to score_sheets after submission
5. ✅ Scores appear on teacher scoresheets and student results

---

## TEST SCENARIO 1: Create CBT Exam with Proper Term

### Step 1: Navigate to Teacher CBT Management
- Login as Teacher
- Go to: `/teacher/cbt-management`
- Click: **"Create New Exam"**

### Step 2: Fill Exam Details
- **School**: Select your school
- **Subject**: Select a subject (e.g., Mathematics)
- **Class**: Select class (e.g., JSS 1A)
- **Assessment Type**: Select `CA1` ⚠️ **MUST BE SET** (not null)
- **Term**: Select current term from dropdown ⚠️ **MUST BE SET** (not null after migration 059)
- **Duration**: 30 minutes
- **Total Marks**: 20
- **Description**: "Mid-term assessment"
- **Click**: Create Exam

**EXPECT**: ✅ Exam created successfully
**ERROR CHECK**: If you see "Missing required field: term_id", migration 059 hasn't been applied

---

## TEST SCENARIO 2: Add Multi-Choice Questions

### Step 1: Open Created Exam
- Click on exam from list
- Go to: **"Add Questions"** tab

### Step 2: Add Multi-Choice Question
- **Question Type**: Select `MULTIPLE_CHOICE`
- **Question Text**: "What is 2 + 2?"
- **Marks**: 1 point

### Step 3: Add Options (MUST BE EXACTLY 4)
Add four options with exactly ONE correct answer:

| Option | Text | Correct |
|--------|------|---------|
| A | 3 | ❌ |
| B | 4 | ✅ |
| C | 5 | ❌ |
| D | 6 | ❌ |

**EXPECT**: ✅ Question created with 4 options displayed as A, B, C, D
**ERROR CHECK**: 
- If validation error: "Question must have exactly 4 options" → Check you added all 4
- If options don't display → Check `cbt_options` table has `option_key` values A-D

### Step 4: Verify Option Display
- Open exam details
- Options should display as radio buttons with labels:
  - (A) 3
  - (B) 4  ← Should show checked/highlighted when correct answer selected
  - (C) 5
  - (D) 6

**EXPECT**: ✅ All 4 options visible with letter labels
**ERROR CHECK**: If options don't show, check:
- Migration 060 applied (enforces uniqueness constraint)
- `display_order` is 0,1,2,3 for each option
- `option_key` is populated

---

## TEST SCENARIO 3: Student Attempts CBT Exam

### Step 1: Login as Student
- Exit teacher account
- Login as a student enrolled in JSS 1A

### Step 2: Navigate to Exam
- Go to: `/student/exams` or `student/cbt`
- Find exam: "Mid-term assessment" (Math)
- Click: **"Start Exam"**

**EXPECT**: ✅ Exam loads without FK errors
**ERROR CHECK**: If you see error "Could not find relationship between cbt_exams and academic_terms":
- The exam's `term_id` is still NULL
- Run migration 059 to backfill term_ids

### Step 3: Answer Question
- See question with 4 options displayed
- Click option B (correct answer: 4)
- **Can you click Next?** → YES, button should be enabled
- **Can you click Submit?** → YES, should be enabled on last question

**EXPECT**: 
- ✅ Option B shows as selected
- ✅ Student can navigate between questions
- ✅ Student can click Submit on last question (Next disabled is OK)

**ERROR CHECK**: If options don't show:
- Check `cbt_options` table: `SELECT * FROM cbt_options WHERE question_id = '<question_id>';`
- Should have 4 rows with `option_key` IN ('A','B','C','D')
- Should have exactly 1 with `is_correct = true`

---

## TEST SCENARIO 4: Submit Exam & Verify Score Creation

### Step 1: Submit Exam
- Click: **"Submit Exam"**
- Confirm submission

**EXPECT**: ✅ Exam submitted, score displayed
**RESULT SHOWN**: "You scored 20/20" or "You scored 20/20 - 100%"

### Step 2: Check Server Logs
Open browser DevTools → Console (F12) → Check for logs:

```
[CBT Submit] Score sheet creation conditions: {
  hasStudent: true,
  hasSubjectId: true,
  hasAssessmentType: true,
  hasTermId: true
}

[CBT Submit] ✅ All conditions met - proceeding with score_sheets creation
[CBT Submit] ✅ Found academic session: <session-uuid>
[CBT Submit] ✅ Creating new score_sheets entry with data: {...}
[CBT Submit] ✅ Score_sheets created successfully
```

**EXPECT**: All conditions should be `true`

**ERROR CHECK**: If any condition is false:
- `hasStudent: false` → Student not found in database (check student registration)
- `hasSubjectId: false` → Exam's subject_id is NULL (re-create exam)
- `hasAssessmentType: false` → Exam's assessment_type is NULL (re-create exam with type set)
- `hasTermId: false` → Migration 059 needs to run (exam's term_id is still NULL)

---

## TEST SCENARIO 5: Verify Score Appears in Teacher Scoresheet

### Step 1: Login as Subject Teacher
- Exit student account
- Login as the teacher who created the exam

### Step 2: View Scoresheet
- Go to: `/teacher/score-management` or `/teacher/scoresheet`
- Select: Subject (Math), Class (JSS 1A), Term (current)
- Find student row

**EXPECT**: 
- ✅ CA1 column shows score (e.g., "8/10" or similar scaled value)
- ✅ Source indicator shows "CBT" or "Online"

**ERROR CHECK**: 
- If scoresheet is empty → Check logs from Step 2
- If score is 0 → Check `cbt_submissions.status` is 'LOCKED' and `score` field has value

### Step 3: Verify in Database
Run in Supabase SQL Editor:

```sql
-- Find the score_sheets entry
SELECT 
  id, 
  student_id, 
  subject_id, 
  term_id,
  test1, test1_source, test1_cbt_source,
  created_at
FROM score_sheets
WHERE student_id = '<student-uuid>'
  AND subject_id = '<subject-uuid>'
  AND term_id = '<term-uuid>'
LIMIT 1;
```

**EXPECT**: 
- ✅ Row exists with populated `test1` value (for CA1 assessment)
- ✅ `test1_source` = 'CBT'
- ✅ `test1_cbt_source` = submission ID

---

## TEST SCENARIO 6: Verify Score Appears on Student Results Page

### Step 1: Login as Student
- Exit teacher account
- Login as the student who took exam

### Step 2: View Results
- Go to: `/student/view-results`
- Select: Subject (Math), Term (current)

**EXPECT**: 
- ✅ CA1 score shows for Math subject
- ✅ Score matches what teacher sees
- ✅ Result indicator shows: e.g., "Score: 8/10" or percentage

**ERROR CHECK**: 
- If score doesn't show → Check `cbt_submissions.status` is 'LOCKED'
- If score is different from teacher's scoresheet → Check scoring calculation in submit endpoint

---

## DEPARTMENT CONSTRAINT TEST

### Step 1: Edit Student Profile
- Login as Admin
- Go to: Admin → Students → Edit Student (secondary level)
- Try to change department to invalid value (e.g., "ARTS")

**EXPECT**: ✅ Error message: "Invalid department: ARTS"
**Allowed values**: SCIENCE, COMMERCIAL, HUMANITIES, TECHNICAL, VOCATIONAL

### Step 2: Set Valid Department
- Change department to "SCIENCE"
- Save

**EXPECT**: ✅ Student profile updated successfully

**ERROR CHECK**: If you see "violates check constraint students_department_check":
- Run migration 061 to standardize existing values
- Verify component uses uppercase department IDs

---

## QUICK VERIFICATION CHECKLIST

### Before Testing
- [ ] All 3 migrations applied (059, 060, 061)
- [ ] Dev server running: `npm run dev`
- [ ] Connected to correct Supabase project
- [ ] Browser DevTools Console open (F12)

### During Testing
- [ ] ✅ Can create exam with term_id required
- [ ] ✅ Multi-choice questions show 4 options (A, B, C, D)
- [ ] ✅ Student can select and submit answer
- [ ] ✅ Score calculated correctly (20/20 = 100%)
- [ ] ✅ [CBT Submit] logs show all conditions met
- [ ] ✅ score_sheets entry created in database
- [ ] ✅ Teacher sees score in scoresheet
- [ ] ✅ Student sees score in results page
- [ ] ✅ Department constraint prevents invalid values

### After Testing
If ALL checks pass: ✅ **PHASE 11 COMPLETE**

If any fails: ⚠️ Check error logs and run appropriate migration or code fix

---

## Troubleshooting Commands

### Check if migrations applied
```sql
-- List all migrations
SELECT name FROM schema_migrations ORDER BY name DESC LIMIT 10;

-- Should include:
-- 061_standardize_department_values
-- 060_enforce_cbt_options_requirements  
-- 059_fix_cbt_term_id_required
```

### Check CBT exam has term_id
```sql
SELECT id, title, term_id, assessment_type FROM cbt_exams LIMIT 5;
```

### Check questions have options
```sql
SELECT q.id, q.question_text, COUNT(o.id) as option_count
FROM cbt_questions q
LEFT JOIN cbt_options o ON o.question_id = q.id
GROUP BY q.id, q.question_text
HAVING COUNT(o.id) != 4;  -- Shows questions without exactly 4 options
```

### Check student department values
```sql
SELECT DISTINCT department FROM students WHERE department IS NOT NULL;
-- Should show: SCIENCE, COMMERCIAL, HUMANITIES, TECHNICAL, VOCATIONAL
```

### Check score_sheets created
```sql
SELECT id, student_id, subject_id, test1, test1_source, created_at
FROM score_sheets
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 5;
```

---

## Expected Outcomes

| Feature | Before PHASE 11 | After PHASE 11 |
|---------|-----------------|----------------|
| **CBT Exam Creation** | ❌ Silent null term_id | ✅ Term required + validated |
| **Multi-Choice Display** | ❌ Empty option list | ✅ 4 options with A,B,C,D |
| **Option Selection** | ❌ Can't click next | ✅ Navigation works |
| **Student Submission** | ❌ Score not auto-saved | ✅ Auto-creates score_sheets |
| **Teacher Scoresheet** | ❌ CBT scores missing | ✅ CBT scores appear |
| **Student Results** | ❌ CBT results missing | ✅ CBT results visible |
| **Student Profile Edit** | ❌ Constraint violation | ✅ Department validated |

---

## Notes

- All times in logs are UTC
- Score scaling: CA (test1-4) scaled to /10, EXAM scaled to /60
- Passing percentage: Default 50% (configurable per exam)
- Theory questions: Manual grading (not auto-scored)
- Score_sheets: One row per student-subject-term combination

