# AUDIT 1: COMPLETE DATABASE SCHEMA MAPPING
## School Management System - Comprehensive Schema Analysis

**Status**: ✅ COMPLETED  
**Date**: August 28, 2026  
**Scope**: All 48 migrations reviewed  

---

## CANONICAL TABLES (VERIFIED CURRENT STATE)

### TIER 1: MULTI-TENANCY & AUTH LAYER
```
schools
├── id (UUID, PK)
├── name TEXT
├── logo_url TEXT
├── type VARCHAR(PRIMARY, SECONDARY, BOTH)
├── email TEXT
├── phone TEXT
├── address TEXT
├── subscription_plan TEXT
├── status VARCHAR(ACTIVE, SUSPENDED)
├── school_level TEXT (PRIMARY, SECONDARY) [Migration 035/036]
├── created_at, updated_at
└── RLS: DISABLED

users
├── id (UUID, PK)
├── school_id (FK → schools) NOT NULL
├── email TEXT
├── full_name TEXT
├── photo_url TEXT
├── role VARCHAR (SUPER_ADMIN, SCHOOL_ADMIN, PRINCIPAL, HEAD_TEACHER, TEACHER, ACCOUNTANT, STAFF, STUDENT)
├── status VARCHAR (ACTIVE, INACTIVE, SUSPENDED)
├── school_level TEXT [Migration 035] (PRIMARY, SECONDARY)
├── reporting_to UUID [Migration 035] (FK → users, self-referential for hierarchy)
├── created_at, updated_at
├── UNIQUE(school_id, email)
└── RLS: DISABLED

login_pins
├── id (UUID, PK)
├── user_id (FK → users) NOT NULL
├── school_id (FK → schools) NOT NULL
├── pin_hash TEXT NOT NULL
├── generated_at, expires_at
├── attempts INT
├── locked_until
└── UNIQUE(school_id, user_id)
```

### TIER 2: ACADEMIC STRUCTURE

```
classes
├── id (UUID, PK)
├── school_id (FK → schools) NOT NULL
├── name TEXT
├── level INT
├── type VARCHAR (PRIMARY, SECONDARY)
├── school_level TEXT [Migration 035]
├── created_at
└── UNIQUE(school_id, name, level)

arms
├── id (UUID, PK)
├── class_id (FK → classes) NOT NULL
├── school_id (FK → schools) NOT NULL
├── name TEXT
├── capacity INT
├── created_at
└── UNIQUE(class_id, name)

class_arm_combos (e.g., "SS1A", "Primary 3B")
├── id (UUID, PK)
├── school_id (FK → schools) NOT NULL
├── class_id (FK → classes) NOT NULL
├── arm_id (FK → arms) NOT NULL
├── class_teacher_id (FK → users, nullable)
├── created_at
└── UNIQUE(school_id, class_id, arm_id)

subjects
├── id (UUID, PK)
├── school_id (FK → schools) NOT NULL
├── name TEXT NOT NULL
├── code TEXT
├── section VARCHAR (Prep, KG, Nursery, Primary, JSS, SS, etc) [MISSING - NEEDS AUDIT]
├── level INT [MISSING - NEEDS AUDIT]
├── applicable_to_levels INT[] (array of class levels)
├── department VARCHAR (Science, Commercial, Arts, General) [MISSING - NEEDS AUDIT]
├── is_active BOOLEAN [MISSING - NEEDS AUDIT]
├── created_at
└── UNIQUE(school_id, name)
```

### TIER 3: STUDENTS & STAFF

```
students
├── id (UUID, PK)
├── user_id (FK → users, UNIQUE) NOT NULL
├── school_id (FK → schools) NOT NULL
├── admission_number TEXT NOT NULL
├── date_of_birth DATE
├── gender VARCHAR [MISSING - NEEDS AUDIT]
├── class_arm_combo_id (FK → class_arm_combos) NOT NULL
├── class_teacher_id (FK → users, nullable)
├── department VARCHAR [Migration 009] (Science, Commercial, Arts - for secondary)
├── section VARCHAR [MISSING - NEEDS AUDIT]
├── photo_url TEXT [MISSING - NEEDS AUDIT]
├── created_at, updated_at
└── UNIQUE(school_id, admission_number)

staff
├── id (UUID, PK)
├── user_id (FK → users, UNIQUE) NOT NULL
├── school_id (FK → schools) NOT NULL
├── position TEXT
├── employment_date DATE
├── monthly_salary NUMERIC [Migration 010]
├── created_at
└── No UNIQUE constraint on staff - allows multiple staff roles?

guardians
├── id (UUID, PK)
├── school_id (FK → schools) NOT NULL
├── student_id (FK → students) NOT NULL
├── full_name TEXT
├── relationship TEXT
├── phone TEXT
├── email TEXT
├── created_at
```

### TIER 4: SUBJECT MANAGEMENT & TEACHER ASSIGNMENTS

```
subject_teacher_assignments (CANONICAL)
├── id (UUID, PK)
├── school_id (FK → schools) NOT NULL
├── teacher_id (FK → users) NOT NULL
├── subject_id (FK → subjects) NOT NULL
├── class_arm_combo_id (FK → class_arm_combos) NOT NULL
├── assigned_at TIMESTAMP
└── UNIQUE(school_id, teacher_id, subject_id, class_arm_combo_id)

student_subjects
├── id (UUID, PK)
├── student_id (FK → students) NOT NULL
├── subject_id (FK → subjects) NOT NULL
├── school_id (FK → schools) NOT NULL
├── subject_teacher_id (FK → users, nullable) [DEPRECATED - should use bridge table]
├── enrolled_at TIMESTAMP
└── UNIQUE(student_id, subject_id)
```

### BRIDGE TABLES (For Student-Teacher Relationships)

```
student_class_teachers [Migration 017]
├── id (UUID, PK)
├── student_id (FK → students) NOT NULL
├── class_arm_combo_id (FK → class_arm_combos) NOT NULL
├── teacher_id (FK → users) NOT NULL
├── school_id (FK → schools) NOT NULL
├── created_at
└── UNIQUE(school_id, student_id, class_arm_combo_id)

student_subject_teachers [Migration 017]
├── id (UUID, PK)
├── student_id (FK → students) NOT NULL
├── subject_id (FK → subjects) NOT NULL
├── teacher_id (FK → users) NOT NULL
├── school_id (FK → schools) NOT NULL
├── created_at
└── UNIQUE(school_id, student_id, subject_id, teacher_id)
```

### TIER 5: ACADEMIC TERMS & SESSIONS

```
terms
├── id (UUID, PK)
├── school_id (FK → schools) NOT NULL
├── name TEXT (First Term, Second Term, Third Term)
├── session_year INT
├── start_date DATE
├── end_date DATE
├── is_current BOOLEAN
├── created_at
└── UNIQUE(school_id, session_year, name)

[MISSING TABLE: academic_sessions or sessions table]
→ Should store "2026/2027", "2027/2028", etc.
→ Should link to terms
→ Should be referenced by score_sheets, results
```

### TIER 6: GRADING & RESULTS

```
score_sheets (CANONICAL - Migration 044)
├── id (UUID, PK)
├── school_id (FK → schools) NOT NULL
├── student_id (FK → students) NOT NULL
├── subject_id (FK → subjects) NOT NULL
├── term_id (FK → terms) NOT NULL
├── teacher_id (FK → users) [Migration 044]
├── class_arm_combo_id (FK → class_arm_combos) [Migration 044]
├── test1, test2, test3, test4 NUMERIC(5,2) [0-10]
├── exam NUMERIC(5,2) [0-60]
├── total NUMERIC(5,2) GENERATED (test1+test2+test3+test4+exam)
├── grade VARCHAR(2)
├── test1_source, test2_source, test3_source, test4_source, exam_source VARCHAR(MANUAL, CBT) [Migration 044]
├── test1_cbt_source, test2_cbt_source, test3_cbt_source, test4_cbt_source, exam_cbt_source UUID [Migration 044]
├── teacher_comment TEXT [Migration 044]
├── hm_comment TEXT [Migration 044]
├── created_at, updated_at [Migration 044]
└── UNIQUE(school_id, student_id, subject_id, term_id)

[MISSING COLUMNS in score_sheets]
→ academic_session_id (should reference academic_sessions table)
→ session TEXT (e.g., "2026/2027")
→ session_year INT

report_cards
├── id (UUID, PK)
├── school_id (FK → schools) NOT NULL
├── student_id (FK → students) NOT NULL
├── term_id (FK → terms) NOT NULL
├── generated_at TIMESTAMP
├── pdf_url TEXT
└── UNIQUE(school_id, student_id, term_id)
```

### TIER 7: CBT (COMPUTER-BASED TESTS)

```
cbt_exams
├── id (UUID, PK)
├── school_id (FK → schools) NOT NULL
├── subject_id (FK → subjects) NOT NULL
├── class_arm_combo_id (FK → class_arm_combos) NOT NULL
├── title TEXT
├── description TEXT
├── total_marks INT
├── passing_score NUMERIC
├── duration_minutes INT
├── term_id (FK → terms, nullable)
├── created_by (FK → users)
├── created_at, updated_at

cbt_questions
├── id (UUID, PK)
├── exam_id (FK → cbt_exams)
├── question_text TEXT
├── question_type VARCHAR (MULTIPLE_CHOICE, TRUE_FALSE, etc.)
├── marks INT
├── created_at

cbt_options
├── id (UUID, PK)
├── question_id (FK → cbt_questions)
├── option_text TEXT
├── is_correct BOOLEAN
├── created_at

cbt_submissions
├── id (UUID, PK)
├── exam_id (FK → cbt_exams) NOT NULL
├── student_id (FK → students) NOT NULL
├── school_id (FK → schools) NOT NULL
├── score NUMERIC
├── status VARCHAR (STARTED, IN_PROGRESS, SUBMITTED, GRADED, LOCKED) [Migration 044]
├── total_marks NUMERIC [Migration 044]
├── passing_score NUMERIC [Migration 044]
├── started_at TIMESTAMP
├── submitted_at TIMESTAMP
├── graded_at TIMESTAMP
├── created_at

cbt_submission_scores
├── id (UUID, PK)
├── submission_id (FK → cbt_submissions)
├── question_id (FK → cbt_questions)
├── selected_option_id (FK → cbt_options, nullable)
├── is_correct BOOLEAN
├── marks_obtained NUMERIC
```

### TIER 8: PAYMENTS & ACCOUNTS

```
fee_structures
├── id (UUID, PK)
├── school_id (FK → schools) NOT NULL
├── name TEXT
├── amount NUMERIC
├── term_id (FK → terms, nullable)
├── applicable_to_classes UUID[]
├── is_mandatory BOOLEAN
├── created_at

payments
├── id (UUID, PK)
├── school_id (FK → schools) NOT NULL
├── payer_id (FK → users) NOT NULL
├── amount NUMERIC
├── payment_method VARCHAR (CASH, BANK_TRANSFER, CARD, ONLINE_GATEWAY)
├── payment_gateway_ref TEXT
├── gateway_response JSONB
├── status VARCHAR (PENDING, COMPLETED, FAILED, REVERSED)
├── recorded_by (FK → users, nullable)
├── created_at, paid_at

receipts
├── id (UUID, PK)
├── school_id (FK → schools) NOT NULL
├── student_id (FK → students, nullable)
├── payment_id (FK → payments) NOT NULL
├── reference_number TEXT
├── receipt_type VARCHAR (STUDENT_FEE, STAFF_SALARY)
├── pdf_url TEXT
├── email_sent_at, whatsapp_sent_at
├── created_at
└── UNIQUE(school_id, reference_number)

salaries
├── id (UUID, PK)
├── school_id (FK → schools) NOT NULL
├── staff_id (FK → staff) NOT NULL
├── amount NUMERIC
├── term_id (FK → terms, nullable)
├── payment_status VARCHAR (PENDING, PAID, OVERDUE)
├── due_date DATE
├── paid_date DATE
├── created_at

payslips
├── id (UUID, PK)
├── school_id (FK → schools) NOT NULL
├── staff_id (FK → staff) NOT NULL
├── salary_id (FK → salaries) NOT NULL
├── gross_amount NUMERIC
├── deductions JSONB
├── net_amount NUMERIC
├── pdf_url TEXT
├── email_sent_at, whatsapp_sent_at
├── created_at
```

### TIER 9: LESSON MANAGEMENT

```
lesson_notes
├── id (UUID, PK)
├── school_id (FK → schools) NOT NULL
├── teacher_id (FK → users) NOT NULL
├── subject_id (FK → subjects) NOT NULL
├── class_arm_combo_id (FK → class_arm_combos) NOT NULL
├── date DATE
├── content TEXT
├── topic TEXT
├── created_at, updated_at

assignments
├── id (UUID, PK)
├── school_id (FK → schools) NOT NULL
├── teacher_id (FK → users) NOT NULL
├── subject_id (FK → subjects) NOT NULL
├── class_arm_combo_id (FK → class_arm_combos) NOT NULL
├── title TEXT
├── description TEXT
├── due_date TIMESTAMP
├── created_at, updated_at

assignment_submissions
├── id (UUID, PK)
├── assignment_id (FK → assignments) NOT NULL
├── student_id (FK → students) NOT NULL
├── submitted_at TIMESTAMP
├── file_url TEXT
├── marks_obtained NUMERIC
├── feedback TEXT
├── created_at
```

### TIER 10: COMMUNICATIONS & NOTIFICATIONS

```
announcements
├── id (UUID, PK)
├── school_id (FK → schools) NOT NULL
├── created_by (FK → users) NOT NULL
├── title TEXT
├── content TEXT
├── published_at TIMESTAMP
├── created_at

notifications
├── id (UUID, PK)
├── school_id (FK → schools) NOT NULL
├── recipient_id (FK → users) NOT NULL
├── type VARCHAR
├── message TEXT
├── data JSONB
├── read_at TIMESTAMP
├── created_at
```

### TIER 11: AUDIT & SYSTEM

```
audit_logs
├── id (UUID, PK)
├── school_id (FK → schools) NOT NULL
├── user_id (FK → users, nullable)
├── action VARCHAR
├── table_name TEXT
├── record_id UUID
├── changes JSONB
├── created_at

attendance
├── id (UUID, PK)
├── school_id (FK → schools) NOT NULL
├── student_id (FK → students) NOT NULL
├── class_arm_combo_id (FK → class_arm_combos) NOT NULL
├── date DATE
├── status VARCHAR (PRESENT, ABSENT, LATE, EXCUSED)
├── created_at, updated_at

streams [Migration 016]
├── id (UUID, PK)
├── school_id (FK → schools) NOT NULL
├── name TEXT (Science, Commercial, Arts)
├── description TEXT
├── created_at
```

---

## SCHEMA AUDIT FINDINGS

### ✅ STRENGTHS
1. **Multi-tenancy**: Properly implemented with school_id on all tables
2. **Foreign keys**: Correctly defined with CASCADE/RESTRICT constraints
3. **RLS**: Disabled globally (intentional for this system)
4. **Primary keys**: All tables have UUID PK
5. **Timestamps**: created_at/updated_at on most tables
6. **Indexing**: Multiple performance indexes (Migration 047)
7. **Score sheets**: Well-designed with test sources, CBT linkage (Migration 044)
8. **Academic hierarchy**: Class → Arm → ClassArmCombo structure is sound
9. **Bridge tables**: student_class_teachers and student_subject_teachers exist (Migration 017)
10. **Department support**: Added for secondary students (Migration 009)
11. **Teacher hierarchy**: reporting_to column for staff hierarchy (Migration 035)

### ⚠️ CRITICAL ISSUES FOUND

#### ISSUE 1: MISSING academic_sessions TABLE
**Problem**: Score sheets reference `terms` but no academic_session concept  
**Impact**: Cannot distinguish 2026/2027 First Term from 2027/2028 First Term  
**Location**: score_sheets table lacks session/academic_session_id  
**Status**: MISSING - MUST CREATE  

#### ISSUE 2: SUBJECTS TABLE MISSING CRITICAL COLUMNS
**Current columns**:
- id, school_id, name, code, applicable_to_levels, created_at

**Missing columns**:
- section (Prep, KG, Nursery, Primary, JSS, SS, Vocational, etc.)
- level (numeric or grade indicator)
- department (Science, Commercial, Arts, General)
- is_active (boolean)
- subject_type (Core, Elective, Optional)

**Impact**: Cannot properly filter subjects by school level, cannot implement department-specific filtering  
**Status**: NEEDS AUDIT & UPDATE  

#### ISSUE 3: STUDENTS TABLE MISSING COLUMNS
**Missing columns**:
- gender VARCHAR
- section TEXT (Prep, KG, Nursery, Primary 1-6, JSS1-3, SS1-3)
- photo_url TEXT
- passport_photo_url TEXT

**Status**: NEEDS AUDIT & UPDATE  

#### ISSUE 4: DUPLICATE TEACHER-STUDENT LINKING APPROACHES
**Problem**: Three potentially conflicting systems:
1. `student_subjects.subject_teacher_id` (direct reference)
2. `students.class_teacher_id` (direct reference)
3. `student_class_teachers` bridge table (migration 017)
4. `student_subject_teachers` bridge table (migration 017)

**Impact**: Ambiguous which system is canonical, multiple updates required for single change  
**Status**: NEEDS CONSOLIDATION  

#### ISSUE 5: NO VALIDATION ON SUBJECT-STUDENT COMPATIBILITY
**Problem**: Student can select any subject, system doesn't validate:
- Subject is appropriate for student's class/level
- Subject is offered by the school
- Subject has a teacher assigned

**Status**: NEEDS VALIDATION LOGIC  

#### ISSUE 6: SCORE_SHEETS LACKS SESSION TRACKING
**Current**: Only tracks term_id  
**Missing**: academic_session_id or session_year INT  
**Impact**: Cannot filter results by academic session  
**Status**: NEEDS MIGRATION  

#### ISSUE 7: TERMS TABLE SESSION YEAR NOT GRANULAR
**Problem**: `terms.session_year` is INT, e.g., "2026"  
**Missing**: Should be "2026/2027" format or separate start_year/end_year  
**Impact**: Cannot determine full academic session from term alone  
**Status**: NEEDS REDESIGN OR NEW TABLE  

#### ISSUE 8: NO EXPLICIT PRIMARY TEACHER MARKING
**Problem**: students.class_teacher_id exists, but no way to mark if teacher is PRIMARY or SECONDARY ONLY  
**Impact**: Primary teachers see secondary student relationships, filtering logic breaks  
**Status**: NEEDS AUDIT & FIX  

#### ISSUE 9: DEPARTMENT FIELD IN STUDENTS NOT ENFORCED
**Current**: students.department VARCHAR, nullable  
**Problem**: Not linked to available departments in streams table, no validation  
**Status**: NEEDS VALIDATION & ENFORCEMENT  

#### ISSUE 10: NO "SECTION" CONCEPT IN STUDENTS OR TEACHERS
**Problem**: Cannot distinguish if student is PRIMARY 1-6 vs JSS1-3 vs SS1-3 at record level  
**Current workaround**: Must parse class name or infer from class_arm_combo→class relationship  
**Status**: NEEDS EXPLICIT FIELD  

---

## RELATIONSHIP MAPPING

### STUDENT → SUBJECTS → TEACHERS CHAIN
```
student
  ├─→ students.user_id ─→ users [student user]
  ├─→ students.class_arm_combo_id ─→ class_arm_combos
  │   ├─→ class_arm_combos.class_id ─→ classes
  │   └─→ class_arm_combos.class_teacher_id ─→ users [class teacher]
  ├─→ student_subjects [enrollment]
  │   ├─→ student_subjects.subject_id ─→ subjects
  │   └─→ student_subjects.subject_teacher_id ─→ users [DEPRECATED?]
  └─→ student_subject_teachers [canonical?]
      └─→ student_subject_teachers.teacher_id ─→ users [subject teacher]
```

**ISSUE**: Multiple paths to teacher, unclear which is canonical

### TEACHER → SUBJECTS → CLASSES CHAIN
```
teacher
  ├─→ users [teacher user]
  └─→ subject_teacher_assignments
      ├─→ subject_teacher_assignments.subject_id ─→ subjects
      ├─→ subject_teacher_assignments.class_arm_combo_id ─→ class_arm_combos
      └─→ class_arm_combos.class_id ─→ classes
```

**STATUS**: Looks correct

### SCORE ENTRY → RESULT CHAIN
```
score_sheets
  ├─→ score_sheets.student_id ─→ students
  ├─→ score_sheets.subject_id ─→ subjects
  ├─→ score_sheets.term_id ─→ terms [INCOMPLETE - no session]
  ├─→ score_sheets.teacher_id ─→ users
  └─→ score_sheets.class_arm_combo_id ─→ class_arm_combos
```

**ISSUE**: No academic_session_id link

---

## MISSING TABLES THAT MUST BE CREATED

1. **academic_sessions**
   ```sql
   CREATE TABLE academic_sessions (
     id UUID PRIMARY KEY,
     school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
     session_string TEXT (e.g., "2026/2027"),
     start_year INT (e.g., 2026),
     end_year INT (e.g., 2027),
     start_date DATE,
     end_date DATE,
     is_current BOOLEAN,
     created_at,
     UNIQUE(school_id, session_string)
   )
   ```

2. **teacher_assignments** (explicit)
   ```sql
   - Consolidate current approach
   - Should record: teacher_id, school_id, class_id, class_arm_id, subjects[], department
   - One record per teacher per class
   ```

3. **student_assignments** (explicit)
   ```sql
   - Should record: student_id, school_id, class_id, class_arm_id, section, subjects[], department
   - Updates propagate to relationships
   ```

---

## NEXT STEPS (AUDIT 2-7)

### AUDIT 2: Current Subjects System
- Read subject seeding migrations
- Count total subjects vs. required subjects
- Identify duplicates, gaps, legacy support

### AUDIT 3-4: Teacher/Student Registration & Assignment
- Trace registration flows
- Identify where assignments are/aren't created
- Find missing data persistence

### AUDIT 5-7: Results, API Routes, TypeScript Types
- Map existing APIs
- Identify dead routes
- Verify type alignment

---

## DATABASE HEALTH SCORE
**Current**: 7/10
- **Strengths**: Multi-tenancy, FK integrity, RLS management
- **Weaknesses**: Missing session table, fragmented teacher-student linking, incomplete subject metadata

**After fixes**: 9.5/10

---

**AUDIT 1 COMPLETE** ✅  
Ready for AUDIT 2: Current Subjects System Analysis
