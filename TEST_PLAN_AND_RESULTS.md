# Subject Selection System - Comprehensive Test Plan & Results

## Test Execution Summary

**Date**: September 12, 2026
**Test Environment**: Supabase (Production)
**Tester**: Kiro AI
**Status**: READY FOR EXECUTION

## Pre-Test Requirements

### 1. Migration Execution
- [ ] Migration 107 executed in Supabase
- [ ] Post-migration verification queries run successfully
- [ ] All 4 success criteria met (see MIGRATION_EXECUTION_GUIDE.md)

### 2. Code Changes Deployed
- [ ] CanonicalSubjectService updated with department-aware filtering
- [ ] StudentRegistrationModal updated with department selection UI
- [ ] TeacherRegistrationModal updated with department-aware subject filtering
- [ ] All changes pushed to git and deployed

### 3. Test Environment Setup
- [ ] School with test data exists (use KINGSWAY SCHOOLS or similar)
- [ ] Classes exist for all levels: Prep, KG, Nursery, Primary 1-6, JSS1-3, SS1-3
- [ ] Arms exist for each class
- [ ] Streams exist for SS classes (SCIENCE, COMMERCIAL, HUMANITIES)

## Test Cases

### TEST GROUP 1: EARLY YEARS REGISTRATION

#### Test 1.1: Nursery Student Registration
**Objective**: Verify Nursery (Level 0) shows correct subjects
**Steps**:
1. Go to School Admin Dashboard
2. Click "Register Student"
3. Select "PRIMARY" section
4. Select "Nursery" class
5. Select any arm
6. Proceed to Step 4 (Subject Selection)

**Expected Result**:
- ✓ Subject list contains: English Language, Mathematics, Physical Education, Arts & Crafts, Music
- ✓ Minimum 5 subjects displayed
- ✓ NO subjects like "Science" or "Social Studies" (not applicable to Nursery)

**Result**: [ ] PASS [ ] FAIL

**Notes**: 

---

#### Test 1.2: Prep Student Registration
**Objective**: Verify Prep (Level 1) shows correct subjects
**Steps**:
1. Register Student (same as 1.1)
2. Select "Prep" class

**Expected Result**:
- ✓ Subject list contains: English Language, Mathematics, Social Studies, Physical Education, Arts & Crafts, Music
- ✓ Minimum 6 subjects displayed
- ✓ NO "Science" subject yet

**Result**: [ ] PASS [ ] FAIL

**Notes**: 

---

#### Test 1.3: KG Student Registration
**Objective**: Verify KG (Level 2) shows correct subjects
**Steps**:
1. Register Student
2. Select "KG" class

**Expected Result**:
- ✓ Subject list contains: English Language, Mathematics, Science, Social Studies, Physical Education, Arts & Crafts, Music
- ✓ Minimum 7 subjects displayed
- ✓ Science now appears (first time in Early Years)

**Result**: [ ] PASS [ ] FAIL

**Notes**: 

---

### TEST GROUP 2: PRIMARY SCHOOL REGISTRATION

#### Test 2.1: Primary 1 Student Registration
**Objective**: Verify Primary 1 (Level 3) shows correct subjects
**Steps**:
1. Register Student
2. Select "PRIMARY" section
3. Select "Primary 1" class

**Expected Result**:
- ✓ Subjects: English Language, Mathematics, Science, Social Studies, Physical Education, Arts & Crafts, Music
- ✓ Computer Studies NOT yet (usually starts Primary 3)
- ✓ Minimum 7 subjects

**Result**: [ ] PASS [ ] FAIL

**Notes**: 

---

#### Test 2.2: Primary 3 Student Registration
**Objective**: Verify Primary 3 (Level 5) shows correct subjects (including Computer Studies)
**Steps**:
1. Register Student
2. Select "PRIMARY" section
3. Select "Primary 3" class

**Expected Result**:
- ✓ Subjects: English Language, Mathematics, Science, Social Studies, Physical Education, Arts & Crafts, Music, Computer Studies
- ✓ Minimum 8 subjects
- ✓ Computer Studies is now available

**Result**: [ ] PASS [ ] FAIL

**Notes**: 

---

#### Test 2.3: Primary 5 Student Registration
**Objective**: Verify Primary 5 (Level 7) shows complete subject list including electives
**Steps**:
1. Register Student
2. Select "PRIMARY" section
3. Select "Primary 5" class

**Expected Result**:
- ✓ Subjects include: English, Math, Science, Social Studies, PE, Arts, Music, Computer Studies, Home Economics, Agricultural Science
- ✓ Minimum 10 subjects
- ✓ Home Economics available (only Primary 4-6)
- ✓ Agricultural Science available

**Result**: [ ] PASS [ ] FAIL

**Notes**: 

---

### TEST GROUP 3: JUNIOR SECONDARY SCHOOL REGISTRATION

#### Test 3.1: JSS1 Student Registration
**Objective**: Verify JSS1 (Level 9) shows correct JSS subjects (NOT SSS subjects)
**Steps**:
1. Register Student
2. Select "SECONDARY" section
3. Select "JSS1" class

**Expected Result**:
- ✓ Subjects include: English Language, Mathematics, Basic Science, Basic Technology, Civic Education, Biology, Chemistry, Physics, History, Geography, French Language, Physical Education, Computer Studies, Agricultural Science
- ✓ Minimum 14 subjects
- ✓ NO "Further Mathematics" (SS only)
- ✓ NO "Economics" or "Accounting" (SS Commercial only)
- ✓ NO "Government" or "Literature in English" (SS Humanities only)

**Result**: [ ] PASS [ ] FAIL

**Notes**: 

---

#### Test 3.2: JSS2 Student Registration
**Objective**: Verify JSS2 (Level 10) shows same subjects as JSS1
**Steps**:
1. Register Student
2. Select "SECONDARY" section
3. Select "JSS2" class

**Expected Result**:
- ✓ Subject list identical to JSS1
- ✓ Minimum 14 subjects

**Result**: [ ] PASS [ ] FAIL

**Notes**: 

---

#### Test 3.3: JSS3 Student Registration
**Objective**: Verify JSS3 (Level 11) shows same subjects as JSS1/JSS2
**Steps**:
1. Register Student
2. Select "SECONDARY" section
3. Select "JSS3" class

**Expected Result**:
- ✓ Subject list identical to JSS1/JSS2
- ✓ Minimum 14 subjects

**Result**: [ ] PASS [ ] FAIL

**Notes**: 

---

### TEST GROUP 4: SENIOR SECONDARY - SCIENCE STREAM

#### Test 4.1: SS1 Science Stream Subject Selection
**Objective**: Verify SS1 Science stream shows ONLY science-relevant subjects
**Steps**:
1. Register Student
2. Select "SECONDARY" section
3. Select "SS1" class
4. Select "SCIENCE" department (new UI button in Step 3)

**Expected Result**:
- ✓ Department selection UI appears (Science/Commercial/Humanities buttons)
- ✓ After selecting "SCIENCE", subject list filtered to:
  - Core: English Language, Mathematics, Civic Education, Physical Education
  - Science: Biology, Chemistry, Physics, Further Mathematics
  - Optional: Agricultural Science, Computer Studies
- ✓ Minimum 8 subjects
- ✓ NO Economics, Accounting, Business Studies (Commercial only)
- ✓ NO Government, Literature in English (Humanities only)

**Result**: [ ] PASS [ ] FAIL

**Notes**: 

---

#### Test 4.2: SS2 Science Stream Subject Selection
**Objective**: Verify SS2 Science stream shows same as SS1
**Steps**:
1. Register Student
2. Select "SECONDARY" section
3. Select "SS2" class
4. Select "SCIENCE" department

**Expected Result**:
- ✓ Subject list identical to SS1 Science stream
- ✓ Minimum 8 subjects

**Result**: [ ] PASS [ ] FAIL

**Notes**: 

---

#### Test 4.3: SS3 Science Stream Subject Selection
**Objective**: Verify SS3 Science stream shows same as SS1/SS2
**Steps**:
1. Register Student
2. Select "SECONDARY" section
3. Select "SS3" class
4. Select "SCIENCE" department

**Expected Result**:
- ✓ Subject list identical to SS1/SS2 Science stream
- ✓ Minimum 8 subjects

**Result**: [ ] PASS [ ] FAIL

**Notes**: 

---

### TEST GROUP 5: SENIOR SECONDARY - COMMERCIAL STREAM

#### Test 5.1: SS1 Commercial Stream Subject Selection
**Objective**: Verify SS1 Commercial stream shows ONLY commercial-relevant subjects
**Steps**:
1. Register Student
2. Select "SECONDARY" section
3. Select "SS1" class
4. Select "COMMERCIAL" department

**Expected Result**:
- ✓ Subject list filtered to:
  - Core: English Language, Mathematics, Civic Education, Physical Education
  - Commercial: Economics, Accounting, Business Studies
  - Optional: Computer Studies
- ✓ Minimum 7 subjects
- ✓ NO Biology, Chemistry, Physics, Further Mathematics (Science only)
- ✓ NO Government, Literature in English (Humanities only)

**Result**: [ ] PASS [ ] FAIL

**Notes**: 

---

#### Test 5.2: SS2 Commercial Stream Subject Selection
**Objective**: Verify SS2 Commercial stream shows same as SS1
**Steps**:
1. Register Student
2. Select "SECONDARY" section
3. Select "SS2" class
4. Select "COMMERCIAL" department

**Expected Result**:
- ✓ Subject list identical to SS1 Commercial stream
- ✓ Minimum 7 subjects

**Result**: [ ] PASS [ ] FAIL

**Notes**: 

---

#### Test 5.3: SS3 Commercial Stream Subject Selection
**Objective**: Verify SS3 Commercial stream shows same as SS1/SS2
**Steps**:
1. Register Student
2. Select "SECONDARY" section
3. Select "SS3" class
4. Select "COMMERCIAL" department

**Expected Result**:
- ✓ Subject list identical to SS1/SS2 Commercial stream
- ✓ Minimum 7 subjects

**Result**: [ ] PASS [ ] FAIL

**Notes**: 

---

### TEST GROUP 6: SENIOR SECONDARY - HUMANITIES STREAM

#### Test 6.1: SS1 Humanities Stream Subject Selection
**Objective**: Verify SS1 Humanities stream shows ONLY humanities-relevant subjects
**Steps**:
1. Register Student
2. Select "SECONDARY" section
3. Select "SS1" class
4. Select "HUMANITIES" department

**Expected Result**:
- ✓ Subject list filtered to:
  - Core: English Language, Mathematics, Civic Education, Physical Education
  - Humanities: Government, Literature in English, History, Geography
  - Optional: Computer Studies
- ✓ Minimum 8 subjects
- ✓ NO Biology, Chemistry, Physics, Further Mathematics (Science only)
- ✓ NO Economics, Accounting, Business Studies (Commercial only)

**Result**: [ ] PASS [ ] FAIL

**Notes**: 

---

#### Test 6.2: SS2 Humanities Stream Subject Selection
**Objective**: Verify SS2 Humanities stream shows same as SS1
**Steps**:
1. Register Student
2. Select "SECONDARY" section
3. Select "SS2" class
4. Select "HUMANITIES" department

**Expected Result**:
- ✓ Subject list identical to SS1 Humanities stream
- ✓ Minimum 8 subjects

**Result**: [ ] PASS [ ] FAIL

**Notes**: 

---

#### Test 6.3: SS3 Humanities Stream Subject Selection
**Objective**: Verify SS3 Humanities stream shows same as SS1/SS2
**Steps**:
1. Register Student
2. Select "SECONDARY" section
3. Select "SS3" class
4. Select "HUMANITIES" department

**Expected Result**:
- ✓ Subject list identical to SS1/SS2 Humanities stream
- ✓ Minimum 8 subjects

**Result**: [ ] PASS [ ] FAIL

**Notes**: 

---

### TEST GROUP 7: TEACHER REGISTRATION

#### Test 7.1: Primary Teacher Registration
**Objective**: Verify Primary teacher can select any Primary class and appropriate subjects
**Steps**:
1. Go to School Admin Dashboard
2. Click "Register Teacher"
3. Select "PRIMARY" teaching level
4. Fill Steps 2-3 (personal, bank info)
5. In Step 4, select "Primary 5" class

**Expected Result**:
- ✓ Subject list shows Primary subjects (English, Math, Science, Social Studies, PE, Arts, Music, Computer Studies, Home Economics, Agricultural Science)
- ✓ Minimum 10 subjects
- ✓ No SS subjects visible

**Result**: [ ] PASS [ ] FAIL

**Notes**: 

---

#### Test 7.2: Secondary Teacher Registration - Science Stream
**Objective**: Verify Secondary teacher can filter by department
**Steps**:
1. Register Teacher
2. Select "SECONDARY" teaching level
3. Fill Steps 2-3
4. In Step 4, select "SS1" class
5. Verify "Department" selector appears
6. Select "SCIENCE"

**Expected Result**:
- ✓ Department selector appears (dropdown with SCIENCE, COMMERCIAL, HUMANITIES, TECHNICAL, VOCATIONAL)
- ✓ Subject list filtered to Science subjects: Biology, Chemistry, Physics, Further Mathematics, + core subjects
- ✓ NO Commercial/Humanities subjects visible

**Result**: [ ] PASS [ ] FAIL

**Notes**: 

---

#### Test 7.3: Secondary Teacher Registration - Commercial Stream
**Objective**: Verify Secondary teacher Science stream filtering works
**Steps**:
1. Register Teacher (same as 7.2)
2. Select "SS1" class
3. Select "COMMERCIAL" department

**Expected Result**:
- ✓ Subject list filtered to Commercial subjects: Economics, Accounting, Business Studies, + core subjects
- ✓ NO Science/Humanities subjects visible

**Result**: [ ] PASS [ ] FAIL

**Notes**: 

---

## Test Execution Checklist

Before running tests:
- [ ] Migration 107 has been executed
- [ ] Post-migration verification passed (no empty applicable_to_levels)
- [ ] Code changes are deployed
- [ ] Browser cache cleared (Ctrl+Shift+Delete or Cmd+Shift+Delete)
- [ ] You're logged in as school admin
- [ ] You have test school selected

## Summary of Test Results

| Test Group | Total Tests | Passed | Failed | % Pass |
|-----------|-------------|--------|--------|---------|
| 1. Early Years | 3 | [ ] | [ ] | [ ]% |
| 2. Primary | 3 | [ ] | [ ] | [ ]% |
| 3. JSS | 3 | [ ] | [ ] | [ ]% |
| 4. SS Science | 3 | [ ] | [ ] | [ ]% |
| 5. SS Commercial | 3 | [ ] | [ ] | [ ]% |
| 6. SS Humanities | 3 | [ ] | [ ] | [ ]% |
| 7. Teacher Reg | 3 | [ ] | [ ] | [ ]% |
| **TOTAL** | **21** | [ ] | [ ] | [ ]% |

## Overall Test Result

**Status**: [ ] PASS (all 21 tests passed) [ ] FAIL (some tests failed)

## Issues Found

(List any failures, unexpected behavior, or issues encountered)

1. 

---

## Sign-Off

**Tested By**: _______________
**Date**: _______________
**Status**: _______________

## Next Steps

If all tests pass:
- [ ] Commit test results
- [ ] Push to main branch
- [ ] Notify stakeholders
- [ ] Mark subject selection system as fixed

If tests fail:
- [ ] Analyze failures
- [ ] Fix root causes
- [ ] Re-run failing tests
- [ ] Document resolutions

