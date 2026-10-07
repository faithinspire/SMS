# Implementation Plan: SMS Master Hard-Fix & Standardization

## Overview
This plan addresses five critical areas across the FTECH SMS codebase:
1. Fix School-Context Resolution in Students Page (currently shows "not linked to school")
2. Implement Student Lock/Unlock System with server-side enforcement
3. Fix Results Page data loading and result engine
4. Implement Canonical Result Engine (unified score aggregation)
5. Complete Academic Page with real database-driven data

All work preserves existing functionality on working pages (Staff, Teacher, CBT, existing dashboards).

---

## PART 1: Fix School-Context Resolution in Students Page

### Issue
The Students page shows "Your account is not linked with the school" even when the School Admin belongs to a school. The Staff page works correctly because it uses `AuthService.getCurrentUser()` → `user.school_id` → `StaffService.getStaffList(school_id)`. The Students page tries to fetch school_id via raw Supabase query using `.maybeSingle()` which returns null.

### Decision: Adopt Staff page pattern exactly
The Staff page pattern is proven and works. We will replicate it for Students page without deviation. This ensures consistency and eliminates the "not linked" error.

---

- [ ] 1. Refactor Students page (`src/app/school-admin/students/page.tsx`) to use AuthService.getCurrentUser() pattern
      Replace raw Supabase query for school_id with the Staff page's proven pattern:
      1. Call `AuthService.getCurrentUser()` on component mount
      2. Check if user exists and has school_id
      3. Pass school_id to API endpoint or data fetch
      4. Display user school context (school name, logo) at top of page
      
      Files: src/app/school-admin/students/page.tsx
      Verify: Navigate to /school-admin/students, confirm page loads without "not linked to school" error, displays school name and students list

---

## PART 2: Student Lock/Unlock System

### Decision: Use PAUSED status for lock; SUSPENDED for manual admin action
The students table already has a `status` column that supports: ACTIVE, INACTIVE, PAUSED, SUSPENDED, TRANSFERRED, GRADUATED (see migration 164). We use PAUSED for lock (indicates temporary restriction) and can optionally add an `is_locked` boolean for future auditing. StudentAuthService.verifyStudentAccountActive() already checks for PAUSED/SUSPENDED.

### Database
The students table already has the required `status` column from migration 164. No new migration needed — table is ready.

### Server-side enforcement: two layers
1. **Student Dashboard Guard** (src/app/student/dashboard/page.tsx): Already partially implemented. Calls StudentAuthService.verifyStudentAccountActive() and redirects to account-locked page on failure.
2. **API Route Guards** (each protected endpoint): Add authorization check to prevent direct API calls.

---

- [ ] 2. Create StudentLockService for lock/unlock operations
      File: src/services/student-lock.service.ts
      Methods:
      - lockStudent(studentId: string, schoolId: string, reason?: string): Promise<{ success: boolean; message: string }>
      - unlockStudent(studentId: string, schoolId: string): Promise<{ success: boolean; message: string }>
      - getLockStatus(studentId: string): Promise<{ isLocked: boolean; status: 'ACTIVE' | 'PAUSED' | 'SUSPENDED'; reason?: string }>
      
      Implementation: Update students.status to PAUSED (lock) or ACTIVE (unlock).
      Use Supabase update with school_id scoping to ensure multi-tenancy.
      Verify: Run Jest/test suite with mock Supabase; confirm lock/unlock return success messages

---

- [ ] 3. Add Lock/Unlock buttons to Students page
      File: src/app/school-admin/students/page.tsx
      Changes:
      1. Import StudentLockService
      2. Add lock/unlock button actions in table row (alongside existing Edit/Delete)
      3. For locked students, show lock icon in status column
      4. Call StudentLockService.lockStudent() / unlockStudent() on button click
      5. Refresh student list after successful lock/unlock
      6. Show toast messages (success/error)
      
      Files: src/app/school-admin/students/page.tsx
      Verify: Lock a student; refresh page; confirm status shows PAUSED; unlock student; refresh; confirm status shows ACTIVE

---

- [ ] 4. Enforce student lock on Student Dashboard access
      File: src/app/student/dashboard/page.tsx
      Changes:
      1. Enhance StudentAuthService.verifyStudentAccountActive() to check PAUSED/SUSPENDED status (already does this)
      2. If status is PAUSED/SUSPENDED, render professional locked screen instead of dashboard
      3. Remove existing partial account-locked redirect; use unified locked page instead
      
      Locked screen components:
      - School logo and name (fetched from school context)
      - Student name (from user profile)
      - "STUDENT ACCESS LOCKED" heading
      - Clear message: "Your access to the student portal has been temporarily restricted by your school administrator. Please contact your school administration for assistance."
      - Contact school option (if email exists)
      - Logout button
      
      Files: src/app/student/dashboard/page.tsx, or create src/app/student/account-locked/page.tsx for dedicated locked page
      Verify: Lock a student and refresh dashboard; confirm locked screen appears with school logo, student name, and message; click Logout; confirm redirected to login

---

- [ ] 5. Enforce student lock on all protected student API endpoints
      Files: src/app/api/student/** (all routes that accept studentId or use auth context)
      Specific endpoints to guard:
      - /api/student/cbt/submit
      - /api/student/cbt/[exam]/submit (if exists)
      - /api/student/assignments/** (all)
      - /api/student/lesson-notes/** (all)
      - /api/student/attendance/** (if exists)
      - /api/student/results/** (if exists)
      - /api/student/profile/** (POST/PATCH only)
      
      Implementation pattern:
      ```typescript
      const { data: student } = await supabase
        .from('students')
        .select('id, status')
        .eq('user_id', userId)
        .eq('school_id', schoolId)
        .maybeSingle();
      
      if (student?.status === 'PAUSED' || student?.status === 'SUSPENDED') {
        return NextResponse.json(
          { error: 'Student account is locked' },
          { status: 403 }
        );
      }
      ```
      
      Files: src/app/api/student/cbt/submit/route.ts, src/app/api/student/assignments/**/route.ts, etc. (see grep results for all endpoints)
      Verify: As locked student, attempt to:
      - Submit CBT exam (via POST /api/student/cbt/submit)
      - Submit assignment
      - Fetch profile
      All should return 403 "Student account is locked"; no data returned

---

## PART 3: Fix Results Page Data Loading

### Issue
The Results page dropdowns for Session, Term, Class, Class Arm, Student, Subject may show hardcoded values or fail to load dynamically from database. API endpoints `/api/results/*` may not be returning proper data.

### Decision: Use SchoolContextService (already exists) + async dropdowns
The SchoolContextService already resolves school context correctly. Results page should use it for school_id, then query academic_sessions, academic_terms, etc. dynamically.

---

- [ ] 6. Audit Results page API endpoints and verify they use school_id scoping
      Files: src/app/api/results/** (all routes)
      Checks:
      1. All queries include `eq('school_id', schoolId)` filter
      2. School ID comes from authenticated user context (not URL params alone)
      3. No hardcoded class names, subject names, or enum values
      4. Return real database values (not "ACTIVE", not magic strings)
      5. Error responses are clear (not generic)
      
      Key endpoints:
      - GET /api/results/ensure-school-data (auto-create sessions/terms if missing)
      - GET /api/results/school-classes-and-students (fetch classes + students for a term)
      - GET /api/results/sessions (fetch all sessions for school)
      - GET /api/results/terms (fetch terms for session)
      - GET /api/results/class/[classId] (fetch scores for class)
      
      Verify: Run each endpoint with known school_id; confirm response includes real data (session year, term names, class names, student names from database; no "ACTIVE", no null values for required fields)

---

- [ ] 7. Refactor Results page (`src/app/school-admin/results/page.tsx`) to dynamically populate dropdowns
      File: src/app/school-admin/results/page.tsx
      Changes:
      1. Import SchoolContextService
      2. On mount: Call SchoolContextService.getCurrentUserSchool() to get school_id
      3. Fetch academic_sessions from /api/results/sessions?schoolId=...
      4. On session change: Fetch academic_terms from /api/results/terms?sessionId=...&schoolId=...
      5. On term change: Fetch class_arm_combos from /api/results/school-classes-and-students?schoolId=...&termId=...
      6. Show loading spinners while fetching each dropdown
      7. Handle errors gracefully (toast messages)
      8. Disable downstream dropdowns until parent selections are made
      
      Files: src/app/school-admin/results/page.tsx
      Verify: 
      - Navigate to Results page; confirm Sessions dropdown populates with real session years from database
      - Select a session; confirm Terms dropdown populates with term names (First Term, Second Term, etc.)
      - Select a term; confirm Classes dropdown populates with real class names from database
      - No hardcoded values appear in any dropdown

---

## PART 4: Canonical Result Engine (Unified Score Aggregation)

### Issue
Scores may come from multiple sources (manual teacher entry in score_sheets, CBT exam results, CBT test results, direct submissions). Without a unified engine, duplicate scores, missing scores, or conflicting sources occur.

### Decision: Create ResultService with idempotent upsert pattern
- Keyed on: (school_id, student_id, subject_id, session_id, term_id, cbt_exam_id or null)
- Roster-first: All students in a class appear in results even without scores
- Merge sources: Manual scores override CBT; CBT overrides nothing (CBT fills gaps)
- Auto-populate: CBT results flow into score_sheets automatically

---

- [ ] 8. Create ResultService for unified score handling
      File: src/services/result.service.ts
      Methods:
      - getStudentScores(studentId: string, schoolId: string, sessionId?: string, termId?: string): Promise<StudentScores[]>
        Returns all scores for a student across all subjects/terms
      - upsertScore(input: ScoreInput): Promise<{ success: boolean; scoreId: string; message: string }>
        ScoreInput: { schoolId, studentId, subjectId, sessionId, termId, test1, test2, test3, test4, exam, source }
        Uses ON CONFLICT (school_id, student_id, subject_id, term_id) DO UPDATE to prevent duplicates
      - aggregateClassScores(classId: string, schoolId: string, termId: string): Promise<ClassScoreAggregation>
        Returns average scores, pass rates, performance by subject
      - populateScoresFromCBT(schoolId: string, sessionId: string, termId: string): Promise<{ inserted: number; skipped: number }>
        Migrates CBT exam results into score_sheets (idempotent)
      
      Implementation:
      - Check score_sheets table for existing entry
      - If exists and source is MANUAL: do not overwrite
      - If exists and source is CBT: do not overwrite (first write wins)
      - If missing: insert with source = 'MANUAL' or 'CBT'
      
      Files: src/services/result.service.ts
      Verify: Run unit tests; confirm upsert prevents duplicates; confirm CBT results merge into score_sheets without loss

---

- [ ] 9. Enhance score_sheets table schema for idempotent upsert
      File: database/migrations/165_enhance_score_sheets_for_idempotent_upsert.sql (new migration)
      Changes:
      1. Ensure unique constraint on (school_id, student_id, subject_id, term_id, cbt_exam_id) with cbt_exam_id nullable
         OR use (school_id, student_id, subject_id, term_id) if no exam-level tracking
      2. Add source column if not exists: source VARCHAR(20) CHECK (source IN ('MANUAL', 'CBT'))
      3. Create index for faster lookups: idx_score_sheets_school_student_subject_term
      4. Verify migration is idempotent (IF NOT EXISTS, IF EXISTS checks)
      
      Files: database/migrations/165_enhance_score_sheets_for_idempotent_upsert.sql
      Verify: Run migration in dev/staging; confirm table structure allows idempotent upsert; confirm existing data preserved

---

- [ ] 10. Integrate ResultService into Results page
      File: src/app/school-admin/results/page.tsx
      Changes:
      1. Import ResultService
      2. When term is selected, call ResultService.aggregateClassScores() for each class_arm_combo
      3. Display class-level statistics: average score, pass rate, top/bottom performers
      4. Show per-student scores in table (merge manual + CBT)
      5. Highlight CBT-sourced scores with badge (optional: different color)
      6. If manual entry form exists, call ResultService.upsertScore() on save
      
      Files: src/app/school-admin/results/page.tsx
      Verify: 
      - Load Results page for a term with both manual scores and CBT results
      - Confirm no duplicate scores appear
      - Confirm students without scores still appear in roster
      - Confirm class statistics (average, pass rate) calculate correctly

---

## PART 5: Complete Academic Page with Real Data

### Issue
Academic page either shows placeholder data or incomplete implementation. Should display real statistics from database.

### Decision: Mirror Staff page architecture + add aggregation queries
Academic page should fetch real data on mount, dynamically populate filters, and show dynamic statistics (not hardcoded).

---

- [ ] 11. Complete Academic page with dynamic data and filters
      File: src/app/school-admin/academic/page.tsx
      Changes:
      1. Use AuthService.getCurrentUser() to get school_id (same as Staff/Students pattern)
      2. Fetch and display key statistics:
         - Total students, total teachers, total classes, total subjects
         - Average score across all classes/subjects
         - Pass rate (% of students with score >= passing threshold)
         - CBT participation rate (% of students with CBT results)
         - Missing results count (students without scores for current term)
      3. Add filters: Session (dropdown), Term (dropdown), Class (dropdown), Subject (dropdown)
      4. Build filterable table showing:
         - Class name / arm
         - Subject name
         - Total students in class/subject
         - Average score for that combination
         - Pass rate for that combination
         - Pass count / fail count
         - Missing results count
      5. Dynamically populate all filter dropdowns from database (not hardcoded)
      6. Update statistics when filters change
      
      Table columns:
      | Class | Subject | Students | Avg Score | Pass Rate | Pass | Fail | Missing |
      
      Files: src/app/school-admin/academic/page.tsx
      Verify:
      - Navigate to Academic page; confirm statistics load (e.g., "Total Students: 150")
      - Confirm Session, Term, Class, Subject dropdowns populate from database
      - Select different filters; confirm table updates with correct statistics
      - No hardcoded values (e.g., "JSS1", "Mathematics") — all from database

---

- [ ] 12. Create AcademicService for statistics aggregation
      File: src/services/academic.service.ts
      Methods:
      - getTotalStatistics(schoolId: string): Promise<{ totalStudents, totalTeachers, totalClasses, totalSubjects }>
      - getAverageScoreAcrossSchool(schoolId: string, termId?: string): Promise<number>
      - getPassRate(schoolId: string, termId?: string): Promise<number>
      - getCBTParticipationRate(schoolId: string, sessionId?: string): Promise<number>
      - getMissingResultsCount(schoolId: string, termId: string): Promise<number>
      - getClassSubjectStatistics(schoolId: string, termId: string, classId?: string, subjectId?: string): Promise<ClassSubjectStats[]>
      
      ClassSubjectStats: { className, classArm, subjectName, studentCount, averageScore, passRate, passCount, failCount, missingCount }
      
      Implementation:
      - Query score_sheets joined with students, classes, subjects, terms
      - Filter by school_id, term_id, (optional) class_id, (optional) subject_id
      - Calculate pass rate using passing_percentage from cbt_exams or configured threshold (e.g., 40%)
      - Handle null scores gracefully (exclude from average, count as missing)
      
      Files: src/services/academic.service.ts
      Verify: Run queries with known data; confirm statistics match manual calculation (e.g., 10 students with scores [50, 60, 70, 80, 90] = avg 70, pass rate depends on threshold)

---

## Cross-Cutting Concerns

### Consistency & Multi-Tenancy
- Every page/service uses AuthService.getCurrentUser() or SchoolContextService to get school_id
- Every database query includes `eq('school_id', schoolId)` filter
- No hardcoded school IDs in code; no localStorage/sessionStorage fallback for school_id
- school_id resolved from authenticated user profile (source of truth)

### Error Handling
- All API endpoints return clear error messages (not generic "Failed")
- Student dashboard shows professional locked screen (not "account not linked" or tech errors)
- Results page dropdowns show loading state and error toast if API fails
- Academic page statistics gracefully handle missing data (show 0 or N/A, not error)

### Performance
- Use Supabase batch queries where possible (select multiple tables in one .select())
- Index queries on school_id, user_id, student_id, term_id, etc.
- Limit N+1 queries: avoid fetching individual student/class data in loops

---

## Implementation Order

1. **Fix Students Page School Context** (Part 1) — unlocks Students page
2. **Add StudentLockService + Lock/Unlock UI** (Part 2.1–2.3) — basic lock controls
3. **Enforce Lock on Student Dashboard** (Part 2.4) — locked screen
4. **Enforce Lock on Student APIs** (Part 2.5) — server-side protection
5. **Audit Results API Endpoints** (Part 3.1) — verify school_id scoping
6. **Fix Results Page Dropdowns** (Part 3.2) — dynamic filtering
7. **Create ResultService** (Part 4.1–4.2) — unified score handling
8. **Integrate ResultService into Results Page** (Part 4.3) — display merged scores
9. **Complete Academic Page** (Part 5.1–5.2) — dynamic statistics

---

## Testing Strategy

### Unit Tests
- StudentLockService: lockStudent/unlockStudent success/failure cases
- ResultService: upsert idempotency, source merging
- AcademicService: statistics calculations with edge cases (null scores, all passing, all failing)

### Integration Tests
- Lock a student → dashboard access blocked → unlock → dashboard access restored
- Results page: add manual score → verify appears in score_sheets; add CBT result → verify merges without duplication
- Academic page: change filters → statistics update correctly

### Manual Testing (on Vercel)
- Navigation: Staff page works → Students page works (no "not linked" error)
- Lock/Unlock: visible immediately in Students page; student cannot access dashboard when locked
- Results: all dropdowns populate from database; no hardcoded values; scores display with sources
- Academic: statistics refresh on filter change; no placeholder data

---

## Files to Create

1. `src/services/student-lock.service.ts` — lock/unlock operations
2. `src/services/result.service.ts` — unified score handling
3. `src/services/academic.service.ts` — statistics aggregation
4. `database/migrations/165_enhance_score_sheets_for_idempotent_upsert.sql` — schema enhancement

## Files to Modify

1. `src/app/school-admin/students/page.tsx` — fix school context, add lock/unlock UI
2. `src/app/student/dashboard/page.tsx` — enhance lock enforcement, show locked screen
3. `src/app/school-admin/results/page.tsx` — dynamic dropdowns, integrate ResultService
4. `src/app/school-admin/academic/page.tsx` — complete with dynamic data and filters
5. `src/app/api/student/**/route.ts` — add lock enforcement to all protected endpoints
6. `src/app/api/results/**/route.ts` — verify school_id scoping

## Build & Deploy

After each item:
```bash
npm run build
```

After all items complete:
```bash
npm run build
# Deploy to Vercel or staging
```

Test on live environment (Vercel) to confirm lock/unlock works without session cache issues.
