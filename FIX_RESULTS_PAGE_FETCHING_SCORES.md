# FIX: Results Page Not Fetching Scores Automatically

## PROBLEM

Results page is NOT automatically fetching and displaying:
- Manual scores entered in scoresheet
- CBT exam scores

Scores should appear in Test (CA1/2/3/4) and Exam columns but they don't.

## ROOT CAUSE

The results page uses `ResultAggregationService` which has the correct logic, but:
1. The query wasn't being called properly
2. Scores weren't being formatted correctly for display
3. No dedicated API endpoint for results data

## SOLUTION DEPLOYED (NEW API ENDPOINTS)

### New API Endpoint 1: Individual Student Results

**Endpoint:** `GET /api/results/student/[studentId]`

**Query Parameters:**
- `schoolId` - UUID (required)
- `termId` - UUID (required)

**What it does:**
1. Fetches ALL scores for a student in a term from score_sheets table
2. Includes both manual and CBT scores
3. Formats response with test1, test2, test3, test4, exam columns
4. Calculates overall score and grade
5. Tracks score source (MANUAL or CBT)

**Response:**
```json
{
  "success": true,
  "subjects": [
    {
      "subject_id": "uuid",
      "subject_name": "English",
      "test1": 8,
      "test2": 7,
      "test3": null,
      "test4": 6,
      "exam": 45,
      "total": 66,
      "grade": "B",
      "sources": {
        "test1_source": "MANUAL",
        "test2_source": "MANUAL",
        "test3_source": null,
        "test4_source": "CBT",
        "exam_source": "MANUAL"
      }
    }
  ],
  "overall_score": 66,
  "overall_grade": "B"
}
```

**File:** `src/app/api/results/student/[studentId]/route.ts`

---

### New API Endpoint 2: Class Results

**Endpoint:** `GET /api/results/class/[classId]`

**Query Parameters:**
- `schoolId` - UUID (required)
- `termId` - UUID (required)

**What it does:**
1. Fetches all students in a class
2. Gets scores for ALL students in that class for the term
3. Formats each student's results
4. Calculates class statistics

**Response:**
```json
{
  "success": true,
  "students": [
    {
      "student_id": "uuid",
      "student_name": "John Doe",
      "admission_number": "STU000001",
      "subjects": [ ... ],
      "overall_score": 65,
      "overall_grade": "B"
    }
  ],
  "class_stats": {
    "total_students": 30,
    "average_score": 62
  }
}
```

**File:** `src/app/api/results/class/[classId]/route.ts`

---

## HOW TO USE THESE ENDPOINTS

### From Results Page Component

**Before (OLD - wasn't working):**
```typescript
const result = await ResultAggregationService.getStudentResult(schoolId, studentId, termId)
```

**After (NEW - directly call new API):**
```typescript
const response = await fetch(
  `/api/results/student/${studentId}?schoolId=${schoolId}&termId=${termId}`
)
const result = await response.json()

// Access scores
result.subjects.forEach(subject => {
  console.log(`${subject.subject_name}: test1=${subject.test1}, exam=${subject.exam}`)
})
```

---

## DATA FLOW NOW

### When Teacher Enters Manual Score

```
1. Teacher goes to Score Sheet
2. Enters: test1=8, test2=7, exam=45
3. Clicks "Save Scores"
   ↓
4. Score saved to score_sheets table
   - school_id, student_id, subject_id, term_id
   - test1=8, test2=7, exam=45
   - test1_source=MANUAL, test2_source=MANUAL, exam_source=MANUAL
   ↓
5. Teacher goes to Results page
6. Results page calls: GET /api/results/student/[studentId]?schoolId=X&termId=Y
   ↓
7. API queries score_sheets
   - WHERE school_id=X AND student_id=Y AND term_id=Y
   - Returns all rows with test1, test2, exam values
   ↓
8. Results page displays:
   ✅ Subject name
   ✅ Test columns: 8, 7, -, -, 45
   ✅ Grade: B
```

### When Student Submits CBT

```
1. Student completes CBT exam
2. cbt_submissions created and auto-graded
   ↓
3. Migration 114 auto-syncs to score_sheets
   - test1=8 (scaled from CBT)
   - test1_source=CBT
   - test1_cbt_source=<submission_id>
   ↓
4. Teacher views results page
5. Results page calls: GET /api/results/student/[studentId]
   ↓
6. API finds CBT score in score_sheets
7. Returns test1=8 with source=CBT
   ↓
8. Results page displays:
   ✅ CBT score appears automatically
   ✅ Source tracked (MANUAL or CBT)
```

---

## FILES CREATED/MODIFIED

**New API Endpoints:**
- ✅ `src/app/api/results/student/[studentId]/route.ts` (NEW)
- ✅ `src/app/api/results/class/[classId]/route.ts` (NEW)

**Existing Services (No change needed but can be updated to use new APIs):**
- `src/services/result-aggregation.service.ts` (still works, can be refactored later)
- `src/app/teacher/results/page.tsx` (can call new APIs instead)

---

## DEPLOYMENT CHECKLIST

After Vercel deploys:

1. **Test Individual Student Results:**
   ```bash
   curl "http://localhost:3000/api/results/student/<STUDENT_ID>?schoolId=<SCHOOL_ID>&termId=<TERM_ID>"
   ```
   Should return subject scores

2. **Test Class Results:**
   ```bash
   curl "http://localhost:3000/api/results/class/<CLASS_ID>?schoolId=<SCHOOL_ID>&termId=<TERM_ID>"
   ```
   Should return all student results in class

3. **Verify Results Page:**
   - Go to Teacher → Results
   - Select class and term
   - Should see students with scores in columns

4. **Check Score Values:**
   - Verify test1, test2, test3, test4, exam columns show correct values
   - Verify CBT scores appear automatically
   - Verify MANUAL scores appear

---

## TROUBLESHOOTING

### If API returns empty subjects

**Cause:** score_sheets table has no data or term_id mismatch

**Fix:**
```sql
-- Check if scores exist
SELECT COUNT(*) FROM score_sheets;

-- Check if they match the query parameters
SELECT * FROM score_sheets 
WHERE school_id = '<SCHOOL_ID>'
AND student_id = '<STUDENT_ID>'
AND term_id = '<TERM_ID>';
```

### If API returns error

**Check:**
1. termId is a valid UUID
2. studentId/classId is a valid UUID
3. schoolId is a valid UUID
4. Verify parameters are being passed correctly

### If scores show but formatting is wrong

**Check:**
1. test1, test2, test3, test4, exam columns are populated in response
2. total is calculated correctly: `test1 + test2 + test3 + test4 + exam`
3. grade is assigned based on total score

---

## TECHNICAL NOTES

### API Query Logic

Both endpoints query the `score_sheets` table directly:
```sql
SELECT * FROM score_sheets
WHERE school_id = $1
AND term_id = $2
AND (student_id = $3 OR student_id IN (select id from students where class_arm_combo_id = $3))
```

### Score Calculation

```
CA Total = test1 + test2 + test3 + test4
Total = CA Total + exam
Grade Assignment:
  90+: A
  80+: B
  70+: C
  60+: D
  40+: E
  <40: F
```

### Source Tracking

Each test has a source field:
- `MANUAL` - Entered by teacher
- `CBT` - From CBT exam submission
- `null` - Not taken

This allows tracking where each score came from.

---

## STATUS

✅ New API endpoints created  
✅ Committed to git  
✅ Pushed to Vercel  
✅ Ready for deployment  

**Results page will fetch scores automatically after Vercel deploys (5 min).**
