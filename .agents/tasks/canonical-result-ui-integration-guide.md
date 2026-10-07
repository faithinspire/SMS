# Canonical Result System - UI Integration Guide

## Overview
This guide provides implementation patterns for integrating the canonical result API endpoints with the existing UI pages for Teachers, School Admins, Principals, and Students.

## 1. Teacher Results Page Integration

### Endpoint
```
GET /api/teacher/results/canonical?sessionId=<id>&termId=<id>
```

### Response includes all classes taught with aggregated results per subject per student

### Key Fields in CanonicalResult
- `test_scores`: breakdown of test1, test2, test3, test4, total_tests
- `exam_score`: exam score
- `manual_total`: test_scores + exam_score
- `cbt_test_score`: CBT test aggregated score
- `cbt_exam_score`: CBT exam aggregated score
- `cbt_total`: cbt_test_score + cbt_exam_score
- `overall_total`: manual_total + cbt_total (final score)
- `grade`: A-F or N/A
- `remark`: Excellent, Very Good, Good, Fair, Pass, Fail, Not Graded

### Display Pattern
1. Session/Term selector
2. Teacher's classes listed
3. For each class: subjects listed
4. For each subject: students and their aggregated results
5. Show component breakdown: Manual (Tests + Exam) | CBT (Tests + Exam) | Overall

## 2. School Admin Results Integration

### Endpoints
```
# Dashboard (school statistics)
GET /api/school-admin/results/canonical?sessionId=<id>&termId=<id>

# Class drill-down
GET /api/school-admin/results/canonical?sessionId=<id>&termId=<id>&classId=<id>&subjectId=<id>
```

### Dashboard Returns
- `totalStudents`: school student count
- `averageScore`: school-wide average
- `gradeDistribution`: count of each grade
- `subjectAverages`: average score per subject
- `classes`: list of all classes for drill-down

### Display Pattern
1. School statistics widgets (total students, average score)
2. Grade distribution chart (bar or pie)
3. Subject averages table
4. Class selector + Subject selector for drill-down
5. When both selected, show all students in that class/subject with full breakdown

## 3. Principal Results Integration

### Endpoint
```
# Dashboard
GET /api/principal/results/canonical?sessionId=<id>&termId=<id>

# Class view
GET /api/principal/results/canonical?sessionId=<id>&termId=<id>&classId=<id>
```

### Dashboard Returns
- School statistics (same as admin)
- All classes ranked by average performance
- Class-level top/bottom performers

### Display Pattern
1. School statistics overview
2. Class performance ranking (sorted by average score descending)
3. For each class: average score + top performer + bottom performer
4. Click class to drill into detailed performance
5. Use for quick identification of underperforming classes

## 4. Student Results Integration

### Endpoint
```
GET /api/student/results/canonical?sessionId=<id>&termId=<id>
```

### Response includes
- Student profile (name, admission number, class)
- Session/term info
- All results for that term
- Summary: overall average, best subject, worst subject

### Display Pattern
1. Session/term selector
2. Student profile card
3. Summary statistics
4. Results table: Subject | Manual (Tests, Exam) | CBT (Tests, Exam) | Total | Grade | Remark
5. Visual breakdown (pie chart) showing manual vs CBT contribution
6. Option to download/print results slip

## Integration Checklist

- [ ] Create or update Teacher Results page to use `/api/teacher/results/canonical`
- [ ] Create or update School Admin Results page to use `/api/school-admin/results/canonical`
- [ ] Create or update Principal Dashboard to use `/api/principal/results/canonical`
- [ ] Create or update Student Results page to use `/api/student/results/canonical`
- [ ] Add session/term selectors to each page
- [ ] Implement drill-down navigation between dashboard → class → student
- [ ] Add error handling for missing data
- [ ] Add loading states during API calls
- [ ] Test with real data (multiple students, multiple subjects, multiple classes)
- [ ] Verify aggregation correctness (manual + CBT = overall)
- [ ] Deploy to Vercel and test live

## Error Handling

All endpoints return errors with HTTP status codes:
- 400: Missing required query parameters
- 401: User not authenticated
- 403: User unauthorized for this resource
- 404: Resource not found (session, term, class, student, etc.)
- 500: Internal server error

Each response follows pattern:
```json
{ "error": "descriptive error message" }
```

Always check `response.ok` or status code before accessing `data`.

## Performance Notes

- Queries are optimized with minimal database round-trips
- School statistics are aggregated efficiently
- Large class results may take 1-2 seconds (acceptable)
- Consider pagination for classes with 100+ students
- Cache session/term/class lists to avoid repeated queries
