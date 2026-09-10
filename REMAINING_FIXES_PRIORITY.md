# Remaining Fixes - Priority & Execution Plan

**Status**: 10/26 tasks complete, 3 critical blockers fixed  
**Date**: August 28, 2026  
**Scope**: 16 more fixes required (migrations + functional + testing)  

---

## PHASE 1: DATABASE FOUNDATIONS (Tasks 11-13) ✅ READY

### Task 11: Database Schema Migrations
**Status**: All migrations created, ready to execute

Files created:
- `049_add_academic_session_to_scores.sql` ✅
- `050_expand_subjects_schema.sql` ✅
- `051_expand_students_schema.sql` ✅
- `052_populate_comprehensive_subjects.sql` ✅

**Action**: Run all 4 migrations in Supabase SQL Editor in order

**Verification**: 
- [ ] Check academic_sessions table exists
- [ ] Check score_sheets has new columns
- [ ] Check students has gender, section fields
- [ ] Count subjects by school/level

---

## PHASE 2: VERIFY EXISTING FUNCTIONS (Tasks 12-13)

### Task 12: Verify Teacher Registration (No changes needed yet)
**File**: `/src/services/user-registration.service.ts` → `registerTeacher()`
**Current State**: ✅ WORKING
- Creates auth user ✓
- Calls TeacherService.assignSubjects() ✓
- Subject-teacher assignments created immediately ✓

**Verification**:
- [ ] Register teacher with subjects
- [ ] Check subject_teacher_assignments table
- [ ] Teacher appears in dashboard

### Task 13: Verify Student Registration (BLOCKER 1 FIX already applied)
**File**: `/src/services/user-registration.service.ts` → `registerStudent()`
**Current State**: ✅ FIXED (BLOCKER 1)
- Creates auth user ✓
- Creates student record with class_arm_combo_id ✓
- Creates subject enrollments WITH teacher linking ✓ (BLOCKER 1 fix)
- Query for academic session ✓ (BLOCKER 2 fix)

**Verification**:
- [ ] Register student with subjects
- [ ] Check student_subjects has subject_teacher_id populated
- [ ] Check student appears in teacher dashboard
- [ ] Check subject teacher is correct

---

## PHASE 3: SESSION/TERM FIXES (Task 14)

### Task 14: Fix Session/Term Fields & Storage
**Current Issues**:
1. Session field read-only in forms
2. No way to select academic_session during score entry
3. Results not grouped by session

**Changes Needed**:

#### A. Update score entry forms
**Files to modify**:
- `/src/app/teacher/[school-id]/scores/page.tsx` (if exists)
- Any score entry modal/component

**Add to forms**:
```typescript
// Add academic session dropdown
const { data: sessions } = await supabase
  .from('academic_sessions')
  .select('*')
  .eq('school_id', school_id)
  .order('start_year', { ascending: false })

// Let teacher select session (default to current)
<select name="academic_session_id">
  {sessions?.map(session => (
    <option value={session.id} selected={session.is_current}>
      {session.session_string}
    </option>
  ))}
</select>
```

#### B. Update API endpoints to accept academic_session_id
**Already done**:
- `/api/subject-scores` ✅ (added session tracking)
- `/api/student/cbt/submit` ✅ (added session tracking)

#### C. Update results filtering
**Files to modify**:
- `/src/app/api/student/results/route.ts`
- `/src/app/api/student/report-card/route.ts`

**Change**:
```typescript
// BEFORE: Only filter by term
.eq('term_id', termId)

// AFTER: Filter by term AND session (if provided)
.eq('term_id', termId)
.eq('academic_session_id', sessionId)  // Optional filter
```

**Timeline**: 1-1.5 hours

---

## PHASE 4: FIX CRITICAL BROKEN ENDPOINTS (Tasks 15-16)

### Task 15: Fix Student Edit Endpoint
**Current State**: `/api/school-admin/students/[id]` returns 400 error

**Issue**: Likely incorrect query or missing field mapping

**Files to check/fix**:
1. `/src/app/api/school-admin/students/[id]/route.ts`
   - GET: Fetch student details
   - PATCH: Update student details

**What to fix**:
- Verify query joins students + users correctly
- Ensure all fields returned match Student type
- Add error handling for missing fields
- Verify update payload maps to database columns

**Expected endpoint behavior**:
```typescript
// GET /api/school-admin/students/[id]
// Returns: { id, user_id, admission_number, class_arm_combo_id, subjects, ... }

// PATCH /api/school-admin/students/[id]
// Accepts: { admission_number, class_arm_combo_id, subjects, parent_name, ... }
// Returns: Updated student object
```

**Timeline**: 45 minutes - 1 hour

### Task 16: Fix Student Photo Upload
**Current State**: Endpoint exists but may not work properly

**Files to fix**:
1. `/src/app/api/upload/student-photo/route.ts`

**Changes needed**:
1. Verify Supabase storage bucket permissions
   - Bucket: `student-photos` (or similar)
   - Public read access for images
   - Authenticated write access

2. Fix upload validation
   - File size limits (e.g., 5MB)
   - File type checking (jpg, png, jpeg)
   - Virus scan (optional)

3. Return proper file URL
   - Store in students.photo_url
   - Return public URL for display

4. Implement cleanup
   - Delete old photo when new one uploaded
   - Handle failed uploads

**Timeline**: 1-1.5 hours

---

## PHASE 5: DOCUMENT GENERATION (Tasks 17-18)

### Task 17: Build Admission Letter
**Current State**: Template exists but uses hardcoded data

**Changes needed**:

**File**: `/src/app/api/documents/admission-letter/route.ts` (if exists, or create new)

**What to fetch**:
```typescript
// Get school details
const school = await supabase.from('schools').select('*').eq('id', school_id).single()

// Get student details
const student = await supabase.from('students').select('*, users!inner(*)').eq('id', student_id).single()

// Get class details
const classCombo = await supabase.from('class_arm_combos').select('*, classes(name), arms(name)').eq('id', student.class_arm_combo_id).single()

// Get school fee configuration
const schoolFee = await supabase.from('school_fees').select('*').eq('school_id', school_id).single()
```

**Letter should include**:
- School logo and letterhead
- Student full name, admission number, class
- Registration date
- School fees and payment terms
- Rules and code of conduct
- Principal/Admin signature line

**Output**: PDF via server response or Supabase storage

**Timeline**: 2 hours

### Task 18: Build Staff Appointment Letter
**Similar to admission letter**

**What to fetch**:
```typescript
// Get school details
const school = ...

// Get staff details
const staff = await supabase.from('users').select('*').eq('id', staff_id).single()

// Get salary information (from registration or staff table)
const salary = ...
```

**Letter should include**:
- School letterhead
- Staff name, position, department
- Appointment date
- Monthly salary
- Employment terms
- Code of conduct
- Principal signature line

**Timeline**: 1.5-2 hours

---

## PHASE 6: DASHBOARD VISIBILITY FIXES (Tasks 19-20)

### Task 19: Primary Teacher-Student Visibility
**Current State**: Teacher dashboard may not show students properly

**File**: `/src/app/teacher/[school-id]/dashboard/page.tsx` (or similar)

**Fix**:
1. Query: Get all students in teacher's assigned class
```typescript
// Get teacher's class (via class_arm_combos.class_teacher_id)
const { data: classCombo } = await supabase
  .from('class_arm_combos')
  .select('id')
  .eq('class_teacher_id', teacher_id)
  .single()

// Get students in that class
const { data: students } = await supabase
  .from('students')
  .select('*, users(!inner(*)), student_subjects(*, subjects(name))')
  .eq('class_arm_combo_id', classCombo.id)
```

2. Display without requiring search
3. Add filter by subject (if subject teacher)

**Timeline**: 45 minutes

### Task 20: Secondary Class/Subject Teacher Filtering
**File**: Same teacher dashboard

**Fix**:
```typescript
// For class teachers (teach a class):
// → Show: All students in the class
// → Filter: Can view by subject

// For subject teachers (teach a subject):
// → Show: Only students taking that subject
// → Filter: By class (if multiple classes teaching same subject)

// Show both views with clear tabs/filters
<Tabs>
  <Tab label="My Class"> {/* Class teacher view */} </Tab>
  <Tab label="My Subjects"> {/* Subject teacher view */} </Tab>
</Tabs>
```

**Timeline**: 1 hour

---

## PHASE 7: API CONSOLIDATION (Task 21)

### Task 21: Consolidate Duplicate Endpoints

**Current duplicates**:
1. `/api/teacher/students/subject` vs `/api/teacher/subject-students`
   - Both return: Students taking a subject
   - Action: Keep `/api/teacher/subject-students` (canonical)
   - Delete: `/api/teacher/students/subject`

2. `/api/teacher/students/class` vs `/api/teacher/class-students`
   - Both return: Students in a class
   - Action: Keep `/api/teacher/class-students` (canonical)
   - Delete: `/api/teacher/students/class`

**Process**:
1. Search codebase for calls to old endpoints
2. Update all references to use canonical endpoints
3. Delete old route files
4. Update API documentation

**Files to modify**:
- `/src/app/api/teacher/students/[subject-or-class]/route.ts` → DELETE
- All components calling these endpoints

**Timeline**: 1-1.5 hours

---

## PHASE 8: TESTING (Tasks 22-26)

### Task 21: TEST 1 - Primary School Flow
**Setup**:
1. Create school: "Sunshine Primary", type=PRIMARY
2. Register teacher: "Mrs. Johnson", class=Primary 3A
3. Register student: "John Smith", class=Primary 3A, subjects=[English, Math]

**Tests**:
- [ ] Student created in students table with class_arm_combo_id
- [ ] Student subjects in student_subjects with subject_teacher_id populated
- [ ] Teacher dashboard shows John under "My Class"
- [ ] John's subjects show correct teacher names
- [ ] Teacher enters score for John in Math
- [ ] Score appears in score_sheets with academic_session_id set
- [ ] John sees score in his results
- [ ] Session is correctly identified (2026/2027)

**Timeline**: 45 minutes

### Task 22: TEST 2 - Secondary School Flow
**Setup**:
1. Create school: "Central Secondary", type=SECONDARY
2. Register class teacher: "Mr. Ahmed", class=SS1A
3. Register subject teacher: "Mrs. Eze", subject=Mathematics (SS1A)
4. Register student: "Jane Okoro", class=SS1A, subjects=[Math, Physics, English]

**Tests**:
- [ ] Class teacher (Mr. Ahmed) sees Jane in "My Class"
- [ ] Subject teacher (Mrs. Eze) sees Jane ONLY in Math, not Physics
- [ ] Physics teacher does NOT see Jane
- [ ] Each teacher can enter scores
- [ ] Scores filtered correctly by teacher+subject
- [ ] Jane sees all her scores in results

**Timeline**: 1 hour

### Task 23: TEST 3 - Session/Term Separation
**Tests**:
- [ ] Switch to "2026/2027" session → shows current scores
- [ ] Switch to "2027/2028" session → shows no scores (future)
- [ ] Add academic_session_id to existing scores (via script)
- [ ] Filter by session works in reports

**Timeline**: 30 minutes

### Task 24: TEST 4 - Student Editing
**Tests**:
- [ ] Load student edit page
- [ ] Change class: Primary 3A → Primary 3B
- [ ] Change subjects: +Science, -Math
- [ ] Save changes
- [ ] Verify: student_subjects updated
- [ ] Verify: New teacher links created
- [ ] Verify: Old teacher links removed

**Timeline**: 45 minutes

### Task 25: TEST 5 - Document Generation
**Tests**:
- [ ] Generate admission letter
  - Shows real school name, logo
  - Shows student name, admission number, class
  - Shows school fees (not placeholder)
  - PDF downloads without errors
- [ ] Generate staff appointment letter
  - Shows staff name, position
  - Shows monthly salary (not placeholder)
  - PDF downloads without errors

**Timeline**: 1 hour

---

## FINAL PHASE: CLEANUP (Task 26)

### Task 26: Codebase Cleanup
**Actions**:
1. Remove hardcoded values
2. Remove dead code/dead routes
3. Remove deprecated bridge table code
4. Add documentation comments
5. Verify no UUIDs/undefined in UI

**Timeline**: 1-2 hours

---

## TOTAL ESTIMATED TIME

```
Phase 1-2: Database + Verification     = 2 hours
Phase 3: Session/Term Fixes            = 1.5 hours
Phase 4: Fix Endpoints                 = 2.5 hours
Phase 5: Document Generation           = 4 hours
Phase 6: Dashboard Visibility          = 2 hours
Phase 7: API Consolidation             = 1.5 hours
Phase 8: Testing (5 comprehensive)     = 4 hours
Phase 9: Cleanup                       = 2 hours
─────────────────────────────────────
TOTAL:                                 = ~20 hours
```

---

## EXECUTION SEQUENCE RECOMMENDATION

**Day 1**: 
- Run all 4 migrations
- Verify schema changes
- Tasks 12-13 verification

**Day 2**:
- Tasks 14 (Session/Term)
- Tasks 15-16 (Broken endpoints)

**Day 3**:
- Tasks 17-18 (Documents)
- Tasks 19-20 (Dashboards)

**Day 4**:
- Task 21 (API Consolidation)
- Tasks 22-25 (Testing)
- Task 26 (Cleanup)

---

**READY TO PROCEED** ✅
