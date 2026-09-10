# 📁 FILES REFERENCE GUIDE

Quick reference to all important files and where they are.

---

## 📖 DOCUMENTATION FILES (READ THESE)

All in root directory:

| File | Purpose | Read When |
|------|---------|-----------|
| `START_HERE.md` | Begin here | First thing |
| `MASTER_FIX_IMPLEMENTATION_ROADMAP.md` | Phase-by-phase plan | Before implementing |
| `IMPLEMENTATION_STATUS_REPORT.md` | Status & metrics | To understand progress |
| `CRITICAL_FIXES_APPLIED.md` | Technical fixes | For developers |
| `SUBJECT_FIX_GUIDE.md` | Subject loading bug | If students can't register |

---

## 🔧 NEW TOOLS CREATED TODAY

### Subject Fixer
- **API**: `src/app/api/fix-subjects/route.ts`
  - GET: Diagnostic (shows broken subjects)
  - POST: Repair (fixes them)
  
- **Web UI**: `src/app/admin/fix-subjects/page.tsx`
  - Visual interface to fix subjects
  - Shows before/after

- **Database**: `database/migrations/018_fix_subject_applicable_levels.sql`
  - SQL migration to populate levels

**Access**: `http://localhost:3000/admin/fix-subjects`

---

## ✅ FIXED FILES

### Teacher Results Page
- **File**: `src/app/teacher/results/page.tsx`
- **Fixed**: TypeScript errors, property names
- **Status**: Ready to test
- **Access**: `/teacher/results` when logged in as teacher

### Subject Filtering (Improved)
- **File**: `src/components/admin/StudentRegistrationModal.tsx`
- **Change**: Better subject filtering logic with logging
- **Impact**: Helps fix "No subjects available" errors

- **File**: `src/components/admin/TeacherRegistrationModal.tsx`
- **Change**: Better subject filtering logic with logging
- **Impact**: Helps fix "No subjects available" errors

---

## 🎯 FILES TO IMPLEMENT NEXT (Phase 1)

### 1. Teacher Registration Fields
**File to modify**: `src/auth/staff/register` page  
**What to add**:
- Class dropdown selector
- Subject multi-select
- Department selector (for SS1-SS3)

**Reference**: Look at `/src/components/admin/TeacherRegistrationModal.tsx` (lines 180-280) for pattern

### 2. Principal Dashboard
**File to modify**: `src/app/principal/dashboard/page.tsx`  
**What to add**:
- Tab interface (Overview | Lesson Notes | Students | Staff | Announcements)
- Lesson notes query and display
- Student list by class
- Staff list with assignments
- Announcement creation

**Reference**: Look at `/src/app/teacher/dashboard/page.tsx` for tab pattern

### 3. Consolidate Registrations
**Files to consolidate**:
- `src/auth/student/register` → Delete or refactor
- `src/auth/staff/register` → Improve
- `src/components/admin/StudentRegistrationModal.tsx` → Keep as canonical
- `src/components/admin/TeacherRegistrationModal.tsx` → Keep as canonical

---

## 📊 KEY SERVICE FILES

### Services Directory: `src/services/`

| Service | Purpose | Key Methods |
|---------|---------|-------------|
| `auth.service.ts` | Authentication | `login`, `register`, `getCurrentUser` |
| `student.service.ts` | Student operations | `registerStudent`, `getStudentById` |
| `teacher.service.ts` | Teacher operations | `registerTeacher`, `getTeacherDashboard` |
| `result.service.ts` | Grades & results | `saveScoreSheet`, `getTeacherClasses`, `getClassStudents` |
| `cbt.service.ts` | CBT exams | `createExam`, `submitExam`, `getExamResults` |
| `registration-config.service.ts` | Registration data | `getClasses`, `getSubjects`, `getStreams` |
| `payment.service.ts` | Payment recording | `recordPayment`, `generateReceipt` |
| `accounting.service.ts` | Accounting | `getSalaries`, `recordSalary` |

---

## 🗄️ IMPORTANT DATABASE FILES

### Migrations: `database/migrations/`

| File | Purpose | Status |
|------|---------|--------|
| `001_initial_schema.sql` | Create all tables | ✅ Done |
| `013_insert_test_data.sql` | Insert demo data | ✅ Done |
| `015_auto_create_school_data.sql` | Auto-populate on school creation | ✅ Done |
| `017_create_bridge_tables.sql` | Student-teacher relationships | ✅ Done |
| `018_fix_subject_applicable_levels.sql` | **NEW - Fix subject levels** | ✅ Created |

---

## 🎨 COMPONENT FILES BY ROLE

### Student Dashboard
- `src/app/student/dashboard/page.tsx` - Main dashboard
- `src/app/student/cbt-portal/page.tsx` - CBT portal
- `src/app/student/mark-sheet/page.tsx` - Report card
- `src/app/student/assignments/page.tsx` - Assignments
- `src/app/student/lessons/page.tsx` - Lesson notes

### Teacher Dashboard
- `src/app/teacher/dashboard/page.tsx` - Main dashboard
- `src/app/teacher/results/page.tsx` - **FIXED** - Score entry
- `src/app/teacher/cbt/page.tsx` - Create exams
- `src/app/teacher/assignments/page.tsx` - Manage assignments
- `src/app/teacher/lessons/page.tsx` - Post lesson notes
- `src/app/teacher/attendance/page.tsx` - Mark attendance

### Admin Dashboards
- `src/app/school-admin/dashboard/page.tsx` - School admin
- `src/app/principal/dashboard/page.tsx` - Principal **(NEEDS WORK)**
- `src/app/headmaster/dashboard/page.tsx` - Headmaster
- `src/app/accountant/dashboard/page.tsx` - Accountant **(NEEDS WORK)**

### Registration Components
- `src/components/admin/StudentRegistrationModal.tsx` - Student registration
- `src/components/admin/TeacherRegistrationModal.tsx` - Teacher registration
- `src/components/admin/StaffRegistrationModal.tsx` - Staff registration
- `src/auth/student/register` - Public student registration
- `src/auth/staff/register` - Public staff/teacher registration

---

## 🔑 KEY UTILITIES & HELPERS

### Authentication
- `src/lib/supabase-client.ts` - Supabase connection
- `src/lib/useAuth.ts` - Auth hook
- `src/lib/fallback-auth.ts` - Fallback authentication
- `src/lib/api-client.ts` - API client wrapper

### Constants & Types
- `src/constants/nigerian-subjects.ts` - Subject list (hardcoded)
- `src/types/index.ts` - TypeScript types

### Utilities
- `src/utils/` - Helper functions

---

## 🚀 QUICK NAVIGATION MAP

```
Your Project
├── src/
│   ├── app/
│   │   ├── student/
│   │   │   ├── dashboard/page.tsx ✅ Working
│   │   │   ├── cbt-portal/page.tsx ✅ Working
│   │   │   └── ...
│   │   ├── teacher/
│   │   │   ├── dashboard/page.tsx ✅ Working
│   │   │   ├── results/page.tsx ✅ FIXED
│   │   │   └── ...
│   │   ├── school-admin/
│   │   │   └── dashboard/page.tsx ✅ Working
│   │   ├── principal/
│   │   │   └── dashboard/page.tsx ❌ Needs work
│   │   ├── accountant/
│   │   │   └── dashboard/page.tsx ❌ Needs work
│   │   ├── admin/
│   │   │   └── fix-subjects/page.tsx ✅ NEW TOOL
│   │   └── api/
│   │       └── fix-subjects/route.ts ✅ NEW API
│   ├── components/
│   │   ├── admin/
│   │   │   ├── StudentRegistrationModal.tsx ✅ Improved
│   │   │   ├── TeacherRegistrationModal.tsx ✅ Improved
│   │   │   └── ...
│   └── services/
│       ├── auth.service.ts ✅ Working
│       ├── student.service.ts ✅ Working
│       ├── teacher.service.ts ✅ Working
│       ├── result.service.ts ⚠️ Partial
│       ├── registration-config.service.ts ✅ Working
│       └── ...
├── database/
│   └── migrations/
│       ├── 015_auto_create_school_data.sql ✅
│       ├── 017_create_bridge_tables.sql ✅
│       └── 018_fix_subject_applicable_levels.sql ✅ NEW
└── Documentation (root)
    ├── START_HERE.md ← READ FIRST
    ├── MASTER_FIX_IMPLEMENTATION_ROADMAP.md
    ├── IMPLEMENTATION_STATUS_REPORT.md
    ├── CRITICAL_FIXES_APPLIED.md
    └── SUBJECT_FIX_GUIDE.md
```

---

## 🧪 WHERE TO TEST

### Dev Server
- **URL**: `http://localhost:3000`
- **Status**: Running ✅

### Test URLs
- **Subject Fixer**: `http://localhost:3000/admin/fix-subjects`
- **Teacher Results**: `http://localhost:3000/teacher/results`
- **Student Registration**: `http://localhost:3000/school-admin/dashboard`
- **Admin Dashboard**: `http://localhost:3000/dashboard`

---

## 📝 HOW TO EDIT

### For TypeScript/React files:
1. Open file in editor
2. Make changes
3. Save (Ctrl+S)
4. Dev server auto-reloads
5. Refresh browser (F5)

### For database files:
1. Open migration in Supabase SQL editor
2. Copy SQL
3. Paste and run
4. Verify in database

---

## 💡 FINDING THINGS

### Find "Coming Soon"
```bash
grep -r "Coming Soon" src/
# Results show placeholder pages
```

### Find UUID display
```bash
grep -r "\.id" src/ | grep -v "// "
# Find places showing raw IDs
```

### Find hardcoded data
```bash
grep -r "mock\|dummy\|fake\|test" src/
# Find mock implementations
```

### Find API endpoints
```bash
find src/app/api -name "route.ts"
# List all API endpoints
```

---

## 🎯 WHAT TO EDIT FOR PHASE 1

### Day 1: Subject Fix
- **Use**: `/admin/fix-subjects` page (already created)
- **No coding needed** - Just run the tool

### Day 2: Teacher Results Page
- **Status**: Already fixed
- **Test**: `/teacher/results`

### Day 3-4: Teacher Registration
- **File**: `src/auth/staff/register` page
- **Add**: Class + Subject fields
- **Ref**: Copy pattern from `TeacherRegistrationModal.tsx`

### Day 5-6: Principal Dashboard
- **File**: `src/app/principal/dashboard/page.tsx`
- **Add**: Tabs and content
- **Ref**: Copy pattern from `/teacher/dashboard/page.tsx`

---

## ✨ SUMMARY

- **Docs**: Read the 5 markdown files in root
- **Tools**: Use `/admin/fix-subjects` web UI
- **Code**: Follow patterns in existing working files
- **Test**: Use http://localhost:3000
- **Roadmap**: Follow `MASTER_FIX_IMPLEMENTATION_ROADMAP.md`

You have everything you need! 🚀

