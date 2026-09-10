# PHASE 10: Update Frontend Services - Action Plan

## Overview
This document outlines the steps to update frontend services to use API routes instead of direct Supabase calls.

## Current State Analysis

### Direct Supabase Calls Found (Components)

| Component | File | Operation | Issue | Fix |
|-----------|------|-----------|-------|-----|
| Teacher Score Sheet | `src/app/teacher/score-sheet/page.tsx:251` | `supabase.from('score_sheets').upsert()` | Direct write to DB, bypasses validation | Use `POST /api/subject-scores` |
| Teacher CBT Management | `src/app/teacher/cbt-management/page.tsx:283` | `supabase.from('cbt_options').insert()` | Direct write, no server validation | Use `POST /api/teacher/cbt/create` for full exam |
| Teacher CBT Create | `src/app/teacher/cbt/CreateCBT.tsx:287` | `supabase.from('audit_logs').insert()` | Direct logging | Acceptable - audit logs are append-only |
| Student CBT | `src/app/student/cbt/page.tsx:140` | `supabase.from('subjects').select()` | Direct read of reference data | OK - reference data reads are acceptable |
| School Admin Results | `src/app/school-admin/results/page.tsx:143-155` | Multiple `.from()` calls | Direct reads for data aggregation | Could optimize with API route, but acceptable for now |

### Service Layer Analysis

| Service File | Purpose | Supabase Direct Calls | Needs Update |
|--------------|---------|----------------------|--------------|
| `teacher-data.service.ts` | Teacher data ops | `attendance.upsert()` | No - this is data entry, appropriate |
| `teacher.service.ts` | Teacher management | `subject_teacher_assignments.insert()` | No - data entry operation |
| `result-sharing.service.ts` | Result sharing | `result_shares.insert()` | No - logging operation |
| `cbt.service.ts` | CBT operations | `cbt_answers.insert()` | No - answer submission, should be in API |

## Priority Fixes (High Impact)

### 1. Teacher Score Sheet Component (Priority: HIGH)
**File**: `src/app/teacher/score-sheet/page.tsx`

**Current**: Directly upserts to `score_sheets` table
```typescript
const { error: upsertError } = await supabase.from('score_sheets').upsert(records, {
  onConflict: 'school_id,student_id,subject_id,term_id',
})
```

**Fix**: Use API route `POST /api/subject-scores` for each score

**Migration Path**:
```typescript
// BEFORE: Direct Supabase
for (const record of records) {
  await supabase.from('score_sheets').upsert([record])
}

// AFTER: Via API
for (const record of records) {
  const response = await fetch('/api/subject-scores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      school_id: record.school_id,
      student_id: record.student_id,
      subject_id: record.subject_id,
      term_id: record.term_id,
      class_arm_combo_id: record.class_arm_combo_id,
      teacher_id: record.teacher_id,
      test1_score: record.test1,
      test2_score: record.test2,
      test3_score: record.test3,
      test4_score: record.test4,
      exam_score: record.exam,
      teacher_comment: record.teacher_comment,
    })
  })
  
  if (!response.ok) {
    throw new Error(`Failed to save score: ${response.statusText}`)
  }
}
```

### 2. Teacher CBT Management Component (Priority: HIGH)
**File**: `src/app/teacher/cbt-management/page.tsx`

**Current**: Directly inserts options to `cbt_options`
```typescript
const { error: optionsError } = await supabase.from('cbt_options').insert(optionsToInsert)
```

**Issue**: Teacher can bypass option_key validation

**Fix**: Use `POST /api/teacher/cbt/create` (already exists) with complete exam + questions + options

**Status**: Already have API route - just need to wire component to it

### 3. CBT Service - Answer Submission (Priority: HIGH)
**File**: `src/services/cbt.service.ts`

**Current**:
```typescript
const { error } = await supabase.from('cbt_answers').insert({
  submission_id: submissionId,
  question_id: questionId,
  answer: answer,
})
```

**Issue**: 
- Bypasses auto-grading logic
- Doesn't interact with `POST /api/student/cbt/submit`
- Inconsistent with API-first architecture

**Fix**: Create intermediate service layer:
```typescript
// cbt-submission.service.ts
class CBTSubmissionService {
  static async submitExam(submissionId: string, answers: Array<{questionId, selectedOptionId}>) {
    return fetch('/api/student/cbt/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        school_id, 
        submission_id: submissionId,
        student_id,
        answers
      })
    })
  }
}
```

---

## Comprehensive Service Layer Fixes

### 1. Create New Services

#### LessonNoteService (Uses Existing APIs from Phases 1-6)
```typescript
// src/services/lesson-note.service.ts
export class LessonNoteService {
  static async submitLesson(data: {
    school_id: string
    subject_id: string
    class_arm_combo_id: string
    teacher_id: string
    title: string
    content: string
    attachments?: File[]
  }) {
    return fetch('/api/teacher/lessons/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
  }

  static async getPendingLessons(schoolId: string, principalId: string) {
    return fetch(`/api/principal/lessons/pending?school_id=${schoolId}&principal_id=${principalId}`)
      .then(r => r.json())
  }

  static async approveLessonsNote(lessonId: string, data: {
    school_id: string
    principal_id: string
    comments?: string
  }) {
    return fetch('/api/principal/lessons/approve', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, lesson_id: lessonId })
    })
  }

  static async returnLessonNote(lessonId: string, data: {
    school_id: string
    principal_id: string
    comments: string
  }) {
    return fetch('/api/principal/lessons/return', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, lesson_id: lessonId })
    })
  }
}
```

#### BroadcastService (Uses Existing APIs from Phases 1-6)
```typescript
// src/services/broadcast.service.ts
export class BroadcastService {
  static async sendBroadcast(data: {
    school_id: string
    created_by: string
    title: string
    message: string
    scope: 'SCHOOL_WIDE' | 'CLASS' | 'ROLE'
    target_class_id?: string
    target_role?: string
  }) {
    return fetch('/api/announcements/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
  }

  static async getTeacherInbox(schoolId: string, teacherId: string) {
    return fetch(`/api/teacher/broadcast-inbox?school_id=${schoolId}&teacher_id=${teacherId}`)
      .then(r => r.json())
  }

  static async markAsRead(schoolId: string, teacherId: string, notificationId?: string, markAll?: boolean) {
    return fetch('/api/teacher/broadcast-inbox', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        school_id: schoolId,
        teacher_id: teacherId,
        notification_id: notificationId,
        mark_all_as_read: markAll
      })
    })
  }
}
```

#### PrincipalDashboardService (Uses Existing API from Phase 5)
```typescript
// src/services/principal-dashboard.service.ts
export class PrincipalDashboardService {
  static async getDashboardData(schoolId: string, principalId: string) {
    return fetch(`/api/principal/dashboard?school_id=${schoolId}&principal_id=${principalId}`)
      .then(r => r.json())
  }
}
```

#### StaffProfileService (Uses Existing API from Phase 4)
```typescript
// src/services/staff-profile.service.ts
export class StaffProfileService {
  static async getProfile(schoolId: string, staffId: string) {
    return fetch(`/api/staff/profile?school_id=${schoolId}&staff_id=${staffId}`)
      .then(r => r.json())
  }
}
```

#### DocumentService (Uses Existing APIs)
```typescript
// src/services/document.service.ts
export class DocumentService {
  static async generateAdmissionLetter(studentId: string) {
    return fetch(`/api/documents/admission-letter?studentId=${studentId}`)
      .then(r => r.json())
  }

  static async generateAppointmentLetter(teacherId: string, principal?: boolean) {
    const url = new URL('/api/documents/appointment-letter', window.location.origin)
    url.searchParams.set('teacherId', teacherId)
    if (principal) url.searchParams.set('principal', '1')
    
    return fetch(url.toString())
      .then(r => r.json())
  }
}
```

#### CBTService (Use Existing APIs)
```typescript
// src/services/cbt.service.ts (UPDATED)
export class CBTService {
  static async createExam(data: {
    school_id: string
    subject_id: string
    class_arm_combo_id: string
    teacher_id: string
    title: string
    assessment_type: 'CA1' | 'CA2' | 'CA3' | 'CA4' | 'EXAM'
    term_id: string
    duration_minutes: number
    total_marks: number
    questions: Array<{
      question_text: string
      question_type: string
      marks?: number
      options: Array<{
        option_key: 'A' | 'B' | 'C' | 'D'
        option_text: string
        is_correct: boolean
      }>
    }>
  }) {
    return fetch('/api/teacher/cbt/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
  }

  static async getStudentExam(schoolId: string, examId: string, studentId: string) {
    return fetch(`/api/student/cbt/${examId}?school_id=${schoolId}&student_id=${studentId}`)
      .then(r => r.json())
  }

  static async submitExam(data: {
    school_id: string
    submission_id: string
    student_id: string
    answers: Array<{question_id: string, selected_option_id: string}>
  }) {
    return fetch('/api/student/cbt/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
  }
}
```

#### ResultService (Uses Updated APIs)
```typescript
// src/services/result.service.ts
export class ResultService {
  static async saveScore(data: {
    school_id: string
    student_id: string
    subject_id: string
    term_id: string
    class_arm_combo_id: string
    teacher_id: string
    test1_score?: number
    test2_score?: number
    test3_score?: number
    test4_score?: number
    exam_score?: number
    teacher_comment?: string
  }) {
    return fetch('/api/subject-scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
  }

  static async updateComment(resultId: string, data: {
    teacher_id: string
    school_id: string
    teacher_comment: string
  }) {
    return fetch('/api/results/update-comment', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        result_id: resultId,
        ...data
      })
    })
  }

  static async syncReportCard(data: {
    school_id: string
    student_id: string
    term_id?: string
  }) {
    return fetch('/api/results/sync-score-sheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
  }
}
```

---

## Component Updates Required

### Priority 1: Teacher Score Sheet
**File**: `src/app/teacher/score-sheet/page.tsx`

**Change**: Replace direct Supabase upsert with API call via `ResultService.saveScore()`

```typescript
// BEFORE
const { error: upsertError } = await supabase.from('score_sheets').upsert(records, {
  onConflict: 'school_id,student_id,subject_id,term_id',
})

// AFTER
for (const record of records) {
  const response = await ResultService.saveScore({
    school_id: record.school_id,
    student_id: record.student_id,
    subject_id: record.subject_id,
    term_id: record.term_id,
    class_arm_combo_id: record.class_arm_combo_id,
    teacher_id: record.teacher_id,
    test1_score: record.test1,
    test2_score: record.test2,
    test3_score: record.test3,
    test4_score: record.test4,
    exam_score: record.exam,
    teacher_comment: record.teacher_comment,
  })
  
  if (!response.ok) {
    throw new Error(`Failed to save score for student ${record.student_id}`)
  }
}
```

### Priority 2: Teacher CBT Management
**File**: `src/app/teacher/cbt-management/page.tsx`

**Change**: Use `CBTService.createExam()` instead of direct option insertion

```typescript
// BEFORE
const { error: optionsError } = await supabase.from('cbt_options').insert(optionsToInsert)

// AFTER
// The entire exam creation (including options) should go through CBTService.createExam()
// which calls POST /api/teacher/cbt/create
```

### Priority 3: Student CBT Exam Page
**File**: `src/app/student/cbt/page.tsx`

**Change**: Use `CBTService.submitExam()` instead of direct answer submission

```typescript
// BEFORE
await supabase.from('cbt_answers').insert({...})

// AFTER
const response = await CBTService.submitExam({
  school_id: schoolId,
  submission_id: submissionId,
  student_id: studentId,
  answers: [{question_id, selected_option_id}, ...]
})
```

### Priority 4: School Admin Results
**File**: `src/app/school-admin/results/page.tsx`

**Status**: Reference data reads are acceptable. No change needed immediately, but could optimize with aggregation API.

---

## Implementation Checklist

### Services to Create
- [ ] `LessonNoteService` - lesson note submission and review
- [ ] `BroadcastService` - announcement and inbox
- [ ] `PrincipalDashboardService` - dashboard data
- [ ] `StaffProfileService` - staff profile
- [ ] `DocumentService` - admission and appointment letters
- [ ] Update `CBTService` - use API routes
- [ ] Update `ResultService` - use API routes

### Components to Update
- [ ] `src/app/teacher/score-sheet/page.tsx` - use ResultService
- [ ] `src/app/teacher/cbt-management/page.tsx` - use CBTService
- [ ] `src/app/student/cbt/page.tsx` - use CBTService
- [ ] `src/app/school-admin/records/page.tsx` - wire up broadcast UI
- [ ] `src/app/principal/dashboard/page.tsx` - use PrincipalDashboardService
- [ ] `src/app/teacher/broadcast-inbox/page.tsx` - create if missing, use BroadcastService

### Verification
- [ ] No direct `supabase.from()` calls in component files (except reference data)
- [ ] All service methods return promises or fetch responses
- [ ] Error handling in place for all API calls
- [ ] TypeScript types defined for all service methods
- [ ] API calls include school_id for multi-tenancy
- [ ] Build passes without warnings

---

## Testing Strategy

After each component update:
1. Test the UI flow (create, submit, review)
2. Verify data appears in database
3. Check console for errors
4. Verify proper HTTP status codes returned
5. Test error cases (missing fields, invalid data)
6. Verify school isolation (can't access other school's data)

---

## Success Criteria

✅ **All Phase 1-6 APIs wired to frontend**
- Lesson note submission working
- Broadcast messaging working
- Principal dashboard displaying data
- Staff profiles loading
- Appointment letters generating
- Admission letters generating

✅ **No broken components**
- Teacher score sheet saves via API
- Teacher CBT creation uses API
- Student CBT submission auto-grades

✅ **Clean architecture**
- Services layer sits between components and APIs
- Components never call Supabase directly
- Data flows: Component → Service → API → Database

---

**Next**: Implement these services and component updates to complete PHASE 10.
