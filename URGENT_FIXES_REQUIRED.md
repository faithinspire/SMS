# URGENT FIXES REQUIRED

## 🔴 Critical Issues to Fix

### 1. Port 3000 Error (500 Internal Server Error)
**Issue:** `http://localhost:3000/_next/static/chunks/app-pages-internals.js net::ERR_ABORTED 500`

**Root Cause:** TypeScript compilation errors in one of the page files

**Fix:**
- Run `npm run build` to find exact errors
- Check for missing imports in new files
- Verify all pages have proper 'use client' directive
- Check ResultShareModal import in results page

**Action:**
```bash
npm run dev --experimental-app
# Or
next dev
```

---

### 2. Old Landing Pages & Dashboards
**Issue:** Old superadmin/landing pages still loading

**Current State:**
- `/src/app/landing/page.tsx` - NEW (correct)
- Need to check for `/src/app/admin/` or other old dirs

**Files to Delete:**
```
/src/app/admin/ (if exists - old directory)
/src/pages/ (if exists - old Next.js pages)
```

**Action:**
- Use file explorer to check for `/src/app/admin/` or `/src/pages/` 
- Delete if found
- Verify only `/src/app/landing/page.tsx` exists

---

### 3. Mark Sheet Structure (TEST 10+10+10+10 + EXAM 60)
**Issue:** Database schema needs verification

**Solution:**
✅ Created: `/src/constants/nigerian-subjects.ts`
- MARK_CONFIGURATION exported
- TEST_1_MAX: 10, TEST_2_MAX: 10, TEST_3_MAX: 10, TEST_4_MAX: 10, EXAM_MAX: 60

**Database:**
- score_sheets table already supports: test1, test2, test3, test4, exam (all numeric)
- Total auto-calculated

**Action:** 
- No DB changes needed
- Use constants in teacher results page
- Validate scores against MARK_CONFIGURATION

---

### 4. Nigerian Subjects Dropdown
**Issue:** Teacher CBT needs dropdown of Nigerian subjects

**Solution:**
✅ Created: `/src/constants/nigerian-subjects.ts`
- NIGERIAN_SUBJECTS object with Primary & Secondary
- Functions: getSubjectsForSchoolType(), getSubjectById()

**Implementation:**
In `/src/app/teacher/cbt/page.tsx`:
```typescript
import { NIGERIAN_SUBJECTS, getSubjectsForSchoolType } from '@/constants/nigerian-subjects'

// In render:
<select>
  {getSubjectsForSchoolType(school.type).map(subject => (
    <option key={subject.id} value={subject.id}>
      {subject.name} ({subject.code})
    </option>
  ))}
</select>
```

**Action:**
- Update `/src/app/teacher/cbt/page.tsx` to import and use subjects
- Add subject dropdown to exam creation form

---

### 5. Teacher Registration - Class & Subject Dropdowns
**Issue:** Registration form doesn't show class/subject selection

**Current Form:** `/src/app/auth/staff/register/page.tsx`

**Missing:**
- Class selection dropdown (after school selected)
- Subject selection dropdown (multi-select for subjects to teach)

**Implementation:**
```typescript
// After school selected:
1. Load classes for that school from class_arm_combos
2. Show dropdown: "Select Class to Manage"
3. Load subjects from subjects table  
4. Show multi-select: "Select Subjects to Teach"
5. On submit: create staff + assign class & subjects
```

**Action:**
- Update `/src/app/auth/staff/register/page.tsx`
- Add class dropdown (query class_arm_combos)
- Add subject multi-select (query subjects)
- Populate on school selection

---

### 6. Principal Dashboard - Lesson Notes & Student Lists
**Issue:** Principal dashboard empty, needs lesson notes and student lists

**Current:** `/src/app/principal/dashboard/page.tsx` - basic stats only

**Required Features:**
1. **Lesson Notes Section**
   - Display uploaded lesson notes from teachers
   - Show: Teacher name, Subject, Class, Date, Download button
   - Filter by subject/class

2. **Student Lists by Class**
   - Dropdown to select class
   - Table of students in selected class
   - Show: Name, Admission #, Class, Contact

**Implementation:**
- Query lesson_notes table (if exists) or file storage
- Query students by class_arm_combo_id
- Create tabs: Overview | Lesson Notes | Students

**Action:**
- Check if lesson_notes table exists in DB
- If not, create migration to add:
  ```sql
  CREATE TABLE lesson_notes (
    id UUID, teacher_id UUID, subject_id UUID, class_arm_combo_id UUID,
    file_url TEXT, title TEXT, uploaded_at TIMESTAMP
  )
  ```
- Update principal dashboard with tabs

---

### 7. Headteacher Dashboard - Same as Principal
**Current:** `/src/app/headmaster/dashboard/page.tsx` - basic stats only

**Required Features:** Same as Principal (Lesson Notes + Student Lists)

**Action:**
- Update using same approach as Principal
- Share lesson_notes & student list logic

---

### 8. Accountant Dashboard - Payment Management
**Issue:** Needs student & staff payment recording + receipt sharing

**Required Features:**
1. **Student Payment Recording**
   - List of all students
   - Click student → Payment form
   - Record: Amount, Method (Cash/Bank/Card/Online), Date
   - Generate receipt
   - Share receipt (WhatsApp/Email)

2. **Staff Salary Recording**
   - List of all staff
   - Click staff → Salary form
   - Record: Amount, Salary Month, Status (Pending/Paid)
   - Generate payslip
   - Share payslip (WhatsApp/Email)

3. **Dashboard Statistics**
   - Total students
   - Total staff
   - Total payments recorded
   - Total salaries paid
   - Pending payments

4. **Recent Transactions**
   - Table of recent payments & salaries
   - Filter by type (Student/Staff)
   - Export to CSV

**Implementation:**
- Create payment form modal
- Use ResultSharingService for WhatsApp/Email
- Query students & staff from DB
- Update payments table

**Action:**
- Update `/src/app/accountant/dashboard/page.tsx`
- Add student/staff lists tabs
- Add payment recording form
- Integrate receipt sharing

---

### 9. Database Migrations Needed
**Check if these tables exist:**
```sql
-- These should exist:
CREATE TABLE students (...)
CREATE TABLE staff (...)
CREATE TABLE payments (...)
CREATE TABLE salaries (...)
CREATE TABLE lesson_notes (...)  -- IF NOT, NEED TO CREATE

-- Check existing:
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
```

**If missing, create:**
```sql
CREATE TABLE lesson_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id),
  teacher_id UUID NOT NULL REFERENCES users(id),
  subject_id UUID REFERENCES subjects(id),
  class_arm_combo_id UUID REFERENCES class_arm_combos(id),
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 📋 Action Checklist

### Immediate (Today)
- [ ] Run `npm run build` to find exact errors
- [ ] Check for old `/src/app/admin/` or `/src/pages/` directories - DELETE if found
- [ ] Verify `/src/app/landing/page.tsx` is correct and current
- [ ] Install constants: `/src/constants/nigerian-subjects.ts` ✅ DONE
- [ ] Test localhost:3000 after fixes

### This Week
- [ ] Update teacher registration with class/subject dropdowns
- [ ] Update teacher CBT with Nigerian subjects dropdown
- [ ] Update principal dashboard with lesson notes + student lists
- [ ] Update headteacher dashboard with lesson notes + student lists
- [ ] Update accountant dashboard with payment management
- [ ] Add receipt sharing for payments/salaries

### Database
- [ ] Run migration for lesson_notes table if needed
- [ ] Verify payments table structure
- [ ] Verify salaries table structure

---

## 🔧 Files to Update

### Priority 1 (Critical)
1. **Fix Build Errors**
   - Check for import issues
   - Check ResultShareModal in results page

2. **Delete Old Code**
   - Remove `/src/app/admin/` if exists
   - Remove `/src/pages/` if exists

3. **New Constants** ✅
   - `/src/constants/nigerian-subjects.ts` - CREATED

### Priority 2 (High)
4. **Teacher Registration** 
   - `/src/app/auth/staff/register/page.tsx`
   - Add class dropdown
   - Add subject multi-select

5. **Teacher CBT**
   - `/src/app/teacher/cbt/page.tsx`
   - Add Nigerian subjects dropdown

### Priority 3 (Medium)
6. **Principal Dashboard**
   - `/src/app/principal/dashboard/page.tsx`
   - Add lesson notes section
   - Add student lists section

7. **Headteacher Dashboard**
   - `/src/app/headmaster/dashboard/page.tsx`
   - Add lesson notes section
   - Add student lists section

8. **Accountant Dashboard**
   - `/src/app/accountant/dashboard/page.tsx`
   - Complete rewrite with payment management

---

## 📊 Summary

**What's Done:**
- ✅ Nigerian subjects constants created
- ✅ Mark sheet structure documented
- ✅ New login pages created
- ✅ CBT system framework
- ✅ Results management framework
- ✅ Result sharing framework

**What's Needed:**
- ❌ Fix port 3000 error (build errors)
- ❌ Delete old landing/admin pages
- ❌ Teacher registration dropdowns
- ❌ Nigerian subjects in CBT
- ❌ Principal/Headteacher lesson notes
- ❌ Accountant payment management
- ❌ Receipt sharing

**Time Estimate:**
- Build errors: 30 min
- Cleanup: 15 min
- Teacher registration: 45 min
- Principal/Headteacher: 60 min
- Accountant: 90 min
- **Total: ~4 hours**

---

**Status:** ⚠️ **NEEDS IMMEDIATE ACTION**
**Priority:** 🔴 **CRITICAL**

Start with fixing the port 3000 error, then work through the checklist in order.
