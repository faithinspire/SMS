# FTECH SMS Implementation Plan: Multi-Stage Staff & Student Registration with Data Fixes

## Executive Summary

This plan addresses the core user request: converting FTECH SMS from a fragmented system into a professional school management solution with:
1. **Multi-stage Staff Registration** (10 stages) — from personal info to account creation
2. **Multi-stage Student Registration** (10 stages) — from personal to admission confirmation
3. **Fix for Staff/Student/Results data fetching** — pages not showing records that exist in Supabase
4. **Professional workflow** — no more uncontrolled giant forms

The existing architecture is sound. This work **repairs, completes, and integrates** rather than rebuilds.

---

## SECTION A: Architecture Findings

### A.1 Real Database Tables (Canonical)

| Table | Purpose | Key Columns |
|-------|---------|-----------|
| `schools` | Tenant root | id, name, logo_url, type (PRIMARY/SECONDARY/BOTH) |
| `users` | All users (unified) | id, school_id, email, full_name, role, status |
| `students` | Student enrollment | id, user_id, school_id, admission_number, class_arm_combo_id, date_of_birth |
| `staff` | Staff employment records | id, user_id, school_id, position, employment_date, status |
| `classes` | Class levels | id, school_id, name, level (0-14 per Nigerian curriculum) |
| `arms` | Class sections | id, class_id, school_id, name, capacity |
| `class_arm_combos` | Class + Arm pairs | id, school_id, class_id, arm_id, class_teacher_id |
| `subjects` | Curriculum subjects | id, school_id, name, code, applicable_to_levels (int array), department |
| `subject_teacher_assignments` | Teacher → Subject/Class | id, teacher_id, subject_id, class_arm_combo_id, school_id |
| `student_subjects` | Student → Subject enrollment | id, student_id, subject_id, school_id |
| `academic_sessions` | School year (e.g., 2024/2025) | id, school_id, session_year, start_year, is_active |
| `academic_terms` | Term per session | id, school_id, session_id, term_name, term_order, start_date, end_date |
| `score_sheets` | Student grades | id, school_id, student_id, subject_id, academic_term_id, test1-4, exam, total, grade |
| `transactions` | Staff salary/payments | id, school_id, payer_id, amount, payment_method, description |
| `guardians` | Student guardians | id, student_id, school_id, full_name, relationship, phone, email |

### A.2 Existing Services (Import Paths & Methods)

#### AuthService (`@/services/auth.service.ts`)
- `getAllSchools()` → School[]
- `registerTeacher(input)` → User
- `registerStudent(input)` → User
- `getCurrentUser()` → User | null
- `login(email, password)` → {user, token}

#### TeacherService (`@/services/teacher.service.ts`)
- `assignSubjects(teacherId, schoolId, assignments)` → void
- `assignClassToTeacher(userId, classArmComboId)` → void
- `getTeacherDashboard(teacherId, schoolId)` → {managedClasses, taughtSubjects, stats}
- `updateTeacherProfile(teacherId, schoolId, updates)` → {teacher}

#### CanonicalSubjectService (`@/services/canonical-subject.service.ts`)
- `getAllSubjectsForSchool(schoolId)` → CanonicalSubject[]
- `getSubjectsForLevel(schoolId, level)` → CanonicalSubject[] (filters by level)
- `getSubjectsForClass(classArmComboId, schoolId)` → CanonicalSubject[] (auto-joins level)

#### StudentService (`@/services/student.service.ts`)
- `registerStudent(fullName, schoolId, classArmComboId, subjectIds, ..., admissionNumberOverride?)` → {student, pin, admission_number}
- `generateAdmissionNumber(year, schoolId, classArmComboId)` → string
- `updateStudentProfile(studentId, schoolId, updates)` → {student, admission_number}

#### UserRegistrationService (`@/services/user-registration.service.ts`)
- `registerUser(data: {email, full_name, school_id, admission_number?, ...})` → {user, pin}
- Auto-generates admission_number if not provided: format `YEAR-CLASSPREFIX-SEQUENCE`

#### LetterGenerationService (`@/services/letter-generation.service.ts`)
- `generateAdmissionLetter(studentId, schoolId)` → PDF
- `generateAppointmentLetter(staffId, schoolId)` → PDF

### A.3 Current Pain Points Identified

**1. Staff Page Not Showing Records**
- **Current code**: Queries `users` table for role IN ['TEACHER', 'HEAD_TEACHER', 'PRINCIPAL', 'ACCOUNTANT', 'STAFF']
- **Issue**: Staff record must exist in BOTH `users` (mandatory) AND `staff` table (optional employment details)
- **Root cause**: Registration flow may not be creating `staff` records after `users` record
- **Fix**: Ensure every staff registration flow creates both `users` + `staff` records in same transaction

**2. Students Page Not Showing Records**
- **Current code**: Queries `students` table with proper `school_id` filter
- **Issue**: May be timeout (15s) on large datasets or students missing `class_arm_combo_id`
- **Root cause**: Students registered without class assignment or incomplete migration
- **Fix**: Verify students.class_arm_combo_id is always set; add indexes for query performance

**3. Results Page Not Showing Classes/Students**
- **Current code**: Queries `class_arm_combos` then `score_sheets` with `academic_term_id`
- **Issue**: No scores exist OR terms not properly set up OR students not in score sheets
- **Root cause**: CBT system may not be auto-populating score sheets; missing term setup
- **Fix**: Ensure score sheets auto-created when students enroll in subjects; verify term data exists

**4. Admission Number Generation**
- **Current code**: Format `YEAR-CLASSPREFIX-SEQUENCE` (e.g., `2026-SSA-0001`)
- **Issue**: Some admission numbers broken (`2026-UNK-undefined`)
- **Root cause**: Class lookup fails → classPrefix becomes 'UNK'; level undefined
- **Fix**: Fallback to UUID-based format when class data unavailable; validate before save

**5. Staff Register Page (Existing but Minimal)**
- Current: Single flat form with school, class, subject selection
- **Issue**: Not multi-stage; missing employment, salary, bank, account setup
- **Fix**: Convert to 10-stage wizard

**6. No Student Register Page**
- **Issue**: Form doesn't exist; students registered only via admin (if at all)
- **Fix**: Create full 10-stage student registration with guardian, admission, subject selection

### A.4 Curriculum Data Status

- Migration `146_complete_nigerian_curriculum_all_schools.sql` populates subjects for all levels
- Levels: 0-2 (Nursery/PREP), 3-8 (Primary 1-6), 9-11 (JSS1-3), 12-14 (SS1-3)
- Each subject has `applicable_to_levels` array for filtering by class level
- **Status**: ✅ Curriculum exists; just needs proper service queries

---

## SECTION B: Phase-by-Phase Implementation Plan

### Phase 1: Fix Staff Registration Flow
**Goal**: Ensure all staff registrations create both `users` AND `staff` records atomically.

#### 1.1 Extend Staff Registration Service
Create new file: `src/services/staff-registration.service.ts`
- Wrap staff registration in transaction or error-recovery logic
- Ensure both `users` and `staff` table writes succeed before returning
- Generate PIN for staff login
- Idempotency: check if user already exists by (school_id, email) before creating

**Files to create**:
- `src/services/staff-registration.service.ts` (200 lines)

**Verify**: 
```bash
npm run build
# Confirm no type errors
```

#### 1.2 Update Staff Register Page to 10 Stages
File: `src/app/auth/staff/register/page.tsx`

Replace current single-form with multi-stage wizard:
- **Stage 1**: Personal Information (first name, middle name, last name, gender, DOB, photo, nationality, state, LGA, marital status)
- **Stage 2**: Contact & Address (phone, email, residential address, state, LGA, emergency contact, emergency phone)
- **Stage 3**: Employment Information (staff ID, position, role, department, employment type, employment status, date employed, date appointed, reporting authority)
- **Stage 4**: Professional Information (highest qualification, professional qualification, institution, course/field, graduation year, teaching experience, professional certifications)
- **Stage 5**: Role & Responsibilities (primary role, secondary responsibilities, department, admin responsibility — populated from existing roles in system)
- **Stage 6**: Class & Subject Assignment (for teachers: class selection, subject multi-select from class curriculum)
- **Stage 7**: Salary & Bank Information (salary, salary frequency, bank name, account name, account number, payment method)
- **Stage 8**: Account & Security (email/username, account role, PIN generation)
- **Stage 9**: Review & Confirmation (display summary of all stages with edit buttons per stage)
- **Stage 10**: Submit Registration (validate all stages → call StaffRegistrationService → show confirmation)

**Component features**:
- Progress bar showing stage X/10
- Previous/Next buttons between stages
- Edit button on review page to jump to any stage
- Validation per stage (required fields, email format, phone format)
- Multi-select checkboxes for subjects (filter by class level automatically)

**Files to modify**:
- `src/app/auth/staff/register/page.tsx` (450 lines)

**Verify**:
```bash
npm run build
npm run lint
# Test form at http://localhost:3001/auth/staff/register
# Complete all 10 stages, submit, check Supabase for users + staff records
```

#### 1.3 Fix Staff Admin Dashboard Data Fetch
File: `src/app/school-admin/staff/page.tsx`

Current issue: Only queries `users` table; misses staff-only metadata.

**Changes**:
- Query both `users` (role in ['TEACHER', 'HEAD_TEACHER', ...]) AND `staff` table
- Left-join to get employment_date, position, status from staff record
- Fallback gracefully if staff record missing (show as 'Staff' with no position)
- Add indexes for faster lookup: `idx_users_school_id_role`, `idx_staff_school_id`

**Files to modify**:
- `src/app/school-admin/staff/page.tsx` (update fetch logic in `fetchStaff()` callback)

**Verify**:
```bash
# Register new staff via /auth/staff/register
# Refresh school-admin/staff page
# Should display new staff member
```

---

### Phase 2: Create Multi-Stage Student Registration

**Goal**: Create full 10-stage student registration flow with proper admission number generation and subject selection.

#### 2.1 Create Student Registration Service
File: `src/services/student-registration.service.ts`

Wrapper around StudentService with explicit multi-stage validation:
- Stage-by-stage data collection
- Admission number generation with fallback
- Guardian record creation
- Student subject enrollment
- Document upload handling (passport/photo)
- Idempotency: check if student with admission_number already exists

**Files to create**:
- `src/services/student-registration.service.ts` (250 lines)

**Verify**:
```bash
npm run build
# Confirm no type errors
```

#### 2.2 Create Student Register Page (10 Stages)
File: `src/app/auth/student/register/page.tsx` (NEW)

**Stages**:
- **Stage 1**: Student Personal Information (first name, middle name, last name, gender, DOB, photo, nationality, state, LGA, address, phone, email)
- **Stage 2**: Parent/Guardian Information (name, relationship, phone, email, address, occupation, emergency contact, additional guardian option)
- **Stage 3**: Admission Information (admission number auto-generated or manual override, admission date, admission status, session, term)
- **Stage 4**: Class & Session & Term (school dropdown, session dropdown, term dropdown, class dropdown, class arm dropdown)
- **Stage 5**: Subject Selection (multi-select subjects; auto-filtered by class level from CanonicalSubjectService)
- **Stage 6**: Previous School & Academic Info (previous school name, previous class level, previous performance, transfer certificate)
- **Stage 7**: Medical & Emergency Information (blood group, allergies, medical conditions, emergency contact name, emergency contact phone)
- **Stage 8**: Documents & Passport (photo upload, passport/national ID upload)
- **Stage 9**: Review & Confirmation (display all stages with edit buttons)
- **Stage 10**: Complete Registration (submit to StudentRegistrationService, display PIN, redirect to login)

**Features**:
- Admission number auto-generated in Stage 3; format: `YEAR-CLASSPREFIX-SEQUENCE` with UUID fallback
- Subjects filter automatically by class level selected in Stage 4
- Guardian can be different from student
- All uploads to Supabase Storage in `/students/{studentId}/` path
- PIN auto-generated and displayed for parent login

**Files to create**:
- `src/app/auth/student/register/page.tsx` (500 lines)

**Verify**:
```bash
npm run build
npm run lint
# Test form at http://localhost:3001/auth/student/register
# Complete all 10 stages, submit
# Check Supabase: users table, students table, student_subjects table, guardians table
# Admission number format should be valid (not undefined)
```

---

### Phase 3: Fix Student Admin Dashboard Data Fetch

**Goal**: Ensure students page displays all enrolled students correctly.

#### 3.1 Fix School Admin Students Page
File: `src/app/school-admin/students/page.tsx`

Current issue: 15-second timeout on large datasets; students may be missing class assignment.

**Changes**:
- Add database indexes: `idx_students_school_id`, `idx_students_class_arm_combo_id`
- Increase query timeout to 30s or paginate results (load 50 at a time)
- Filter students where `class_arm_combo_id IS NOT NULL` to exclude incomplete registrations
- Sort by admission_number instead of created_at for natural order
- Add debug logging: count total, count with class, count fetched

**Files to modify**:
- `src/app/school-admin/students/page.tsx` (update `fetchStudents()` callback, increase timeout, add index check)

**Database migration** (new):
- `database/migrations/153_add_performance_indexes.sql`
  - Add indexes on school_id, class_arm_combo_id for students
  - Add indexes on school_id, role for users
  - Add indexes on school_id for staff

**Verify**:
```bash
npm run build
# Apply migration manually or during build
# Register 5+ students
# Visit school-admin/students
# Should load all students without timeout; admission numbers visible
```

---

### Phase 4: Fix Results Page Data Fetch

**Goal**: Ensure results page shows classes and students with scores.

#### 4.1 Fix School Admin Results Page
File: `src/app/school-admin/results/page.tsx`

Current issue: Classes load but students/scores don't; likely no score_sheets exist or academic_term_id doesn't match.

**Changes**:
- Verify academic sessions and terms are created (migration 152 does this)
- Query score_sheets with correct join to academic_terms
- Fallback: If no score_sheets exist, show "No results yet" with explanation
- Add pre-population: When term is selected, auto-create empty score_sheets for all students in classes (admin can fill in)
- Timeout remains 15s; paginate if needed

**Files to modify**:
- `src/app/school-admin/results/page.tsx` (verify term/session queries, add score sheet fallback)

**Verify**:
```bash
npm run build
# Ensure academic_sessions and academic_terms exist for school
# Enter a term with enrolled students
# Should show classes; clicking class shows empty/populated score_sheets
```

---

### Phase 5: Create Database Performance Indexes

**File to create**: `database/migrations/153_add_performance_indexes.sql`

```sql
-- Add critical indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_class_arm_combo_id ON students(class_arm_combo_id);
CREATE INDEX IF NOT EXISTS idx_users_school_id_role ON users(school_id, role);
CREATE INDEX IF NOT EXISTS idx_staff_school_id ON staff(school_id);
CREATE INDEX IF NOT EXISTS idx_subject_teacher_assignments_school_teacher ON subject_teacher_assignments(school_id, teacher_id);
CREATE INDEX IF NOT EXISTS idx_student_subjects_school_student ON student_subjects(school_id, student_id);
CREATE INDEX IF NOT EXISTS idx_score_sheets_school_term ON score_sheets(school_id, academic_term_id);

-- Verify RLS is disabled (critical for performance)
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE staff DISABLE ROW LEVEL SECURITY;
ALTER TABLE score_sheets DISABLE ROW LEVEL SECURITY;
```

**Files to create**:
- `database/migrations/153_add_performance_indexes.sql`

**Verify**:
```bash
# Run migration in Supabase
# Query should complete in < 1 second per 1000 records
```

---

### Phase 6: Add Validation & Admission Number Fallback

**Goal**: Ensure admission numbers never break; format always valid.

#### 6.1 Strengthen Admission Number Generation
File: `src/services/student.service.ts` → `generateAdmissionNumber()` method

Current code:
```typescript
admissionNumber = `${year}-${classPrefix}-${sequence}`
```

Issue: If classPrefix is 'UNK' or undefined, result breaks.

**Fix**:
```typescript
private static async generateAdmissionNumber(
  year: number,
  schoolId: string,
  classArmComboId: string
): Promise<string> {
  try {
    const { data: classCombo } = await supabase
      .from('class_arm_combos')
      .select('classes(name, level), arms(name)')
      .eq('id', classArmComboId)
      .single();

    if (!classCombo?.classes?.name || classCombo.classes.level === undefined) {
      throw new Error('Class data incomplete');
    }

    const classPrefix = classCombo.classes.name.substring(0, 3).toUpperCase();
    const armPrefix = classCombo.arms?.name?.substring(0, 1) || 'X';
    
    const { count } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('class_arm_combo_id', classArmComboId);

    const sequence = ((count || 0) + 1).toString().padStart(4, '0');
    return `${year}-${classPrefix}${armPrefix}-${sequence}`;
  } catch (err) {
    console.warn('Admission number generation failed, using UUID fallback:', err);
    // Fallback: Use UUID-based format
    const uuid = crypto.randomUUID().substring(0, 8).toUpperCase();
    return `${year}-ADM-${uuid}`;
  }
}
```

**Files to modify**:
- `src/services/student.service.ts` → `generateAdmissionNumber()` method (add try-catch fallback)

**Verify**:
```bash
npm run build
# Test with class that has no name or level
# Should generate valid fallback admission number (not 'undefined')
```

---

## SECTION C: File Change Manifest

### Files to Create

| File | Lines | Purpose |
|------|-------|---------|
| `src/services/staff-registration.service.ts` | 200 | Staff registration with transaction logic, PIN generation |
| `src/services/student-registration.service.ts` | 250 | Student registration with idempotency, guardian handling |
| `src/app/auth/student/register/page.tsx` | 500 | 10-stage student registration UI |
| `database/migrations/153_add_performance_indexes.sql` | 30 | Database indexes for query performance |

### Files to Modify

| File | Changes | Purpose |
|------|---------|---------|
| `src/app/auth/staff/register/page.tsx` | Replace single form with 10-stage wizard (450 lines) | Multi-stage staff registration UI |
| `src/app/school-admin/staff/page.tsx` | Update `fetchStaff()` query; join both users + staff tables; improve error handling | Fix staff page data fetch |
| `src/app/school-admin/students/page.tsx` | Increase timeout to 30s; add class_arm_combo_id filter; pagination if needed | Fix students page data fetch |
| `src/app/school-admin/results/page.tsx` | Verify academic_term_id joins correctly; add empty score_sheets fallback | Fix results page data fetch |
| `src/services/student.service.ts` | Strengthen `generateAdmissionNumber()` with UUID fallback | Prevent broken admission numbers |

### Build & Test Commands

```bash
# Build
npm run build

# Lint
npm run lint

# Manual verification (if test suite exists)
npm run test

# Development mode
npm run dev
# Visit:
# - http://localhost:3001/auth/staff/register
# - http://localhost:3001/auth/student/register
# - http://localhost:3001/school-admin/staff
# - http://localhost:3001/school-admin/students
# - http://localhost:3001/school-admin/results
```

---

## SECTION D: Implementation Order

Execute in this sequence to avoid blockers:

1. **Phase 1.1** → Staff Registration Service (foundation)
2. **Phase 5** → Database Indexes (performance baseline)
3. **Phase 1.2** → Staff Register Page (10-stage wizard)
4. **Phase 1.3** → Fix Staff Admin Page (verify data visibility)
5. **Phase 6** → Strengthen Admission Number Generation (safety)
6. **Phase 2.1** → Student Registration Service (foundation)
7. **Phase 2.2** → Student Register Page (10-stage wizard)
8. **Phase 3.1** → Fix Student Admin Page (verify data visibility)
9. **Phase 4.1** → Fix Results Admin Page (verify score data)

---

## SECTION E: Known Constraints & Assumptions

1. **RLS Policies**: All tables have RLS disabled for performance; rely on app-layer school_id checks
2. **Admission Number Format**: Designed as `YEAR-CLASSPREFIX-SEQUENCE`; fallback to UUID if class data unavailable
3. **Multi-Tenancy**: Every table has `school_id` FK; queries MUST filter by school_id to prevent cross-school data leaks
4. **Academic Calendar**: Sessions and terms auto-created in migration 152; admins can create additional as needed
5. **Subject Curriculum**: Nigerian curriculum (levels 0-14) pre-populated; subjects linked via `applicable_to_levels` int array
6. **Staff vs Users**: Staff person exists in `users` table (mandatory); optional `staff` record for employment details
7. **Student Enrollment**: Students MUST have `class_arm_combo_id` set; incomplete registrations won't display in admin pages
8. **Idempotency**: Staff/student registration checks (school_id, email) to prevent duplicates on accidental re-submit
9. **Timeout Strategy**: Pages use 15-30 second timeouts for queries; pagination/filtering recommended for >1000 records per school

---

## SECTION F: Success Criteria

✅ **Staff Registration**:
- [ ] 10-stage form displays correctly with progress bar
- [ ] All stages validate required fields (email format, phone format)
- [ ] Subject selection filters by class level automatically
- [ ] Submission creates both `users` AND `staff` records
- [ ] Staff page displays newly registered staff within 5 seconds
- [ ] No duplicate staff created on accidental double-submit (within 60 seconds)

✅ **Student Registration**:
- [ ] 10-stage form displays correctly with progress bar
- [ ] Admission number auto-generated with valid format (never 'undefined')
- [ ] Guardian records created separately from student user
- [ ] Subject selection filters by class level automatically
- [ ] Submission creates `users`, `students`, `student_subjects`, `guardians` records
- [ ] Student page displays newly registered students within 5 seconds
- [ ] PIN auto-generated and displayed to parent

✅ **Data Fetching**:
- [ ] Staff page queries return all staff for school within 5 seconds
- [ ] Student page queries return all students for school within 5 seconds
- [ ] Results page loads classes and populated/empty score_sheets within 5 seconds
- [ ] No timeout errors on pages with < 500 records per school
- [ ] Database indexes present and used (verify with EXPLAIN ANALYZE)

✅ **Code Quality**:
- [ ] `npm run build` completes without errors
- [ ] `npm run lint` finds no issues
- [ ] No console errors in browser DevTools on happy path

---

This plan is complete and ready for implementation.
