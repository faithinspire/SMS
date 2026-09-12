# Phase 3: CBT (Computer-Based Testing) System Implementation

## Overview
Complete implementation of Computer-Based Testing system including:
- Teacher CBT exam creation interface
- Question and option management
- Student exam portal and exam-taking interface
- Answer submission and scoring
- Results display and analytics

## Architecture

### Database Schema (Already in Place)
```
cbt_exams
  ├─ id (UUID)
  ├─ school_id (FK→schools)
  ├─ subject_id (FK→subjects)
  ├─ class_arm_combo_id (FK→class_arm_combos)
  ├─ created_by (FK→users - teacher)
  ├─ term_id (FK→academic_terms)
  ├─ title, description
  ├─ exam_type: 'TEST|EXAM'
  ├─ test_number: 1-4 (for continuous assessment)
  ├─ start_time, end_time, duration_minutes
  ├─ total_marks, passing_percentage
  ├─ allow_review, randomize_questions, randomize_options
  ├─ status: 'DRAFT|PUBLISHED|ACTIVE|CLOSED'
  └─ created_at, updated_at

cbt_questions
  ├─ id (UUID)
  ├─ school_id (FK→schools)
  ├─ cbt_exam_id (FK→cbt_exams)
  ├─ question_type: 'MULTIPLE_CHOICE|TRUE_FALSE|THEORY'
  ├─ question_text
  ├─ marks
  ├─ display_order
  └─ created_at

cbt_options
  ├─ id (UUID)
  ├─ question_id (FK→cbt_questions)
  ├─ option_text
  ├─ is_correct (UNIQUE constraint: only 1 correct per question)
  ├─ option_key ('A', 'B', 'C', 'D')
  ├─ display_order
  └─ created_at

cbt_submissions
  ├─ id (UUID)
  ├─ school_id (FK→schools)
  ├─ cbt_exam_id (FK→cbt_exams)
  ├─ student_id (FK→students)
  ├─ started_at
  ├─ submitted_at
  ├─ score, percentage, passed
  ├─ answers (JSONB: all submitted answers)
  ├─ status: 'STARTED|IN_PROGRESS|SUBMITTED|GRADED'
  ├─ tab_switches, device_info (for proctoring)
  ├─ total_marks, passing_score, assessment_type, term_id
  └─ created_at

cbt_answers
  ├─ id (UUID)
  ├─ school_id (FK→schools)
  ├─ submission_id (FK→cbt_submissions)
  ├─ question_id (FK→cbt_questions)
  ├─ selected_option_id (FK→cbt_options)
  ├─ answer_text (for theory/short answer)
  ├─ marks_awarded
  ├─ is_correct
  └─ created_at
```

## Implementation Steps

### Step 1: Teacher CBT Management Interface
File: `src/app/teacher/cbt-management/page.tsx` (UPDATE)
- List all CBTs created by teacher
- Create new CBT with wizard
- Edit CBT details and questions
- Delete CBT
- View submissions and results

### Step 2: CBT Creation Wizard
File: `src/components/teacher/CBTCreationWizard.tsx` (NEW)
- Step 1: Select exam type (Test/Exam), subject, class
- Step 2: Basic info (title, description, duration, marks)
- Step 3: Add questions and options
  - Question type selector (MC, T/F, Essay)
  - MCQOption management (A, B, C, D)
  - Correct answer selection
- Step 4: Exam settings (randomization, review, time, schedule)
- Step 5: Review and publish

### Step 3: Student CBT Portal
File: `src/app/student/cbt/page.tsx` (UPDATE/VERIFY)
- List available exams for student's class and subjects
- Filter by status (Available, In Progress, Completed)
- Display exam details (duration, total marks, available time)
- Join exam button

### Step 4: Exam Taking Interface
File: `src/app/student/cbt/[id]/take-exam/page.tsx` (NEW)
- Timer (countdown, warning at 5 minutes, auto-submit at 0)
- Question navigation (previous/next, jump to specific)
- Question display with options (for MCQ)
- Answer input field (for essay)
- Progress indicator (X of Y questions)
- Answer review section
- Submit button with confirmation

### Step 5: Results Display
File: `src/app/student/cbt/[id]/results/page.tsx` (NEW)
- Score display (X/Y marks, percentage)
- Pass/Fail status
- Review submitted answers (if allowed by teacher)
- Performance breakdown by section
- View correct answers (if allowed)

### Step 6: Teacher Results View
File: `src/app/teacher/cbt-results/page.tsx` (NEW)
- List all exams and submissions
- Class results (average, pass rate, grade distribution)
- Individual student results
- Export results to CSV
- Analytics dashboard

### Step 7: Auto-Scoring System
File: `src/services/cbt-scoring.service.ts` (NEW)
- Auto-mark MCQ questions (compare selected option to correct option)
- Calculate total score
- Determine pass/fail based on passing_percentage
- Generate grade (A, B, C, D, E, F)
- Update score_sheets with CBT scores

### Step 8: Sync CBT Scores to Report Card
File: `src/services/score-sync.service.ts` (UPDATE)
- When CBT submitted: auto-score and populate cbt_answers
- Update score_sheets with CBT score
- Map test_number to test1/test2/test3/test4 or exam column
- Trigger score_sheets calculation of total and grade

## Data Flow

### Creating a CBT
```
Teacher → CBT Wizard
  ↓
Step 1: Exam Type, Subject, Class
  ↓
Step 2: Title, Duration, Total Marks
  ↓
Step 3: Questions & Options
  ├→ Add Question
  ├→ Add Options (for MCQ)
  ├→ Mark correct answer
  └→ Set marks
  ↓
Step 4: Settings & Schedule
  ↓
Step 5: Review & Publish
  ↓
INSERT cbt_exams
  ├→ INSERT cbt_questions
  ├→ INSERT cbt_options
  └→ Status = 'PUBLISHED'
  ↓
Database Ready
  └→ Students see in portal
```

### Taking an Exam
```
Student → View Available Exams
  ↓
Click "Start Exam"
  ↓
INSERT cbt_submissions (status='STARTED')
  ↓
Display Exam Interface
  ├→ Show question 1/N
  ├→ Timer counting down
  ├→ Answer input
  └→ Navigation buttons
  ↓
For each question:
  SELECT cbt_questions WHERE cbt_exam_id=X
  SELECT cbt_options WHERE question_id=Y
  ↓
Student answers questions
  ├→ SELECT to show options
  ├→ Store answer in memory
  └→ Allow navigation
  ↓
Click "Submit"
  ├→ Confirmation dialog
  └→ Confirm
  ↓
UPDATE cbt_submissions (status='SUBMITTED', submitted_at=NOW)
  ├→ FOR EACH question:
  │   INSERT cbt_answers (selected_option_id, answer_text)
  │   IF MCQ: Compare with correct option, is_correct=true/false
  │   Calculate marks_awarded
  └→ Calculate total score
  ↓
UPDATE score_sheets (test_number or exam)
  └→ Populate from cbt_submissions
  ↓
Display Results
```

### Auto-Scoring Process
```
When cbt_submissions.status = 'SUBMITTED':
  ↓
FOR EACH cbt_answers record:
  1. GET correct option from cbt_options WHERE is_correct=true
  2. Compare selected_option_id with correct option
  3. Set is_correct=true/false
  4. Set marks_awarded = question.marks IF correct, 0 IF wrong
  ↓
SUM all marks_awarded → total_score
  ↓
percentage = (total_score / cbt_exams.total_marks) * 100
  ↓
passed = percentage >= cbt_exams.passing_percentage
  ↓
grade = CASE
  WHEN percentage >= 80 THEN 'A'
  WHEN percentage >= 70 THEN 'B'
  WHEN percentage >= 60 THEN 'C'
  WHEN percentage >= 50 THEN 'D'
  WHEN percentage >= 40 THEN 'E'
  ELSE 'F'
END
  ↓
UPDATE cbt_submissions (score, percentage, passed, grade)
  ↓
UPDATE score_sheets (test1/test2/test3/test4/exam, grade)
```

## Testing Checklist
- [ ] Teacher can create exam with questions and options
- [ ] Questions save to database with correct relationships
- [ ] Student sees exam in portal (auto-discovery)
- [ ] Student can start exam and see questions
- [ ] Timer works and auto-submits at 0
- [ ] Navigation between questions works
- [ ] Answers are saved correctly
- [ ] Submission marks answers with correct/incorrect
- [ ] Score calculated accurately
- [ ] Score_sheets updated with exam score
- [ ] Report card shows exam results
- [ ] Results show pass/fail status
- [ ] Export to CSV works

## Success Criteria
✅ Teacher can create complete exam with questions
✅ All data persists in Supabase
✅ Student portal auto-populates with available exams
✅ Exam-taking interface is responsive and timed
✅ Scoring is automatic and accurate
✅ Results sync to student report card
✅ No database errors or FK violations
✅ UI is professional and intuitive

## Migration Required
- Migration 077 (auto_populate_cbt_scores_system.sql) should handle auto-sync
- May need trigger to auto-update score_sheets when cbt_submissions submitted
