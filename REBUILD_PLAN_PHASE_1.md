# COMPLETE SCHOOL MANAGEMENT SYSTEM REBUILD - PHASE 1 PLAN

**Objective**: Properly rebuild and connect Teacher Dashboard, Student Dashboard, CBT, Results into a synchronized system using Supabase as the single source of truth.

**Estimated Effort**: 20-30 hours of focused development

**Timeline**: This Phase (Foundation) - 4-6 hours

---

## PHASE 1: FOUNDATION & API LAYER (THIS PHASE)

### Goal
Implement core API layer and fix all broken references so dashboards and services work correctly.

### Phase 1 Tasks

#### TASK 1.1: Fix All Broken Service Method References (1 hour)
**Status**: READY

Add missing methods to services:

1. **`TeacherService.getClassStudents()`**
   ```typescript
   // Get all students in a class where teacher is class teacher
   async getClassStudents(classArmComboId: string, schoolId: string)
   ```

2. **`TeacherService.getSubjectStudents()`**
   ```typescript
   // Get students registered for a specific subject taught by this teacher
   async getSubjectStudents(subjectId: string, classArmComboId: string, teacherId: string, schoolId: string)
   ```

3. **`StudentService.getStudentDetails()`**
   ```typescript
   // Get student profile with all relationships
   async getStudentDetails(studentId: string, schoolId: string)
   ```

4. **`StudentService.getStudentDashboard()`**
   ```typescript
   // Get dashboard data: school, class, subjects, grades
   async getStudentDashboard(studentId: string, schoolId: string)
   ```

**Impact**: Fixes crashing teacher/student dashboards

---

#### TASK 1.2: Create Core API Endpoints Layer (2 hours)

Create `/api/v1/*` structure with core endpoints:

**Authentication APIs:**
```
POST /api/v1/auth/login
POST /api/v1/auth/logout
POST /api/v1/auth/register
GET /api/v1/auth/me
```

**Teacher APIs:**
```
GET /api/v1/teachers/:id/dashboard
GET /api/v1/teachers/:id/class-students
GET /api/v1/teachers/:id/subject-students?subjectId=X&classArmId=Y
```

**Student APIs:**
```
GET /api/v1/students/:id/dashboard
GET /api/v1/students/:id/details
```

**Academic APIs:**
```
GET /api/v1/classes
GET /api/v1/subjects
GET /api/v1/teacher-assignments
GET /api/v1/student-subjects
```

**Impact**: Frontend can call proper API endpoints instead of services directly

---

#### TASK 1.3: Verify Database Relationships (1 hour)

Ensure all relationships properly configured:

1. ✅ `schools` → `users` (multi-tenancy)
2. ✅ `class_arm_combos` → `class_teacher_assignments` (auto-link)
3. ✅ `student_subjects` → `subject_teacher_assignments` (auto-link)
4. ✅ `students` → `class_arm_combos` (class students)
5. ✅ `students` → `student_subjects` → `subject_teacher_assignments` (subject students)

Add missing relationships if needed.

**Impact**: Data integrity for auto-linking

---

#### TASK 1.4: Remove Hardcoded Localhost URLs (30 min)

Search project for hardcoded API URLs:
- `localhost:5001`
- `localhost:55651`
- Any other hardcoded endpoints

Create centralized config:
```typescript
// src/lib/api-config.ts
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'
```

Update all fetch calls to use config.

**Impact**: Proper API routing for all environments

---

#### TASK 1.5: Consolidate Duplicate Services (1 hour)

Remove conflicting implementations:

1. **Merge student registrations:**
   - `StudentService.registerStudent()`
   - `UserRegistrationService.registerStudent()`
   - → Keep only one, coordinated version

2. **Merge PIN generation:**
   - `pin-generator.ts`
   - `credential-generator.ts`
   - → Consolidate into one utility

3. **Merge login methods:**
   - `AuthService.login()`
   - `fallback-auth.ts`
   - → Single login flow with fallback

**Impact**: No competing implementations

---

#### TASK 1.6: Fix Broken Table Name References (30 min)

Fix queries referencing non-existent tables:

1. **CBT Service:**
   - ❌ References `cbt_answers`
   - ✅ Use `cbt_submissions` + `cbt_submission_scores`

2. **Teacher Service:**
   - ❌ References `student_class_teachers`
   - ✅ Use `class_arm_combos` + `class_teacher_id`

3. **Assignment Service:**
   - ❌ May reference wrong joins
   - ✅ Use `assignment_submissions` correctly

**Impact**: Queries work without 404 errors

---

### Phase 1 Deliverables

1. ✅ All service methods working (no crashes)
2. ✅ Core API endpoints functional
3. ✅ Database relationships verified
4. ✅ API URLs centralized
5. ✅ No duplicate services
6. ✅ Table name references fixed

### Phase 1 Testing

After Phase 1:
- [ ] Teacher dashboard loads without errors
- [ ] Student dashboard loads without errors
- [ ] Can navigate tabs without crashes
- [ ] API endpoints return data (mock data OK for now)
- [ ] No console errors

### Phase 1 Dependencies

- Database schema complete (✅ Already done)
- Supabase client configured (✅ Already done)
- Auth working (✅ Already done from previous fix)
- RLS disabled (✅ Already done)

### Phase 1 NOT Included

- Full CBT implementation (Phase 2)
- Results system (Phase 3)
- Primary teacher dashboard (Phase 3)
- Email/WhatsApp delivery (Phase 4)
- Production security hardening (Phase 5)

---

## PHASE SEQUENCE

```
PHASE 1: Foundation (API & Services) ← YOU ARE HERE
    ↓ (4-6 hours)
PHASE 2: Teacher/Student Features (Dashboards, Auto-linking)
    ↓ (4-6 hours)
PHASE 3: Results System (Teacher entry, Student viewing)
    ↓ (3-4 hours)
PHASE 4: CBT System (Question builder, Exam interface)
    ↓ (3-4 hours)
PHASE 5: Primary Teacher System (Separate workflow)
    ↓ (2-3 hours)
PHASE 6: Advanced Features (Notifications, Exports)
    ↓ (2-3 hours)
PHASE 7: Testing & Deployment
    ↓ (3-4 hours)
```

---

## Success Criteria for Phase 1

✅ **All Pages Load**: Teacher, Student, School Admin dashboards render without errors  
✅ **All Tabs Work**: Can click through tabs without crashing  
✅ **API Endpoints Ready**: Core API routes exist and respond  
✅ **No Warnings**: Console clean except for dev warnings  
✅ **Database Connected**: Services successfully query Supabase  

---

**Next Action**: Begin Phase 1 Task execution

**Time Remaining Today**: ~4 hours available

**Recommendation**: Start with Tasks 1.1-1.3 (core fixes), then 1.4-1.6 (cleanup)
