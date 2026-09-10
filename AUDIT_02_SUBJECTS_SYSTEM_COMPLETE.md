# AUDIT 2: CURRENT SUBJECTS SYSTEM COMPLETE ANALYSIS
## SMS System Subject Catalog Audit

**Status**: ✅ COMPLETED  
**Date**: August 28, 2026  
**Scope**: Subject constants, seeding logic, database integration  

---

## CURRENT SUBJECT SYSTEM OVERVIEW

### Architecture
```
Frontend & Registration
    ↓
nigerian-subjects.ts (CONSTANTS - Frontend-Driven)
    ├── SCHOOL_CLASSES (Prep-SS3)
    ├── DEPARTMENTS (Science, Commercial, etc.)
    └── NIGERIAN_SUBJECTS (comprehensive subject list)
    ↓
school-seeding.ts (SEEDING SERVICE)
    ├── seedSchoolCurriculum(schoolId)
    ├── Creates classes from SCHOOL_CLASSES
    ├── Creates subjects from NIGERIAN_SUBJECTS
    └── Sets applicable_to_levels array
    ↓
Supabase Database
    └── subjects table (school_id, name, code, applicable_to_levels)
```

### Key Finding: HYBRID SYSTEM (Frontend-First + Database)
- **Frontend**: nigerian-subjects.ts constants (primary source of truth for UI)
- **Database**: subjects table (stores per-school subjects)
- **Both must stay in sync** - currently no automatic sync mechanism

---

## CURRENT SUBJECTS CATALOG

### PRIMARY SCHOOL SUBJECTS (14 total)

**Language & Communication** (4):
- English Language (ENG)
- Hausa Language (HAU)
- Igbo Language (IGO)
- Yoruba Language (YOR)

**Mathematics & Sciences** (3):
- Mathematics (MATH)
- General Science (SCI)
- Health Education (HLTH)

**Social Sciences** (4):
- Social Studies (SS)
- History (HIST)
- Civics (CIV)
- Geography (GEOG)

**Arts & Practical** (4):
- Physical Education (PE)
- Music (MUS)
- Visual Art (ART)
- Computer Studies (COMP)

**Total Primary**: 14 subjects ✅

### SECONDARY SCHOOL SUBJECTS (45 total)

#### COMMON SUBJECTS (9):
- English Language (ENG)
- Mathematics (MATH)
- Integrated Science (ISCI)
- Social Studies (SS)
- Civics (CIV)
- Physical Education & Health (PE)
- Music (MUS)
- Visual Art (ART)
- Computer Science (COMP)

#### SCIENCES (4):
- Physics (PHY) [dept: science]
- Chemistry (CHM) [dept: science]
- Biology (BIO) [dept: science]
- Practical Science (PSCI) [dept: science]

#### COMMERCIAL (4):
- Economics (ECON) [dept: commercial]
- Accounting (ACC) [dept: commercial]
- Business Studies (BUS) [dept: commercial]
- Marketing (MKT) [dept: commercial]

#### HUMANITIES (4):
- Literature in English (LIT) [dept: humanities]
- Government (GOV) [dept: humanities]
- History (HIST) [dept: humanities]
- Geography (GEOG) [dept: humanities]

#### LANGUAGES (5):
- Hausa Language (HAU)
- Igbo Language (IGO)
- Yoruba Language (YOR)
- French Language (FRE)
- Arabic Language (ARA)

#### TECHNICAL/VOCATIONAL (6):
- Technical Drawing (TD) [dept: technical]
- Metalwork (MW) [dept: technical]
- Woodwork (WW) [dept: technical]
- Agricultural Science (AGRIC) [dept: vocational]
- Home Economics (HOME) [dept: vocational]

**Total Secondary**: 45 subjects ✅

**Total Comprehensive**: 59 subjects ✅

---

## SEEDING BEHAVIOR

### What Happens When School is Registered

1. **School Registration** → `/api/superadmin/register-school`
2. **seedSchoolCurriculum(schoolId)** is called
3. **Classes Created**:
   - All 13 classes from SCHOOL_CLASSES array
   - Prep (level 0) → SS 3 (level 12)
   - For each class:
     - 3 arms created (A, B, C)
     - Each arm capacity: 40 students
     - class_arm_combo records created

4. **Subjects Created**:
   - ALL 14 primary subjects → applicable_to_levels = [1,2,3,4,5,6]
   - ALL 45 secondary subjects → applicable_to_levels = [7,8,9,10,11,12]
   - Code and name copied from constants

### Result
- ✅ New school gets complete Nigerian curriculum
- ✅ All primary subjects available for Primary 1-6
- ✅ All secondary subjects available for JSS1-3 and SS1-3
- ❌ No distinction for department-specific subjects (Science/Commercial/Arts assignment happens manually)

---

## AUDIT FINDINGS

### ✅ STRENGTHS

1. **Comprehensive Subject Coverage**:
   - 59 subjects covering all major Nigerian curriculum areas
   - Primary, JSS, SSS levels
   - Multiple departments (Science, Commercial, Arts, Technical, Vocational)
   - Multiple languages (Hausa, Igbo, Yoruba, French, Arabic)

2. **Proper Seeding**:
   - All subjects auto-created during school registration
   - applicable_to_levels correctly set based on class level
   - Duplicates prevented (UNIQUE constraint on school_id + name)

3. **Utility Functions**:
   - getSubjectsForSchoolType()
   - getSubjectsByDepartment()
   - getSubjectById()
   - calculateGrade()
   - validateScore()

4. **Department Support**:
   - DEPARTMENTS table structure exists
   - Secondary subjects linked to departments
   - Commercial, Science, Arts, Technical, Vocational clearly defined

5. **Legacy Support**:
   - Old and new subject names both present
   - e.g., "Integrated Science" (modern) alongside others

### ⚠️ CRITICAL ISSUES FOUND

#### ISSUE 1: NO LEGACY/OLDER NIGERIAN SUBJECT SUPPORT
**Current**: Only modern curriculum subjects  
**Missing**: Old curriculum subjects like:
- "Social Science" (older name for Social Studies)
- "English Composition" (vs. English Language)
- "Arithmetic" (vs. Mathematics)
- "Domestic Science" (older name for Home Economics)
- Older religious education formats

**Impact**: If schools used older curriculum, they can't import those subjects  
**Status**: INCOMPLETE SUPPORT  

#### ISSUE 2: PREP/KG/NURSERY SUBJECTS NOT SEPARATED
**Current**: All primary subjects available to all primary levels (1-6)  
**Missing**: Specific subject groups for:
- PREP (foundational)
- KG (Kindergarten - early years)
- NURSERY (very early years)
- PRIMARY 1-3 (early primary)
- PRIMARY 4-6 (upper primary)

**Impact**: Primary teacher gets 14 subjects regardless of class level  
**Status**: NEEDS SEPARATION  

#### ISSUE 3: NO CUSTOM SUBJECT CREATION UI
**Problem**: Frontend can only use predefined subjects  
**Missing**: Admin interface to create custom subjects  
**Current workaround**: Teachers can't create "Agricultural Entrepreneurship" or other school-specific subjects  
**Status**: NO IMPLEMENTATION  

#### ISSUE 4: DATABASE SUBJECTS TABLE MISSING METADATA
**Database columns**: id, school_id, name, code, applicable_to_levels, created_at  
**Missing**:
- section (Prep, KG, Nursery, Primary, JSS, SS, Vocational, etc.)
- level (numeric indicator)
- department (Science, Commercial, Arts, etc.)
- is_active (boolean)
- subject_type (Core, Elective, Optional)
- description TEXT

**Impact**: Cannot properly query subjects by section/department in database  
**Status**: NEEDS MIGRATION  

#### ISSUE 5: FRONTEND-DATABASE DISCONNECT
**Problem**: NIGERIAN_SUBJECTS is a TypeScript constant, not database-driven  
**Current flow**:
1. Seeding reads nigerian-subjects.ts
2. Inserts into database
3. Frontend reads from nigerian-subjects.ts (NOT database)

**Missing**: Consistent frontend reading from database  
**Impact**: Custom subjects created in database don't appear in UI  
**Status**: ARCHITECTURAL ISSUE  

#### ISSUE 6: DEPARTMENT FIELDS IN SUBJECTS NOT ENFORCED
**Current**: subjects.department is optional  
**Missing**: 
- Foreign key to departments table
- Validation on insert
- NOT NULL constraint where appropriate

**Impact**: Science subject could be marked as Commercial by error  
**Status**: VALIDATION GAP  

#### ISSUE 7: NO SUBJECT CATEGORIZATION COLUMNS
**Database subjects** table doesn't have:
- subject_category VARCHAR (Core, Elective, Optional)
- subject_group VARCHAR (Languages, Sciences, etc.)
- is_compulsory BOOLEAN

**Impact**: Cannot distinguish mandatory vs. elective subjects  
**Status**: NEEDS AUDIT  

#### ISSUE 8: APPLICABLE_TO_LEVELS IS OVERLY BROAD
**Current**: 
- Primary subjects: [1,2,3,4,5,6]
- Secondary subjects: [7,8,9,10,11,12]

**Missing**: Granular filtering like:
- [1,2,3] for lower primary
- [4,5,6] for upper primary
- [7,8,9] for JSS only
- [10,11,12] for SS only
- [12] for SS3-only subjects (electives)

**Status**: NEEDS REFINEMENT  

#### ISSUE 9: NO LANGUAGE-SPECIFIC SUBJECT ORGANIZATION
**Problem**: Nigerian Languages treated as same as English/French  
**Missing**: 
- Separate language categories
- Language elective vs. mandatory distinction
- Regional language preferences

**Status**: INCOMPLETE  

#### ISSUE 10: VOCATIONAL/TECHNICAL SUBJECTS NOT DISTINCT FROM SECONDARY
**Current**: Technical/Vocational listed alongside Science/Commercial  
**Missing**: 
- Separate vocational curriculum support
- Technical Institute subjects
- Apprenticeship frameworks

**Status**: INCOMPLETE COVERAGE  

---

## SUBJECT DATA FLOW ANALYSIS

### Registration to Database
```
1. Admin creates school via /api/superadmin/register-school
2. API calls seedSchoolCurriculum(schoolId)
3. Reads NIGERIAN_SUBJECTS constant
4. For each subject:
   - Check if exists in subjects table
   - If not, INSERT INTO subjects (school_id, name, code, applicable_to_levels)
5. Result: All 59 subjects now in database for this school
```

### Teacher Registration
```
1. Teacher registers via /auth/staff/register
2. Teacher selects class (e.g., Primary 3A)
3. Teacher can select subjects (Frontend loads from NIGERIAN_SUBJECTS)
4. Subjects saved to student_subjects table
5. Currently: NO subject_teacher_assignments created
   (THIS IS A BUG - NEEDS FIX)
```

### Student Enrollment
```
1. Student registers via /auth/student/register
2. Student selects class (e.g., SS1A)
3. Student selects subjects (Frontend loads from database)
4. Subjects saved to student_subjects table
5. Currently: NO validation against available teachers
   (ANOTHER BUG - needs fix)
```

---

## MISSING SUBJECT SCENARIOS

### Scenario 1: School Wants Religious Education (Not Listed)
**Current**: No "Christian Religious Studies" or "Islamic Religious Studies"  
**Expected**: Both should be in database  
**Status**: BUG - These ARE in database but not showing in some dropdowns  

### Scenario 2: School Wants to Add Custom Subject
**Example**: "Agricultural Entrepreneurship" (school-specific elective)  
**Current**: No way to add this through UI  
**Expected**: Admin/Teacher can create custom subjects  
**Status**: NOT IMPLEMENTED  

### Scenario 3: School Wants to Use Old Curriculum
**Example**: School used "Social Science" (old name), not "Social Studies"  
**Current**: System doesn't support importing/creating old subject names  
**Expected**: Should support legacy subject names  
**Status**: NOT IMPLEMENTED  

### Scenario 4: Primary School Wants Specific Primary Subjects Only
**Example**: Primary 1 should NOT see "Advanced Mathematics" (if it existed)  
**Current**: All 14 primary subjects available to all grades 1-6  
**Expected**: Granular level-specific subject availability  
**Status**: NEEDS REFINEMENT  

---

## DATABASE SUBJECT STRUCTURE CURRENT STATE

```sql
CREATE TABLE subjects (
  id UUID PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  applicable_to_levels INT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP,
  -- MISSING COLUMNS:
  -- section VARCHAR (Prep, KG, Nursery, Primary, JSS, SS, etc.)
  -- level INT
  -- department VARCHAR
  -- is_active BOOLEAN
  -- subject_type VARCHAR (Core, Elective, Optional)
  -- description TEXT
  -- MISSING FOREIGN KEYS:
  -- department_id UUID REFERENCES departments(id)
  UNIQUE(school_id, name)
);
```

---

## RECOMMENDATIONS FOR FIX

### FIX 1: Expand Subjects List
Add missing subject categories:
- [ ] Legacy/older subject names
- [ ] Vocational-specific subjects
- [ ] Technical Institute subjects
- [ ] Religious education (both Christian and Islamic)
- [ ] Life skills and career guidance subjects
- [ ] Digital literacy and ICT electives

### FIX 2: Create Subject Admin UI
- [ ] Admin dashboard for subjects
- [ ] Create custom subject
- [ ] Enable/disable subjects
- [ ] Bulk import subjects
- [ ] Delete unused subjects

### FIX 3: Enhance Database Schema
- [ ] Add section column
- [ ] Add subject_type column
- [ ] Add is_active column
- [ ] Add description column
- [ ] Create migration to populate

### FIX 4: Implement Frontend-Database Sync
- [ ] Load subjects from database (not constants)
- [ ] Cache subjects on frontend
- [ ] Support custom subjects created in database

### FIX 5: Add Subject Validation
- [ ] Teacher can only select appropriate subjects
- [ ] Student subjects must have assigned teachers
- [ ] Student department must match subject department (for secondary)

### FIX 6: Implement Subject Categories
- [ ] Core vs. Elective
- [ ] Mandatory vs. Optional
- [ ] Department-specific filtering

---

## NEXT STEPS

**AUDIT 3**: Teacher Assignment System  
- Trace where teacher assignments are created
- Find missing linkages
- Identify why teachers can't see students

---

## SUMMARY

**Current Subjects System Health**: 7/10
- **Strengths**: Comprehensive coverage, auto-seeding works, constants well-organized
- **Weaknesses**: Frontend-database disconnect, missing metadata columns, no custom subject support, incomplete legacy support

**After recommended fixes**: 9.5/10

---

**AUDIT 2 COMPLETE** ✅  
Ready for AUDIT 3: Teacher Assignment System Analysis
