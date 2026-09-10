# 🚀 MASTER IMPLEMENTATION ROADMAP

## Phase 1: Database Architecture (Completed)
✅ Created migration 030 with:
- `cbt_answers` table (ONE canonical table)
- Enhanced `cbt_submissions` with status, term, assessment_type
- Enhanced `cbt_exams` with assessment_type, teacher_id, status
- Enhanced `score_sheets` for CBT integration
- Created `teacher_class_assignments` table
- Performance indices

## Phase 2: API Fixes Required

### A. CBT Answer Storage API
**Current**: Stores answers as JSON in `cbt_submissions.answers`
**Required**: Individual `cbt_answers` records

**Fix**: Update `/api/student/cbt/submit/route.ts`:
1. After creating submission, insert each answer to `cbt_answers`
2. Set `selected_option_id` for MC/TF questions
3. Set `answer_text` for theory questions
4. Calculate `is_correct` immediately
5. Save to `cbt_answers` table

### B. Teacher Endpoints (Currently 404)
**Required Endpoints**:
- GET /api/teachers/:teacherId/students/class → Class students
- GET /api/teachers/:teacherId/students/subject → Subject students
- GET /api/teachers/:teacherId/cbt/exams → Teacher's CBT exams
- POST /api/teachers/:teacherId/cbt/create → Create CBT
- GET /api/teachers/:teacherId/results → Teacher results
- PATCH /api/teachers/:teacherId/results/:resultId → Update scores

### C. Student Endpoints
**Required Endpoints**:
- GET /api/students/:studentId/cbt/eligible → Eligible CBTs
- GET /api/students/:studentId/results → Student results
- GET /api/students/:studentId/profile → Student info (for header)

## Phase 3: Service Layer Consolidation

### A. Existing Services
- `src/services/teacher.service.ts` → Consolidate teacher logic
- `src/services/student.service.ts` → Consolidate student logic
- `src/services/cbt.service.ts` → Create CBT service
- `src/services/result.service.ts` → Create result service

### B. Key Functions Needed
```typescript
// CBT Service
- createCBT(teacherId, classArmId, subjectId, termId, details)
- getEligibleCBTs(studentId) // Filter by class+subject+term+session
- submitCBT(studentId, cbtId, answers)
- gradeAutomatically(submissionId)

// Result Service
- createResult(studentId, subjectId, termId, assessmentType, score)
- updateResult(resultId, updates)
- getStudentResults(studentId, termId)
- getTeacherResults(teacherId, filters)

// Student Service
- getStudentProfile(studentId) // For header
- getStudentClassmates(studentId)
- getStudentSubjectTeachers(studentId)

// Teacher Service
- getTeacherClasses(teacherId)
- getTeacherSubjects(teacherId)
- getClassStudents(teacherId, classArmId)
- getSubjectStudents(teacherId, subjectId, classArmId)
```

## Phase 4: Frontend Components

### A. Exam Header Component
**File**: `src/components/ExamHeader.tsx`
```
Display:
- School name
- Student name
- Admission number
- Class & Arm
- Subject
- Assessment type (CA1, EXAM, etc)
- Term
- Academic session
- Timer (sticky)

Must be visible during entire exam
```

### B. Teacher Dashboard Updates
**File**: `src/app/teacher/student-management/page.tsx`
- Fix 404 API calls
- Show class students
- Show subject students with filters

**File**: `src/app/teacher/cbt/page.tsx`
- Fix/enhance CBT creation
- Assessment type dropdown (CA1-CA4, MIDTERM, EXAM)
- Term selection

**File**: `src/app/teacher/results/page.tsx`
- Fix multi-filter queries
- Show correct results
- Allow editing scores

### C. Student Dashboard Updates
**File**: `src/app/student/cbt/page.tsx`
- Filter to ONLY eligible CBTs
- Student-specific endpoint

**File**: `src/app/student/cbt/[id]/page.tsx`
- Add ExamHeader at top
- Fix Object.size error (already done)

**File**: `src/app/student/results/page.tsx`
- Create if missing
- Show results by term
- Display TEST1-4, EXAM format

## Phase 5: Type Definitions

**File**: `src/types/index.ts`
```typescript
interface CBTExam {
  id: string
  school_id: string
  subject_id: string
  class_arm_combo_id: string
  teacher_id: string
  term_id: string
  title: string
  assessment_type: 'CA1' | 'CA2' | 'CA3' | 'CA4' | 'MIDTERM' | 'EXAM'
  start_time: string
  end_time: string
  duration_minutes: number
  total_marks: number
  passing_percentage: number
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED'
}

interface CBTSubmission {
  id: string
  school_id: string
  cbt_exam_id: string
  student_id: string
  term_id: string
  assessment_type: string
  status: 'STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED' | 'LOCKED'
  score: number
  percentage: number
  passed: boolean
  submitted_at: string
}

interface CBTAnswer {
  id: string
  school_id: string
  submission_id: string
  question_id: string
  selected_option_id: string | null
  answer_text: string | null
  is_correct: boolean
  marks_awarded: number
}

interface StudentResult {
  id: string
  student_id: string
  subject_id: string
  term_id: string
  test1: number
  test2: number
  test3: number
  test4: number
  exam: number
  total: number
  grade: string
}
```

## Phase 6: Database Guards

**In every API**:
```typescript
// Before any Supabase query:
if (!schoolId) {
  return NextResponse.json({error: 'Invalid school'}, {status: 400})
}
if (!studentId && !teacherId) {
  return NextResponse.json({error: 'Invalid user'}, {status: 400})
}
if (!examId || examId.includes('undefined')) {
  return NextResponse.json({error: 'Invalid exam'}, {status: 400})
}

// Always filter by school_id
.eq('school_id', schoolId)

// Never render UUIDs to user
// Always join and display names
```

## Phase 7: Testing Sequence

### Test 1: Database
```
1. Run migration 030
2. Verify cbt_answers table exists
3. Verify columns added to cbt_submissions
4. Check indices created
```

### Test 2: Student Registration Flow
```
1. Register student: John Doe, SS1A, Math+English
2. Verify appears in:
   - SS1A Class Teacher → Class Students
   - Math Teacher → Subject Students
   - English Teacher → Subject Students
```

### Test 3: CBT Creation
```
1. Teacher creates: Math SS1A CA1 First Term
2. Only Math SS1A students can see it
3. Math SS1B students cannot see it
```

### Test 4: CBT Taking
```
1. Student opens exam
2. Exam header displays correctly
3. Takes exam
4. Submits
5. Answers saved to cbt_answers table
6. Score calculated
```

### Test 5: Results Sync
```
1. Teacher opens results
2. Sees student CBT score
3. Sees CA1 score from exam
4. Student opens results
5. Sees same CA1 score
```

## Critical Fixes Summary

| Issue | Status | Impact |
|-------|--------|--------|
| cbt_answers missing | 🔧 Schema fix applied | Fixes 404 error |
| Multi-filter 400 | 🔧 Query fix needed | Fixes teacher results |
| Student not found | 🔧 Query fix needed | Fixes student discovery |
| Exam header missing | 🔧 Component needed | UI requirement |
| UUID rendering | 🔧 Join fixes needed | User experience |
| Empty UUID protection | 🔧 Guards needed | API reliability |

## Execution Order

1. **Immediate**: Run migration 030 (database)
2. **Next**: Fix API endpoints (teacher student lists)
3. **Next**: Create ExamHeader component
4. **Next**: Fix CBT submission to use cbt_answers
5. **Next**: Enhance CBT creation UI
6. **Next**: Fix result system
7. **Final**: Comprehensive testing

## NOT Allowed
❌ Do not create duplicate CBT services
❌ Do not hardcode UUIDs
❌ Do not render UUIDs to users
❌ Do not create empty UUID queries
❌ Do not create parallel API endpoints
❌ Do not mix Primary/Secondary logic
❌ Do not reintroduce RLS policies
❌ Do not create duplicate tables

## One Authoritative Flow

```
STUDENT REGISTRATION
↓
SCHOOL + ACADEMIC SESSION + CLASS + ARM + SUBJECTS
↓
AUTOMATIC CLASS TEACHER LINK
AUTOMATIC SUBJECT TEACHER LINKS
↓
TEACHER CREATES CBT
↓
ONLY ELIGIBLE STUDENTS SEE IT
↓
STUDENT TAKES EXAM WITH HEADER
↓
AUTOMATIC GRADING
↓
RESULT APPEARS FOR BOTH
↓
TEACHER CAN EDIT
↓
STUDENT SEES UPDATE
```

---

**This roadmap ensures ONE canonical system with NO duplicates or conflicts.**
