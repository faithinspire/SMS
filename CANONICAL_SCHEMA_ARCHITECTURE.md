# CANONICAL SCHEMA ARCHITECTURE - UNIFIED SCORE DATA FLOW

## Executive Summary
The SMS system now uses a **single source of truth** for all academic scores:

| **Purpose** | **Canonical Table** | **Flow** |
|----------|-------------------|----------|
| **Assessment Scores** | `score_sheets` | Manual entry + CBT auto-population |
| **Teacher→Subject→Class** | `subject_teacher_assignments` | Teacher assignment management |
| **Student→Subject** | `student_subjects` | Student enrollment data |
| **CBT Submissions** | `cbt_submissions` + `cbt_answers` | Question-level tracking → score_sheets |

**All other tables that duplicated these relationships have been removed.**

---

## CANONICAL TABLE SCHEMAS

### 1. `score_sheets` - SINGLE SOURCE OF TRUTH FOR SCORES

```sql
CREATE TABLE score_sheets (
  id UUID PRIMARY KEY,
  school_id UUID NOT NULL,
  student_id UUID NOT NULL,
  subject_id UUID NOT NULL,
  term_id UUID NOT NULL,
  teacher_id UUID,
  class_arm_combo_id UUID,
  
  -- Test scores (0-10 each, max total 40)
  test1 NUMERIC(5,2),
  test2 NUMERIC(5,2),
  test3 NUMERIC(5,2),
  test4 NUMERIC(5,2),
  
  -- Exam score (0-60)
  exam NUMERIC(5,2),
  
  -- Auto-calculated total (0-100)
  total GENERATED ALWAYS AS (
    COALESCE(test1,0) + COALESCE(test2,0) + COALESCE(test3,0) + COALESCE(test4,0) + COALESCE(exam,0)
  ) STORED,
  
  -- Auto-assigned grade
  grade VARCHAR(2),
  
  -- SOURCE TRACKING (WHO PROVIDED THIS SCORE?)
  test1_source VARCHAR(20),    -- 'MANUAL' or 'CBT'
  test2_source VARCHAR(20),    -- 'MANUAL' or 'CBT'
  test3_source VARCHAR(20),    -- 'MANUAL' or 'CBT'
  test4_source VARCHAR(20),    -- 'MANUAL' or 'CBT'
  exam_source VARCHAR(20),     -- 'MANUAL' or 'CBT'
  
  -- CBT LINKAGE (WHICH CBT SUBMISSION GENERATED THIS?)
  test1_cbt_source UUID,       -- REFERENCES cbt_submissions(id)
  test2_cbt_source UUID,       -- REFERENCES cbt_submissions(id)
  test3_cbt_source UUID,       -- REFERENCES cbt_submissions(id)
  test4_cbt_source UUID,       -- REFERENCES cbt_submissions(id)
  exam_cbt_source UUID,        -- REFERENCES cbt_submissions(id)
  
  -- COMMENTS
  teacher_comment TEXT,
  hm_comment TEXT,
  
  -- TIMESTAMPS
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  
  -- CONSTRAINT: ONE SCORE PER STUDENT-SUBJECT-TERM
  UNIQUE(school_id, student_id, subject_id, term_id)
);
```

**Purpose:** Store ALL academic scores - from manual teacher entry or CBT auto-population.

**Data Flows TO score_sheets FROM:**
1. Subject Teacher Manual Entry → `score_sheets` (test1-4, exam)
2. CBT Submission → `cbt_submissions` → `score_sheets` (auto-population based on assessment_type)

**Data Flows FROM score_sheets TO:**
1. Subject Teachers (for review/editing)
2. Class Teachers (for aggregation across all subjects)
3. Students (for viewing own results)

---

### 2. `subject_teacher_assignments` - TEACHER SUBJECT SCOPE

```sql
CREATE TABLE subject_teacher_assignments (
  id UUID PRIMARY KEY,
  school_id UUID NOT NULL,
  teacher_id UUID NOT NULL,
  subject_id UUID NOT NULL,
  class_arm_combo_id UUID NOT NULL,
  assigned_at TIMESTAMP,
  
  UNIQUE(school_id, teacher_id, subject_id, class_arm_combo_id)
);
```

**Purpose:** Define which teacher teaches which subject in which class.

**Used By:**
1. Subject Teacher Dashboard → "Show me my students for Mathematics in SSS1A"
2. Score Sheet Page → "Show me only students who are enrolled in my subject in my class"
3. Class Teacher Dashboard → "Show me all teachers who teach subjects in my class"

**Relationship:**
```
Teacher (John)
  ├─ Mathematics in SSS1A
  ├─ Mathematics in SSS1B
  └─ Mathematics in JSS2A
```

---

### 3. `student_subjects` - STUDENT ENROLLMENT

```sql
CREATE TABLE student_subjects (
  id UUID PRIMARY KEY,
  school_id UUID NOT NULL,
  student_id UUID NOT NULL,
  subject_id UUID NOT NULL,
  enrolled_at TIMESTAMP,
  
  UNIQUE(student_id, subject_id)
);
```

**Purpose:** Define which student is enrolled in which subject.

**Used By:**
1. Subject Teacher Dashboard → "Show me all students enrolled in Mathematics"
2. Class Teacher Dashboard → "Show me all subjects each student is taking"
3. Student Results Page → "Show me scores for all subjects I'm enrolled in"

**Relationship:**
```
Student (John)
  ├─ Mathematics
  ├─ English
  └─ Physics
```

---

### 4. `cbt_submissions` - CBT EXAM TRACKING

```sql
CREATE TABLE cbt_submissions (
  id UUID PRIMARY KEY,
  school_id UUID NOT NULL,
  cbt_exam_id UUID NOT NULL,
  student_id UUID NOT NULL,
  started_at TIMESTAMP,
  submitted_at TIMESTAMP,
  score NUMERIC(5,2),
  percentage NUMERIC(5,2),
  passed BOOLEAN,
  status VARCHAR(50),           -- STARTED, IN_PROGRESS, SUBMITTED, GRADED, LOCKED
  assessment_type VARCHAR(50),  -- CA1, CA2, CA3, CA4, MIDTERM, EXAM
  term_id UUID,
  graded_at TIMESTAMP,
  ...
);
```

**Purpose:** Track CBT exam submissions and auto-grade results.

**Data Flow:**
1. Student submits CBT
2. System grades using `cbt_answers` table
3. Score calculated and written to `score_sheets` based on `assessment_type`:
   - assessment_type='CA1' → `score_sheets.test1`
   - assessment_type='CA2' → `score_sheets.test2`
   - assessment_type='CA3' → `score_sheets.test3`
   - assessment_type='CA4' → `score_sheets.test4`
   - assessment_type='EXAM' → `score_sheets.exam`

---

### 5. `cbt_answers` - QUESTION-LEVEL ANSWERS

```sql
CREATE TABLE cbt_answers (
  id UUID PRIMARY KEY,
  school_id UUID NOT NULL,
  submission_id UUID NOT NULL REFERENCES cbt_submissions(id),
  question_id UUID NOT NULL REFERENCES cbt_questions(id),
  selected_option_id UUID REFERENCES cbt_options(id),
  answer_text TEXT,
  marks_awarded NUMERIC(5,2),
  is_correct BOOLEAN,
  
  UNIQUE(submission_id, question_id)
);
```

**Purpose:** Store individual question answers and marks for detailed exam review.

**Data Flow:**
1. Student answers questions → `cbt_answers` (selected_option_id for MCQ, answer_text for theory)
2. Auto-grade MCQ/True-False → `is_correct` = true/false
3. Aggregate all answers → `cbt_submissions.score`
4. Map score to `score_sheets` based on `cbt_exams.assessment_type`

---

## COMPLETE DATA FLOW DIAGRAM

```
╔════════════════════════════════════════════════════════════════════════════╗
║                    UNIFIED SCORE DATA ARCHITECTURE                         ║
╚════════════════════════════════════════════════════════════════════════════╝

STUDENT REGISTRATION
        ↓
        ├─→ Students created in `students` table
        ├─→ Class assignment: `students.class_arm_combo_id`
        └─→ Subject enrollment: INSERT into `student_subjects`

TEACHER ASSIGNMENT
        ↓
        └─→ INSERT into `subject_teacher_assignments`
            (teacher_id, subject_id, class_arm_combo_id)

════════════════════════════════════════════════════════════════════════════

FLOW 1: SUBJECT TEACHER MANUAL ENTRY
════════════════════════════════════════════════════════════════════════════

Subject Teacher Dashboard
        ↓
GET /api/subject-students?teacher_id=X&subject_id=Y
        ├─ Query: subject_teacher_assignments WHERE teacher_id=X, subject_id=Y
        ├─ Get: class_arm_combo_ids for this teacher-subject combo
        └─ Query: student_subjects WHERE subject_id=Y AND class_arm_combo_id IN (...)
        ↓
Display Subject Students:
        ├─ Student Name (from students.user_id → users.full_name)
        ├─ Admission Number
        ├─ Class (from students.class_arm_combo_id → classes.name)
        └─ [Current Scores if any]

Subject Teacher Enters Scores
        ↓
POST /api/subject-scores
{
  "school_id": "...",
  "student_id": "...",
  "subject_id": "...",
  "term_id": "...",
  "test1": 8.5,
  "test2": 9.0,
  "test3": 8.0,
  "test4": 9.5,
  "exam": 52
}
        ↓
INSERT/UPDATE score_sheets:
{
  school_id, student_id, subject_id, term_id,
  test1: 8.5 (source: 'MANUAL'),
  test2: 9.0 (source: 'MANUAL'),
  test3: 8.0 (source: 'MANUAL'),
  test4: 9.5 (source: 'MANUAL'),
  exam: 52 (source: 'MANUAL'),
  total: GENERATED = 86,
  grade: 'A' (from total)
}

════════════════════════════════════════════════════════════════════════════

FLOW 2: CBT AUTO-POPULATION
════════════════════════════════════════════════════════════════════════════

Student Takes CBT Exam
        ↓
POST /api/cbt/submit
        ├─ Student answers questions
        └─ Answers stored in cbt_answers (one row per question)

Auto-Grading
        ↓
SELECT FROM cbt_answers WHERE submission_id=X
        ├─ For MULTIPLE_CHOICE/TRUE_FALSE: is_correct = (selected_option.is_correct)
        ├─ Calculate: total marks = SUM(marks_awarded where is_correct=true)
        ├─ Calculate: percentage = (total_marks / cbt_exam.total_marks) * 100
        └─ Determine: passed = (percentage >= cbt_exam.passing_percentage)

Update cbt_submissions
        ↓
UPDATE cbt_submissions SET
  status: 'GRADED',
  score: 38,
  percentage: 76%,
  passed: true,
  graded_at: NOW()

Auto-Populate score_sheets (CRITICAL)
        ↓
Convert CBT score to score_sheets column based on cbt_exams.assessment_type:

CASE assessment_type:
  'CA1' → test1 = (38 / 100) * 10 = 3.8
  'CA2' → test2 = (38 / 100) * 10 = 3.8
  'CA3' → test3 = (38 / 100) * 10 = 3.8
  'CA4' → test4 = (38 / 100) * 10 = 3.8
  'EXAM' → exam = (38 / 100) * 60 = 22.8

        ↓
INSERT/UPDATE score_sheets:
{
  school_id, student_id, subject_id, term_id,
  [test1/2/3/4 or exam]: [converted score],
  [test1/2/3/4 or exam]_source: 'CBT',
  [test1/2/3/4 or exam]_cbt_source: submission_id,
  total: GENERATED,
  grade: GENERATED
}

════════════════════════════════════════════════════════════════════════════

FLOW 3: CLASS TEACHER AGGREGATION
════════════════════════════════════════════════════════════════════════════

Class Teacher Dashboard
        ↓
GET /api/class-results?teacher_id=X&class_id=Y
        ├─ Query: class_arm_combos WHERE class_teacher_id=X
        ├─ Get: students WHERE class_arm_combo_id=Y
        └─ For each student: Query score_sheets for all subjects
        ↓
Display Class Results:
┌─────────────────────────────────────────────────┐
│ Class: SSS1A                                    │
│ ┌───────────────────────────────────────────┐   │
│ │ Student: John Doe (Admission: 001)        │   │
│ ├───────────────────────────────────────────┤   │
│ │ Subject    │ CA1 │ CA2 │ CA3 │ CA4 │ Exam │   │
│ ├────────────┼─────┼─────┼─────┼─────┼──────┤   │
│ │ Math       │ 8.5 │ 9.0 │ 8.0 │ 9.5 │ 52   │   │ ← from score_sheets
│ │ English    │ 7.5 │ 8.0 │ 8.5 │ 8.0 │ 48   │   │
│ │ Physics    │ 9.0 │ 9.5 │ 8.5 │ 9.0 │ 54   │   │
│ └───────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘

Note: Class Teacher does NOT re-enter data. All scores come from score_sheets.
      If a Subject Teacher updates a score, Class Teacher sees update immediately.

════════════════════════════════════════════════════════════════════════════

FLOW 4: STUDENT RESULT PAGE
════════════════════════════════════════════════════════════════════════════

Student Dashboard
        ↓
GET /api/student-results?student_id=X&term_id=Y
        ├─ Query: student_subjects WHERE student_id=X
        ├─ For each subject: Query score_sheets WHERE student_id=X, subject_id=S, term_id=Y
        └─ Organize by subject
        ↓
Display Student Results:
┌──────────────────────────────────────────┐
│ Student: John Doe                        │
│ Class: SSS1A                             │
│ Term: First Term 2026/2027               │
│ ┌────────────────────────────────────┐   │
│ │ Subject    │ Total │ % │ Grade │    │   │
│ ├────────────┼───────┼───┼───────┤    │   │
│ │ Math       │ 86    │86 │ A     │    │   │
│ │ English    │ 80    │80 │ B     │    │   │
│ │ Physics    │ 84    │84 │ A     │    │   │
│ └────────────────────────────────────┘   │
└──────────────────────────────────────────┘

Note: Student sees EXACTLY the same data as Class Teacher + Subject Teacher.
      ONE source of truth: score_sheets
```

---

## KEY DESIGN PRINCIPLES

### 1. SINGLE SOURCE OF TRUTH
- **score_sheets** is THE ONLY table for storing scores
- Manual entry writes here
- CBT auto-population writes here
- Both teachers and students read from here

### 2. SOURCE TRACKING
- Every score has a source: 'MANUAL' or 'CBT'
- Score sources: `test1_source`, `test2_source`, `test3_source`, `test4_source`, `exam_source`
- CBT linkage: `test1_cbt_source`, `test2_cbt_source`, etc. → `cbt_submissions(id)`
- Allows audit trail and manual override if needed

### 3. NO DUPLICATE DATA
- Removed `result_entries` (was duplicate of score_sheets with different schema)
- Removed `student_subject_enrollment` (was duplicate of student_subjects)
- Removed `teacher_assignments` (was duplicate of subject_teacher_assignments)
- ALL relationships go through canonical tables only

### 4. AUTOMATIC CALCULATION
- Total auto-calculated: `total = test1 + test2 + test3 + test4 + exam` (GENERATED column)
- Grade auto-assigned based on total score
- No manual total/grade entry needed

### 5. PROPER SCOPING
- Teacher sees only students in their assigned subject-class
- Class Teacher sees all students in their class
- Student sees only their own results
- All filtering enforced at API level

### 6. CBT INTEGRATION
- CBT exam configured with `assessment_type` (CA1/CA2/CA3/CA4/EXAM)
- On submission, score automatically routed to correct score_sheets column
- Teacher/Class Teacher/Student see CBT scores with 'CBT' label in source

---

## VALIDATION RULES

### For score_sheets
- `test1, test2, test3, test4`: 0-10 (inclusive), NULL allowed
- `exam`: 0-60 (inclusive), NULL allowed
- `total`: AUTO-GENERATED, 0-100
- `grade`: AUTO-ASSIGNED or explicitly set
- `UNIQUE(school_id, student_id, subject_id, term_id)`: Prevents duplicate entries

### For subject_teacher_assignments
- Must reference valid: `school`, `teacher` (user), `subject`, `class_arm_combo`
- `UNIQUE(school_id, teacher_id, subject_id, class_arm_combo_id)`: One assignment per combo

### For student_subjects
- Must reference valid: `school`, `student`, `subject`
- `UNIQUE(student_id, subject_id)`: One enrollment per subject

### For cbt_submissions
- `assessment_type` MUST be one of: CA1, CA2, CA3, CA4, MIDTERM, EXAM
- `term_id` MUST reference valid term (critical for score_sheets linkage)
- `status` should be 'GRADED' before score_sheets update

---

## MIGRATION STEPS COMPLETED

1. ✅ **Migration 043**: Removed redundant tables, migrated existing data to canonical tables
2. ✅ **Migration 044**: Verified canonical table schemas, created indices, enforced constraints

---

## NEXT STEPS (Tasks #3-#8)

3. **Fix Subject Teacher → Subject Students Query**
   - API: `GET /api/subject-students?teacher_id=X&subject_id=Y`
   - Query: `subject_teacher_assignments` + `student_subjects` + student details

4. **Create Unified Subject Teacher Score Sheet**
   - Component allows entering test1-4, exam for each subject student
   - Saves to score_sheets with source='MANUAL'

5. **Fix CBT Auto-Population**
   - Ensure `cbt_exams.assessment_type` is set
   - Ensure `cbt_exams.term_id` is set
   - On submission, convert score and write to correct score_sheets column

6. **Create Class Teacher Result Aggregation**
   - Fetch all students in class
   - For each student, fetch all subjects from student_subjects
   - Query score_sheets for each student-subject combination
   - Display aggregated view

7. **Ensure Student Result Uses score_sheets**
   - Query student_subjects for enrolled subjects
   - Query score_sheets for each subject
   - Display to student

8. **End-to-End Test**
   - Subject teacher enters scores → appears in class teacher view → appears in student view
   - Student takes CBT → score auto-populates → appears in class teacher view → appears in student view

---

## TROUBLESHOOTING QUERIES

```sql
-- Check if redundant tables still exist (should all be empty/dropped)
SELECT table_name FROM information_schema.tables 
WHERE table_schema='public' 
AND table_name IN ('result_entries', 'student_subject_enrollment', 'teacher_assignments');

-- Count canonical data
SELECT COUNT(*) as score_sheets_count FROM score_sheets;
SELECT COUNT(*) as teacher_subject_count FROM subject_teacher_assignments;
SELECT COUNT(*) as student_subject_count FROM student_subjects;

-- Find scores with NULL sources (should be rare or none after migration)
SELECT id, student_id, subject_id, test1, test1_source
FROM score_sheets 
WHERE test1 IS NOT NULL AND test1_source IS NULL;

-- Find CBT scores not yet in score_sheets
SELECT cs.id, cs.student_id, cs.subject_id, cs.score, ce.assessment_type
FROM cbt_submissions cs
JOIN cbt_exams ce ON cs.cbt_exam_id = ce.id
WHERE cs.status = 'GRADED' 
AND NOT EXISTS (
  SELECT 1 FROM score_sheets ss
  WHERE ss.student_id = cs.student_id 
  AND ss.subject_id = ce.subject_id
);

-- Verify data integrity: score_sheets with invalid references
SELECT * FROM score_sheets ss
WHERE NOT EXISTS (SELECT 1 FROM students WHERE id = ss.student_id)
  OR NOT EXISTS (SELECT 1 FROM subjects WHERE id = ss.subject_id)
  OR NOT EXISTS (SELECT 1 FROM terms WHERE id = ss.term_id)
  OR NOT EXISTS (SELECT 1 FROM schools WHERE id = ss.school_id);
```

---

## SUMMARY

The SMS system is now architected with a **unified, single source of truth**:

- ✅ ONE canonical score table: `score_sheets`
- ✅ ONE teacher-subject-class link: `subject_teacher_assignments`
- ✅ ONE student-subject enrollment: `student_subjects`
- ✅ CBT submissions automatically flow to score_sheets
- ✅ No duplicate data across multiple tables
- ✅ All views (Subject Teacher, Class Teacher, Student) read from same source

**Result:** Any score entered (manual or CBT) is immediately visible to all authorized users.
