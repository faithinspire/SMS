# MASTER PROMPT — ENHANCE SCORE SHEET & AUTOMATIC REPORT CARD SYSTEM

**Version:** 1.0 Production-Level Specification  
**Status:** Ready for Implementation  
**Purpose:** Complete Score Sheet → Student Result integration with automatic calculations and real-time synchronization

---

## 1. SCORE SHEET MAIN PURPOSE

The Score Sheet belongs to the Teacher Dashboard.

```
Teacher Dashboard
→ Score Sheet
```

The Score Sheet must automatically fetch ONLY students belonging to the teacher's assigned class.

**Example:**

Teacher: Mr. John  
Class Teacher: SS1A

The Score Sheet must automatically load:
- SS1A Students

It MUST NOT show students from:
- SS1B, SS1C, SS2, SS3, JSS, Primary (unless explicitly assigned)

Use the actual teacher → class/class-arm → student relationship already established in the database.

**Do not hardcode student lists.**

---

## 2. SCORE SHEET CLASS SELECTION

At the top of the Score Sheet display:

```
SCHOOL NAME
TEACHER NAME
ACADEMIC SESSION
TERM
CLASS
CLASS ARM

Example:

LEADWAY SCHOOLS

Teacher: Mr. John Doe
Class Teacher: SS1A
Academic Session: 2026/2027
Term: First Term
```

If the teacher is assigned to multiple classes, provide:

```
Select Class:
[ SS1A ▼ ]

Select Term:
[ First Term ▼ ]

Select Session:
[ 2026/2027 ▼ ]
```

The system then loads the correct students.

---

## 3. STUDENT LIST

Display the students in a professional table:

```
NO | STUDENT NAME | ADMISSION NO | CLASS | ACTION

1 | John Doe | 2026-001 | SS1A | [ENTER SCORES]
2 | Jane Doe | 2026-002 | SS1A | [ENTER SCORES]
```

When the teacher clicks `[ENTER SCORES]`, open a large modal/pop-up.

---

## 4. EXCEL-LIKE SCORE SHEET POPUP

The popup should look and behave like a professional Excel spreadsheet.

### Header:

```
STUDENT SCORE SHEET

School Name
Student Name
Admission Number
Class
Term
Academic Session
```

### Then display the student's subjects as rows:

```
Student: JOHN DOE
Class: SS1A
Term: FIRST TERM
Session: 2026/2027

| SUBJECT      | CA1 | CA2 | CA3 | CA4 | EXAM | TOTAL | % |
|--------------|-----|-----|-----|-----|------|-------|---|
| Mathematics  |  8  |  9  |  7  |  9  |  52  |  85   |85%|
| English      |  7  |  8  |  9  |  8  |  48  |  80   |80%|
| Biology      |  9  | 8   | 9   | 9   | 55   | 90    |90%|
| Physics      | 8   | 7   | 8   | 9   | 50   | 82    |82%|
```

---

## 5. SCORE STRUCTURE

Each subject must have:

- CA1 = 10 marks
- CA2 = 10 marks
- CA3 = 10 marks
- CA4 = 10 marks

**Continuous Assessment Total:** 40 marks  
**Exam:** 60 marks  
**Total:** 100 marks

Therefore:

```
CA TOTAL = CA1 + CA2 + CA3 + CA4
FINAL TOTAL = CA TOTAL + EXAM
```

**Example:**

```
CA1 = 8
CA2 = 9
CA3 = 7
CA4 = 9

CA TOTAL = 33/40
EXAM = 52/60

FINAL TOTAL:
33 + 52 = 85/100

Display:
CA: 33/40
Exam: 52/60
Total: 85/100
Percentage: 85%
```

---

## 6. VALIDATION

The system must prevent invalid scores.

**CA fields:**
- Minimum = 0
- Maximum = 10

**Exam:**
- Minimum = 0
- Maximum = 60

**Do not allow:**
- 11/10
- 15/10
- 61/60
- negative values
- letters
- invalid values

**Example messages:**

```
"CA score cannot exceed 10."
"Exam score cannot exceed 60."
```

The system must validate both **frontend AND backend**.

---

## 7. AUTOMATIC CALCULATION

**DO NOT require the teacher to manually calculate anything.**

As soon as a score is entered:

- CA TOTAL automatically updates
- EXAM automatically updates
- TOTAL automatically updates
- PERCENTAGE automatically updates

**Example:**

```
CA1 = 8
CA2 = 8
CA3 = 9
CA4 = 10

CA Total automatically becomes: 35/40
Exam: 52/60
Total automatically becomes: 87/100
Percentage: 87%
```

**Do this in real time while the teacher is entering scores.**

---

## 8. AVERAGE / CUMULATIVE COLUMN

Include an appropriate **AVERAGE** column.

The average must be calculated correctly based on the school's result structure.

**Example with multiple subjects:**

```
Mathematics = 85
English = 80
Biology = 90
Physics = 82

Overall subject average:
(85 + 80 + 90 + 82) / 4 = 84.25%
```

The system should automatically calculate the student's overall percentage/average.

**DO NOT double-count subjects.**  
**DO NOT include empty/unregistered subjects in the calculation.**

---

## 9. TOTAL COLUMN

At the bottom of the score sheet display:

```
SUBJECT TOTALS

CA1 TOTAL
CA2 TOTAL
CA3 TOTAL
CA4 TOTAL
CA TOTAL
EXAM TOTAL
OVERALL TOTAL

Also calculate:

Overall Percentage
Overall Average

Example:

CA1 Total: 32
CA2 Total: 34
CA3 Total: 35
CA4 Total: 36

CA Total: 137/160
Exam Total: 410/480

Overall:
547/640

Overall Percentage: 85.47%
```

The exact calculation must be based on the actual number of subjects the student offers.

---

## 10. STUDENT SUBJECTS

**IMPORTANT:** The Score Sheet must show ONLY subjects that the specific student actually offers.

**Example:**

Student A offers:
- Mathematics
- English
- Physics
- Chemistry
- Biology

Only these subjects should appear.

**Do not display subjects the student does not offer.**

Use the student-subject enrollment relationship.

**Do not display subject UUIDs.**

Display: `Mathematics`  
NOT: `b9e1884d-6fae-40ca-86a7-54301ea73620`

---

## 11. AUTO-SAVE

Scores should save reliably.

Prefer auto-save or controlled save behavior.

**Example:**

```
Teacher enters:
Mathematics CA1 = 8

The system saves the score.

Show:
✓ Saved
```

**Do not lose entered scores when the teacher changes subject/student.**

Provide:
- `[Save Scores]`
- Optionally auto-save with debounce

**If auto-save fails:**

```
❌ Failed to save score
[Retry]
```

Never silently discard teacher input.

---

## 12. RESULT PAGE AUTOMATIC SYNCHRONIZATION

**THIS IS CRITICAL.**

Every score entered in:

```
Teacher Dashboard
→ Score Sheet
```

must automatically appear in:

```
Student Dashboard
→ Results
```

**There must be ONE source of truth.**

**DO NOT create a separate manually maintained student result table that can become different from the teacher score sheet.**

The flow must be:

```
Teacher Score Sheet
↓
Assessment/Result Record
↓
Student Result Page
```

**Example:**

```
Teacher enters Mathematics CA1 = 8
→ Student Result immediately shows: Mathematics CA1 = 8

Teacher enters Exam = 52
→ Student Result shows: Exam = 52
```

---

## 13. REPORT CARD

Student Dashboard:

```
→ Results
```

The result page must function as a professional digital report card.

### Header:

```
SCHOOL LOGO

SCHOOL NAME

STUDENT REPORT CARD

Academic Session
Term

Student Name
Admission Number
Class
Class Arm
Department where applicable

Example:

LEADWAY SCHOOLS

STUDENT REPORT CARD

FIRST TERM
2026/2027

Student:
JOHN DOE

Admission No:
2026-001

Class:
SS1A
```

---

## 14. REPORT CARD SUBJECT TABLE

Display:

```
| SUBJECT | CA1 | CA2 | CA3 | CA4 | CA TOTAL | EXAM | TOTAL | % | GRADE |
|---------|-----|-----|-----|-----|----------|------|-------|---|-------|
| Maths   | 8   | 9   | 7   | 9   | 33       | 52   | 85    |85%| A     |
| English | 7   | 8   | 9   | 8   | 32       | 48   | 80    |80%| A     |
| Biology | 9   | 8   | 9   | 9   | 35       | 55   | 90    |90%| A     |
```

At the bottom:

```
Total Score
Maximum Possible Score
Overall Percentage
Overall Average
Overall Grade
Position if configured
Number of Subjects
```

---

## 15. AUTOMATIC GRADING

Implement the school's grading configuration.

**For example:**

```
70–100 = A
60–69 = B
50–59 = C
45–49 = D
40–44 = E
0–39 = F
```

**BUT:** If the project already has a grading configuration table, use that instead of hardcoding.

**The grade must automatically update when the score changes.**

---

## 16. ATTENDANCE

The Report Card must also include attendance.

Display:

```
ATTENDANCE

School Days: 65
Present: 61
Absent: 4
Late: 2

Attendance Percentage: 93.85%
```

Fetch attendance from the existing attendance system.

**Do not create duplicate attendance records.**

If attendance is unavailable, display:

```
"No attendance records available."
```

**Do not display fake data.**

---

## 17. OTHER STUDENT PERFORMANCE

The report card should support additional performance information where available.

**Examples:**

- Attendance
- Conduct
- Punctuality
- Participation
- Practical Work
- Classwork
- Assignment
- Teacher Assessment

Use the existing database structures if available.

**Do not invent fake records.**

---

## 18. TEACHER COMMENT

At the bottom of the Report Card:

```
TEACHER'S COMMENT
```

Provide a large editable text area for the class teacher.

**Example:**

```
"John has demonstrated excellent academic improvement this term. He should continue to work on consistency and class participation."
```

- Teacher can edit the comment
- Student can VIEW the comment
- Student cannot edit it

---

## 19. HEAD TEACHER / PRINCIPAL COMMENT

Where supported, include:

```
HEAD TEACHER / PRINCIPAL'S COMMENT
```

This should be editable only by authorized school administrators.

- Student: READ ONLY

---

## 20. TERM SYSTEM

The Report Card must support:

```
FIRST TERM
SECOND TERM
THIRD TERM
```

The teacher selects:

```
[ First Term ▼ ]
```

and sees only First Term scores.

**Student:**

```
Results
→ First Term
```

shows First Term results.

**Second Term must show only Second Term results.**  
**Third Term must show only Third Term results.**

**Never mix results between terms.**

---

## 21. ACADEMIC SESSION

Every score must belong to:

```
School
Academic Session
Term
Student
Class
Subject

Example:

School: LEADWAY SCHOOLS
Session: 2026/2027
Term: First Term
Student: John Doe
Class: SS1A
Subject: Mathematics
Assessment: CA1
Score: 8/10
```

---

## 22. TEACHER PERMISSION

A teacher must only edit scores for:

- Students assigned to their class/subject responsibilities

**Class Teacher:** Can manage results for students in their assigned class according to school permissions.

**Subject Teacher:** Can manage scores for students offering the subject they teach.

**Teacher cannot edit:**

- Another school's students
- Another teacher's unrelated subject
- Another class without authorization

**Students cannot edit results.**

---

## 23. EXCEL-LIKE USER EXPERIENCE

The Score Sheet should feel like a professional spreadsheet.

### Features:

- Sticky header
- Frozen student column where useful
- Editable cells
- Keyboard navigation
- Tab between cells
- Enter to move down
- Numeric validation
- Auto-calculation
- Save indicator
- Search student
- Filter class
- Filter subject
- Filter term
- Responsive layout

Use clean modern UI.

**Desktop:** Spreadsheet/table experience  
**Tablet:** Horizontally scrollable score table  
**Mobile:** Convert each student into a card or horizontally scrollable spreadsheet without destroying usability

---

## 24. STUDENT POPUP DESIGN

When clicking a student, open a large modal.

### Header:

```
[Student Photo]

JOHN DOE
SS1A
2026-001

First Term | 2026/2027
```

Then the spreadsheet.

### Footer:

```
Overall Average
Overall Percentage
Overall Grade

Teacher Comment

[Save Scores]
[Close]
```

---

## 25. RESULT GENERATION

The result page must automatically generate from the same stored assessment data.

**DO NOT manually duplicate values into another unrelated table.**

The system should calculate:

- CA total
- Exam score
- Subject total
- Subject percentage
- Subject grade
- Overall total
- Overall percentage
- Overall average
- Overall grade

**Whenever a score changes, the result recalculates.**

---

## 26. CBT INTEGRATION

If a score comes from CBT:

```
CBT Submission
↓
Automatic Grading
↓
Assessment Result
↓
Score Sheet
↓
Student Result
```

**Example:**

```
Mathematics
CA1
CBT Score = 8/10
```

The Score Sheet must show: `CA1 = 8`

The teacher should not have to manually re-enter the CBT score.

If the teacher is allowed to override the score, record the override appropriately.

---

## 27. RESULT CONSISTENCY

**There must NEVER be a situation where:**

```
Teacher sees: 85
while: Student sees: 72
```

The same result source must power both pages.

Every result query must use:

- school_id
- student_id
- class/class_arm
- subject_id
- term
- academic_session

where appropriate.

---

## 28. DATABASE/API REQUIREMENT

Inspect the current schema before implementation.

Identify existing:

- students
- teachers
- subjects
- classes
- class_arms
- student_subjects
- teacher_subjects
- teacher_class_assignments
- assessments
- scores/results
- attendance
- terms
- academic_sessions
- CBT submissions

**Reuse existing tables where possible.**

**Do not create duplicate result tables.**

**Do not create duplicate score tables.**

If a required structure is missing, create the minimum necessary canonical structure.

**All frontend and backend types must match the database.**

---

## 29. NO UUIDS IN THE UI

**NEVER display:**

```
b9e1884d-6fae-40ca-86a7-54301ea73620
```

or any other UUID as a subject/class/student name.

Use joins/relationships to display:

- Mathematics (not UUID)
- English (not UUID)
- Physics (not UUID)
- SS1A (not UUID)
- John Doe (not UUID)

**UUIDs may remain internal database identifiers.**

---

## 30. ERROR PREVENTION

Prevent:

- undefined student
- undefined class
- undefined subject
- undefined score
- empty UUID
- invalid score
- duplicate score
- duplicate result
- wrong term
- wrong session
- wrong student
- wrong subject
- wrong teacher

**Before every database query validate required IDs.**

Never send:

```
school_id=eq.
student_id=eq.undefined
```

Never save a score without:

- student_id
- subject_id
- school_id
- term
- academic_session
- assessment type

---

## 31. FINAL END-TO-END TEST

**TEST WITH A REAL STUDENT.**

### Example:

```
Student: John Doe
Class: SS1A
Subjects: Mathematics, English, Physics, Chemistry

Teacher opens:
Score Sheet
→ SS1A
→ John Doe

Click John Doe.
Popup opens.

Enter:
Mathematics:
CA1 8
CA2 9
CA3 7
CA4 9
Exam 52

System calculates:
CA Total = 33/40
Exam = 52/60
Total = 85/100
Percentage = 85%

Then enter the other subjects.

Verify:
- Overall Average calculates automatically
- Overall Percentage calculates automatically

Then close the popup.

Reopen it.

Verify scores remain.

Then open:
Student Dashboard
→ Results
→ First Term

Verify the exact same scores appear.

Verify:
- Attendance appears
- Teacher Comment appears
- Overall Percentage appears
- Overall Grade appears

Then modify:
Mathematics CA1: 8 → 9

Verify:
- Score Sheet updates
- Result Page updates
- Overall calculation updates
- Student cannot edit the score
```

---

## 32. FINAL IMPLEMENTATION REQUIREMENT

**DO NOT JUST BUILD THE UI.**

Implement the COMPLETE DATA FLOW:

```
TEACHER CLASS
↓
STUDENTS
↓
STUDENT SUBJECTS
↓
SCORE SHEET
↓
ASSESSMENT SCORES
↓
AUTOMATIC CALCULATION
↓
RESULT DATABASE
↓
REPORT CARD
↓
ATTENDANCE
↓
TEACHER COMMENT
↓
STUDENT DASHBOARD
```

**The Score Sheet and Report Card must be two views of the SAME academic performance data.**

- Do not create disconnected mock data
- Do not use static/demo scores
- Do not hardcode students
- Do not hardcode subjects
- Do not hardcode classes
- Do not create duplicate APIs
- Do not create duplicate result systems

### After implementation:

1. **RUN THE APPLICATION**
2. **TEST THE SCORE SHEET**
3. **TEST SCORE SAVING**
4. **TEST CALCULATIONS**
5. **TEST RESULT PAGE**
6. **TEST ATTENDANCE**
7. **TEST TEACHER COMMENT**
8. **TEST TERM SWITCHING**
9. **TEST STUDENT VIEW**
10. **FIX ALL TYPESCRIPT ERRORS**
11. **FIX ALL API ERRORS**
12. **FIX ALL DATABASE ERRORS**
13. **FIX ALL DATA-SYNCHRONIZATION ERRORS**

**DO NOT CONSIDER THE TASK COMPLETE UNTIL A SCORE ENTERED IN THE TEACHER SCORE SHEET IS AUTOMATICALLY REFLECTED CORRECTLY IN THE STUDENT'S REPORT CARD.**

---

## Core Workflow

```
Teacher Dashboard
  → Score Sheet
    → Select Class (auto-populated with assigned classes)
      → Select Student (auto-populated with class students)
        → Excel-style score popup
          → Enter CA1–CA4 + Exam
            → Automatic 100% calculation
              → Save
                → Result/Report Card
                  → Attendance + Performance + Comments
                    → Student Dashboard (Real-time sync)
```

---

## Key Implementation Principle

**Do not store "Total," "Percentage," and "Average" as independently editable values.**

They should be calculated from the underlying scores. This prevents the common situation where a teacher changes a CA score but the report card continues showing an old total.

---

**Version:** 1.0  
**Status:** Production-Ready Specification  
**Created:** August 2026  
**For:** SMS Application Score Sheet & Report Card System
