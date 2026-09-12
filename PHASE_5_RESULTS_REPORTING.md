# Phase 5: Results & Reporting System

## Overview
Complete results management and reporting system including:
- Score sheet display (report card)
- Performance analytics and insights
- Result exports (PDF, CSV)
- Teacher result management
- Parent/Guardian result access

## Architecture

### Score Sheets (Report Card)
Database Table: `score_sheets`
```
score_sheets
  ├─ school_id (FK→schools)
  ├─ student_id (FK→students)
  ├─ subject_id (FK→subjects)
  ├─ term_id (FK→academic_terms)
  ├─ test1, test2, test3, test4 (0-100)
  ├─ exam (0-100)
  ├─ total (GENERATED as: (test1+test2+test3+test4+exam)/5)
  ├─ grade (A-F, GENERATED from total)
  ├─ test1_source, test2_source, ... exam_source ('MANUAL' or 'CBT')
  ├─ test1_cbt_source, test2_cbt_source, ... exam_cbt_source (FK→cbt_submissions if CBT)
  ├─ UNIQUE(school_id, student_id, subject_id, term_id)
```

### Results Display Pages
1. **Student Results** `src/app/student/results/page.tsx`
   - Current term results
   - Results by term (filter)
   - Results by subject
   - Overall grade distribution
   - Download report as PDF

2. **Teacher Results** `src/app/teacher/results/page.tsx`
   - Filter by term, class, subject
   - Class performance overview
   - Individual student results
   - Student rank/position
   - Performance graph
   - Export class results

3. **Admin Results** `src/app/school-admin/results/page.tsx`
   - School-wide performance
   - Best performing classes
   - Weak students needing support
   - Subject performance comparison
   - Generate official transcripts

## Implementation Steps

### Step 1: Score Sheet Display Component
File: `src/components/ResultsDisplay/ScoreSheetCard.tsx` (NEW)
- Display all scores for one term
- Show subject, test1-4, exam, total, grade
- Color-code grades (A=green, F=red)
- Allow filtering by term

### Step 2: Student Results Page
File: `src/app/student/results/page.tsx` (NEW/UPDATE)
- Fetch student's score_sheets from Supabase
- Display current term results
- Allow term selection (dropdown)
- Show summary stats (GPA, average)
- Download PDF report

### Step 3: Teacher Results Page
File: `src/app/teacher/results/page.tsx` (NEW/UPDATE)
- Fetch all students in teacher's class/subject
- Display class results (table view)
- Sort by score, grade, position
- Edit scores (manual entry)
- Bulk upload scores
- Export to CSV

### Step 4: Results Analytics
File: `src/services/results-analytics.service.ts` (NEW)
- Calculate class average
- Calculate subject average
- Identify struggling students
- Rank students in class
- Grade distribution

### Step 5: PDF Report Generation
File: `src/services/pdf-report.service.ts` (NEW)
- Use jsPDF and pdfmake libraries
- Generate student report card
- Generate class results sheet
- Generate school transcript
- Customizable header/footer with school info

### Step 6: Export to CSV
File: `src/services/csv-export.service.ts` (NEW)
- Export score_sheets data to CSV
- Format: Subject, Test1, Test2, Test3, Test4, Exam, Total, Grade
- Include metadata (school, term, date, exported by)

### Step 7: Admin Transcript Management
File: `src/app/school-admin/transcripts/page.tsx` (NEW)
- Generate official transcripts
- Print transcripts
- Sign/verify transcripts
- Archive transcripts

## Data Queries

### Get Student's Score Sheets
```sql
SELECT 
  s.id,
  subj.name as subject_name,
  subj.code,
  ss.test1, ss.test2, ss.test3, ss.test4, ss.exam,
  ss.total, ss.grade,
  ss.test1_source, ss.test2_source, ... ss.exam_source,
  t.term_name, t.term_order
FROM score_sheets ss
JOIN subjects subj ON ss.subject_id = subj.id
JOIN academic_terms t ON ss.term_id = t.id
WHERE ss.student_id = $1 AND ss.school_id = $2 AND t.id = $3
ORDER BY subj.name
```

### Get Class Results
```sql
SELECT 
  u.full_name,
  s.id as student_id,
  subj.name,
  ss.test1, ss.test2, ss.test3, ss.test4, ss.exam, ss.total, ss.grade
FROM students s
JOIN users u ON s.user_id = u.id
JOIN class_arm_combos ca ON s.class_arm_combo_id = ca.id
JOIN score_sheets ss ON ss.student_id = s.id
JOIN subjects subj ON ss.subject_id = subj.id
WHERE ca.id = $1 AND ss.term_id = $2
ORDER BY ss.total DESC
```

### Get Subject Performance
```sql
SELECT 
  subj.name,
  AVG(ss.total) as average_score,
  MAX(ss.total) as highest_score,
  MIN(ss.total) as lowest_score,
  COUNT(CASE WHEN ss.grade IN ('A', 'B') THEN 1 END) as pass_count,
  COUNT(*) as total_count
FROM score_sheets ss
JOIN subjects subj ON ss.subject_id = subj.id
WHERE ss.school_id = $1 AND ss.term_id = $2
GROUP BY subj.id, subj.name
ORDER BY average_score DESC
```

## UI Components

### ScoreSheetCard
```tsx
<div className="grid grid-cols-5 gap-2 text-center">
  <div>Test1: {score.test1}</div>
  <div>Test2: {score.test2}</div>
  <div>Test3: {score.test3}</div>
  <div>Test4: {score.test4}</div>
  <div>Exam: {score.exam}</div>
  <div>Total: {score.total}</div>
  <div className={`grade-${score.grade}`}>{score.grade}</div>
</div>
```

### ResultsTable
```tsx
<table>
  <thead>
    <tr>
      <th>Student Name</th>
      <th>Test1</th>
      <th>Test2</th>
      <th>Test3</th>
      <th>Test4</th>
      <th>Exam</th>
      <th>Total</th>
      <th>Grade</th>
      <th>Position</th>
    </tr>
  </thead>
  <tbody>
    {results.map(result => (...))}
  </tbody>
</table>
```

## Testing Checklist
- [ ] Student can view their results by term
- [ ] Results display all 5 components (test1-4, exam)
- [ ] Total calculated correctly (sum/5)
- [ ] Grade assigned correctly (80+=A, 70+=B, etc)
- [ ] Can switch between terms
- [ ] Can filter by subject
- [ ] Teacher can see class results
- [ ] Results sorted by score
- [ ] Student position/rank displays
- [ ] PDF download works
- [ ] CSV export works
- [ ] No missing data in reports

## Success Criteria
✅ All score components display correctly
✅ Calculations are accurate (total, grade, rank)
✅ Results filter by term and subject
✅ PDF report is professional and complete
✅ CSV export includes all required fields
✅ Performance analytics show meaningful insights
✅ Multi-role access control (student sees own, teacher sees class, admin sees all)
✅ Real data from score_sheets table
✅ No hardcoded or mock data
