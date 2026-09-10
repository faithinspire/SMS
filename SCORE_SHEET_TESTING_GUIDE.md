# Score Sheet System - Complete Testing Guide

## System Overview
The Score Sheet system is a comprehensive module for teachers to manage student scores with automatic data synchronization to student report cards. The system includes:

1. **Teacher Dashboard** - View assigned classes
2. **Score Sheet** - Enter student scores per subject
3. **Report Card** - Automatic report card generation for students
4. **Data Synchronization** - Automatic score sync between systems

## API Endpoints

### Core Endpoints
| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/teacher/classes` | GET | Fetch teacher's assigned classes | ✅ FIXED |
| `/api/teacher/class-students` | GET | Fetch students in a class | ✅ Working |
| `/api/teacher/student-scores` | GET/POST | Fetch/Save student scores | ✅ Working |
| `/api/student/report-card` | GET | Generate student report card | ✅ Working |
| `/api/results/validate-scores` | POST | Validate score data | ✅ CREATED |
| `/api/results/sync-score-sheet` | POST | Sync score sheet data | ✅ Working |

### Endpoint Details

#### 1. GET /api/teacher/classes
**Headers Required:**
```
x-teacher-id: [teacher-uuid]
x-school-id: [school-uuid]
```

**Response:**
```json
{
  "success": true,
  "count": 2,
  "classes": [
    {
      "id": "class-combo-id",
      "class_id": "class-id",
      "arm_id": "arm-id",
      "classes": {
        "id": "class-id",
        "name": "Form 1",
        "level": "1",
        "type": "PRIMARY"
      },
      "arms": {
        "id": "arm-id",
        "name": "Arm A"
      }
    }
  ]
}
```

**Test:**
```bash
curl -X GET http://localhost:3000/api/teacher/classes \
  -H "x-teacher-id: [teacher-id]" \
  -H "x-school-id: [school-id]"
```

---

#### 2. GET /api/teacher/class-students
**Query Params:**
```
class_arm_combo_id: [required - UUID of class-arm combo]
```

**Headers Required:**
```
x-teacher-id: [teacher-uuid]
x-school-id: [school-uuid]
```

**Response:**
```json
{
  "success": true,
  "count": 25,
  "students": [
    {
      "id": "student-id",
      "user_id": "user-id",
      "admission_number": "2024/001",
      "full_name": "John Doe",
      "email": "john@example.com",
      "photo_url": "https://...",
      "class_arm_combo_id": "combo-id",
      "subjects": [
        {
          "id": "subject-id",
          "name": "Mathematics",
          "code": "MATH"
        }
      ]
    }
  ]
}
```

**Test:**
```bash
curl -X GET "http://localhost:3000/api/teacher/class-students?class_arm_combo_id=[class-combo-id]" \
  -H "x-teacher-id: [teacher-id]" \
  -H "x-school-id: [school-id]"
```

---

#### 3. GET /api/teacher/student-scores
**Query Params:**
```
school_id: [required]
student_id: [required]
term_id: [optional]
```

**Response:**
```json
{
  "success": true,
  "count": 8,
  "scores": [
    {
      "subject_id": "subject-id",
      "subject_name": "Mathematics",
      "subject_code": "MATH",
      "test1": 8.5,
      "test2": 9.0,
      "test3": 8.0,
      "test4": 9.5,
      "test_total": 35,
      "exam": 52,
      "total": 87,
      "grade": "A",
      "teacher_comment": "Excellent performance"
    }
  ]
}
```

---

#### 4. POST /api/teacher/student-scores
**Body:**
```json
{
  "school_id": "school-uuid",
  "student_id": "student-uuid",
  "subject_id": "subject-uuid",
  "test1_score": 8.5,
  "test2_score": 9.0,
  "test3_score": 8.0,
  "test4_score": 9.5,
  "exam_score": 52,
  "teacher_comment": "Good work",
  "term_id": "term-uuid",
  "class_arm_combo_id": "combo-uuid",
  "teacher_id": "teacher-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Score created",
  "data": {
    "id": "entry-id",
    "test1_score": 8.5,
    "test2_score": 9.0,
    "test3_score": 8.0,
    "test4_score": 9.5,
    "exam_score": 52,
    "total_score": 87,
    "grade": "A"
  }
}
```

---

#### 5. GET /api/student/report-card
**Query Params:**
```
school_id: [required]
student_id: [required]
term_id: [optional]
```

**Response:**
```json
{
  "success": true,
  "report_card": {
    "student": {
      "id": "student-id",
      "admission_number": "2024/001",
      "full_name": "John Doe",
      "class": "Form 1",
      "arm": "Arm A",
      "level": "1"
    },
    "school": {
      "id": "school-id",
      "name": "Example School",
      "logo_url": "https://..."
    },
    "term": {
      "id": "term-id",
      "name": "First Term",
      "session_year": "2024/2025"
    },
    "scores": [
      {
        "subject_name": "Mathematics",
        "subject_code": "MATH",
        "total": 87,
        "grade": "A",
        "teacher_comment": "Excellent"
      }
    ],
    "attendance": {
      "total_school_days": 60,
      "present": 55,
      "absent": 3,
      "late": 2,
      "percentage": 91.67
    },
    "overall": {
      "total_subjects": 8,
      "overall_score": 720,
      "overall_percentage": 85.5,
      "overall_grade": "A",
      "subjects_passed": 8
    }
  }
}
```

---

#### 6. POST /api/results/validate-scores
**Body:**
```json
{
  "scores": [
    {
      "subject_id": "subject-uuid",
      "subject_name": "Mathematics",
      "test1": 8.5,
      "test2": 9.0,
      "test3": 8.0,
      "test4": 9.5,
      "exam": 52
    }
  ]
}
```

**Response (Valid):**
```json
{
  "valid": true,
  "errors": [],
  "message": "All scores are valid"
}
```

**Response (Invalid):**
```json
{
  "valid": false,
  "errors": [
    {
      "subject_id": "subject-uuid",
      "subject_name": "Mathematics",
      "field": "test1",
      "message": "Must be between 0-10",
      "value": 15
    }
  ]
}
```

---

## End-to-End Testing Workflow

### Step 1: Teacher Login
1. Navigate to `/auth/staff/login`
2. Login with teacher account
3. Verify user is redirected to teacher dashboard

### Step 2: Navigate to Score Sheet
1. From dashboard, click on "Score Sheet" or navigate to `/teacher/score-sheet`
2. Wait for page to load
3. **VERIFY:** Class dropdown shows teacher's assigned classes

### Step 3: Select Class
1. From dropdown, select a class
2. **VERIFY:** Student list appears below showing all students in that class
3. **VERIFY:** Each student card shows admission number and class info

### Step 4: Open Student Score Modal
1. Click "ENTER SCORES" button on a student card
2. **VERIFY:** Modal opens with student name and admission number
3. **VERIFY:** Modal shows all subjects enrolled for that student
4. **VERIFY:** Score input fields are visible and ready for input

### Step 5: Enter Test Scores
1. Click on Test 1 field for Mathematics
2. Enter a value between 0-10 (e.g., 8.5)
3. Press Tab or click elsewhere
4. **VERIFY:** Test scores calculate automatically
5. **VERIFY:** Total CA (test_total) updates to sum of all tests

### Step 6: Enter Exam Score
1. Click on Exam field
2. Enter a value between 0-60 (e.g., 48)
3. Press Tab
4. **VERIFY:** Total score updates (test_total + exam)
5. **VERIFY:** Percentage calculates correctly
6. **VERIFY:** Grade assigns correctly (A/B/C/D/F)

### Step 7: Add Teacher Comment
1. Scroll down to "Teacher's Comment" section
2. Enter a comment (e.g., "Good performance")
3. **VERIFY:** Comment text appears in textarea

### Step 8: Save Scores
1. Click "✅ Save Scores" button
2. **VERIFY:** Scores are validated locally first
3. **VERIFY:** Scores are validated backend
4. **VERIFY:** Success toast appears: "✅ Scores and comments saved successfully!"
5. **VERIFY:** Modal closes automatically
6. **VERIFY:** Student list refreshes

### Step 9: Student Views Report Card
1. Login as student
2. Navigate to Results page
3. **VERIFY:** Report card loads with entered scores
4. **VERIFY:** All subjects show scores entered by teacher
5. **VERIFY:** Teacher comments are visible
6. **VERIFY:** Attendance statistics show if available
7. **VERIFY:** Overall grade displays

### Step 10: Data Verification
1. Check that all entered data is persisted in `result_entries` table
2. **VERIFY:** `test1_score, test2_score, test3_score, test4_score, exam_score, total_score, grade, teacher_comment` are all saved
3. **VERIFY:** Multiple students can have different scores
4. **VERIFY:** Updating scores doesn't lose previous data

---

## Validation Rules

### Score Ranges
- **Test 1-4:** 0-10 points each
- **CA Total:** Sum of 4 tests (0-40)
- **Exam:** 0-60 points
- **Total:** CA Total + Exam (0-100)

### Grading Scale
| Score Range | Grade |
|-------------|-------|
| 70-100 | A |
| 60-69 | B |
| 50-59 | C |
| 40-49 | D |
| 0-39 | F |

### Auto-Calculations
- `test_total` = test1 + test2 + test3 + test4
- `total_score` = test_total + exam_score
- `percentage` = (total_score / 100) * 100
- `grade` = lookup from grading scale

---

## Error Handling

### Error Scenarios

#### 400 Bad Request
- Missing required headers or query params
- Invalid score ranges (e.g., test1 = 15)

#### 404 Not Found
- Student not found
- Class not found

#### 500 Internal Server Error
- Database connection error
- Validation error
- Score calculation error

### Error Recovery
1. Check server logs for detailed error
2. Verify teacher ID and school ID are valid
3. Verify student and class IDs exist
4. Check network connection
5. Retry operation

---

## Database Schema Requirements

### Tables Used
1. **class_arm_combos** - Teacher's assigned classes
   - `id, class_id, arm_id, class_teacher_id, school_id`

2. **students** - Student records
   - `id, user_id, admission_number, class_arm_combo_id, school_id`

3. **student_subjects** - Student subject enrollments
   - `id, student_id, subject_id, school_id`

4. **result_entries** - Score records (canonical data source)
   - `id, student_id, subject_id, test1_score, test2_score, test3_score, test4_score, exam_score, total_score, grade, teacher_comment, term_id, school_id, updated_at`

5. **attendance** - Attendance records
   - `id, student_id, date, status, school_id`

6. **terms** - Academic term information
   - `id, name, session_year, start_date, end_date, is_current, school_id`

---

## Performance Considerations

### Query Optimization
- Class dropdown loads once on page load
- Student list loads when class is selected
- Student scores load when opening modal
- Results page loads report card data

### Caching Strategy
- Cache class list in localStorage for faster page loads
- Don't cache student lists (may change)
- Don't cache scores (real-time updates)

### Bulk Operations
- Save scores one at a time (safer)
- Validate all before saving any
- Rollback on error

---

## Security Checks

### Authentication
- ✅ Headers validated: `x-teacher-id`, `x-school-id`
- ✅ Teacher authorization verified
- ✅ Students can only see their own report cards
- ✅ Teachers can only modify scores for their classes

### Data Validation
- ✅ Score ranges validated
- ✅ Required fields checked
- ✅ Type checking (numbers, strings)

### Database Security
- ✅ RLS policies should prevent unauthorized access
- ✅ All queries filter by school_id
- ✅ Teachers scoped to their classes

---

## Troubleshooting

### Class Dropdown Shows "Select class..."
**Problem:** Classes not loading
**Solutions:**
1. Check browser console for errors
2. Verify teacher has class assignments
3. Check API endpoint returns data
4. Check headers are sent correctly

### Student List Empty
**Problem:** No students showing in class
**Solutions:**
1. Verify students exist in database
2. Check student `class_arm_combo_id` is correct
3. Verify teacher has access to this class

### Scores Not Saving
**Problem:** Save button doesn't work
**Solutions:**
1. Check validation errors in console
2. Verify score ranges (0-10 for tests, 0-60 for exam)
3. Check network tab for API response
4. Verify teacher_id is sent in POST body

### Report Card Not Showing
**Problem:** Student can't see scores
**Solutions:**
1. Verify scores are saved in result_entries
2. Check student_id is correct
3. Verify term_id if filtering by term
4. Check school_id matches

---

## Success Criteria Checklist

- [ ] Class dropdown populates with teacher's classes
- [ ] Clicking class loads students list
- [ ] Clicking "ENTER SCORES" opens modal with subjects
- [ ] Can enter test scores (0-10) for all 4 tests
- [ ] CA total auto-calculates
- [ ] Can enter exam score (0-60)
- [ ] Total and percentage auto-calculate
- [ ] Grade assigns based on score
- [ ] Can add teacher comment
- [ ] Save button validates scores
- [ ] Save button sends data to API
- [ ] Success message appears after save
- [ ] Modal closes after save
- [ ] Student sees scores in report card
- [ ] Multiple students can have different scores
- [ ] Can edit scores (replaces old values)
- [ ] Attendance displays in report card
- [ ] Overall grade calculates correctly
- [ ] Teacher comment visible to student
- [ ] API endpoints respond with correct format
- [ ] Error messages display when validation fails

