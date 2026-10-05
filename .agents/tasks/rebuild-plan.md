# School Admin Dashboard - Production Rebuild Plan

## Overview
Five critical fixes to rebuild the school admin dashboard for production. Work in dependency order.

---

## Task 1: Fix Navigation & School Context Loading
**Status:** Foundational — all other pages depend on this

### Problem
Pages show "Your account is not linked to a school" error even when users have valid `school_id`. Root cause: Inconsistent school lookup patterns and missing error state handling during loading.

### Solution
Standardize the school context fetch pattern across all pages (staff, students, academic, results).

### Files to Modify
- `src/app/school-admin/staff/page.tsx`
- `src/app/school-admin/students/page.tsx`
- `src/app/school-admin/academic/page.tsx`
- `src/app/school-admin/results/page.tsx`

### Changes Required

**For each page:**

1. In the initial `useEffect` that fetches the current user's school_id:
   - Use `.maybeSingle()` instead of `.single()` to avoid PGRST116 when record doesn't exist
   - Distinguish between "loading" state and "no school_id" error state
   - Only show the error AFTER the fetch completes AND school_id is null
   - Don't show error during loading

**Before (staff/page.tsx, line ~545):**
```typescript
const { data: userProfile, error } = await getSupabaseClient()
  .from('users')
  .select('school_id')
  .eq('id', user.id)
  .single();  // ❌ Fails with PGRST116 if record missing
```

**After:**
```typescript
const { data: userProfile, error } = await getSupabaseClient()
  .from('users')
  .select('school_id')
  .eq('id', user.id)
  .maybeSingle();  // ✅ Returns null instead of error

if (error) {
  console.error('[Page] Error getting user profile:', error);
  toast.error('Failed to load your school information');
  return;
}

if (userProfile?.school_id) {
  setSchoolId(userProfile.school_id);
} else {
  // Only show error AFTER fetch completes with no school_id
  toast.error('Your account is not linked to a school');
  return;
}
```

**Academic page** (line ~68, 123): Also has `.single()` → `.maybeSingle()` bug on school and term lookups — apply same fix.

### Verification
```bash
npm run dev
# 1. Login as SCHOOL_ADMIN
# 2. Verify pages load without "account not linked" error
# 3. Verify school data appears in all pages
# 4. Check browser console for no errors
```

---

## Task 2: Build 6-Tab Staff Edit Modal (Match Student Modal Pattern)
**Depends on:** Task 1 (school context must load first)

### Problem
Staff edit modal exists in `src/app/school-admin/staff/page.tsx` but is a bare placeholder. Student edit modal in `src/app/school-admin/students/page.tsx` has full 6-tab UI. Staff modal must match student modal design.

### Solution
Rebuild staff edit modal with 6 identical tabs, each with staff-specific fields. Tabs are: Personal, Admission, Class, Employment, Salary, Contact.

### Staff Fields by Tab
- **Personal:** Full Name, Gender, Date of Birth
- **Admission:** Staff ID (disabled), Position
- **Class:** Assigned Class (select), Subject Assignments (checkboxes)
- **Employment:** Department, Employment Date, Status
- **Salary:** Salary, Bank Name, Account Number, Account Name
- **Contact:** Email, Role (disabled)

### Files to Create/Modify
- `src/app/school-admin/staff/page.tsx` — Rebuild `StaffEditModal` component (already exists at line ~120 but needs full implementation)

### Implementation
The modal skeleton exists. Replace the implementation at lines 120–360 with:
1. Identical tab structure to Student modal: 6 tabs with same header styling (gradient blue, emoji icons)
2. Same form validation pattern
3. Same submit button styling
4. All fields are editable except: Staff ID, Role
5. Load lookup data (classes, subjects) on modal open using existing pattern

**Tab Content (use exact field structure below):**

```typescript
// Personal Tab
- Full Name (text input, required)
- Gender (select: MALE, FEMALE, OTHER)
- Date of Birth (date input)

// Admission Tab
- Staff ID (text input, disabled, readonly)
- Position (text input, required)

// Class Tab
- Assigned Class (select from class_arm_combos with format "Class Name Arm")
- Subject Assignments (checkboxes, multi-select, loaded from subjects table)

// Employment Tab
- Department (text input, optional)
- Employment Date (date input, optional)
- Status (select: ACTIVE, PAUSED, INACTIVE, SUSPENDED)

// Salary Tab
- Salary (number input with decimals)
- Bank Name (text input)
- Account Number (text input)
- Account Name (text input)

// Contact Tab
- Email (email input, required)
- Role (text input, disabled)
```

### Verification
```bash
npm run dev
# 1. Navigate to Staff Management page
# 2. Click Edit on any staff member
# 3. Modal opens with all 6 tabs visible
# 4. Each tab loads correctly with proper fields and styling
# 5. Changes save without errors
```

---

## Task 3: Fix Staff Letter Generation (Appointment Letters)
**Depends on:** Task 1 (school context must load first)

### Problem
Generating staff appointment letters fails with:
- HTTP 406 error (API route call fails)
- WebSocket disconnection error (real-time unavailable)
- Letter shows "staff" instead of actual role/position

### Solution
1. Use client-side Supabase query directly (not API route) to fetch staff data
2. Handle WebSocket disconnection gracefully with fallback
3. Include staff role/position in letter body
4. LetterPreviewModal already has Preview, Download, Share, Edit buttons — verify they work

### Files to Modify
- `src/services/letter-generation.service.ts` — `fetchStaffData()` method (line ~40)
- `src/components/admin/LetterPreviewModal.tsx` — Verify buttons exist (they do)
- `src/app/school-admin/staff/page.tsx` — Call modal correctly (line ~815)

### Changes Required

**letter-generation.service.ts, `fetchStaffData()` method:**

Current issue: Using fetch() to API route → 406 error. Change to direct Supabase query.

**Before (line ~40):**
```typescript
// ❌ Current: Using API route that fails with 406
const response = await fetch(`/api/staff/${staffId}`, {...});
```

**After:**
```typescript
// ✅ Direct Supabase query
const { data: staffRecord, error: staffError } = await this.supabase
  .from('staff')
  .select(`
    id,
    user_id,
    position,
    department,
    employment_date,
    salary,
    bank_name,
    account_number,
    account_name
  `)
  .eq('id', staffId)
  .eq('school_id', schoolId)
  .maybeSingle();

if (staffError && staffError.code !== 'PGRST116') {
  console.error('[LetterGenService] Error fetching staff:', staffError);
}

// Fetch user data separately
const { data: userData } = await this.supabase
  .from('users')
  .select('id, full_name, email, phone, gender, role')
  .eq('id', staffRecord.user_id)
  .maybeSingle();

// Return combined data with role field populated
return {
  id: staffRecord?.id || staffId,
  full_name: userData?.full_name || '',
  email: userData?.email || '',
  position: staffRecord?.position || 'Staff Member',
  role: userData?.role || 'Staff Member',  // ✅ Include role
  // ... other fields
};
```

**Appointment Letter Body (in `generateAppointmentLetter()` method):**

Change from:
```
We are pleased to offer you a position of [Position] as a staff member...
```

To:
```
We are pleased to offer you a position of [Position] as a [Role]...
```

**LetterPreviewModal buttons** — Already exist (Preview, Download, Share, Edit). No changes needed. Verify in code at lines 40-80.

### Verification
```bash
npm run dev
# 1. Navigate to Staff Management page
# 2. Click "Generate Appointment Letter" on any staff member
# 3. Modal opens with letter preview
# 4. Verify role is shown (not just "Staff")
# 5. Click Download — saves PDF
# 6. Click Share/Edit — modals work
# 7. No WebSocket or 406 errors in console
```

---

## Task 4: Rebuild Academic Page with Real-Time Data
**Depends on:** Task 1 (school context must load first)

### Problem
Academic page shows error or blank screen instead of displaying:
- All academic sessions (from `academic_sessions` table)
- All terms per session (from `academic_terms` table)
- All classes with student count and form master name

### Solution
Rebuild the academic page to load and display data in a standard grid/card layout with three sections:
1. Sessions list
2. Terms list filtered by selected session
3. Classes list with metadata

### Files to Modify
- `src/app/school-admin/academic/page.tsx` (entire file rebuild)

### Database Queries to Use
```typescript
// 1. Load sessions
const { data: sessions } = await supabase
  .from('academic_sessions')
  .select('id, session_year, is_active, created_at')
  .eq('school_id', schoolId)
  .order('session_year', { ascending: false });

// 2. Load terms
const { data: terms } = await supabase
  .from('academic_terms')
  .select('id, session_id, term_name, term_number, is_active')
  .eq('school_id', schoolId)
  .order('term_number', { ascending: true });

// 3. Load classes with student count and form master
const { data: classes } = await supabase
  .from('class_arm_combos')
  .select(`
    id,
    classes(id, name),
    arms(id, name),
    school_id
  `)
  .eq('school_id', schoolId);

// For each class, count students:
const { data: enrollments } = await supabase
  .from('student_class_enrollments')
  .select('id, class_arm_combo_id')
  .eq('class_arm_combo_id', classId);

// For form master, fetch from teacher_class_assignments:
const { data: formMaster } = await supabase
  .from('teacher_class_assignments')
  .select('users(full_name)')
  .eq('class_arm_combo_id', classId)
  .eq('is_class_teacher', true)
  .maybeSingle();
```

### UI Structure
```
┌─────────────────────────────────────────┐
│  Academic Management                    │
├─────────────────────────────────────────┤
│  [Sessions] [Terms] [Classes]           │ (Tab buttons)
├─────────────────────────────────────────┤
│  
│  IF Sessions Tab:
│    ┌──────────┐ ┌──────────┐            │
│    │2024/2025 │ │2023/2024 │            │ (Cards)
│    │Active    │ │Inactive  │            │
│    └──────────┘ └──────────┘            │
│
│  IF Terms Tab:
│    ┌──────────┐ ┌──────────┐            │
│    │Term 1    │ │Term 2    │            │ (Cards)
│    │Active    │ │Inactive  │            │
│    └──────────┘ └──────────┘            │
│
│  IF Classes Tab:
│    ┌──────────────────┐                  │
│    │JS1A              │                  │ (Cards/Table)
│    │Students: 45      │                  │
│    │Form Master: Mrs. │                  │
│    │                  │                  │
│    └──────────────────┘                  │
└─────────────────────────────────────────┘
```

### Code Fixes Required
- Line 68: Change `.single()` to `.maybeSingle()` on school query
- Line 123 (approximately): Change `.single()` to `.maybeSingle()` on term query
- Replace entire render logic with card-based UI

### Verification
```bash
npm run dev
# 1. Navigate to Academic Management page
# 2. Verify Sessions tab loads and displays all sessions
# 3. Select a session → Terms tab loads and filters by session
# 4. Terms tab shows all terms for selected session
# 5. Classes tab shows all classes with student count and form master
# 6. No errors in console
```

---

## Task 5: Fix Results Page Cascade Dropdowns (Real-Time Data)
**Depends on:** Task 1 (school context must load first)

### Problem
Results page dropdowns don't cascade:
- Sessions dropdown doesn't load on mount
- Selecting session doesn't load terms
- Selecting term doesn't load classes/students
- No real-time data fetching

### Solution
Implement proper cascade: Sessions → Terms → Classes → Students

### Files to Modify
- `src/app/school-admin/results/page.tsx` (entire file rebuild)

### Cascade Logic
```typescript
// On mount: Load sessions for this school
const loadSessions = async () => {
  const { data: sessions } = await supabase
    .from('academic_sessions')
    .select('id, session_year, is_active')
    .eq('school_id', schoolId)
    .order('session_year', { ascending: false });
  setSessions(sessions || []);
};

// When session selected: Load terms for that session
const loadTerms = async (sessionId) => {
  const { data: terms } = await supabase
    .from('academic_terms')
    .select('id, term_name, term_number')
    .eq('session_id', sessionId)
    .eq('school_id', schoolId)
    .order('term_number', { ascending: true });
  setTerms(terms || []);
};

// When term selected: Call API /api/results/school-classes-and-students
const loadClasses = async (schoolId, termId) => {
  const response = await fetch(
    `/api/results/school-classes-and-students?schoolId=${schoolId}&termId=${termId}`
  );
  const data = await response.json();
  setClasses(data.classes || []);
};

// When class selected: Display students from classes[index].students
```

### Dropdown States
```
┌─────────────────────────────────────────┐
│  Results Management                     │
├─────────────────────────────────────────┤
│
│  Sessions:     [Select Session] ▼       │ (Loads on mount)
│  Terms:        [Disabled] ▼             │ (Enabled when session selected)
│  Classes:      [Disabled] ▼             │ (Enabled when term selected)
│  Students:     [Disabled] ▼             │ (Enabled when class selected)
│
│  Results Table:
│  ┌────────────────────────────────────┐ │
│  │ Admission # │ Name │ Score │ Grade │ │
│  ├────────────────────────────────────┤ │
│  │ ADM001      │ John │ 75    │ A     │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Loading States
- Sessions: Load on mount, show spinner
- Terms: Show "Select Session first" until session chosen, then load on select
- Classes: Show "Select Term first" until term chosen, then load on select
- Students: Populated from selected class data

### Code Changes
1. Add `loadSessions()` in `useEffect` on component mount
2. Add `useEffect` when `selectedSession` changes → `loadTerms()`
3. Add `useEffect` when `selectedTerm` changes → `loadClasses()`
4. When class selected → show students from that class

### Verification
```bash
npm run dev
# 1. Navigate to Results page
# 2. Sessions dropdown populated on load
# 3. Select a session → Terms dropdown loads and enables
# 4. Select a term → Classes dropdown loads and enables
# 5. Select a class → Students dropdown loads with student names
# 6. Results table updates with scores, grades, and performance ratings
# 7. No errors in console
# 8. All data loads in real-time from Supabase
```

---

## Dependency Order

**Execute in this order:**

1. ✅ **Task 1: Fix Navigation & School Context** — All other tasks depend on this
2. ✅ **Task 2: Build 6-Tab Staff Edit Modal** — Once school loads, can fetch lookup data
3. ✅ **Task 3: Fix Staff Letter Generation** — Once school loads and modal works
4. ✅ **Task 4: Rebuild Academic Page** — Once school loads and context is stable
5. ✅ **Task 5: Fix Results Page Cascade** — Once school loads and context is stable

**Parallel after Task 1:** Tasks 2, 3, 4, 5 are independent and can run in parallel once Task 1 completes.

---

## Database Columns Verified (Migration 163)

✅ All required columns exist after running migration 163:

**Staff table:**
- `salary DECIMAL(15, 2)`
- `bank_name VARCHAR(255)`
- `account_number VARCHAR(50)`
- `account_name VARCHAR(255)`
- `department TEXT`

**Students table:**
- `status VARCHAR(50) DEFAULT 'ACTIVE'` (ACTIVE, INACTIVE, TRANSFERRED, GRADUATED)

**Schools table (existing):**
- `name, email, phone, address, logo_url, etc.`

---

## Build & Deployment

```bash
# After all tasks complete:
npm run build     # Verify no errors
npm run dev       # Test locally

# Deploy to Vercel:
git add .
git commit -m "fix: rebuild school admin dashboard - fix navigation, staff modal, letters, academic, results"
git push origin rebuild/school-admin-dashboard

# Create PR → merge to main → Vercel auto-deploys
```

---

## Notes

- All pages use `.maybeSingle()` to avoid PGRST116 errors on missing records
- All dropdowns show proper loading states (not disabled during load, only before selection)
- All letter generation uses direct Supabase client queries, not API routes
- All data is real-time from Supabase — no caching delays
- Staff edit modal exactly matches Student edit modal design/behavior
