# ROOT CAUSE INVESTIGATION - FINDINGS SUMMARY

## THE PROBLEM
**Registration modals show empty dropdowns:** "No subjects available" and empty class lists even though the UI code is correct.

---

## DATA FLOW TRACED

### 1. REGISTRATION MODAL RENDERING
- **File:** `src/app/school-admin/dashboard/page.tsx` (Line 374-377)
- **Code:** `<TeacherRegistrationModal schoolId={user?.schoolId || ''} />`
- **Status:** ✅ Modal is rendered correctly

### 2. SCHOOLID PARAMETER
- **Issue Identified:** Potential naming mismatch
  - Dashboard uses: `user?.schoolId` (camelCase)
  - User type defines: `school_id` (snake_case)
  - AuthService returns: `schoolId` (camelCase) ✅ Matches

- **File:** `src/types/index.ts` (User interface)
- **Current Definition:**
  ```typescript
  export interface User {
    id: string;
    school_id: string;  // ← snake_case in type
    ...
  }
  ```

- **But AuthService returns camelCase:**
  ```typescript
  return {
    ...
    schoolId: userRecord.school_id,  // ✅ Correct mapping
    ...
  }
  ```

- **Status:** ⚠️ Type interface and actual data don't match - type says `school_id` but runtime returns `schoolId`

### 3. SUPABASE QUERIES IN MODALS

#### TeacherRegistrationModal.tsx (Line 73-100)
```typescript
const { data: combosData } = await supabase
  .from('class_arm_combos')
  .select(`id, class_id, arm_id, classes:class_id (...), arms:arm_id (...)`)
  .eq('school_id', schoolId)

const { data: subjectsData } = await supabase
  .from('subjects')
  .select('id, name, code, applicable_to_levels')
  .eq('school_id', schoolId)
```

- **Status:** ✅ Queries are correctly structured
- **Potential Issues:**
  - If `schoolId` is undefined → Query will fail silently
  - If `schoolId` is wrong → Query will return empty array
  - If database has no data for this school → Empty array returned

#### StudentRegistrationModal.tsx (Line 82-107)
- Same query pattern as Teacher modal
- Same potential issues

### 4. DATABASE SCHEMA

Tables identified:
- `class_arm_combos` - Valid table ✅
- `classes` - Valid table ✅
- `arms` - Valid table ✅
- `subjects` - Valid table ✅

All have `school_id` column for multi-tenancy ✅

### 5. RLS STATUS

RLS has been disabled on all registration tables:
- `ALTER TABLE class_arm_combos DISABLE ROW LEVEL SECURITY`
- `ALTER TABLE subjects DISABLE ROW LEVEL SECURITY`
- `ALTER TABLE classes DISABLE ROW LEVEL SECURITY`
- `ALTER TABLE arms DISABLE ROW LEVEL SECURITY`

Status: ✅ RLS is disabled (confirmed in migrations)

---

## ROOT CAUSE HYPOTHESES

### Hypothesis 1: schoolId is undefined
**Evidence:**
- Dashboard passes `user?.schoolId`
- If user is null or schoolId is not set, empty string is passed
- Supabase query with empty schoolId returns []

**How to verify:**
- Console logs in dashboard: `console.log('user:', user, 'schoolId:', user?.schoolId)`
- Check `[REGISTRATION DEBUG]` logs for schoolId value

### Hypothesis 2: Database has no data for this school
**Evidence:**
- schoolId might be valid but that school has never been configured
- No classes/subjects/arms exist for the specific school

**How to verify:**
- API endpoint: `/api/debug/registration-data?schoolId=[UUID]`
- Returns count of records for that school

### Hypothesis 3: Type mismatch causing cascading issues
**Evidence:**
- User interface type defines `school_id` (snake_case)
- But all code uses `schoolId` (camelCase)
- TypeScript might be allowing this, but it's a code smell

**How to verify:**
- Search for `school_id` usage (snake_case) in dashboard/auth
- All should be camelCase for consistency

### Hypothesis 4: schoolId is for a different school than the one logged in
**Evidence:**
- User might be admin of School A
- But schoolId somehow points to School B
- School B has no data configured

**How to verify:**
- Log the admin's school from auth service
- Compare with schoolId being passed to modal

---

## FILES MODIFIED FOR DIAGNOSIS

1. **Added Comprehensive Logging:**
   - `src/components/admin/TeacherRegistrationModal.tsx` - Line 69-118
   - `src/components/admin/StudentRegistrationModal.tsx` - Line 81-130
   - Added `[REGISTRATION DEBUG]` console logs

2. **Created Debug API:**
   - `src/app/api/debug/registration-data/route.ts` (NEW)
   - Allows querying what data exists for a specific schoolId

3. **Created Diagnostic Guide:**
   - `ROOT_CAUSE_DIAGNOSTIC_GUIDE.md` (NEW)
   - Step-by-step instructions for user to diagnose

---

## NEXT STEPS FOR USER

1. **Execute Diagnostic Steps:**
   - Open browser console (F12)
   - Trigger registration modal
   - Report `[REGISTRATION DEBUG]` logs

2. **Identify Which Scenario:**
   - Scenario A: schoolId is undefined
   - Scenario B: schoolId valid but database empty
   - Scenario C: Supabase query error

3. **Apply Appropriate Fix:**
   - Each scenario has a specific fix documented

---

## CODE ISSUES IDENTIFIED (Not causing empty dropdowns, but should be fixed)

### Type Inconsistency
- **Issue:** User interface uses `school_id` but code uses `schoolId`
- **File:** `src/types/index.ts`
- **Fix:** Update type to use `schoolId` for consistency

### Fallback Session schoolId
- **File:** `src/services/auth.service.ts` Line 375
- **Status:** Returns `schoolId` correctly ✅

### Dashboard User Update
- **File:** `src/app/school-admin/dashboard/page.tsx` Line 376
- **Current:** `schoolId={user?.schoolId || ''}`
- **Should be:** `schoolId={user?.schoolId || user?.school_id || ''}`

---

## DEFINITION OF FIXED

This is complete when:

1. ✅ `[REGISTRATION DEBUG]` logs show correct schoolId
2. ✅ `[REGISTRATION DEBUG]` logs show count > 0 for classes and subjects
3. ✅ Teacher Registration Step 4 shows Class dropdown with options
4. ✅ Teacher Registration Step 4 shows Subjects list populated
5. ✅ Student Registration shows Class dropdown with options
6. ✅ Student Registration shows Subjects list populated
7. ✅ Can complete full registration
8. ✅ Registered data appears in Supabase

---

**Current Status:** Diagnostic framework deployed, awaiting console logs from user
