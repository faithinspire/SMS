# 🔧 REPAIR EXECUTION PLAN - Full System Rebuild

**Start Date**: August 12, 2026  
**Expected Completion**: 15-20 hours work  
**Approach**: Priority-based repair with testing at each stage

---

## EXECUTION PHASES

### PHASE 1: CRITICAL FIXES (MUST DO FIRST)

These block the entire system from functioning correctly.

#### 1.1: FIX TEACHER REGISTRATION (2 hours)

**Current State**: Public teacher registration missing class/subject selection

**Files to Modify**:
- `/src/app/auth/staff/register/page.tsx` - Add UI for class + subject
- OR replace with modal-based flow
- Ensure proper data loading and validation

**Steps**:
1. Read current teacher registration file
2. Trace the flow to AuthService.registerTeacher()
3. Compare with TeacherRegistrationModal to see correct pattern
4. Add class selection (query from class_arm_combos)
5. Add subject multi-select (query from subjects table)
6. Ensure subjects filtered by class level (applicable_to_levels)
7. Verify teacher bridge tables created (subject_teacher_assignments)
8. Test registration creates complete teacher record

**Expected DB State After**:
- users table: teacher record with TEACHER role
- staff table: teacher staff record
- subject_teacher_assignments: populated with 3-5 subjects
- class_arm_combos: class_teacher_id updated

**Test**: Register teacher, verify dashboard shows correct class + subjects

---

#### 1.2: REMOVE "NO SUBJECT AVAILABLE" BY FIX ING DATA SOURCE (1 hour)

**Current State**: Subject queries fail due to:
1. Empty applicable_to_levels array
2. Subjects not filtered by school_id
3. Hardcoded fallback used instead of querying DB

**Files to Modify**:
- `/src/services/registration-config.service.ts` - Subject loading
- `/src/components/admin/StudentRegistrationModal.tsx` - Subject display
- `/src/components/admin/TeacherRegistrationModal.tsx` - Subject display

**Steps**:
1. Check `applicable_to_levels` population in migration 015
2. If empty, update via API or fix query
3. Verify subject query filters by:
   - school_id
   - applicable_to_levels (matches selected class level)
   - type (PRIMARY, SECONDARY)
4. Test class selection → immediate subject load
5. Verify no hardcoded fallback

**Test**: Select SS1 → See all SS1 subjects. Select JSS1 → See all JSS1 subjects.

---

#### 1.3: FIX TEACHER RESULTS PAGE (3 hours)

**Current State**: "Coming soon..." placeholder

**Files to Modify**:
- `/src/app/teacher/results/page.tsx` - Complete implementation
- Create new service: `/src/services/result.service.ts` if needed
- Query from: students, score_sheets, cbt_submissions tables

**Implementation Steps**:

1. **List Students by Class/Subject**:
   ```
   Teacher selects:
   - Class (dropdown)
   - Subject (optional dropdown)
   - Filters to only students in that class/subject
   ```

2. **Score Entry**:
   ```
   For each student:
   - Test 1 (0-10)
   - Test 2 (0-10)
   - Test 3 (0-10)
   - Test 4 (0-10)
   - Exam (0-60)
   - Auto-calculate total
   - Save to score_sheets table
   ```

3. **Score View**:
   ```
   Display table:
   Student | Test1 | Test2 | Test3 | Test4 | Exam | Total | Grade
   ```

4. **Grade Calculation**:
   ```
   From mark_configuration:
   90-100: A
   80-89: B
   70-79: C
   60-69: D
   Below 60: F
   ```

5. **Database Integration**:
   ```
   INSERT/UPDATE into score_sheets:
   - school_id
   - student_id
   - subject_id
   - term_id
   - test1, test2, test3, test4, exam
   - grade (calculated)
   ```

**Test**: Enter scores, verify saved, verify grade calculated, verify student sees score

---

#### 1.4: FIX SUBJECT LOADING IN ALL REGISTRATION (1 hour)

**Current State**: Mix of constants and database queries

**Files to Modify**:
- `/src/constants/nigerian-subjects.ts` - Keep for reference only
- `/src/app/auth/student/register/page.tsx` - Use DB not constants
- `/src/app/auth/staff/register/page.tsx` - Use DB not constants
- All modals - Ensure consistent DB usage

**Steps**:
1. Identify where hardcoded constants used
2. Replace with `RegistrationConfigService.getSubjectsForLevel()`
3. Ensure queries filter by:
   - school_id
   - class level
   - applicable_to_levels
4. Test with multiple schools (ensure no cross-school data)
5. Verify cache/refresh behavior

**Test**: New school with no subjects → "No subjects configured". After setup → subjects appear.

---

### PHASE 2: COMPLETE MISSING DASHBOARDS (HIGH PRIORITY)

#### 2.1: IMPLEMENT PRINCIPAL DASHBOARD (2 hours)

**Current State**: Basic stats only

**Files to Modify**:
- `/src/app/principal/dashboard/page.tsx` - Complete implementation
- Create services if needed:
  - `/src/services/lesson-note.service.ts`
  - `/src/services/principal.service.ts`

**Required Sections**:

1. **Lesson Notes Review**:
   ```
   Table: All lesson notes from teachers
   Columns: Teacher | Subject | Class | Date | Status
   Status Options: Submitted | Under Review | Approved | Returned
   Actions: Approve | Return (with comment) | View
   ```

2. **Student Management**:
   ```
   Lists all students in school
   Filters: Class | Section | Status
   Actions: View | Suspend | Reactivate
   ```

3. **Staff Management**:
   ```
   All teachers and staff
   Filters: Role | Class | Subject | Status
   ```

4. **Broadcast Messages**:
   ```
   Create announcements
   Recipients: All | Teachers | Specific class | Role-based
   View sent/unread count
   ```

5. **Academic Records**:
   ```
   Summary by class
   Statistics: Students | Avg marks | Pass rate
   Top performers
   Need improvement
   ```

**Database Tables Used**:
- lesson_notes
- students
- staff / users (where role=TEACHER)
- announcements
- score_sheets

**Test**: Login as principal, see all sections functional, can approve lesson notes

---

#### 2.2: FIX HEADMASTER DASHBOARD (1 hour)

**Current State**: Copy-paste of principal

**Decision**: Keep as alias to principal (same role, same access) OR split into primary-specific view

**For Now**: Make it identical to principal (acceptable until Primary school specific requirements emerge)

**Files**:
- `/src/app/headmaster/dashboard/page.tsx` - Either same as principal or redirect to principal

---

#### 2.3: IMPLEMENT ACCOUNTANT DASHBOARD (3 hours)

**Current State**: Empty stub

**Files to Modify**:
- `/src/app/accountant/dashboard/page.tsx` - Complete implementation
- Create service: `/src/services/payment.service.ts` if doesn't exist
- Create service: `/src/services/salary.service.ts` if doesn't exist

**Required Sections**:

1. **Payment Recording**:
   ```
   Form to record student payments:
   - Student (dropdown with admission numbers)
   - Amount
   - Payment method (Cash | Bank Transfer | Card | Online)
   - Fee structure (if applicable)
   - Invoice/receipt number
   - Save to payments table
   - Auto-generate receipt
   ```

2. **Receipt Management**:
   ```
   List all receipts
   Status: Sent | Pending
   Actions: Resend | Download | Delete draft
   ```

3. **Staff Salary Management**:
   ```
   - View staff list (with salaries configured)
   - Enter salary amount
   - Select payment period
   - Mark as paid
   - Generate payslip
   - Email payslip to staff
   ```

4. **Financial Reports**:
   ```
   - Total collected
   - Pending payments
   - Staff salary payout schedule
   - Outstanding fees by class
   - Charts/graphs
   ```

5. **Fee Configuration**:
   ```
   - View configured fees
   - View applicable classes
   - Mandatory vs optional
   - Due dates
   ```

**Database Tables**:
- payments
- receipts
- salaries
- payslips
- fee_structures

**Test**: Record payment, generate receipt, enter staff salary, generate payslip

---

### PHASE 3: CONSOLIDATE DUPLICATE IMPLEMENTATIONS (HIGH PRIORITY)

#### 3.1: MERGE STUDENT REGISTRATION FLOWS (2 hours)

**Current State**: Two separate implementations with different data sources

**Target State**: Single unified registration service

**Steps**:
1. Create unified StudentRegistrationService
2. Single form component (combine best UX from both)
3. Always fetch from database
4. Remove constants fallback
5. Both public and admin use same service
6. Ensure consistent behavior

**Files to Modify**:
- `/src/app/auth/student/register/page.tsx` - Simplified to use service
- `/src/components/admin/StudentRegistrationModal.tsx` - Update to use new service
- Create: `/src/services/student-registration.service.ts` - Unified logic

---

#### 3.2: MERGE TEACHER REGISTRATION FLOWS (2 hours)

**Current State**: Two separate implementations

**Target State**: Single unified registration service

**Steps**:
1. Create unified TeacherRegistrationService
2. Single form component with all fields
3. Both public and admin routes use same service
4. Always query database for classes/subjects
5. Verify bridge tables created (subject_teacher_assignments)
6. Ensure consistent validation

**Files to Modify**:
- `/src/app/auth/staff/register/page.tsx` - Add missing fields
- `/src/components/admin/TeacherRegistrationModal.tsx` - Update to use unified service
- Create: `/src/services/teacher-registration.service.ts` - Unified logic

---

### PHASE 4: ADD GLOBAL ROUTE PROTECTION (1 hour)

#### 4.1: Create middleware.ts

**Current State**: No global route protection

**Target State**: All routes protected by JWT validation

**File to Create**: `/src/middleware.ts`

```typescript
// Middleware checks:
1. Extract JWT from request
2. Validate JWT signature
3. Check role-based access
4. Redirect unauthorized users
5. Add school_id to request context
```

**Protected Routes**:
- All /student/* routes
- All /teacher/* routes
- All /principal/* routes
- All /school-admin/* routes
- All /accountant/* routes
- All /superadmin/* routes

**Unprotected Routes**:
- /landing
- /auth/...
- /api/health

---

### PHASE 5: COMPREHENSIVE TESTING

#### 5.1: Test Complete Workflow (END-TO-END)

**Test 1: School Setup**
```
1. Admin logs in
2. Runs /api/setup/init-school-data
3. Verifies 15 classes + 17 subjects created
4. Status: ✅ Ready
```

**Test 2: Teacher Registration via Public**
```
1. Go to /auth/staff/register
2. Select school
3. Enter email/PIN
4. Fill personal info
5. ✅ Select class (new field)
6. ✅ Select subjects (new field)
7. Submit
8. Verify teacher in database with:
   - Class assignment
   - Subjects assigned
   - Bridge tables populated
   - Status: ✅ Complete
```

**Test 3: Teacher Registration via Admin**
```
1. School admin dashboard
2. Register Teacher button
3. Fill form (same as public)
4. Verify same result
5. Status: ✅ Same outcome
```

**Test 4: Student Registration**
```
1. Go to /auth/student/register
2. Select school
3. Fill personal info
4. Select class → ✅ Subjects load immediately
5. Select 3 subjects
6. Submit
7. Verify in database:
   - student record created
   - Auto-linked to class teacher
   - Auto-linked to each subject teacher
   - Bridge tables populated
   - Status: ✅ Complete
```

**Test 5: Teacher Dashboard - Results**
```
1. Login as teacher
2. Navigate to Results (was "Coming Soon")
3. ✅ Select class/subject
4. ✅ See student list
5. ✅ Enter test scores
6. ✅ See grades calculated
7. ✅ Save scores
8. Status: ✅ Working
```

**Test 6: Principal Dashboard - Lesson Notes**
```
1. Login as principal
2. See lesson notes section
3. View submitted lesson notes from teachers
4. ✅ Approve
5. ✅ Return for revision
6. Status: ✅ Working
```

**Test 7: Accountant Dashboard - Payments**
```
1. Login as accountant
2. Record student payment
3. Generate receipt
4. ✅ Download receipt
5. Status: ✅ Working
```

**Test 8: No "No Subject Available" Error**
```
1. During registration, select class
2. ✅ Subjects load immediately
3. ❌ Don't see error message
4. Status: ✅ Fixed
```

**Test 9: Multi-Tenancy Isolation**
```
1. Create 2 test schools
2. Register teacher in School A
3. Login teacher - Only see School A data
4. Teacher doesn't see School B students/classes
5. Status: ✅ Isolated
```

**Test 10: Student-Teacher Linking**
```
1. Register student in SS1 Science
2. Register teacher for SS1 Science + Math, Physics
3. ✅ Student appears in teacher's "Class Students"
4. ✅ Student appears in "Math Students"
5. ✅ Student appears in "Physics Students"
6. Status: ✅ Linked
```

**Test 11: CBT System (Already Working)**
```
1. Teacher creates CBT for Math
2. Student takes exam
3. ✅ Results show immediately
4. Status: ✅ Already working
```

**Test 12: Complete Academic Flow**
```
REGISTRATION → ASSIGNMENT → CLASSWORK → CBT → RESULTS
1. Register teacher + student
2. Teacher creates classwork → Student receives
3. Teacher creates assignment → Student receives
4. Teacher creates CBT → Student can take
5. Student takes CBT → Gets score
6. Teacher enters test scores
7. ✅ Student sees full report
8. Status: ✅ Complete flow
```

---

## IMPLEMENTATION ORDER

### Week 1 (Critical Fixes)
- Day 1: Fix teacher registration (add class/subject selection) - 2 hours
- Day 1: Fix subject loading (remove mock data) - 1 hour
- Day 1-2: Implement teacher results page - 3 hours
- Day 2: Test all critical fixes

### Week 2 (Complete Missing Features)
- Day 3-4: Implement principal dashboard - 2 hours
- Day 4-5: Implement accountant dashboard - 3 hours
- Day 5: Test principal and accountant flows

### Week 3 (Consolidation)
- Day 6-7: Merge student registration - 2 hours
- Day 7-8: Merge teacher registration - 2 hours
- Day 8: Add global middleware - 1 hour
- Day 8-9: Comprehensive testing

### Week 4 (Final Testing & Documentation)
- Day 10: End-to-end testing
- Day 10: Bug fixes
- Day 10-11: Documentation updates
- Day 11: Production readiness

**Total**: ~15-20 hours

---

## SUCCESS CRITERIA

✅ Teacher registration includes class + subject selection
✅ Teacher results page is functional
✅ "No subject available" error completely eliminated
✅ Principal dashboard shows lesson notes + students
✅ Accountant dashboard records payments
✅ All 12 test workflows pass
✅ No duplicate implementations
✅ No hardcoded mock data in UI
✅ All data from Supabase
✅ Multi-tenancy isolation verified
✅ Complete student→teacher→subject linking

---

## RISK MITIGATION

- **Backup Supabase before changes**: Already done (auto-backup)
- **Keep old components until new fully tested**: Don't delete until verified
- **Test each phase before moving to next**: Prevents cascading failures
- **Document changes as made**: Maintain audit trail

---

This plan is ready for implementation.

**Next Step**: Begin Phase 1 with teacher registration fix.
