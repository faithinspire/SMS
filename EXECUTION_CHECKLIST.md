# Curriculum Migration Execution Checklist

**Start Date**: September 23, 2026  
**Project**: FTECH SMS - Complete Curriculum Population (Prep→SS3)  
**Status**: READY FOR EXECUTION  

---

## PRE-EXECUTION CHECKLIST

### Database Preparation
- [ ] Verify Supabase project is accessible
- [ ] Backup database (optional but recommended)
- [ ] Confirm `subjects` table exists with columns:
  - [ ] `id` (UUID)
  - [ ] `school_id` (UUID, NOT NULL)
  - [ ] `name` (TEXT)
  - [ ] `subject_code` (VARCHAR)
  - [ ] `level` (INT)
  - [ ] `department` (VARCHAR)
  - [ ] `created_at` (TIMESTAMP)

### File Verification
- [ ] `database/migrations/140_complete_curriculum_all_schools.sql` exists
- [ ] `database/migrations/141_auto_initialize_school_curriculum.sql` exists
- [ ] `src/app/api/school/subjects/route.ts` exists
- [ ] Documentation files exist:
  - [ ] `MIGRATION_140_141_EXECUTION_GUIDE.md`
  - [ ] `COMPLETE_CURRICULUM_IMPLEMENTATION_SUMMARY.md`
  - [ ] `VERIFY_MIGRATIONS_140_141.sql`

---

## EXECUTION PHASE

### Step 1: Execute Migration 140 (Populate All Schools)

**Action**: Run Migration 140 in Supabase SQL Editor

- [ ] Open Supabase Dashboard
- [ ] Navigate to SQL Editor
- [ ] Copy entire contents of `database/migrations/140_complete_curriculum_all_schools.sql`
- [ ] Paste into SQL Editor
- [ ] Click "Run" (or press Ctrl+Enter)
- [ ] Wait for execution to complete (~2-5 seconds)
- [ ] **Expected Output**: NOTICE message "Migration 140: Curriculum population complete for all schools"
- [ ] Check for errors in output
- [ ] If successful, note timestamp: `_________________________`
- [ ] If failed, note error and troubleshoot before proceeding

**Status**: ☐ PENDING | ☐ IN PROGRESS | ☐ COMPLETED | ☐ FAILED

**Timestamp**: `_________________________`  
**Error (if any)**: `_________________________`

---

### Step 2: Execute Migration 141 (Setup Auto-Init Trigger)

**Action**: Run Migration 141 in Supabase SQL Editor

- [ ] Copy entire contents of `database/migrations/141_auto_initialize_school_curriculum.sql`
- [ ] Paste into new SQL Editor session (or same editor, clear previous)
- [ ] Click "Run"
- [ ] Wait for execution to complete (~1-2 seconds)
- [ ] **Expected Output**: Silent completion (no error = success)
- [ ] Check for errors in output
- [ ] If successful, note timestamp: `_________________________`
- [ ] If failed, note error and troubleshoot before proceeding

**Status**: ☐ PENDING | ☐ IN PROGRESS | ☐ COMPLETED | ☐ FAILED

**Timestamp**: `_________________________`  
**Error (if any)**: `_________________________`

---

## VERIFICATION PHASE

### Step 3: Run Verification Script

**Action**: Execute comprehensive verification

- [ ] Copy entire contents of `VERIFY_MIGRATIONS_140_141.sql`
- [ ] Paste into Supabase SQL Editor
- [ ] Click "Run"
- [ ] Wait for all sections to complete (this script is comprehensive, may take 10-15 seconds)
- [ ] Review each section result below:

#### Section 1: Migration 140 Results
- [ ] **1.1 Schools with subjects**: ✓ Multiple schools shown
- [ ] **1.2 PREP subjects**: ✓ Each school has 18 PREP-* codes
- [ ] **1.3 KG/NUR subjects**: ✓ 19 each
- [ ] **1.4 PRI 1-3 subjects**: ✓ 13 subjects
- [ ] **1.5 PRI 4-6 subjects**: ✓ 16 subjects
- [ ] **1.6 JSS subjects**: ✓ 22 subjects
- [ ] **1.7 SS subjects**: ✓ 46 subjects
- [ ] **1.8 SS departments**: ✓ CORE=4, SCIENCE=10, HUMANITIES=14, BUSINESS=4, TRADE=6
- [ ] **1.9 Duplicate check**: ✓ 0 rows returned (no duplicates)
- [ ] **1.10 NULL school_id check**: ✓ 0 returned (all have school_id)

#### Section 2: Migration 141 Trigger Setup
- [ ] **2.1 Trigger exists**: ✓ trigger_initialize_school_curriculum shown, enabled=true
- [ ] **2.2 Trigger definition**: ✓ Shows AFTER INSERT ON schools
- [ ] **2.3 Helper function**: ✓ initialize_school_curriculum function exists

#### Section 3: Test Auto-Initialization
- [ ] **3.1 Create test school**: ✓ Test school ID obtained
- [ ] **3.2 Verify auto-init**: ✓ ~215 subjects for test school, 18 PREP, 46 SS

**Copy test school ID here**: `_________________________`

#### Section 4: Multi-Tenancy Verification
- [ ] **4.1 School subject counts**: ✓ Each school has ~215 subjects
- [ ] **4.2 No cross-school contamination**: ✓ 0 rows (each subject_code in only 1 school)

#### Section 5: Existing Data Preservation
- [ ] **5.1 Student-subject relationships**: ✓ All valid, orphaned_references=0
- [ ] **5.2 Results references**: ✓ All valid, orphaned_results=0
- [ ] **5.3 CBT references**: ✓ All valid, orphaned_cbt=0

#### Section 6: Summary Report
- [ ] **6.1 Subject count by level**: ✓ Shows all 6 education levels
- [ ] **6.2 Overall stats**: ✓ Shows total schools, unique codes, records

**Verification Status**: ☐ ALL PASSED | ☐ SOME FAILED | ☐ INCOMPLETE

**Failed tests (if any)**: `_________________________`

---

## FRONTEND UPDATE PHASE

### Step 4: Update Student Registration Component

**File**: `src/app/auth/student/register/page.tsx`

- [ ] Locate hard-coded subjects array (search for: `PREP`, `PRIMARY`, `JSS`, `SS`)
- [ ] Find the section that returns/loads subjects
- [ ] Replace hard-coded array with API call:
  ```typescript
  const fetchSubjects = async (classLevel: number) => {
    const response = await fetch(
      `/api/school/subjects?schoolId=${schoolId}&level=${classLevel}`
    );
    const result = await response.json();
    return result.data || [];
  };
  ```
- [ ] Update component to call `fetchSubjects()` when class is selected
- [ ] Test: Can form be loaded without error? ✓
- [ ] Test: Subjects dropdown appears? ✓
- [ ] Test: Selecting class loads correct subjects? ✓

**Status**: ☐ PENDING | ☐ IN PROGRESS | ☐ COMPLETED | ☐ TESTED

---

### Step 5: Update Teacher Registration Component

**File**: `src/app/auth/staff/register/page.tsx`

- [ ] Locate hard-coded subjects array for teachers
- [ ] Replace with centralized API call:
  ```typescript
  const fetchTeacherSubjects = async () => {
    const response = await fetch(
      `/api/school/subjects?schoolId=${schoolId}&assignable=true`
    );
    const result = await response.json();
    return result.data || [];
  };
  ```
- [ ] Test: Can form be loaded? ✓
- [ ] Test: Subjects list appears? ✓
- [ ] Test: Multiple subjects can be selected? ✓

**Status**: ☐ PENDING | ☐ IN PROGRESS | ☐ COMPLETED | ☐ TESTED

---

### Step 6: Update CBT Component

**File**: `src/app/teacher/cbt/page.tsx` (or wherever CBT subjects are loaded)

- [ ] Locate hard-coded CBT subjects
- [ ] Replace with API call:
  ```typescript
  const fetchCbtSubjects = async (classLevel: number) => {
    const response = await fetch(
      `/api/school/subjects?schoolId=${schoolId}&level=${classLevel}`
    );
    const result = await response.json();
    return result.data || [];
  };
  ```
- [ ] Test: CBT form loads? ✓
- [ ] Test: Subject dropdown appears? ✓
- [ ] Test: Subjects load for different class levels? ✓

**Status**: ☐ PENDING | ☐ IN PROGRESS | ☐ COMPLETED | ☐ TESTED

---

### Step 7: Update Results/Score Sheet Component

**File**: `src/app/.../results/...` or wherever results subjects are loaded

- [ ] Locate hard-coded subjects for results
- [ ] Replace with API call (may need to filter by department for SS):
  ```typescript
  const fetchResultSubjects = async (classLevel: number, department?: string) => {
    const url = new URL('/api/school/subjects', window.location.origin);
    url.searchParams.set('schoolId', schoolId);
    url.searchParams.set('level', classLevel.toString());
    if (department) url.searchParams.set('department', department);
    
    const response = await fetch(url.toString());
    const result = await response.json();
    return result.data || [];
  };
  ```
- [ ] Test: Results form loads? ✓
- [ ] Test: Subjects appear for different classes? ✓
- [ ] Test: SS subjects filtered by department? ✓

**Status**: ☐ PENDING | ☐ IN PROGRESS | ☐ COMPLETED | ☐ TESTED

---

### Step 8: Search for and Update All Other Subject Dropdowns

**Search for**: Hard-coded subject arrays throughout codebase

- [ ] Search codebase for:
  - [ ] `['English', 'Mathematics']`
  - [ ] `PRIMARY_SUBJECTS`
  - [ ] `JSS_SUBJECTS`
  - [ ] `SS_SUBJECTS`
  - [ ] `SUBJECT_LIST`
  - [ ] Any array containing subject names
- [ ] For each occurrence:
  - [ ] Determine its purpose (registration, CBT, results, etc.)
  - [ ] Replace with `/api/school/subjects` call
  - [ ] Test that component still works
- [ ] Document changes: `_________________________`

**Status**: ☐ PENDING | ☐ IN PROGRESS | ☐ COMPLETED

**Components Updated**: `_________________________`

---

## INTEGRATION TESTING PHASE

### Step 9: Test Student Registration Flow

**Scenario**: Register a new Primary 1 student

- [ ] Navigate to student registration page
- [ ] Select school: OK ✓
- [ ] Select class: Primary 1 ✓
- [ ] **Verify**: Primary 1 subjects load:
  - [ ] English Studies ✓
  - [ ] Mathematics ✓
  - [ ] Nigerian Language options (Hausa, Igbo, Yoruba) ✓
  - [ ] Basic Science ✓
  - [ ] Physical and Health Education ✓
  - [ ] Christian Religious Studies ✓
  - [ ] Islamic Studies ✓
  - [ ] Nigerian History ✓
  - [ ] Social and Citizenship Studies ✓
  - [ ] Cultural and Creative Arts ✓
  - [ ] Arabic ✓
- [ ] Select 5-7 subjects ✓
- [ ] Complete registration ✓
- [ ] Verify student created in database ✓
- [ ] Verify subjects assigned to student ✓

**Status**: ☐ PENDING | ☐ IN PROGRESS | ☐ PASSED | ☐ FAILED

**Timestamp**: `_________________________`  
**Notes**: `_________________________`

---

### Step 10: Test SS Science Student Registration

**Scenario**: Register a new SS1 Science student

- [ ] Navigate to student registration
- [ ] Select school ✓
- [ ] Select class: SS1 ✓
- [ ] Select department: Science (if applicable) ✓
- [ ] **Verify**: Core subjects load:
  - [ ] English Language ✓
  - [ ] General Mathematics ✓
  - [ ] Citizenship and Heritage Studies ✓
  - [ ] Digital Technologies ✓
- [ ] **Verify**: Science subjects available:
  - [ ] Biology ✓
  - [ ] Chemistry ✓
  - [ ] Physics ✓
  - [ ] Agricultural Science ✓
  - [ ] Further Mathematics ✓
  - [ ] Physical Education ✓
  - [ ] Health Education ✓
  - [ ] Foods and Nutrition ✓
  - [ ] Geography ✓
  - [ ] Technical Drawing ✓
- [ ] Select core + science subjects ✓
- [ ] Complete registration ✓
- [ ] Verify student created with correct subjects ✓

**Status**: ☐ PENDING | ☐ IN PROGRESS | ☐ PASSED | ☐ FAILED

---

### Step 11: Test SS Business Student Registration

**Scenario**: Register a new SS1 Business student

- [ ] Navigate to student registration
- [ ] Select class: SS1 ✓
- [ ] Select department: Business ✓
- [ ] **Verify**: Core + Business subjects load:
  - [ ] English Language ✓
  - [ ] General Mathematics ✓
  - [ ] Citizenship and Heritage Studies ✓
  - [ ] Digital Technologies ✓
  - [ ] Accounting ✓
  - [ ] Commerce ✓
  - [ ] Marketing ✓
  - [ ] Economics ✓
- [ ] Complete registration ✓
- [ ] Verify student created with correct subjects ✓

**Status**: ☐ PENDING | ☐ IN PROGRESS | ☐ PASSED | ☐ FAILED

---

### Step 12: Test Multi-School Isolation

**Scenario**: Verify School A subjects ≠ School B subjects

- [ ] In Supabase, have at least 2 schools with subjects
- [ ] Query: `SELECT * FROM subjects WHERE school_id = 'SCHOOL_A_ID'`
  - Count: `_________________________`
- [ ] Query: `SELECT * FROM subjects WHERE school_id = 'SCHOOL_B_ID'`
  - Count: `_________________________`
- [ ] Verify: Subject IDs are different ✓
- [ ] Verify: Subject names are identical but IDs unique ✓
- [ ] Verify: Selecting School A shows only School A subjects ✓
- [ ] Verify: Selecting School B shows only School B subjects ✓

**Status**: ☐ PENDING | ☐ IN PROGRESS | ☐ PASSED | ☐ FAILED

---

### Step 13: Test New School Auto-Initialization

**Scenario**: Create a brand new school and verify curriculum auto-initializes

- [ ] Create new school via admin panel or direct API
- [ ] Copy school ID: `_________________________`
- [ ] In Supabase, query: `SELECT COUNT(*) FROM subjects WHERE school_id = '<NEW_SCHOOL_ID>'`
- [ ] **Expected**: ~215 subjects
- [ ] **Actual**: `_________________________`
- [ ] Query: `SELECT COUNT(DISTINCT subject_code) FROM subjects WHERE school_id = '<NEW_SCHOOL_ID>' AND subject_code LIKE 'PREP-%'`
- [ ] **Expected**: 18 PREP subjects
- [ ] **Actual**: `_________________________`
- [ ] Query: `SELECT COUNT(DISTINCT subject_code) FROM subjects WHERE school_id = '<NEW_SCHOOL_ID>' AND subject_code LIKE 'SS-%'`
- [ ] **Expected**: 46 SS subjects
- [ ] **Actual**: `_________________________`
- [ ] Register a student in new school ✓
- [ ] **Verify**: Subjects appear in registration form ✓

**Status**: ☐ PENDING | ☐ IN PROGRESS | ☐ PASSED | ☐ FAILED

---

### Step 14: Test CBT with New Curriculum

**Scenario**: Create CBT exam using centralized subjects

- [ ] Navigate to teacher CBT creation
- [ ] Create new exam ✓
- [ ] Select class ✓
- [ ] **Verify**: Subject dropdown populated from API ✓
- [ ] Select subject: English Language ✓
- [ ] Create questions ✓
- [ ] Save exam ✓
- [ ] Verify CBT exam created with correct subject ✓
- [ ] Test: Student can see and attempt CBT ✓

**Status**: ☐ PENDING | ☐ IN PROGRESS | ☐ PASSED | ☐ FAILED

---

### Step 15: Test Results with New Curriculum

**Scenario**: Create result/score entry using centralized subjects

- [ ] Navigate to results entry page ✓
- [ ] Select class ✓
- [ ] **Verify**: Subject dropdown populated from API ✓
- [ ] Select student ✓
- [ ] Enter scores for multiple subjects ✓
- [ ] Save results ✓
- [ ] Verify results saved with correct subjects ✓
- [ ] Verify results report shows correct subjects ✓

**Status**: ☐ PENDING | ☐ IN PROGRESS | ☐ PASSED | ☐ FAILED

---

## DEPLOYMENT PHASE

### Step 16: Commit Changes to Git

**Action**: Stage and commit all changes

- [ ] Check git status: `git status`
- [ ] Add migration files:
  ```bash
  git add database/migrations/140_complete_curriculum_all_schools.sql
  git add database/migrations/141_auto_initialize_school_curriculum.sql
  ```
- [ ] Add API endpoint:
  ```bash
  git add src/app/api/school/subjects/route.ts
  ```
- [ ] Add updated components (list them):
  - [ ] `_________________________`
  - [ ] `_________________________`
  - [ ] `_________________________`
- [ ] Create commit with message:
  ```bash
  git commit -m "feat: complete curriculum population (Prep-SS3) for all schools

  - Migration 140: Populate subjects for all existing schools (215 per school)
  - Migration 141: Auto-initialize curriculum for new schools (trigger)
  - API endpoint: GET /api/school/subjects for centralized subject service
  - Updated all subject dropdowns to use centralized API
  - Frontend components: student registration, teacher registration, CBT, results
  - Verified: All schools have correct subjects, multi-tenant isolation, zero data loss"
  ```
- [ ] Verify commit created: `git log --oneline -1`

**Status**: ☐ PENDING | ☐ IN PROGRESS | ☐ COMPLETED

---

### Step 17: Push to Remote Repository

**Action**: Push changes to main branch

- [ ] Push to origin:
  ```bash
  git push origin main
  ```
- [ ] Wait for Vercel deployment to complete (5-10 minutes)
- [ ] Check deployment status at vercel.com ✓
- [ ] Verify: No deployment errors ✓
- [ ] Verify: API endpoint is live: `curl https://sms-gold-eta.vercel.app/api/school/subjects?schoolId=xxx`

**Status**: ☐ PENDING | ☐ IN PROGRESS | ☐ COMPLETED

**Deployment URL**: `_________________________`  
**Timestamp**: `_________________________`

---

### Step 18: Final Smoke Tests (Production)

**Action**: Test key flows in production

- [ ] Navigate to production URL ✓
- [ ] Test: Student registration → subjects load ✓
- [ ] Test: Teacher registration → subjects load ✓
- [ ] Test: CBT creation → subjects load ✓
- [ ] Test: Results entry → subjects load ✓
- [ ] Test: New school creation → auto-initialized ✓
- [ ] Test: Multi-school isolation still working ✓
- [ ] Check for JavaScript console errors: ✓
- [ ] Check for backend errors in logs: ✓

**Status**: ☐ PENDING | ☐ IN PROGRESS | ☐ PASSED | ☐ FAILED

**Issues (if any)**: `_________________________`

---

## COMPLETION CHECKLIST

### Final Verification
- [ ] All 5 migrations/API changes deployed
- [ ] All tests passed
- [ ] No data loss (existing students/teachers/results intact)
- [ ] All schools have complete curriculum
- [ ] New schools auto-initialize on creation
- [ ] Multi-tenancy isolation verified
- [ ] Production deployment successful

### Documentation
- [ ] All documentation files created
- [ ] Verification script runs successfully
- [ ] Troubleshooting guide complete
- [ ] API endpoint documented

### Sign-Off
- [ ] Developer: _________________________ Date: _________
- [ ] QA: _________________________ Date: _________
- [ ] Approver: _________________________ Date: _________

---

## SUMMARY

| Phase | Status | Timestamp | Notes |
|-------|--------|-----------|-------|
| Migration 140 Execution | ☐ | _________ | |
| Migration 141 Execution | ☐ | _________ | |
| Verification Tests | ☐ | _________ | |
| Frontend Updates | ☐ | _________ | |
| Integration Testing | ☐ | _________ | |
| Production Deployment | ☐ | _________ | |
| Final Sign-Off | ☐ | _________ | |

---

## NOTES

`_________________________________________________________________`

`_________________________________________________________________`

`_________________________________________________________________`

---

**Project Status**: ☐ PENDING | ☐ IN PROGRESS | ☐ COMPLETED | ☐ ISSUE FOUND

**Overall Completion**: _____ %
