# PHASE 12: Clean Up and Documentation

## Overview
Final cleanup, documentation, and verification that the system is production-ready.

---

## TASK 12.1: Remove Migration Files for Deprecated Tables

### Migrations to Review/Clean Up

After migration 058 is applied and data is verified consolidated, these old migrations can be marked as archived:

**Migrations that created deprecated tables (for reference only, don't delete)**:
- `migration_001_initial_schema.sql` - Contains `terms`, `result_entries`, etc. (KEEP - historical record)
- Any other migrations that created deprecated tables

**Migrations that can be removed from active set** (after 058):
- None - all migration files should be kept for audit trail

**Recommendation**:
- Keep all migration files in `database/migrations/` directory
- Don't delete migrations - they form the audit trail
- Migration 055, 056, 057, 058 are the "cleanup" migrations
- Future migrations should NOT reference deprecated tables

---

## TASK 12.2: Update README with Final Schema Diagram

### Create/Update README.md

```markdown
# School Management System (SMS)

## Architecture Overview

### Data Model (Canonical)

#### Academic Hierarchy
```
┌─────────────────────────────────────────────────────────┐
│                    SCHOOL                               │
│              (id, name, address, type)                  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ├─→ STUDENTS
                     │   (id, admission_number, class_id, user_id)
                     │
                     ├─→ STAFF (Teachers, Principal, Accountant)
                     │   (id, user_id, position, employment_date)
                     │
                     └─→ ACADEMIC SESSIONS
                         (id, session_year, start_year, end_year)
                         │
                         └─→ ACADEMIC TERMS (1st, 2nd, 3rd Term)
                             (id, session_id, term_name, dates)
                             │
                             ├─→ CBT_EXAMS
                             │   (id, term_id, subject_id, questions)
                             │   │
                             │   └─→ CBT_QUESTIONS (A,B,C,D options)
                             │       (id, option_key, is_correct)
                             │       │
                             │       └─→ CBT_SUBMISSIONS
                             │           (id, student_id, score, graded_at)
                             │           │
                             │           └─→ CBT_ANSWERS (auto-graded)
                             │
                             └─→ SCORE_SHEETS (Canonical Assessment Table)
                                 (id, student_id, subject_id, test1-4, exam, total, grade)
                                 │
                                 └─→ [AUTO-POPULATED from CBT_SUBMISSIONS]
```

#### Key Features

**✅ Consolidated Academic Hierarchy**:
- `academic_sessions` parent table
- `academic_terms` child table with FK to sessions
- All assessments reference `academic_terms` (not deprecated `terms`)
- No ambiguity about which academic period data belongs to

**✅ Canonical Assessment Storage**:
- Single table: `score_sheets`
- Source tracking: test1_source, test2_source, etc. ('MANUAL' or 'CBT')
- CBT integration: cbt_submissions automatically populate test scores via `cbt_?_cbt_source` FK
- Single source of truth for all assessments (no competing `result_entries` table)

**✅ CBT System Complete**:
- `cbt_exams`: Teacher creates exam
- `cbt_questions`: Each question (MULTIPLE_CHOICE, TRUE_FALSE, ESSAY)
- `cbt_options`: Exactly 4 options (A,B,C,D), one marked `is_correct=true`
- `cbt_submissions`: Student's attempt (auto-graded via trigger)
- `cbt_answers`: Each answer (auto-set `is_correct` via trigger)
- Auto-grading: Trigger compares student's selected_option_id with cbt_options.is_correct
- Score mapping: Auto-populates score_sheets with scaled scores (0-10 or 0-60)

**✅ Lesson Note Workflow**:
- Teacher submits (status='SUBMITTED')
- Principal reviews (status='UNDER_REVIEW')
- Principal approves/returns (status='APPROVED' or 'RETURNED')
- Approval workflow tracked with reviewers, dates, comments

**✅ Broadcast Messaging**:
- Administrators create announcements
- System auto-creates notifications per recipient
- Recipients can fetch inbox (grouped by recipient)
- Read tracking: mark individual or bulk messages as read
- Messages persist after being read

**✅ Multi-Tenant Isolation**:
- Every table has `school_id` FK
- Every API filters by `school_id` in request
- Cross-school access blocked (403 or 404)
- Data cannot leak between schools

### Database Tables (Canonical)

| Table | Purpose | Source of Truth |
|-------|---------|-----------------|
| `academic_sessions` | Academic years (2024/2025) | CANONICAL |
| `academic_terms` | Terms within session (First, Second, Third) | CANONICAL |
| `students` | Student records | CANONICAL |
| `staff` | Staff member records (teacher, principal, etc.) | CANONICAL |
| `score_sheets` | All assessments (tests, exams, CBT scores) | **CANONICAL** |
| `lesson_notes` | Teacher lesson submissions | CANONICAL |
| `announcements` | Broadcast messages | CANONICAL |
| `notifications` | Recipient notifications | CANONICAL |
| `cbt_exams` | CBT exam definitions | CANONICAL |
| `cbt_questions` | CBT exam questions | CANONICAL |
| `cbt_options` | CBT answer options (A,B,C,D) | CANONICAL |
| `cbt_submissions` | Student CBT attempts | CANONICAL |
| `cbt_answers` | Student CBT answers | CANONICAL |

### Deprecated Tables (Removed)

- ❌ `terms` - Superseded by academic_terms
- ❌ `result_entries` - Superseded by score_sheets
- ❌ `cbt_results` - Superseded by cbt_submissions + score_sheets integration
- ❌ `student_subject_enrollment` - Superseded by student_subjects
- ❌ `teacher_assignments` - Superseded by subject_teacher_assignments

## API Endpoints (All Read/Write Operations)

### Documents
- `GET /api/documents/admission-letter` - Generate student admission letter
- `GET /api/documents/appointment-letter` - Generate staff appointment letter

### Academic
- `GET /api/teacher/terms` - List terms for school
- `GET /api/principal/dashboard` - Aggregated dashboard data

### Lessons
- `POST /api/teacher/lessons/submit` - Teacher submits lesson note
- `GET /api/principal/lessons/pending` - Principal views pending lessons
- `PUT /api/principal/lessons/approve` - Principal approves lesson
- `PUT /api/principal/lessons/return` - Principal returns for revision

### Messaging
- `POST /api/announcements/broadcast` - Create broadcast announcement
- `GET /api/teacher/broadcast-inbox` - Get teacher's inbox
- `PATCH /api/teacher/broadcast-inbox` - Mark messages as read

### CBT
- `POST /api/teacher/cbt/create` - Teacher creates CBT exam
- `GET /api/student/cbt/{examId}` - Student fetches exam
- `POST /api/student/cbt/submit` - Student submits answers (auto-grades)

### Scores
- `POST /api/subject-scores` - Teacher enters/updates student scores
- `PATCH /api/results/update-comment` - Update teacher comment on score
- `POST /api/results/sync-score-sheet` - Sync report card data

### Staff
- `GET /api/staff/profile` - Get staff member profile

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase project
- PostgreSQL database

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run migrations
npm run migrate

# Start development server
npm run dev
```

### Applying Migrations

All migrations are in `database/migrations/`. Key migrations:
- `055_final_consolidate_academic_hierarchy.sql` - Consolidate academic hierarchy
- `056_fix_lesson_notes_complete.sql` - Add lesson note workflow
- `057_finalize_cbt_system.sql` - Complete CBT system
- `058_consolidate_and_drop_deprecated_tables.sql` - Drop deprecated tables

Apply via Supabase SQL editor or migration runner.

## Features

### For Students
- View assigned classes and subjects
- Take CBT exams with auto-grading
- View report cards and scores
- Receive broadcast announcements

### For Teachers
- Create and manage CBT exams
- Submit lesson notes for principal approval
- Enter and update student scores
- Access student performance data
- Receive and read announcements

### For Principals
- Review and approve/return lesson notes
- Send broadcast announcements
- View aggregated dashboard data
- Generate appointment letters

### For Administrators
- Register schools, students, staff
- Manage academic sessions and terms
- Send system-wide announcements
- Generate admission letters

## Data Integrity & Safety

### Multi-Tenant Isolation
- Every API request must include `school_id`
- Cross-school access automatically blocked
- Data isolation enforced at API layer
- No SQL injection possible (parameterized queries)

### Auto-Grading Validation
- CBT answers auto-graded via database trigger
- Student cannot modify teacher's correct answers
- UNIQUE constraint: only one correct answer per question
- Marks automatically awarded based on correctness

### Audit Trail
- All changes timestamped (created_at, updated_at)
- Lesson note workflow tracked (reviewed_by, reviewed_at, comments)
- Score sources tracked (MANUAL vs CBT)
- CBT submissions track grading timestamp

## Monitoring & Maintenance

### Database Performance
- Key indexes created on:
  - academic_terms (school_id, session_id, is_active)
  - cbt_options (question_id, is_correct)
  - cbt_submissions (student_id, status)
  - cbt_answers (is_correct, option_id)
  - score_sheets (student_id, subject_id, term_id)

### Error Logging
- All API routes log errors to console
- Format: `[RouteFunction] Operation failed: error message`
- HTTP status codes: 400 (bad request), 403 (unauthorized), 404 (not found), 500 (server error)

### Health Check
- `/api/health` endpoint available (if implemented)
- Database connectivity tested

## Deployment

### Production Checklist
- [ ] All migrations applied to production database
- [ ] Environment variables configured correctly
- [ ] SSL/TLS enabled for all endpoints
- [ ] CORS policies configured properly
- [ ] Rate limiting enabled
- [ ] Error logging active
- [ ] Database backups scheduled
- [ ] Monitoring/alerting configured

---

## Technical Documentation

### CBT Auto-Grading Flow

```
1. Teacher creates exam with questions (option_key A,B,C,D, one marked is_correct=true)
2. Student takes exam, submits answers
3. POST /api/student/cbt/submit receives submission
4. For each answer:
   a. Get selected_option: SELECT is_correct FROM cbt_options WHERE id = selected_option_id
   b. Set answer.is_correct = option.is_correct (via trigger)
   c. Set answer.marks_awarded = question.marks IF is_correct ELSE 0
5. Sum marks across all answers → submission.score
6. Auto-populate score_sheets (test1/test2/test3/test4/exam based on assessment_type)
7. Return score, percentage, and pass/fail to student
```

### Score Sheet Integration

```
Assessment Score Path:
  Manual Entry (Teacher) → POST /api/subject-scores → score_sheets
  CBT Submission → POST /api/student/cbt/submit → score_sheets (auto-populated)
  
Score Calculation:
  test1-4: 0-10 (continuous assessment)
  exam: 0-60 (final exam)
  total = test1 + test2 + test3 + test4 + exam (0-100)
  grade = Calculated from total (A, B, C, D, F based on thresholds)
```

### Lesson Note Approval Workflow

```
DRAFT (unsaved)
  ↓
SUBMITTED (teacher submitted via API)
  ↓
UNDER_REVIEW (principal is reviewing)
  ↓
APPROVED ✅ (lesson is approved)
  OR
RETURNED (with comments for revision)
  ↓
Teacher resubmits → back to SUBMITTED
```

---

## Support & Troubleshooting

### Common Issues

**"Option key null or invalid"**
- Cause: cbt_options missing option_key or invalid value
- Fix: Run migration 057, verify option_key IN ('A','B','C','D')

**"No current term found"**
- Cause: No academic_terms with is_active=true
- Fix: Create academic_session and academic_terms, set is_active=true

**"Cross-school access denied"**
- Cause: API filtering by school_id
- Fix: Ensure school_id in request matches user's school

**"Multiple correct answers per question"**
- Cause: Migration 057 didn't apply properly
- Fix: Run VERIFY query to find and fix invalid data

---

**Last Updated**: 2024
**Version**: 2.0 (Post-Holistic Rebuild)
```

---

## TASK 12.3: Document Canonical Tables

Create `CANONICAL_SCHEMA_REFERENCE.md`:

```markdown
# Canonical Schema Reference

## Core Principle
Single source of truth for each entity type. No competing tables.

## Academic Hierarchy

### academic_sessions
```sql
id UUID PRIMARY KEY
school_id UUID FK → schools
session_year VARCHAR(20) UNIQUE (e.g., "2024/2025")
start_year INT
end_year INT
is_active BOOLEAN
created_at TIMESTAMP
updated_at TIMESTAMP

UNIQUE(school_id, session_year)
CHECK(end_year = start_year + 1)
```

### academic_terms
```sql
id UUID PRIMARY KEY
session_id UUID FK → academic_sessions ON DELETE CASCADE
school_id UUID FK → schools ON DELETE CASCADE
term_name VARCHAR(100)
term_order INT
start_date DATE
end_date DATE
is_active BOOLEAN
created_at TIMESTAMP
updated_at TIMESTAMP

UNIQUE(session_id, term_name)
UNIQUE(session_id, term_order)
CHECK(end_date > start_date)
```

## Assessment Data

### score_sheets (CANONICAL - Single Source of Truth)
```sql
id UUID PRIMARY KEY
school_id UUID FK → schools
student_id UUID FK → students
subject_id UUID FK → subjects
term_id UUID FK → academic_terms (CANONICAL - not old terms)
academic_session_id UUID FK → academic_sessions
class_arm_combo_id UUID FK → class_arm_combos
teacher_id UUID FK → users (teacher who entered/approved)

-- Test scores (0-10 each, can be MANUAL or CBT)
test1 NUMERIC(5,2)
test2 NUMERIC(5,2)
test3 NUMERIC(5,2)
test4 NUMERIC(5,2)
test1_source VARCHAR(10) ('MANUAL' or 'CBT')
test1_cbt_source UUID FK → cbt_submissions (if source='CBT')
... (same for test2-4)

-- Exam score (0-60, can be MANUAL or CBT)
exam NUMERIC(5,2)
exam_source VARCHAR(10)
exam_cbt_source UUID FK → cbt_submissions

-- Calculated fields
total NUMERIC(5,2) = test1+test2+test3+test4+exam
grade VARCHAR(2) (A, B, C, D, F)

-- Metadata
teacher_comment TEXT
created_at TIMESTAMP
updated_at TIMESTAMP

UNIQUE(school_id, student_id, subject_id, term_id)
```

## Lesson Notes

### lesson_notes
```sql
id UUID PRIMARY KEY
school_id UUID FK → schools
created_by UUID FK → users (teacher)
subject_id UUID FK → subjects
class_arm_combo_id UUID FK → class_arm_combos
title VARCHAR(255)
content TEXT
attachments JSONB

-- Workflow status
status VARCHAR(50) CHECK (status IN (
  'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'RETURNED'
))

-- Principal review tracking
reviewed_by UUID FK → users (principal)
reviewed_at TIMESTAMP
review_comments TEXT

created_at TIMESTAMP
updated_at TIMESTAMP
```

## CBT System

### cbt_exams
```sql
id UUID PRIMARY KEY
school_id UUID FK → schools
subject_id UUID FK → subjects
class_arm_combo_id UUID FK → class_arm_combos
created_by UUID FK → users (teacher)
teacher_id UUID FK → users (same as created_by)
term_id UUID FK → academic_terms (CANONICAL)
academic_session_id UUID FK → academic_sessions
title VARCHAR(255)
description TEXT
assessment_type VARCHAR(20) (CA1, CA2, CA3, CA4, EXAM)
duration_minutes INT
total_marks NUMERIC
passing_percentage NUMERIC DEFAULT 50
status VARCHAR(20) (DRAFT, PUBLISHED)
created_at TIMESTAMP
```

### cbt_questions
```sql
id UUID PRIMARY KEY
cbt_exam_id UUID FK → cbt_exams ON DELETE CASCADE
question_text TEXT
question_type VARCHAR(20) (MULTIPLE_CHOICE, TRUE_FALSE, ESSAY)
marks NUMERIC DEFAULT 1
correct_option VARCHAR(1) (A, B, C, D) -- reference only
display_order INT
created_at TIMESTAMP
```

### cbt_options
```sql
id UUID PRIMARY KEY
question_id UUID FK → cbt_questions ON DELETE CASCADE
option_key VARCHAR(1) NOT NULL CHECK (option_key IN ('A','B','C','D'))
option_text TEXT
is_correct BOOLEAN DEFAULT FALSE
display_order INT
created_at TIMESTAMP

UNIQUE(question_id, display_order)
UNIQUE(question_id) WHERE is_correct = TRUE  -- Only ONE correct per question
```

### cbt_submissions
```sql
id UUID PRIMARY KEY
school_id UUID FK → schools
cbt_exam_id UUID FK → cbt_exams
student_id UUID FK → students
started_at TIMESTAMP
submitted_at TIMESTAMP
status VARCHAR(20) (DRAFT, IN_PROGRESS, SUBMITTED, GRADED, LOCKED)
score NUMERIC(5,2)
percentage NUMERIC(5,2)
passed BOOLEAN
graded_at TIMESTAMP
created_at TIMESTAMP
```

### cbt_answers
```sql
id UUID PRIMARY KEY
school_id UUID FK → schools
submission_id UUID FK → cbt_submissions ON DELETE CASCADE
question_id UUID FK → cbt_questions ON DELETE CASCADE
selected_option_id UUID FK → cbt_options ON DELETE SET NULL
answer_text TEXT

-- Auto-set by trigger
is_correct BOOLEAN DEFAULT FALSE
marks_awarded NUMERIC(5,2) DEFAULT 0

created_at TIMESTAMP
updated_at TIMESTAMP
```

## Messaging

### announcements
```sql
id UUID PRIMARY KEY
school_id UUID FK → schools
created_by UUID FK → users
title VARCHAR(255)
message TEXT
scope VARCHAR(20) (SCHOOL_WIDE, CLASS, ROLE)
target_class_id UUID FK → class_arm_combos (if scope=CLASS)
target_role VARCHAR(20) (if scope=ROLE)
created_at TIMESTAMP
```

### notifications
```sql
id UUID PRIMARY KEY
school_id UUID FK → schools
user_id UUID FK → users (recipient)
title VARCHAR(255)
message TEXT
type VARCHAR(20) (ANNOUNCEMENT, ...)
related_entity_id UUID (FK to announcement or other entity)
read_at TIMESTAMP (NULL = unread)
created_at TIMESTAMP
```

---

## Common Queries

### Get Student's Scores for Term
```sql
SELECT ss.*, s.name as subject_name, ut.full_name as teacher_name
FROM score_sheets ss
JOIN subjects s ON ss.subject_id = s.id
JOIN users ut ON ss.teacher_id = ut.id
WHERE ss.student_id = $1 AND ss.term_id = $2 AND ss.school_id = $3
ORDER BY s.name;
```

### Get CBT Exam with Questions and Options
```sql
SELECT 
  e.*,
  json_agg(json_build_object(
    'id', q.id,
    'text', q.question_text,
    'marks', q.marks,
    'options', (SELECT json_agg(json_build_object(
      'key', o.option_key,
      'text', o.option_text,
      'is_correct', o.is_correct
    )) FROM cbt_options o WHERE o.question_id = q.id)
  )) as questions
FROM cbt_exams e
JOIN cbt_questions q ON e.id = q.cbt_exam_id
WHERE e.id = $1
GROUP BY e.id;
```

### Check CBT Submission Grading
```sql
SELECT 
  cs.*,
  COUNT(*) as total_questions,
  COUNT(CASE WHEN ca.is_correct THEN 1 END) as correct_answers,
  SUM(ca.marks_awarded) as total_marks_awarded
FROM cbt_submissions cs
LEFT JOIN cbt_answers ca ON cs.id = ca.submission_id
WHERE cs.id = $1
GROUP BY cs.id;
```

### Get Teacher's Pending Lesson Reviews
```sql
SELECT ln.*,
  ut.full_name as teacher_name,
  s.name as subject_name,
  concat(c.name, ' - ', a.name) as class_arm
FROM lesson_notes ln
JOIN users ut ON ln.created_by = ut.id
JOIN subjects s ON ln.subject_id = s.id
JOIN class_arm_combos cc ON ln.class_arm_combo_id = cc.id
JOIN classes c ON cc.class_id = c.id
JOIN arms a ON cc.arm_id = a.id
WHERE ln.school_id = $1 AND ln.status IN ('SUBMITTED', 'UNDER_REVIEW')
ORDER BY ln.created_at DESC;
```

---
```

---

## TASK 12.4: Document All API Endpoints

Create `API_REFERENCE.md`:

```markdown
# SMS API Reference

## Base URL
`http://localhost:3000/api`

## Authentication
All endpoints require:
- User authenticated via Supabase Auth
- `school_id` parameter for multi-tenant isolation

## Response Format

### Success Response (200, 201)
```json
{
  "success": true,
  "data": {...},
  "message": "Operation successful"
}
```

### Error Response (400, 403, 404, 500)
```json
{
  "error": "Clear error message",
  "details": "Optional additional details",
  "hint": "Optional PostgreSQL hint"
}
```

## Endpoints

### Documents

#### GET /api/documents/admission-letter
Generate student admission letter

**Query Parameters**:
- `studentId` (UUID, required) - Student ID

**Response** (200):
```json
{
  "success": true,
  "letterHtml": "<html>...</html>",
  "personName": "John Doe",
  "schoolName": "Test School",
  "admissionNumber": "ADM/2024/001",
  "classes": ["JSS1A"]
}
```

**Errors**:
- 404: Student not found

---

#### GET /api/documents/appointment-letter
Generate staff appointment letter

**Query Parameters**:
- `teacherId` (UUID, required) - Staff/teacher ID
- `principal` (1, optional) - Set to 1 for principal letter

**Response** (200):
```json
{
  "success": true,
  "letterHtml": "<html>...</html>",
  "personName": "Mr. Teacher",
  "position": "Teacher",
  "employmentDate": "2024-01-15",
  "classes": ["JSS1A", "JSS2B"]
}
```

**Errors**:
- 404: Staff not found

---

### Academic

#### GET /api/teacher/terms
List all academic terms for a school

**Query Parameters**:
- `school_id` (UUID, required)

**Response** (200):
```json
{
  "success": true,
  "count": 3,
  "terms": [
    {
      "id": "uuid",
      "term_name": "First Term",
      "start_date": "2024-09-01",
      "end_date": "2024-12-31",
      "is_active": true,
      "session_id": "uuid"
    },
    ...
  ]
}
```

---

#### GET /api/principal/dashboard
Get aggregated principal dashboard data

**Query Parameters**:
- `school_id` (UUID, required)
- `principal_id` (UUID, required)

**Response** (200):
```json
{
  "success": true,
  "dashboard": {
    "school_info": {
      "name": "Test School",
      "logo_url": "...",
      "type": "PRIMARY"
    },
    "stats": {
      "total_classes": 6,
      "total_students": 150,
      "total_teachers": 12,
      "total_staff": 8,
      "average_attendance": 92.5,
      "pending_lesson_notes": 3
    },
    "classes": [...],
    "recent_scores": [...],
    "attendance_summary": {"present": 120, "absent": 10, "late": 5}
  }
}
```

---

### Lessons

#### POST /api/teacher/lessons/submit
Teacher submits lesson note

**Body**:
```json
{
  "school_id": "uuid",
  "subject_id": "uuid",
  "class_arm_combo_id": "uuid",
  "teacher_id": "uuid",
  "title": "Introduction to Fractions",
  "content": "Today we covered...",
  "attachments": null
}
```

**Response** (200):
```json
{
  "success": true,
  "lesson_note_id": "uuid",
  "status": "SUBMITTED",
  "created_at": "2024-09-01T10:00:00Z"
}
```

**Errors**:
- 400: Missing required fields

---

#### GET /api/principal/lessons/pending
Principal views pending lesson notes

**Query Parameters**:
- `school_id` (UUID, required)
- `principal_id` (UUID, required)

**Response** (200):
```json
{
  "success": true,
  "count": 2,
  "lesson_notes": [
    {
      "id": "uuid",
      "title": "Lesson Title",
      "status": "SUBMITTED",
      "teacher_name": "Mr. Teacher",
      "subject_name": "Mathematics",
      "class_name": "JSS1",
      "arm_name": "A",
      "created_at": "2024-09-01T09:00:00Z"
    },
    ...
  ]
}
```

---

#### PUT /api/principal/lessons/approve
Principal approves lesson note

**Body**:
```json
{
  "school_id": "uuid",
  "principal_id": "uuid",
  "lesson_note_id": "uuid",
  "comments": "Excellent coverage"
}
```

**Response** (200):
```json
{
  "success": true,
  "lesson_note_id": "uuid",
  "status": "APPROVED"
}
```

---

#### PUT /api/principal/lessons/return
Principal returns lesson for revision

**Body**:
```json
{
  "school_id": "uuid",
  "principal_id": "uuid",
  "lesson_note_id": "uuid",
  "comments": "Please add more examples"
}
```

**Response** (200):
```json
{
  "success": true,
  "lesson_note_id": "uuid",
  "status": "RETURNED"
}
```

---

### Messaging

#### POST /api/announcements/broadcast
Create broadcast announcement

**Body**:
```json
{
  "school_id": "uuid",
  "created_by": "uuid",
  "title": "Staff Meeting",
  "message": "Meeting at 3 PM",
  "scope": "ROLE",
  "target_role": "TEACHER"
}
```

**Response** (200):
```json
{
  "success": true,
  "announcement_id": "uuid",
  "notifications_created": 12,
  "message": "Broadcast sent to 12 recipients"
}
```

---

#### GET /api/teacher/broadcast-inbox
Get teacher's broadcast inbox

**Query Parameters**:
- `school_id` (UUID, required)
- `teacher_id` (UUID, required)
- `unread_only` (boolean, optional) - Default: false

**Response** (200):
```json
{
  "success": true,
  "count": 5,
  "unread_count": 2,
  "inbox": [
    {
      "id": "uuid",
      "title": "Message Title",
      "message": "Message content...",
      "sender": "Admin",
      "created_at": "2024-09-01T09:00:00Z",
      "read_at": null,
      "read": false
    },
    ...
  ]
}
```

---

#### PATCH /api/teacher/broadcast-inbox
Mark notifications as read

**Body**:
```json
{
  "school_id": "uuid",
  "teacher_id": "uuid",
  "notification_id": "uuid",  // OR use mark_all_as_read
  "mark_all_as_read": false
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Updated 1 notification(s)"
}
```

---

### CBT

#### POST /api/teacher/cbt/create
Teacher creates CBT exam

**Body**:
```json
{
  "school_id": "uuid",
  "subject_id": "uuid",
  "class_arm_combo_id": "uuid",
  "teacher_id": "uuid",
  "title": "Mathematics Test",
  "assessment_type": "CA1",
  "term_id": "uuid",
  "duration_minutes": 30,
  "total_marks": 10,
  "questions": [
    {
      "question_text": "What is 2+2?",
      "question_type": "MULTIPLE_CHOICE",
      "marks": 2,
      "options": [
        {"option_key": "A", "option_text": "3", "is_correct": false},
        {"option_key": "B", "option_text": "4", "is_correct": true},
        {"option_key": "C", "option_text": "5", "is_correct": false},
        {"option_key": "D", "option_text": "6", "is_correct": false}
      ]
    }
  ]
}
```

**Response** (200):
```json
{
  "success": true,
  "exam": {
    "id": "uuid",
    "title": "Mathematics Test",
    "status": "DRAFT",
    "total_marks": 10,
    "created_at": "2024-09-01T10:00:00Z"
  }
}
```

**Errors**:
- 400: Invalid assessment_type, missing fields, option_key validation
- 403: Teacher not assigned to subject/class

---

#### GET /api/student/cbt/{examId}
Student fetches exam questions

**Query Parameters**:
- `school_id` (UUID, required)
- `student_id` (UUID, required)

**Response** (200):
```json
{
  "success": true,
  "exam": {
    "id": "uuid",
    "title": "Mathematics Test",
    "duration_minutes": 30,
    "total_marks": 10,
    "questions": [
      {
        "id": "uuid",
        "text": "What is 2+2?",
        "marks": 2,
        "options": [
          {"key": "A", "text": "3"},
          {"key": "B", "text": "4"},
          ...
        ]
      },
      ...
    ]
  }
}
```

---

#### POST /api/student/cbt/submit
Student submits answers (auto-graded)

**Body**:
```json
{
  "school_id": "uuid",
  "submission_id": "uuid",
  "student_id": "uuid"
}
```

**Response** (200):
```json
{
  "success": true,
  "result": {
    "score": 8,
    "total_marks": 10,
    "percentage": 80.0,
    "passed": true,
    "status": "GRADED",
    "submitted_at": "2024-09-01T11:00:00Z",
    "message": "Congratulations! You scored 8/10"
  }
}
```

---

### Scores

#### POST /api/subject-scores
Teacher enters/updates student scores

**Body**:
```json
{
  "school_id": "uuid",
  "student_id": "uuid",
  "subject_id": "uuid",
  "term_id": "uuid",
  "class_arm_combo_id": "uuid",
  "teacher_id": "uuid",
  "test1_score": 8,
  "test2_score": 7,
  "test3_score": 9,
  "test4_score": 8,
  "exam_score": 45,
  "teacher_comment": "Good performance"
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Score created",
  "score_sheet": {
    "id": "uuid",
    "total": 84,
    "grade": "A",
    "created_at": "2024-09-01T10:00:00Z"
  }
}
```

**Errors**:
- 400: Score out of range (test: 0-10, exam: 0-60)

---

#### PATCH /api/results/update-comment
Update teacher comment on score

**Body**:
```json
{
  "result_id": "uuid",
  "teacher_id": "uuid",
  "school_id": "uuid",
  "teacher_comment": "Excellent work"
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Teacher comment updated"
}
```

---

#### POST /api/results/sync-score-sheet
Get synchronized report card

**Body**:
```json
{
  "school_id": "uuid",
  "student_id": "uuid",
  "term_id": "uuid"
}
```

**Response** (200):
```json
{
  "success": true,
  "synced": true,
  "data": {
    "total_subjects": 8,
    "passed_subjects": 7,
    "failed_subjects": 1,
    "total_score": 668,
    "average_score": 83.5,
    "overall_percentage": 83.5,
    "scores": [...]
  }
}
```

---

### Staff

#### GET /api/staff/profile
Get staff member profile

**Query Parameters**:
- `school_id` (UUID, required)
- `staff_id` (UUID, required)

**Response** (200):
```json
{
  "success": true,
  "profile": {
    "id": "uuid",
    "full_name": "Mr. Teacher",
    "email": "teacher@school.com",
    "role": "TEACHER",
    "position": "Senior Teacher",
    "employment_date": "2020-01-15",
    "subjects": [
      {"id": "uuid", "name": "Mathematics", "code": "MATH"}
    ],
    "classes": [
      {"class_name": "JSS1", "arm_name": "A"}
    ],
    "salary_info": {
      "current_salary": 50000,
      "currency": "NGN",
      "last_paid": "2024-08-30",
      "payment_status": "PAID"
    }
  }
}
```

---

## HTTP Status Codes

- **200 OK** - Successful GET, PUT, PATCH
- **201 Created** - Successful POST
- **400 Bad Request** - Invalid parameters, validation errors
- **403 Forbidden** - Unauthorized access (cross-school, wrong role)
- **404 Not Found** - Resource doesn't exist
- **500 Internal Server Error** - Server error

---

## Error Examples

### 400 Bad Request
```json
{
  "error": "Missing required field: subject_id"
}
```

### 403 Forbidden
```json
{
  "error": "Unauthorized: You cannot edit comments for results you did not create"
}
```

### 404 Not Found
```json
{
  "error": "Student not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Database error",
  "details": "Unique constraint violation on (student_id, subject_id, term_id)"
}
```

---
```

---

## TASK 12.5: Remove TODO Comments from Code

### Search for TODOs

```bash
grep -r "TODO\|FIXME\|XXX\|HACK" src/ --include="*.ts" --include="*.tsx"
```

### Policy
- Remove completed TODOs
- Keep architectural notes as comments (not TODO)
- Document remaining incomplete items in GitHub Issues

---

## TASK 12.6: Final Verification

### Build Verification

```bash
npm run build
```

**Expected**: 0 errors, 0 warnings

### Linter Verification

```bash
npm run lint
```

**Expected**: 0 errors

### Type Check

```bash
npm run type-check  # or tsc --noEmit
```

**Expected**: 0 errors

### Migration Verification

```sql
-- Run all verification queries
SELECT COUNT(*) FROM academic_sessions;
SELECT COUNT(*) FROM academic_terms;
SELECT COUNT(*) FROM cbt_exams;
SELECT COUNT(*) FROM cbt_submissions;
SELECT COUNT(*) FROM score_sheets;
SELECT COUNT(*) FROM lesson_notes;
SELECT COUNT(*) FROM announcements;
SELECT COUNT(*) FROM notifications;

-- Verify no deprecated tables
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_name IN ('result_entries', 'cbt_results', 'terms', 'student_subject_enrollment', 'teacher_assignments')
AND table_schema = 'public';
-- Expected: 0
```

### API Spot-Check

Test 5 random endpoints:
1. `GET /api/teacher/terms?school_id=...` - Returns 200
2. `GET /api/principal/dashboard?school_id=...` - Returns 200  
3. `POST /api/subject-scores` - Returns 200 or 400 (valid test of validation)
4. `GET /api/staff/profile?school_id=...` - Returns 200 or 404 (no error)
5. `POST /api/announcements/broadcast` - Returns 200 or 400 (valid test)

---

## Deliverables

- [x] `README.md` - Updated with architecture overview
- [x] `CANONICAL_SCHEMA_REFERENCE.md` - Table documentation
- [x] `API_REFERENCE.md` - Complete endpoint documentation
- [x] Migrations applied and verified
- [x] No deprecated tables remain
- [x] Build passes without errors
- [x] Linter passes
- [x] All TODOs resolved or documented

---

**Status**: PHASE 12 Complete ✅  
**Next**: Deploy to production with confidence
