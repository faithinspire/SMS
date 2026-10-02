# Critical Production Fixes - Implementation Plan

## Executive Summary
Four critical issues prevent staff and student operations:
1. **Staff letter generation fails**: Code queries `staff.department` column that doesn't exist
2. **Student letter generation fails**: Code queries `students.status` column that doesn't exist  
3. **Teacher login fails**: Registration creates `role=STAFF` but login service requires `role=TEACHER`
4. **Staff/Student profile edits broken**: Code references non-existent columns

---

## Issue 1: Staff Letter Generation - Missing `department` Column

### Error Details
```
GET /rest/v1/staff?select=...department...  400 Bad Request
Error: column staff.department does not exist
```

### Root Cause
- Database schema (migration 001): `staff` table has columns: `id, user_id, school_id, position, employment_date, created_at`
- Code attempts to select: `position, department, employment_date, salary, bank_name, account_number, account_name`
- `department`, `salary`, `bank_name`, `account_number`, `account_name` don't exist in the actual schema

### Solution: Add Missing Columns to Staff Table

**File to Modify**: `database/migrations/163_add_staff_extended_fields.sql` (NEW MIGRATION)

**SQL Migration**:
```sql
-- Migration 163: Add Extended Staff Fields
-- Adds missing columns referenced by letter generation and staff editing

ALTER TABLE staff 
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS salary DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS salary_frequency VARCHAR(50),
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS account_number TEXT,
  ADD COLUMN IF NOT EXISTS account_name TEXT,
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';
```

**Files to Update** (code):
1. `src/services/letter-generation.service.ts` (line 53-84)
   - Already queries these columns correctly - will work once columns exist
   - No code change needed

2. `src/components/admin/StaffProfileEditModal.tsx` (line 150)
   - Already expects these columns
   - No code change needed - will work once columns exist

**Verification**:
- Run migration in Supabase SQL editor
- Run in browser: Staff letter generation → click "Generate Appointment Letter" → verify HTML renders without errors
- Confirm query succeeds: `SELECT id, department, salary, bank_name FROM staff LIMIT 1`

---

## Issue 2: Student Letter Generation - Missing `status` Column

### Error Details
```
GET /rest/v1/students?select=...status...  400 Bad Request
Error: column students.status does not exist
```

### Root Cause
- Database schema (migration 001): `students` table has columns: `id, user_id, school_id, admission_number, date_of_birth, class_arm_combo_id, class_teacher_id, created_at, updated_at`
- Code in `src/services/letter-generation.service.ts` (line 115) queries: `status`
- Also `StudentProfileEditModal.tsx` (line 139) tries to set `studentStatus` in modal

### Solution: Add `status` Column to Students Table

**File to Modify**: `database/migrations/163_add_staff_extended_fields.sql` (SAME MIGRATION - ADD THIS)

**SQL Addition** (add to the migration):
```sql
-- Add status column to students table
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';

-- Add department column to students table (referenced in StudentProfileEditModal)
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS department TEXT;
```

**Files to Update** (code):
1. `src/services/letter-generation.service.ts` (line 115)
   - Removes `status` from select query OR handles it gracefully
   - Current: `.select('id, admission_number, date_of_birth, status, user_id, class_arm_combo_id')`
   - Change line 115 to: `.select('id, admission_number, date_of_birth, user_id, class_arm_combo_id')`
   - Remove references to `status` field in StudentData interface (line 24-25)

2. `src/components/admin/StudentProfileEditModal.tsx` (line 139)
   - Already expects `status` column - will work once column exists
   - No code change needed

**Verification**:
- Run migration in Supabase
- Run in browser: Student letter generation → click "Generate Admission Letter" → verify HTML renders without errors
- Confirm query succeeds: `SELECT id, status, department FROM students LIMIT 1`

---

## Issue 3: Teacher Role Mismatch - STAFF vs TEACHER

### Error Details
```
[TeacherDataService] Error: User is not a teacher (role: STAFF)
    at a.Z.getTeacherProfile
```

### Root Cause - Multi-part Issue

#### Part A: Registration creates wrong role
- **File**: `src/services/staff-registration.service.ts` (line 117)
  - Line 117: `role: data.primaryRole || 'TEACHER'`
  - When user registers as "Teacher" in the form, `primaryRole` = "TEACHER"
  - User record is created with `role='TEACHER'` ✓ CORRECT

- However, **File**: `src/app/auth/staff/register/page.tsx` (line 36)
  - Initial form state: `role: 'TEACHER'` ✓ CORRECT
  - BUT the staff registration API endpoint is being called with the WRONG role

- Actually, checking `/api/auth/register-user` endpoint behavior:
  - It receives `role: data.primaryRole || 'TEACHER'`
  - The registration service is CORRECTLY setting `userRole = data.primaryRole || 'STAFF'`
  - **Line 145 in staff-registration.service.ts**: `const userRole = data.primaryRole || 'STAFF'` ← **THIS IS THE BUG**
  - Should be: `const userRole = data.primaryRole || 'TEACHER'`

- Check shows:
  - Staff registration form sends `primaryRole: 'TEACHER'` 
  - But **staff-registration.service.ts line 145** defaults to `'STAFF'` instead of `'TEACHER'`
  - When someone signs up as a teacher but doesn't explicitly set `primaryRole`, they get `role='STAFF'` 
  - Then login fails because `TeacherDataService.getTeacherProfile()` (line 101) requires `role='TEACHER'`

#### Part B: Login service is inflexible
- **File**: `src/services/teacher-data.service.ts` (line 101)
  - Checks: `if (userData.role !== 'TEACHER')`
  - But should allow: `role IN ('TEACHER', 'STAFF', 'HEAD_TEACHER', 'PRINCIPAL')`
  - Teachers are often registered with role='STAFF' in the users table

### Solution

**Fix 1: Correct the role default in StaffRegistrationService**

**File**: `src/services/staff-registration.service.ts`
- Line 145: Change from `const userRole = data.primaryRole || 'STAFF'`
- Change to: `const userRole = data.primaryRole || 'TEACHER'`

**Fix 2: Make TeacherDataService accept multiple teaching roles**

**File**: `src/services/teacher-data.service.ts`
- Lines 101-103: Change from:
```typescript
if (userData.role !== 'TEACHER') {
  throw new Error(`User is not a teacher (role: ${userData.role})`)
}
```
- Change to:
```typescript
const teachingRoles = ['TEACHER', 'STAFF', 'HEAD_TEACHER', 'PRINCIPAL', 'HEAD_OF_DEPARTMENT']
if (!teachingRoles.includes(userData.role)) {
  throw new Error(`User is not a teacher (role: ${userData.role})`)
}
```

**Verification**:
- Register a new staff member as "Teacher" role
- Login with that account
- Verify: Dashboard loads without "User is not a teacher" error
- Verify: Teacher profile loads with full name and school name

---

## Issue 4: Staff/Student Profile Editing Broken

### Related Issues

#### 4A: StaffProfileEditModal tries to set `department` on staff
- **File**: `src/components/admin/StaffProfileEditModal.tsx` (line 150, 174)
- Sets department on staff record - will work once migration 163 is applied
- No code change needed after migration

#### 4B: StudentProfileEditModal tries to set `department` on student
- **File**: `src/components/admin/StudentProfileEditModal.tsx` (line 139)
- Sets department on student record - will work once migration 163 is applied
- No code change needed after migration

### Solution
- All fixed by migration 163 (add `department` and `status` columns)
- Code already handles these fields correctly

---

## Implementation Order (CRITICAL DEPENDENCIES)

Execute in this order to avoid breaking intermediate states:

### Step 1: Database Migrations (MUST RUN FIRST)
- Create and run `database/migrations/163_add_staff_extended_fields.sql`
- This adds all missing columns: `staff.department`, `staff.salary`, `staff.salary_frequency`, `staff.bank_name`, `staff.account_number`, `staff.account_name`, `staff.status`, `students.status`, `students.department`
- **Verification**: Run SQL query in Supabase:
  ```sql
  SELECT id, department, salary FROM staff LIMIT 1;
  SELECT id, status, department FROM students LIMIT 1;
  ```

### Step 2: Code Fixes
- Fix `src/services/staff-registration.service.ts` line 145: Change default role from `'STAFF'` to `'TEACHER'`
- Fix `src/services/teacher-data.service.ts` lines 101-103: Accept multiple teaching roles
- Fix `src/services/letter-generation.service.ts` line 115: Remove `status` from select (or handle null)
- **Verification**: 
  - Run build: `npm run build` (TypeScript compilation succeeds)
  - Unit tests: `npm run test:services` (if test suite exists)

### Step 3: Integration Verification (IN BROWSER)
- Log in as school admin
- Test 1 - Staff Letter: Navigate to Staff page → Select staff member → Click "Generate Appointment Letter" → Verify letter HTML loads
- Test 2 - Student Letter: Navigate to Student page → Select student → Click "Generate Admission Letter" → Verify letter HTML loads
- Test 3 - Staff Registration: Register new staff as "Teacher" → Attempt login → Verify dashboard loads (no role error)
- Test 4 - Staff Profile Edit: Edit staff details (set department, salary) → Verify save succeeds
- Test 5 - Student Profile Edit: Edit student details (set status) → Verify save succeeds

---

## Risk Assessment

### Low Risk
- Migration 163: Adds columns only, no existing data affected (columns are nullable with defaults)
- Code changes: String defaults and conditional checks, backwards compatible

### Medium Risk  
- Role change in teacher-data.service: Broadens who can access teacher dashboard
  - **Mitigation**: Only affects users already registered with role='STAFF', 'HEAD_TEACHER', 'PRINCIPAL' 
  - These roles should have teacher-like permissions anyway
  - No permission changes - just fixes incorrect role checks

### Backward Compatibility
- All changes are additive or fixing bugs
- Existing staff/students records will get NULL values in new columns (handled by defaults in INSERT)
- Existing code continues to work

---

## Files Changed Summary

| File | Change Type | Lines | Impact |
|------|-------------|-------|--------|
| `database/migrations/163_add_staff_extended_fields.sql` | NEW | - | Add 9 missing columns |
| `src/services/staff-registration.service.ts` | CODE FIX | 145 | Fix role default |
| `src/services/teacher-data.service.ts` | CODE FIX | 101-103 | Accept multiple teacher roles |
| `src/services/letter-generation.service.ts` | CODE FIX | 115 | Remove invalid column |

---

## No Changes Needed (Already Correct)

The following files do NOT need changes - they reference the correct columns once the migration is applied:
- `src/components/admin/LetterPreviewModal.tsx` - Already calls service correctly
- `src/components/admin/StaffProfileEditModal.tsx` - Already expects columns
- `src/components/admin/StudentProfileEditModal.tsx` - Already expects columns
- `src/services/letter-generation.service.ts` (fetchStaffData, fetchStudentData) - Already has correct logic

---

## Rollback Plan (if needed)

If migration causes issues:
1. Remove migration 163 from Supabase SQL
2. Revert code changes by restoring from git
3. No data loss (columns were just added, never populated)

---

## Testing Checklist

- [ ] Migration 163 runs without errors in Supabase
- [ ] Build succeeds: `npm run build`
- [ ] Staff letter generation works (HTML renders)
- [ ] Student letter generation works (HTML renders)
- [ ] Staff registration as teacher → login works → dashboard loads
- [ ] Staff profile edit: save department, salary → succeeds
- [ ] Student profile edit: save status → succeeds
- [ ] Existing staff/students still display correctly (no data loss)

