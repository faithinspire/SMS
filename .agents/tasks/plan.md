# School Admin Rebuild: Investigation & Planning Report

## Executive Summary

Five modules are broken and require rebuilding:
1. **School Context Resolution** — auth chain doesn't reliably map auth.users.id → users.user_id → users.school_id
2. **Staff Page & Staff List** — no staff service exists; staff queries from users table not from dedicated staff table
3. **Staff Edit Modal** — doesn't exist; needs rebuild matching Student Edit quality
4. **Appointment Letter Generation** — API route `/api/letters/fetch-staff` missing (404); service exists but endpoint doesn't
5. **Result Management** — Session→Term→Class cascade partially works but schema inconsistencies cause query failures

---

## 1. ROOT CAUSE ANALYSIS

### 1.1 School Context Resolution Broken

**Problem:**  
Users with roles `SCHOOL_ADMIN` or `ADMIN` see "account not linked to school" despite valid registration.

**Root Cause:**  
`AuthService.getCurrentUser()` (src/services/auth.service.ts lines 160–238) uses this priority order:

1. PRIORITY 1: Check `auth.users.user_metadata.school_id` — this is set during signup in auth metadata
2. PRIORITY 2: If no metadata school_id, query `users` table with `eq('id', data.user.id)` — **BUT this query uses `id` not `user_id`**
3. PRIORITY 3: Fall back to undefined school_id

The users table has:
- `id` UUID PK — generated separately
- `user_id` UUID FK — references auth.users.id
- `school_id` UUID FK — references schools

**The query on line 185–194 is wrong:**
```typescript
const { data: userRecord, error: userError } = await supabase
  .from('users')
  .select('role, school_id')
  .eq('id', data.user.id)  // ❌ WRONG: searching by users.id, not users.user_id
  .maybeSingle()
```

Should be:
```typescript
.eq('user_id', data.user.id)  // ✅ CORRECT: auth.users.id → users.user_id → users.school_id
```

**Impact:**  
Users skip PRIORITY 1 if auth metadata doesn't have `school_id`, then PRIORITY 2 fails because the lookup is on the wrong column, so they end up at PRIORITY 3 with `school_id: undefined`.

---

### 1.2 Staff Page Missing

**Problem:**  
No dedicated staff list/management page exists in `src/app/school-admin/`.

**Current State:**  
- `src/services/staff-profile.service.ts` exists but is minimal
- Dashboard (src/app/school-admin/dashboard/page.tsx line 93) queries `users` table with `in('role', ['TEACHER', 'HEAD_TEACHER', 'PRINCIPAL', 'ACCOUNTANT', 'STAFF'])`
- Schema has both `users` and `staff` tables, but the `staff` table is rarely used
- No dedicated Staff service for CRUD operations

**Schema Mismatch:**
- `users` table has: id, school_id, email, full_name, role, phone, gender, address, state, lga, status
- `staff` table has: id, user_id (FK to users.id), school_id, position, employment_date, salary, bank_name, account_number, account_name, department, status (added in migration 167)
- They are not properly linked — `staff.user_id` → `users.id`, but the dashboard queries only `users`

---

### 1.3 Staff Edit Modal Missing

**Problem:**  
No component exists at `src/components/admin/StaffProfileEditModal.tsx`.

**Current Reference:**  
`StudentProfileEditModal.tsx` (lines 1–500+) is a fully-built multi-section form with:
- Tab-based navigation (personal, admission, class, guardian, contact)
- Multi-table updates (users, students, guardians, student_subjects, class_arm_combos)
- Form validation and error handling
- Bulk subject enrollment logic

**Gap:**  
Staff Edit must mirror this structure but for staff:
- Personal Information (first/last name, gender, date of birth, marital status, state, LGA, passport)
- Contact Information (email, phone, alternate phone, address)
- Employment Information (staff ID, employee number, hire date, appointment date, department, position, role, status)
- Qualifications (highest qualification, institution, course, graduation year, professional certs)
- Class Assignment (sessions, classes, class arms, class teacher status)
- Subject Assignment (load school subjects, multi-select by class/arm combo)
- Salary & Bank (salary, frequency, bank, account name, account number, pension fields)

Must update: `users`, `staff`, `teacher_class_assignments`, `subject_teacher_assignments` on save.

---

### 1.4 Appointment Letter Generation 404

**Problem:**  
`LetterGenerationService.fetchStaffData()` (src/services/letter-generation.service.ts line 20) calls `/api/letters/fetch-staff?staffId=X&schoolId=Y` which does NOT exist.

**Evidence:**  
- Service file: src/services/letter-generation.service.ts line 24
- Console logs show 404 responses
- No route in `src/app/api/letters/*`

**Impact:**  
- LetterPreviewModal (src/components/admin/LetterPreviewModal.tsx line 45) calls this service
- StaffData fetch fails → HTML generation returns null → preview shows nothing

**What Exists:**  
- `LetterGenerationService.generateAppointmentLetter()` (line 95–290) — HTML generation works
- `LetterGenerationService.fetchStudentData()` (line 45–85) — queries Supabase directly (works)
- `LetterGenerationService.fetchSchoolData()` (line 88–105) — queries Supabase directly (works)
- `html2pdf.js` is in package.json (dependency exists)

**What's Missing:**  
1. API route `/api/letters/fetch-staff` (should query staff + user + assignment data)
2. PDF generation endpoint (should call html2pdf on server or return HTML for client)
3. Email sharing endpoint `/api/letters/send-email` (mentioned in LetterPreviewModal line 138 but doesn't exist)

---

### 1.5 Result Management Cascade Broken

**Problem:**  
Results page (src/app/school-admin/results-rebuilt.tsx) tries to load Session → Term → Class → Students → Subjects but fails partway.

**Schema Issues Found:**
- `academic_sessions` table exists (schema found in migrations)
- `academic_terms` table exists but columns are `term_order` not `term_number`
- Terms query uses `.eq('session_id', selectedSession)` but migration 163 renamed this to `session_year` in some places
- Classes query tries to fetch from `class_arm_combos` but the relationship to terms is missing — there's no `term_id` in `class_arm_combos`
- Score sheets (score_sheets table) have `term_id` FK but no relationship back through classes

**Cascade Break Points:**
1. Session load works (academic_sessions table exists)
2. Term load — query assumes `session_id` FK exists; migration 163 indicates schema inconsistency
3. Class load — `class_arm_combos` has no `term_id` column; classes are global to school, not term-scoped
4. Student load — should work if class_arm_combo_id matches
5. Subject load — should work if student_subjects exists

**Root Issue:**  
The data model treats classes as school-scoped (not term-scoped), but score sheets are term-scoped. Teachers may teach different classes in different terms, but the schema doesn't explicitly model this.

---

## 2. DATABASE SCHEMA SUMMARY

### Core Tables (Multi-tenant, all have school_id FK)

| Table | Key Columns | Foreign Keys | Issue |
|-------|------------|--------------|-------|
| schools | id, name, logo_url, type, status | — | — |
| users | id, user_id?, school_id, email, full_name, role, phone, gender, address, state, lga, status | user_id→auth.users.id, school_id→schools.id | **user_id column mapping missing in queries** |
| staff | id, user_id, school_id, position, employment_date, salary, bank_name, account_number, account_name, department, status | user_id→users.id, school_id→schools.id | Rarely used; most queries hit users table |
| teacher_class_assignments | id, teacher_id, class_arm_combo_id, school_id, is_class_teacher | teacher_id→users.id, class_arm_combo_id→class_arm_combos.id, school_id→schools.id | **New in migration 165** |
| subject_teacher_assignments | id, subject_id, class_arm_combo_id, teacher_id, school_id | subject_id→subjects.id, class_arm_combo_id→class_arm_combos.id, teacher_id→users.id, school_id→schools.id | — |
| classes | id, school_id, name, level, type | school_id→schools.id | — |
| class_arm_combos | id, school_id, class_id, arm_id, class_teacher_id | class_id→classes.id, arm_id→arms.id, class_teacher_id→users.id, school_id→schools.id | **No term_id** (classes are school-scoped, not term-scoped) |
| academic_sessions | id, school_id, session_year, is_active | school_id→schools.id | — |
| academic_terms | id, school_id, session_id, term_name, term_order, is_active | session_id→academic_sessions.id, school_id→schools.id | Column name: `term_order` not `term_number` |
| subjects | id, school_id, name, code, applicable_to_levels | school_id→schools.id | — |
| students | id, user_id, school_id, admission_number, date_of_birth, class_arm_combo_id, department, status | user_id→users.id, class_arm_combo_id→class_arm_combos.id, school_id→schools.id, | — |
| student_subjects | id, student_id, subject_id, school_id, subject_teacher_id | student_id→students.id, subject_id→subjects.id, subject_teacher_id→users.id, school_id→schools.id | — |
| score_sheets | id, school_id, student_id, subject_id, term_id, test1–exam, grade, total | student_id→students.id, subject_id→subjects.id, term_id→academic_terms.id, school_id→schools.id | — |

### Known Column Additions (Migration 167)

```sql
ALTER TABLE staff
ADD COLUMN IF NOT EXISTS salary DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS account_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS account_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS department TEXT;

ALTER TABLE students
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';

ALTER TABLE schools
ADD COLUMN IF NOT EXISTS school_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS website_url VARCHAR(255),
ADD COLUMN IF NOT EXISTS principal_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS principal_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS established_year INTEGER;
```

---

## 3. DEPENDENCIES & LIBRARIES

### Available for Use
- **html2pdf.js** (v0.10.1) — client-side PDF generation (already in package.json)
- **Supabase client** (@supabase/supabase-js v2.38.0)
- **React Hot Toast** (v2.6.0) — notifications
- **Lucide React** (v0.292.0) — icons

### No Imported DOC Library
No `docx` library for .docx generation — only HTML/PDF support. Appointment letters should generate PDF via html2pdf.

---

## 4. CURRENT IMPLEMENTATION STATUS

### What Works
- ✅ Authentication login/logout (when school_id is in auth metadata)
- ✅ Student registration → creates users + students records
- ✅ StudentProfileEditModal (multi-section form, multi-table updates)
- ✅ Letter HTML generation (appointment + admission templates)
- ✅ Academic session loading
- ✅ Supabase direct queries in components

### What Doesn't Work
- ❌ School context resolution for SCHOOL_ADMIN after login (queries wrong column)
- ❌ Staff page (no dedicated component)
- ❌ Staff CRUD operations (no staff service methods)
- ❌ StaffProfileEditModal (doesn't exist)
- ❌ Appointment letter generation (API route missing)
- ❌ PDF download (html2pdf not integrated)
- ❌ Email sharing of letters (API route missing)
- ❌ WhatsApp sharing (API integration incomplete)
- ❌ Result management cascade (term-class relationship broken)

---

## 5. IMPLEMENTATION PLAN

### Phase 1: Fix School Context Resolution (CRITICAL)
**Files:**
- `src/services/auth.service.ts` — Fix PRIORITY 2 query (line 185)

**Fix:**
Change line 193 from `.eq('id', data.user.id)` to `.eq('user_id', data.user.id)`

**Verification:**
- Login as school admin → dashboard loads with school name
- No "account not linked to school" error

---

### Phase 2: Build Staff Service
**Files to Create:**
- `src/services/staff.service.ts` — Staff CRUD + data loading

**Capabilities:**
- `getStaffList(schoolId)` → query users table where role IN (...staff roles...)
- `getStaffById(staffId, schoolId)` → join users + staff tables
- `createStaff(staffData, schoolId)` → insert users + staff + teacher_class_assignments
- `updateStaff(staffId, updates, schoolId)` → update users + staff, handle subject assignments
- `deleteStaff(staffId, schoolId)` → cascade delete from users table

**Verification:**
- Service methods callable from components
- Return all required fields for staff display

---

### Phase 3: Build Staff Page Component
**Files to Create:**
- `src/app/school-admin/staff/page.tsx` — Staff list/management page

**Features:**
- Display staff table: name, ID, email, phone, role, position, department, employment date, class assignment, subject assignment, salary, status
- Action buttons: Appointment Letter, Edit, Delete
- Integration with StaffService

**Verification:**
- Page loads without errors
- Staff list displays with correct columns
- Buttons visible and clickable

---

### Phase 4: Build Staff Edit Modal
**Files to Create:**
- `src/components/admin/StaffProfileEditModal.tsx` — Multi-section staff edit form

**Sections:**
1. **Personal Information** — first/last/middle name, gender, DOB, marital status, nationality, state, LGA, passport/photo
2. **Contact Information** — email, phone, alternate phone, address, city, state, emergency contact
3. **Employment Information** — staff ID, employee number, hire date, appointment date, resumption date, employment type, department, position, role, status
4. **Qualifications** — highest qualification, institution, course, graduation year, professional certs
5. **Class Assignment** — load sessions/classes/arms, select and save to teacher_class_assignments
6. **Subject Assignment** — load school subjects, multi-select by class/arm, save to subject_teacher_assignments
7. **Salary & Bank** — salary, frequency, bank name, account name, account number, pension info

**Multi-Table Updates on Save:**
- Update `users` (full_name, email, phone, gender, address, state, lga, status)
- Update `staff` (position, employment_date, department, salary, bank_name, account_number, account_name)
- Insert/update `teacher_class_assignments` (class + arm + is_class_teacher)
- Insert/update `subject_teacher_assignments` (subject + class_arm_combo + teacher_id)

**Verification:**
- Form loads with all staff data populated
- Tabs navigate correctly
- Save updates all related tables
- No data loss on form submission

---

### Phase 5: Build Letter Generation API Route
**Files to Create:**
- `src/app/api/letters/fetch-staff/route.ts` — Staff data fetch endpoint

**Endpoint:**
```
GET /api/letters/fetch-staff?staffId=<id>&schoolId=<id>
Response: {
  success: boolean,
  data: {
    id, full_name, email, position, department, salary, salaryFrequency,
    bankName, accountNumber, accountName, role, employment_date, qualification
  }
}
```

**Implementation:**
- Query users table for staff user data
- Query staff table for position/salary/bank info
- Query teacher_class_assignments for class assignments
- Combine and return

**Verification:**
- Calling fetch returns 200 with staff data
- No 404 error

---

### Phase 6: Integrate PDF Generation
**Files to Modify:**
- `src/components/admin/LetterPreviewModal.tsx` — Add PDF download button

**Changes:**
- Use html2pdf library to convert HTML letter to PDF
- Download PDF with naming convention: `appointment-letter-{staffName}-{date}.pdf`
- Provide print button (already exists but ensure it works)

**Verification:**
- Click "Download PDF" → PDF downloads to browser
- PDF content matches preview
- No truncation

---

### Phase 7: Build Email Sharing API Route
**Files to Create:**
- `src/app/api/letters/send-email/route.ts` — Email letter endpoint (if email service available)

**Implementation:**
- Check if email service (Resend, SendGrid, Postmark) is configured
- If yes: send HTML letter as email attachment
- If no: return error with guidance to implement email service

**Verification:**
- Email endpoint callable (or returns sensible "not configured" message)

---

### Phase 8: Fix Result Management Cascade
**Files to Modify:**
- `src/services/academic.service.ts` — Fix term query logic
- `src/app/school-admin/results-rebuilt.tsx` — Fix component queries

**Fixes:**
1. Update `getTermsForSession()` to use `term_order` not `term_number`
2. Ensure term queries filter by `session_id` correctly
3. Verify class_arm_combo fetch (classes don't have term_id; they're school-scoped)
4. Verify student fetch by class_arm_combo_id
5. Verify score sheet fetch by term_id + student_id + subject_id

**Root Issue Resolution:**
Classes are school-scoped, not term-scoped. Score sheets are term-scoped. The cascade should be:
- Session → Terms (by session_id)
- Terms → (no direct class link; classes are school-scoped)
- Schools → ClassArmCombos (all classes for school)
- ClassArmCombos → Students (by class_arm_combo_id)
- Students + Subjects → ScoreSheets (by term_id + student_id + subject_id)

**Verification:**
- Results page loads without cascade errors
- Session → Term → Class → Student cascade works
- Score sheets display correctly

---

## 6. BUILD COMMAND & VERIFICATION

**Build:**
```bash
npm run build
```

**Test:**
```bash
npm run test
```

**Lint:**
```bash
npm next lint
```

**Run for Local Testing:**
```bash
npm run dev  # Runs on :3001 (see package.json line 5)
```

---

## 7. CROSS-FILE DEPENDENCIES

| Module | Depends On | Status |
|--------|-----------|--------|
| Auth Service | Supabase auth | ✅ Working (after school_id fix) |
| Staff Service | Supabase direct (users, staff tables) | 🔨 To be created |
| Staff Page | Staff Service + LetterPreviewModal | 🔨 To be created |
| Staff Edit Modal | Staff Service + Academic Service (for class/term combos) | 🔨 To be created |
| Letter Generation Service | Supabase direct (staff, users, schools) | ✅ Working (after API route added) |
| Letter API Route | Letter Generation Service | 🔨 To be created |
| Letter Preview Modal | Letter API Route + html2pdf | ✅ Mostly working (needs PDF integration) |
| Results Page | Academic Service (fixed term queries) | 🔨 Needs term_order fix |
| Academic Service | Supabase direct (academic_sessions, academic_terms, class_arm_combos) | ⚠️ Needs term_order rename |

---

## 8. IMPLEMENTATION ORDER

1. **Fix auth.service.ts** (1 line change) — unblocks school admin login
2. **Create staff.service.ts** — foundation for all staff operations
3. **Create staff page component** — staff list display
4. **Create StaffProfileEditModal** — staff data editing
5. **Create /api/letters/fetch-staff** — unblocks appointment letter generation
6. **Integrate PDF in LetterPreviewModal** — letter download
7. **Create /api/letters/send-email** — optional email sharing
8. **Fix academic.service.ts term queries** — fixes result management cascade

---

## 9. NOTES FOR IMPLEMENTER

- **No New Libraries:** html2pdf.js already in package.json
- **Supabase First:** All queries use Supabase client, no raw SQL
- **Multi-Tenant:** Every query must include `school_id` filter
- **User vs. Staff Table:** users table is primary; staff table has employment-specific fields (salary, bank, etc.)
- **Column Names:** Use `user_id` not `id` when joining users to staff
- **Term Ordering:** Use `term_order` not `term_number` when querying academic_terms
- **Class Scope:** Classes are school-scoped, not term-scoped; handle cascade accordingly

---

## 10. FILES TO CREATE/MODIFY

**Create:**
- src/services/staff.service.ts
- src/app/school-admin/staff/page.tsx
- src/components/admin/StaffProfileEditModal.tsx
- src/app/api/letters/fetch-staff/route.ts
- src/app/api/letters/send-email/route.ts (optional)

**Modify:**
- src/services/auth.service.ts (1 line fix)
- src/components/admin/LetterPreviewModal.tsx (add PDF integration)
- src/services/academic.service.ts (fix term query)
- src/app/school-admin/results-rebuilt.tsx (use fixed academic service)

**Total:** 5 new files, 4 modified files

---

## 11. ABSOLUTE PATHS (for implementer)

| File | Absolute Path |
|------|---------------|
| Auth Service | c:\Users\OLU\Desktop\SMS\src\services\auth.service.ts |
| Staff Service (create) | c:\Users\OLU\Desktop\SMS\src\services\staff.service.ts |
| Staff Page (create) | c:\Users\OLU\Desktop\SMS\src\app\school-admin\staff\page.tsx |
| Staff Edit Modal (create) | c:\Users\OLU\Desktop\SMS\src\components\admin\StaffProfileEditModal.tsx |
| Letter API Route (create) | c:\Users\OLU\Desktop\SMS\src\app\api\letters\fetch-staff\route.ts |
| Email API Route (create) | c:\Users\OLU\Desktop\SMS\src\app\api\letters\send-email\route.ts |
| Letter Preview Modal | c:\Users\OLU\Desktop\SMS\src\components\admin\LetterPreviewModal.tsx |
| Academic Service | c:\Users\OLU\Desktop\SMS\src\services\academic.service.ts |
| Results Page | c:\Users\OLU\Desktop\SMS\src\app\school-admin\results-rebuilt.tsx |

