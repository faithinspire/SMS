# Phase 2: Complete Teacher & Student Registration System

## Overview
This phase implements a bulletproof registration system with:
- Proper data binding to actual database records
- Cascading dropdown selectors
- Multi-select subject assignment
- Form validation and error handling
- Complete API integration

## Architecture

### Data Flow
```
User Registration Flow
  ↓
Registration Service (Load configs)
  ├→ Load Classes (by school_id, section)
  ├→ Load Arms (by class_id)
  ├→ Load Streams (by class_id for SS1/SS2/SS3)
  └→ Load Subjects (by school_id, applicable_to_levels)
  ↓
Registration Modal (Multi-step form)
  ├→ Personal Information
  ├→ Academic Placement (Class/Arm/Stream)
  ├→ Subject Selection (Multi-select)
  ├→ Review & Confirm
  └→ Submit Registration
  ↓
API Route (Validation & Save)
  ├→ Validate school_id
  ├→ Create user account
  ├→ Create student/teacher record
  ├→ Link subjects and assignments
  ├→ Auto-create score sheets
  └→ Return success
  ↓
Supabase Database
  └→ All data persisted with proper relationships
```

## Implementation Steps

### Step 1: Create Registration Configuration Service
File: `src/services/registration-config.service.ts`
- Loads classes, arms, streams, subjects
- Filters by school_id and section
- Handles caching and error states

### Step 2: Build Teacher Registration Modal
File: `src/components/admin/TeacherRegistrationModal.tsx`
- Step 1: Select Primary/Secondary
- Step 2: Personal Information (Name, Email, Phone)
- Step 3: Employment Information (Salary, Qualification)
- Step 4: Teaching Assignment
  - Dropdown: Select Class (Optional)
  - List: Select Subjects (Multi-select, Required min 1)
- Step 5: Review & Register

### Step 3: Build Student Registration Modal
File: `src/components/admin/StudentRegistrationModal.tsx`
- Step 1: Personal Information
- Step 2: Parent Information
- Step 3: Academic Placement
  - Dropdown: Select Section (PRIMARY/SECONDARY)
  - Dropdown: Select Class (dynamic, by section)
  - Dropdown: Select Arm (dynamic, by class)
  - Dropdown: Select Stream (optional, for SS1/SS2/SS3)
- Step 4: Subject Selection (Multi-select)
- Step 5: Review & Register

### Step 4: API Routes
- `PUT /api/admin/teacher/register` — Register teacher
- `PUT /api/admin/student/register` — Register student
- `GET /api/config/registration` — Load classes, subjects, etc.

### Step 5: Database Triggers
- Auto-create score_sheets when student enrolls in subject
- Trigger already created in migration 106

## Testing Checklist
- [ ] Classes dropdown shows real classes from database
- [ ] Arms cascade when class selected
- [ ] Streams appear for SS1/SS2/SS3 only
- [ ] Subjects list populated from database
- [ ] Multi-select works with 1+ subjects
- [ ] Teacher registration saves to database
- [ ] Student registration saves to database
- [ ] Score sheets auto-created for student subjects
- [ ] No errors in browser console
- [ ] No database FK errors

## Success Criteria
✅ All dropdowns show actual database records (not mocks)
✅ No "No classes available" when classes exist
✅ Multi-select allows selecting multiple subjects
✅ Data saves to Supabase without FK errors
✅ Student dashboards show correct class and subjects
