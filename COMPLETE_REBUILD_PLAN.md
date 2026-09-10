# 🚀 COMPLETE REGISTRATION REBUILD PLAN

## MANDATE: End-to-End Verification Required

This is a COMPLETE REBUILD of Teacher and Student Registration.

**I will NOT claim this is fixed until:**
1. ✅ I trace the data pipeline from Supabase → API → React → UI
2. ✅ I verify the DATABASE actually has classes and subjects
3. ✅ I identify ANY missing or broken components
4. ✅ I rebuild the UI completely
5. ✅ I make real class and subject lists VISIBLE in the UI
6. ✅ I test the actual browser and show you screenshots/video of working dropdowns

---

## PHASE 1: ROOT CAUSE ANALYSIS (NOW)

### Step 1: Run Diagnostic
```bash
# Get school UUID from your account
curl "http://localhost:3000/api/debug/registration-trace?schoolId=YOUR_UUID"
```

This will show:
- ✅ Does school exist?
- ✅ Are there classes in database?
- ✅ Are there subjects in database?
- ✅ Are queries succeeding?
- ✅ Where is data disappearing?

### Step 2: Analyze Results
Based on diagnostic results, I will identify:
- **Root Cause 1:** Database is empty (need test data)
- **Root Cause 2:** API is broken (query errors)
- **Root Cause 3:** Component isn't connected (wrong import/render)
- **Root Cause 4:** State isn't updating (React bug)
- **Root Cause 5:** UI isn't displaying (CSS/display issue)

### Step 3: Find All Duplicate Components
Search for:
- Multiple TeacherRegistration components
- Multiple StudentRegistration components
- Multiple registration APIs
- Obsolete registration services

Keep ONE canonical implementation, DELETE the rest.

---

## PHASE 2: DATA LAYER FIX

If database is empty → INSERT TEST DATA:
```bash
curl -X POST http://localhost:3000/api/debug/insert-test-data \
  -H "Content-Type: application/json" \
  -d '{"schoolId": "your-uuid"}'
```

If API is broken → FIX THE API:
- Check Supabase queries
- Verify table names and columns
- Check authentication
- Test with direct SQL query

---

## PHASE 3: COMPLETE UI REDESIGN

### New Architecture

```
Current User (Authenticated School Admin)
    ↓
Get Current School ID (from user object)
    ↓
Registration Configuration Service
    ├→ Load Classes (filtered by school_id)
    ├→ Load Class Arms
    ├→ Load Streams
    └→ Load Subjects (filtered by school_id)
    ↓
Teacher Registration Modal (NEW DESIGN)
    ├→ Step 1: Select Section (PRIMARY/SECONDARY)
    ├→ Step 2: Personal Info
    ├→ Step 3: Employment Info
    ├→ Step 4: Teaching Assignment
    │   ├→ Card 1: Class Teacher (with dropdowns)
    │   └→ Card 2: Subjects (searchable multi-select)
    └→ Step 5: Review & Register
    ↓
Student Registration Modal (NEW DESIGN)
    ├→ Step 1: Personal Info
    ├→ Step 2: Parent Info
    ├→ Step 3: Academic Placement
    │   ├→ Section (PRIMARY/SECONDARY)
    │   ├→ Class (dynamic)
    │   ├→ Arm (dynamic)
    │   └→ Stream (if SS1/SS2/SS3)
    ├→ Step 4: Subject Selection
    └→ Step 5: Review & Register
```

### UI Components to Build

1. **RegistrationConfigurationService.ts** - Data source
2. **TeacherRegistrationWizard.tsx** - Complete redesign
3. **StudentRegistrationWizard.tsx** - Complete redesign
4. **ClassSelect.tsx** - Cascading selector
5. **SubjectsMultiSelect.tsx** - Searchable multi-select
6. **LoadingState.tsx** - Show while loading
7. **ErrorState.tsx** - Show errors, not empty

---

## PHASE 4: DATA BINDING

### Teacher Registration
```
Section Selection
  ↓ Load Classes for that section
Class Dropdown
  ↓ Load Arms for that class
Arm Selection
  ↓
Subject List (ALL subjects for school)
  ↓ Filtered by: applicable_to_levels
Subject Selection (multi-select)
```

### Student Registration
```
Section Selection (PRIMARY/SECONDARY)
  ↓ Load classes for that section
Class Dropdown
  ↓ Load arms for that class
Arm Selection
  ↓ Load streams if SS1/SS2/SS3
Stream Selection (if applicable)
  ↓
Subject List (for that class/section)
  ↓ Filtered by: applicable_to_levels AND class level
Subject Selection (multi-select)
```

---

## PHASE 5: DATABASE SAVE

When registration submitted:

### Teacher
Save:
```sql
INSERT INTO users (id, school_id, email, full_name, role, status)
INSERT INTO subject_teacher_assignments 
  (school_id, subject_id, class_arm_combo_id, teacher_id)
  for each subject selected
```

### Student
Save:
```sql
INSERT INTO users (id, school_id, email, full_name, role, status)
INSERT INTO students (user_id, school_id, class_arm_combo_id)
INSERT INTO student_subjects 
  (student_id, subject_id, school_id)
  for each subject selected
```

---

## PHASE 6: VERIFICATION

After rebuild, verify:

### Teacher Registration
1. Open http://localhost:3000/school-admin/dashboard
2. Click "+ Register Teacher"
3. **VERIFY:**
   - Step 4 shows CLASS TEACHER ASSIGNMENT dropdown
   - Dropdown contains real class names from database
   - Step 4 shows SUBJECTS TO TEACH list
   - List contains real subject names from database
   - Can select multiple subjects
   - Selected count updates
   - Can complete registration
   - Data saved to Supabase

### Student Registration
1. Click "+ Register Student"
2. **VERIFY:**
   - Section selector works
   - Class dropdown populates
   - Arm selector works
   - Stream selector appears for SS1/SS2/SS3
   - Subject list shows real subjects
   - Can select multiple subjects
   - Can complete registration
   - Data saved to Supabase

### Teacher Dashboard
1. Log in as registered teacher
2. **VERIFY:**
   - Teacher name displays
   - School name displays
   - If class teacher: CLASS STUDENTS shows students in that class
   - If subject teacher: SUBJECT STUDENTS shows students in those subjects

### Student Dashboard
1. Log in as registered student
2. **VERIFY:**
   - Student name displays
   - School name displays
   - Class displays
   - Arm displays
   - Stream displays (if applicable)
   - Subjects display
   - Class teacher name displays
   - Subject teachers display

---

## ACCEPTANCE CRITERIA

✅ **Task is COMPLETE only when ALL of these are true:**

- [ ] Diagnostic shows database HAS classes and subjects
- [ ] TeacherRegistrationModal.tsx is the ONLY teacher registration component being used
- [ ] StudentRegistrationModal.tsx is the ONLY student registration component being used
- [ ] Data loading code correctly queries by school_id
- [ ] School ID is correctly extracted from authenticated user
- [ ] Class dropdown displays REAL classes from database
- [ ] Subject list displays REAL subjects from database
- [ ] No "No subjects available" message when data exists
- [ ] Loading states show while fetching
- [ ] Error states show when queries fail
- [ ] Teacher can select a class (optional)
- [ ] Teacher can select multiple subjects (required)
- [ ] Student can select class/arm/stream
- [ ] Student can select subjects
- [ ] Registration saves to database
- [ ] Teacher dashboard shows correct assignments
- [ ] Student dashboard shows correct class and subjects
- [ ] UI is professional and responsive
- [ ] No hardcoded data
- [ ] No mock data
- [ ] All real data from Supabase

---

## TESTING CHECKLIST

Before claiming completion:

**Teacher Registration:**
- [ ] Open modal
- [ ] Select Primary or Secondary
- [ ] Fill personal info (steps 2-3)
- [ ] Step 4: See class dropdown with OPTIONS
- [ ] Step 4: See subjects list with OPTIONS
- [ ] Select a class (optional)
- [ ] Select 2+ subjects
- [ ] Submit
- [ ] Success message
- [ ] Data in Supabase

**Student Registration:**
- [ ] Open modal
- [ ] Fill personal info
- [ ] Select section
- [ ] Class dropdown shows classes
- [ ] Arm selector works
- [ ] Subject list shows subjects
- [ ] Select subjects
- [ ] Submit
- [ ] Success message
- [ ] Data in Supabase

**Dashboards:**
- [ ] Teacher dashboard shows assignments
- [ ] Student dashboard shows class and subjects

---

## TIMELINE

1. **Diagnostic:** 5 minutes
2. **Insert test data (if needed):** 2 minutes
3. **Identify root cause:** 5 minutes
4. **Fix data layer (if broken):** 15 minutes
5. **Rebuild UI:** 30 minutes
6. **Test and verify:** 20 minutes

**Total: ~80 minutes for complete end-to-end fix**

---

## TOOLS I'LL USE

- ✅ Diagnostic service to trace data
- ✅ Debug API to query actual database
- ✅ Test data insertion to populate school
- ✅ Console logging to verify data flow
- ✅ React DevTools to inspect state
- ✅ Browser to visually verify

---

**Next Action:** You share diagnostic results, I identify root cause, then rebuild

NO MORE PATCHING. COMPLETE FIX OR NOTHING.
