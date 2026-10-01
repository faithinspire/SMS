# Implementation Plan: Fix 4 Critical Issues in School Management System

**Project**: Multi-tenant School Management System (SMS) running on Next.js + Supabase
**Status**: CRITICAL - Blocking school registration and admin workflows
**Deploy Target**: Vercel (auto-deploy on git push)

---

## ISSUE 1: Super Admin School Registration (42P10 Error - BLOCKING)

### Root Cause Analysis
The error `there is no unique or exclusion constraint matching the ON CONFLICT specification` (PostgreSQL code 42P10) occurs because:

1. **Migration 152** (`academic_sessions` and `academic_terms` tables) defines:
   - `academic_sessions`: UNIQUE(school_id, session_year) 
   - `academic_terms`: UNIQUE(school_id, session_id, term_order)

2. **Migration 161** correctly adds these UNIQUE constraints and disables RLS.

3. **Safe INSERT Logic**: The new `seedSchoolCurriculum()` in `src/lib/school-seeding.ts` uses safe INSERT-SELECT with `WHERE NOT EXISTS` — no ON CONFLICT clause.

4. **The Problem**: Legacy migration files may still contain ON CONFLICT clauses on columns that DON'T have UNIQUE constraints:
   - Migration 013 or 015 may reference `term_name` column in an ON CONFLICT that no longer exists or doesn't have a constraint
   - Any ON CONFLICT without a matching UNIQUE constraint will fail with 42P10

5. **Migration 015 Specific Issues**:
   - Creates `academic_terms` with `term_name TEXT NOT NULL` 
   - If any migration tries `ON CONFLICT (school_id, term_name)` → ERROR: no such constraint exists
   - The UNIQUE constraint is on `(school_id, session_id, term_order)`, NOT `term_name`

### Files to Investigate
- `database/migrations/013_insert_test_data.sql` → Check for any INSERT with ON CONFLICT
- `database/migrations/015_auto_create_school_data.sql` → Check for any INSERT with ON CONFLICT or DROP triggers referencing removed columns
- `database/migrations/152_add_academic_core_tables.sql` → Already correct (uses safe INSERT-SELECT)
- `src/lib/school-seeding.ts` → Already correct (no ON CONFLICT)
- `src/app/api/superadmin/register-school/route.ts` → Already correct (calls seedSchoolCurriculum which uses safe logic)

### Fix Strategy
**Decision**: Remove all ON CONFLICT clauses and use safe INSERT-SELECT logic as per Migration 152 pattern.

1. **Create Migration 162** to:
   - Remove/fix any stray ON CONFLICT clauses in academic_sessions or academic_terms inserts
   - Ensure all legacy triggers that call INSERT operations use safe WHERE-NOT-EXISTS logic
   - Drop any trigger that references non-existent columns (e.g., term_name in old function signatures)
   - Verify all constraints exist before any auto-seeding

2. **Verify triggers in Migration 015**:
   - The `trigger_create_default_school_data_fn()` trigger calls `create_default_school_data()`
   - This function uses INSERT with no ON CONFLICT — GOOD
   - BUT: If this function exists from older schema, it may reference removed columns → drop and recreate it cleanly

3. **Test the fix**:
   - Register a new school via POST /api/superadmin/register-school
   - Verify academic_sessions table receives 1 row with (school_id, session_year = '2024/2025')
   - Verify academic_terms table receives 3 rows for First/Second/Third Term with (school_id, session_id, term_order)

### Implementation Tasks

#### Task 1.1: Create Migration 162 to Fix ON CONFLICT Issues
**What**: Create a new migration that removes all problematic ON CONFLICT clauses and ensures safe INSERT logic.

**Files to create/modify**:
- `database/migrations/162_fix_on_conflict_academic_tables.sql` (NEW)

**Details**:
```sql
-- Drop problematic triggers and functions that might use ON CONFLICT
DROP TRIGGER IF EXISTS trigger_auto_seed_school_safe ON schools;
DROP FUNCTION IF EXISTS auto_seed_school_safe(UUID);
DROP TRIGGER IF EXISTS trigger_create_default_school_data ON schools;

-- Recreate the trigger with safe INSERT-SELECT logic (no ON CONFLICT)
CREATE OR REPLACE FUNCTION auto_seed_school_safe(p_school_id UUID)
RETURNS void AS $$
BEGIN
  -- Safe INSERT: Only insert if session doesn't exist
  INSERT INTO academic_sessions (school_id, session_year, start_year, is_active)
  SELECT p_school_id, '2024/2025', 2024, true
  WHERE NOT EXISTS (
    SELECT 1 FROM academic_sessions 
    WHERE school_id = p_school_id AND session_year = '2024/2025'
  );
  
  -- Get the session for this school
  DECLARE
    v_session_id UUID;
  BEGIN
    SELECT id INTO v_session_id FROM academic_sessions 
    WHERE school_id = p_school_id AND session_year = '2024/2025'
    LIMIT 1;
    
    -- Safe INSERT for terms
    IF v_session_id IS NOT NULL THEN
      INSERT INTO academic_terms (school_id, session_id, term_name, term_order, is_active)
      SELECT p_school_id, v_session_id, 'First Term', 1, true
      WHERE NOT EXISTS (
        SELECT 1 FROM academic_terms
        WHERE school_id = p_school_id AND session_id = v_session_id AND term_order = 1
      );
      -- ... similar for Second and Third Term
    END IF;
  END;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (won't fire since seedSchoolCurriculum() is called directly in the API route)
CREATE TRIGGER trigger_auto_seed_school_safe
AFTER INSERT ON schools
FOR EACH ROW
EXECUTE FUNCTION auto_seed_school_safe(NEW.id);
```

**Verify**: 
- Run the migration in Supabase SQL editor: `SELECT migration_number FROM schema_migrations ORDER BY migration_number DESC LIMIT 1;`
- Expected: 162 is present
- Then test: POST /api/superadmin/register-school with valid school data
- Expected response: 201 with success=true, seeding.sessionsCreated=1
- Supabase query: `SELECT COUNT(*) FROM academic_sessions WHERE school_id = 'NEW_SCHOOL_ID';` → Should be 1
- Supabase query: `SELECT COUNT(*) FROM academic_terms WHERE school_id = 'NEW_SCHOOL_ID';` → Should be 3

---

## ISSUE 2: School Admin Bottom Navbar - Staff/Students/Results not Loading

### Root Cause Analysis
Reading `src/app/school-admin/dashboard/page.tsx` (lines 1-120 visible), the dashboard:
- Has tabs: 'overview' | 'staff' | 'students' | 'transactions' | 'academic'
- Has state: `activeTab`, `staffMembers`, `students`, etc.
- Loads data via sequential queries (not Promise.all) to avoid timeouts

**THE ISSUE**: 
- The visible code shows ONLY the TAB system in the top dashboard area
- There is NO separate "bottom navbar" component rendering the same tabs
- User report says "bottom navbar" for Staff/Students/Results "isn't fetching and loading school information"
- **Likely cause**: There is a SECOND navigation component (mobile bottom nav) that is NOT wired to the same state/data as the main tabs

**Search pattern**: Look for:
1. A mobile navigation bar (bottom fixed) — might use Tailwind `fixed bottom-0 w-full`
2. Links to `/school-admin/staff`, `/school-admin/students`, `/school-admin/results` (separate routes)
3. These routes don't have the same data loading logic as the dashboard

### Fix Strategy
**Decision**: Consolidate navigation. Whether the bottom nav links to separate pages or tabs on the dashboard, they must load the same school/staff/student data.

If separate pages exist:
- They should fetch school_id from auth context
- They should call the SAME data-loading functions as the dashboard

If tabs exist on dashboard:
- Ensure mobile view uses the tab system, not separate nav links
- Add CSS to show bottom nav bar on mobile only

### Implementation Tasks

#### Task 2.1: Audit Navigation Structure
**What**: Find all navigation components and pages related to Staff, Students, Results in school-admin routes.

**Files to read**:
- `src/app/school-admin/` — check for subdirectories/routes
- `src/components/` — check for nav components (likely found already: StaffHeader.tsx is top header, not bottom nav)
- Search grep for `school-admin/staff`, `school-admin/students`, `school-admin/results`

**Expected findings**:
- Either separate pages at `/school-admin/staff/page.tsx`, `/school-admin/students/page.tsx`, `/school-admin/results/page.tsx`
- OR the dashboard has a bottom navbar component that needs to be wired to state

**Verify**: 
- `grep -r "school-admin/staff\|school-admin/students\|school-admin/results" src/` → Find all references
- If routes exist, list them; if not, find the bottom nav component

#### Task 2.2: Wire Bottom Navbar Data Loading
**What**: Ensure the bottom navbar (or separate pages) load and display school/staff/student data correctly.

**If separate pages exist**:
- Create/modify `src/app/school-admin/staff/page.tsx` to load staff data
- Create/modify `src/app/school-admin/students/page.tsx` to load student data
- Create/modify `src/app/school-admin/results/page.tsx` to load sessions/terms/results
- Each page must:
  1. Get current user (AuthService.getCurrentUser())
  2. Extract school_id from user.school_id
  3. Fetch data filtered by school_id
  4. Display data in a table/list

**If tabs exist on dashboard**:
- Move the dashboard tab logic into separate components
- Export each tab as a reusable component
- Ensure mobile viewport uses tabs, desktop uses sidebar

**Files to create/modify**:
- If pages don't exist: Create `src/app/school-admin/staff/page.tsx`, `/students/page.tsx`, `/results/page.tsx`
- Or create tab components: `src/components/school-admin/StaffTab.tsx`, `StudentsTab.tsx`, `ResultsTab.tsx`

**Verify**:
- Navigate to the bottom navbar / separate page for Staff
- Expected: Staff list loads with school-specific data
- Expected: Tables display names, emails, roles
- Same for Students and Results tabs

---

## ISSUE 3: Results Page Not Loading (Sessions/Terms/Classes/Students Dropdowns Missing)

### Root Cause Analysis
The results page structure is unclear (not found in workspace search). From `src/app/api/results/school-classes-and-students/route.ts`:
- API endpoint exists and is well-designed
- It takes `schoolId` and `termId` query params
- It fetches class_arm_combos → students → score_sheets
- Returns structured data with student scores

**THE ISSUES**:
1. **Missing session/term selector**: The dropdown cascade (select session → load terms → select term → load classes) is not implemented
2. **Results page may not exist**: No `/school-admin/results/page.tsx` found
3. **API dependencies**: The API needs proper schoolId extraction and error handling

**From error log**: "null value in column 'end_year' of relation 'academic_sessions' violates not-null constraint"
- This means: academic_sessions.end_year is being inserted as NULL
- The INSERT in seedSchoolCurriculum() only sets start_year, not end_year
- **Migration 152** defines `end_year INTEGER` WITHOUT a DEFAULT value — this is the bug!

### Fix Strategy
**Decision**: 
1. Fix academic_sessions table to have end_year DEFAULT or computed value
2. Create the results page with session/term/class/student selectors
3. Wire selectors to API calls

### Implementation Tasks

#### Task 3.1: Fix academic_sessions Schema
**What**: Add DEFAULT or computed value for end_year in academic_sessions table.

**Files to create**:
- `database/migrations/163_fix_academic_sessions_end_year.sql` (NEW)

**Details**:
```sql
-- Migration 163: Fix academic_sessions end_year constraint
ALTER TABLE academic_sessions
ALTER COLUMN end_year SET DEFAULT (start_year + 1);

-- Backfill any existing sessions with NULL end_year
UPDATE academic_sessions 
SET end_year = start_year + 1 
WHERE end_year IS NULL;

-- Make end_year NOT NULL
ALTER TABLE academic_sessions
ALTER COLUMN end_year SET NOT NULL;
```

**Verify**:
- `SELECT COUNT(*) FROM academic_sessions WHERE end_year IS NULL;` → Should return 0
- Register a new school and check: `SELECT start_year, end_year FROM academic_sessions WHERE school_id = 'NEW_SCHOOL_ID';` → Should be (2024, 2025)

#### Task 3.2: Create Results Page with Session/Term/Class Selectors
**What**: Build the results page UI with cascading dropdowns.

**Files to create**:
- `src/app/school-admin/results/page.tsx` (NEW)

**Structure**:
```tsx
export default function ResultsPage() {
  const [sessions, setSessions] = useState([])
  const [terms, setTerms] = useState([])
  const [classes, setClasses] = useState([])
  const [selectedSession, setSelectedSession] = useState('')
  const [selectedTerm, setSelectedTerm] = useState('')
  
  useEffect(() => {
    // Get current user and fetch sessions for school
    const loadSessions = async () => {
      const user = await AuthService.getCurrentUser()
      const sessionData = await supabase
        .from('academic_sessions')
        .select('*')
        .eq('school_id', user.school_id)
        .order('session_year', { ascending: false })
      setSessions(sessionData.data)
    }
    loadSessions()
  }, [])
  
  useEffect(() => {
    // When session changes, load terms
    if (!selectedSession) return
    const loadTerms = async () => {
      const termData = await supabase
        .from('academic_terms')
        .select('*')
        .eq('session_id', selectedSession)
        .order('term_order', { ascending: true })
      setTerms(termData.data)
    }
    loadTerms()
  }, [selectedSession])
  
  useEffect(() => {
    // When term changes, fetch classes and students
    if (!selectedTerm) return
    const loadClasses = async () => {
      const user = await AuthService.getCurrentUser()
      const response = await fetch(
        `/api/results/school-classes-and-students?schoolId=${user.school_id}&termId=${selectedTerm}`
      )
      const data = await response.json()
      setClasses(data.classes)
    }
    loadClasses()
  }, [selectedTerm])
  
  return (
    <div>
      <select value={selectedSession} onChange={e => setSelectedSession(e.target.value)}>
        <option value="">Select Session</option>
        {sessions.map(s => <option key={s.id} value={s.id}>{s.session_year}</option>)}
      </select>
      
      <select value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)} disabled={!selectedSession}>
        <option value="">Select Term</option>
        {terms.map(t => <option key={t.id} value={t.id}>{t.term_name}</option>)}
      </select>
      
      {/* Display classes and students with results */}
      {classes.map(cls => (
        <div key={cls.id}>
          <h3>{cls.class_name} {cls.arm_name}</h3>
          <table>
            {/* Student results */}
          </table>
        </div>
      ))}
    </div>
  )
}
```

**Verify**:
- Navigate to `/school-admin/results`
- Expected: Session dropdown populated with available sessions
- Select a session
- Expected: Term dropdown shows terms for that session
- Select a term
- Expected: Classes and students with scores load below

---

## ISSUE 4: Staff Registration Modal (9 Slides → Reduce to 4)

### Current State Analysis
From `src/app/auth/staff/register/page.tsx`:
- **Current: 9 stages** (lines 10-18):
  1. Personal Information
  2. Contact & Address
  3. Employment Information
  4. Professional Information (🎓)
  5. Class Assignment (🏫)
  6. Subject Assignment (📚)
  7. Salary & Bank (💰)
  8. Account & Security (🔐)
  9. Review & Confirm (✓)

- **Problem**: Too many steps, over-complicated for school admin registration
- **Requirement**: Reduce to 4-5 essential slides, keep school locked (not selectable)

### Fix Strategy
**Decision**: Consolidate to 4 stages focusing on essential information:
1. **Personal Info** (merge stages 1 + 2): Name, DOB, gender, phone, email, address
2. **Employment Info** (merge stages 3 + 4): Position, role, department, employment type, qualifications
3. **Class & Subjects** (consolidate stages 5-6): Select class to teach, select subjects (optional)
4. **Account Security** (stages 8 + review): Username, password, confirm, review all data

**Removed fields** (not critical for initial registration):
- Middle name (keep first + last only)
- Professional qualifications (too detailed)
- Salary & Bank info (handle separately after onboarding)
- Emergency contact (can be added later in profile)
- Nationality, State of Origin, LGA, Marital Status (simplify)

### Implementation Tasks

#### Task 4.1: Refactor Staff Registration to 4 Stages
**What**: Redesign the staff registration form to have 4 streamlined stages.

**Files to modify**:
- `src/app/auth/staff/register/page.tsx`
- Possibly: `src/services/staff-registration.service.ts` (if validation needs updating)

**STAGES structure**:
```typescript
const STAGES = [
  { number: 1, title: 'Personal Information', icon: '👤' },
  { number: 2, title: 'Employment Details', icon: '💼' },
  { number: 3, title: 'Classes & Subjects', icon: '📚' },
  { number: 4, title: 'Account & Confirm', icon: '🔐' },
]
```

**Stage 1: Personal Information**
- firstName (required)
- lastName (required)
- gender (MALE/FEMALE, required)
- dateOfBirth (required)
- phone (required)
- email (required)
- address (required)
- state (required)
- lga (optional)

**Stage 2: Employment Details**
- staffId (optional, auto-generated)
- position (required, dropdown: "Teacher", "HOD", "Principal", etc.)
- role (required, default: "TEACHER")
- department (optional)
- employmentType (required, dropdown: "Full-time", "Part-time", "Contract")
- employmentStatus (required, default: "Active")
- dateEmployed (required, default: today)
- reportingAuthority (optional)
- teachingExperience (required, number 0-50)
- institution (optional, last school attended)
- highestQualification (optional: "ND", "BSc", "HND", "MSc", etc.)

**Stage 3: Classes & Subjects**
- classArmComboId (optional): If role is TEACHER, ask which class to teach
- isClassTeacher (optional checkbox): Is this a class teacher?
- subjectIds (required if TEACHER): Multi-select subjects applicable to class level
- adminResponsibility (optional): If role has admin duties

**Stage 4: Account & Confirm**
- accountUsername (required, unique per school)
- password (required, min 8 chars, must have upper/lower/number/special)
- confirmPassword (required)
- Review all data from stages 1-3 in read-only format
- Submit button

**School is pre-selected**: The school_id comes from auth context (currentUser.school_id), NOT from a dropdown.

**Code changes**:
- Remove stages 5, 7, 8 (Professional Info, Salary & Bank need consolidation with others)
- Merge stage 2 (Contact & Address) into stage 1
- Merge stage 4 (Professional Info) into stage 2
- Combine stages 5+6 into stage 3
- Move stage 8 (Account) to stage 4 with review

**Verify**:
- Open `/auth/staff/register` from school admin context
- Expected: Only 4 progress indicators shown
- Fill Stage 1: Personal info (firstName, lastName, gender, DOB, phone, email, address, state)
- Click Next
- Expected: Progress shows "Stage 2 of 4"
- Fill Stage 2: Position dropdown (select "Teacher"), role (TEACHER), employmentType, qualifications
- Click Next
- Expected: Stage 3 shows class selector (if TEACHER) and subjects multi-select
- Select a class and some subjects
- Click Next
- Expected: Stage 4 shows username/password form + review section
- Fill credentials and submit
- Expected: 201 response, staff record created in users table

---

## ISSUE 5: Student Registration Modal (Similar Consolidation)

### Current State Analysis
From `src/app/auth/student/register/page.tsx`:
- **Current: 10 stages** (lines 11-21):
  1. Student Personal Info
  2. Parent/Guardian
  3. Admission Info
  4. Class & Session
  5. Subjects
  6. Previous School
  7. Medical Info
  8. Documents
  9. Review
  10. Complete

### Fix Strategy
**Decision**: Consolidate to 5 stages:
1. **Student Personal Info** (keep as-is): Name, DOB, gender, phone, email, address, state
2. **Guardian Info** (merge stages 2 + admission): Parent/Guardian details + admission date/number
3. **Class & Subjects** (keep stages 4-5): Session, term, class, subjects
4. **Medical & Documents** (merge stages 7-8): Blood type, allergies, medical conditions, uploads
5. **Review & Confirm** (keep as-is): Final review before submission

**Removed fields**:
- Previous school info (optional, can add later in profile)
- Detailed medical history (simplify to blood type + allergies + conditions)
- Multiple document uploads (keep only passport/birth cert if needed)

### Implementation Tasks

#### Task 5.1: Refactor Student Registration to 5 Stages
**What**: Redesign the student registration form to have 5 streamlined stages.

**Files to modify**:
- `src/app/auth/student/register/page.tsx`
- Possibly: `src/services/student-registration.service.ts`

**STAGES structure**:
```typescript
const STAGES = [
  { number: 1, title: 'Personal Information', icon: '👤' },
  { number: 2, title: 'Parent/Guardian & Admission', icon: '👨‍👩‍👧' },
  { number: 3, title: 'Class, Session & Subjects', icon: '🏫' },
  { number: 4, title: 'Medical & Documents', icon: '📄' },
  { number: 5, title: 'Review & Confirm', icon: '✓' },
]
```

**Verify**:
- Open student registration modal/page
- Expected: Only 5 progress indicators shown
- Complete all stages and submit
- Expected: 201 response with student ID and PIN

---

## ISSUE 6: Deployment to Vercel

### Deployment Process
**Decision**: Use git push to trigger auto-deployment on Vercel.

### Implementation Tasks

#### Task 6.1: Commit All Migration and Code Changes
**What**: Create a single git commit with all fixes and push to main branch (or create PR).

**Files to commit**:
- `database/migrations/162_fix_on_conflict_academic_tables.sql` (NEW)
- `database/migrations/163_fix_academic_sessions_end_year.sql` (NEW)
- `src/app/school-admin/results/page.tsx` (NEW or modified)
- `src/app/school-admin/staff/page.tsx` (NEW or modified if separate)
- `src/app/school-admin/students/page.tsx` (NEW or modified if separate)
- `src/app/auth/staff/register/page.tsx` (MODIFIED - 9 stages → 4)
- `src/app/auth/student/register/page.tsx` (MODIFIED - 10 stages → 5)
- `src/services/staff-registration.service.ts` (MODIFIED if validation changes)
- `src/services/student-registration.service.ts` (MODIFIED if validation changes)

**Git commands**:
```bash
git add database/migrations/162_*.sql database/migrations/163_*.sql
git add src/app/school-admin/
git add src/app/auth/staff/register/page.tsx
git add src/app/auth/student/register/page.tsx
git add src/services/
git commit -m "fix: resolve 42P10 error, fix results page, consolidate registration forms"
git push -u origin main
```

**Verify**:
- Vercel receives webhook and starts deployment
- Check Vercel dashboard for deployment status (building → deployment → live)
- Expected: All tests pass (if any), build succeeds
- DNS propagates to live URL

#### Task 6.2: Test in Vercel Production
**What**: Manual end-to-end testing in deployed environment.

**Test steps**:
1. **Super Admin School Registration**:
   - Navigate to Vercel URL
   - Login as super admin
   - Click "Register School"
   - Fill form: school_name="Test School", email="test@school.com", admin email/password, phone, address
   - Submit
   - Expected: 201 response, school created, academic sessions/terms auto-seeded

2. **School Admin Dashboard**:
   - Login as the newly created school admin
   - Navigate to dashboard
   - Check Staff tab → Should load staff list (if any)
   - Check Students tab → Should load student list
   - Check Results tab → Should show session/term selectors

3. **Staff Registration**:
   - From school admin context, click "Register Staff"
   - Fill Stage 1: Personal info
   - Click Next → Stage 2 of 4
   - Fill Stage 2: Employment details
   - Click Next → Stage 3 of 4
   - Select class and subjects
   - Click Next → Stage 4 of 4
   - Enter credentials and submit
   - Expected: Staff record created in users table

4. **Results Page**:
   - Navigate to Results tab
   - Select a session from dropdown
   - Terms dropdown populates
   - Select a term
   - Classes and students with scores load
   - Expected: Results displayed in table format

**Verify**:
- All test steps pass without errors
- No 42P10 errors in Supabase logs
- No NULL end_year errors
- Registration forms complete with reduced steps

---

## Summary of Changes

| Issue | Root Cause | Fix | Priority |
|-------|-----------|-----|----------|
| 1. 42P10 Error | ON CONFLICT on non-unique columns | Migrate 162: Remove ON CONFLICT, use safe INSERT-SELECT | CRITICAL |
| 2. Bottom Navbar | Not wired to school data | Create staff/students/results pages with proper data loading | HIGH |
| 3. Results Page Missing | No session/term selector UI | Create Migration 163 (end_year fix) + Results page with dropdowns | HIGH |
| 4. Staff Registration | 9 stages too complex | Consolidate to 4 essential stages | MEDIUM |
| 5. Student Registration | 10 stages too complex | Consolidate to 5 essential stages | MEDIUM |
| 6. Deploy Changes | Changes not in production | Commit all files and git push to trigger Vercel auto-deploy | HIGH |

---

## Testing Checklist

- [ ] Migration 162 runs without errors in Supabase
- [ ] Migration 163 runs without errors in Supabase
- [ ] Super admin can register a new school (no 42P10 error)
- [ ] Academic sessions table has 1 row per school with end_year populated
- [ ] Academic terms table has 3 rows per school
- [ ] School admin dashboard loads (Staff, Students, Results tabs visible)
- [ ] Results page shows session/term/class selectors and cascades correctly
- [ ] Staff registration form has exactly 4 stages
- [ ] Student registration form has exactly 5 stages
- [ ] Vercel deployment succeeds and site is live
- [ ] End-to-end testing in production passes

---

## Deployment Checklist

- [ ] All migrations tested locally (or in Supabase SQL editor)
- [ ] All code changes tested in development
- [ ] Git commits created with descriptive messages
- [ ] Code pushed to main branch
- [ ] Vercel deployment completed successfully
- [ ] Production testing passed (all test steps above)
- [ ] No errors in Supabase logs or Vercel Function logs
- [ ] School registration flow working end-to-end
- [ ] Notify user of successful deployment
