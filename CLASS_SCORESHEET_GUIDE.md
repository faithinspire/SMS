# Class Score Sheet - Complete Guide

## Overview

The **Class Score Sheet** is a comprehensive tool for class teachers to enter and manage student scores for all subjects offered by students in their class in a single, table-based interface.

## Access

### Port Information
- **Development Server**: Running on port **3001**
- **URL**: `http://localhost:3001/teacher/class-scoresheet`

### From Teacher Dashboard
1. Click on "📊 Class Score Sheet" button on the teacher dashboard
2. Or navigate directly to the URL above

## Features

### 1. **Term Selection**
- Dropdown menu to select which term to enter scores for
- Current term is auto-highlighted with "(Current)" indicator
- Terms are fetched from your school's database

### 2. **Student List with Subjects**
- All students in your class are displayed
- Each student shows:
  - Full name
  - Admission number
  - **All subjects they're enrolled in** (expandable list)

### 3. **Score Entry Interface**

Each student's subjects are displayed in a table with columns:

| Column | Description | Input Range |
|--------|-------------|------------|
| **Student** | Student's full name (merged across all subjects) | - |
| **Admission** | Student's admission number | - |
| **Subject** | Subject name and code | - |
| **T1** | Test 1 score | 0-10 |
| **T2** | Test 2 score | 0-10 |
| **T3** | Test 3 score | 0-10 |
| **T4** | Test 4 score | 0-10 |
| **Exam** | Exam score | 0-60 |
| **Total** | Auto-calculated total (CA + Exam) | /100 |
| **Grade** | Auto-calculated grade (A, B, C, D, F) | - |

### 4. **Real-Time Calculations**
- **CA Total**: Sum of Test 1-4 (max 40)
- **Total**: CA Total + Exam (max 100)
- **Grade**: Automatically assigned based on total
  - A: 70-100
  - B: 60-69
  - C: 50-59
  - D: 40-49
  - F: 0-39

### 5. **Score Entry Workflow**

1. **Select a Term**: Choose from the term dropdown at the top
2. **View Students & Subjects**: See all your students with their enrolled subjects
3. **Enter Scores**: Click on any score field to enter data
   - Supports decimal values (e.g., 8.5)
   - Validates ranges (0-10 for tests, 0-60 for exam)
   - Invalid entries show error toast
4. **Review Calculations**: Total and grade update automatically as you type
5. **Batch Save**: When done with all changes, click "✅ Save" button
6. **Confirmation**: Success message shows number of scores saved

### 6. **Change Tracking**
- Footer displays: "X changes pending" while you edit
- Save button is disabled if no changes are made
- Clear indication of what's ready to save

### 7. **Data Persistence**
- All scores are saved to the database with:
  - Correct term ID (UUID)
  - Score source marked as "MANUAL"
  - Your teacher ID
  - Timestamp of save
  - Class and arm information

## Validation Rules

### Input Validation
- **Test Scores (T1-T4)**: Must be between 0-10
- **Exam Score**: Must be between 0-60
- **Empty fields**: Treated as no score (null)
- **Decimal values**: Supported (e.g., 7.5, 9.25)

### Database Validation
- Term ID must be a valid UUID (auto-selected, no user input)
- Student ID must exist in database
- Subject ID must be in student's enrolled subjects
- Scores saved to canonical `score_sheets` table

## Example Workflow

```
Scenario: Enter Term 1 scores for your SS1A class
```

1. Navigate to: `http://localhost:3001/teacher/class-scoresheet`
2. See page loads with your class name: "SS1A Alpha"
3. Term dropdown shows available terms (e.g., "Term 1 (Current)", "Term 2", "Term 3")
4. Click dropdown → Select "Term 1 (Current)"
5. Table loads showing:
   ```
   | Student | Admission | Subject | T1 | T2 | T3 | T4 | Exam | Total | Grade |
   |---------|-----------|---------|-----|-----|-----|-----|------|--------|-------|
   | Ade Ibrahim | LW001 | English | [_] | [_] | [_] | [_] | [_] | 0/100 | - |
   |            |        | Mathematics | [_] | [_] | [_] | [_] | [_] | 0/100 | - |
   |            |        | Physics | [_] | [_] | [_] | [_] | [_] | 0/100 | - |
   | Bola Adeyemi | LW002 | English | [_] | [_] | [_] | [_] | [_] | 0/100 | - |
   |              |       | Biology | [_] | [_] | [_] | [_] | [_] | 0/100 | - |
   ```

6. Click in Ade's English T1 field → Type "8" → Moves to next field
7. Continue entering: T2=7.5, T3=9, T4=8, Exam=45
8. Total auto-calculates: (8+7.5+9+8) + 45 = 77.5/100
9. Grade auto-calculates: "B"
10. Continue for all students and subjects
11. When done, click "✅ Save (X)" button
12. Scores are batched and saved to database
13. Success toast: "✅ 15 scores saved successfully"
14. Table refreshes to show saved data

## Keyboard Navigation

- **Tab**: Move to next score field
- **Shift+Tab**: Move to previous score field
- **Enter**: Confirm entry and move to next row
- **Click**: Direct entry to any field

## Dark Mode

- Supports dark and light themes
- Theme setting saved to localStorage
- Toggle from user profile settings
- Color scheme automatically applied to entire interface

## Troubleshooting

### Issue: "No students in this class"
**Cause**: Either no students enrolled in your class, or term not selected
**Solution**: 
1. Select a term first
2. Verify students are in your class in school admin

### Issue: "Select a term to view students"
**Cause**: No term selected
**Solution**: Click term dropdown and select an available term

### Issue: "Changes pending" button is grayed out after editing
**Cause**: No changes made or all changes already saved
**Solution**: Make edits first, then button will activate

### Issue: Score appears as 0 instead of saved value
**Cause**: Page not refreshed after save
**Solution**: The page auto-refreshes. If not, refresh manually (F5)

### Issue: Can't enter score, field stays empty
**Cause**: Value outside valid range
**Solution**: Check range:
- Tests: 0-10
- Exam: 0-60
- Try with valid value

### Issue: Teacher dashboard link shows 404
**Cause**: Dev server on wrong port
**Solution**: 
1. Check server is running on port 3001
2. Visit: `http://localhost:3001/teacher/dashboard`
3. Click "Class Score Sheet" button

## Database Schema (Reference)

### score_sheets Table
```sql
{
  id: UUID,
  school_id: UUID,
  student_id: UUID,
  subject_id: UUID,
  term_id: UUID,              -- Required, validated UUID
  class_arm_combo_id: UUID,
  teacher_id: UUID,
  test1: NUMERIC(5,2),        -- 0-10 range
  test2: NUMERIC(5,2),        -- 0-10 range
  test3: NUMERIC(5,2),        -- 0-10 range
  test4: NUMERIC(5,2),        -- 0-10 range
  exam: NUMERIC(5,2),         -- 0-60 range
  total: NUMERIC (GENERATED), -- Auto-calculated
  grade: VARCHAR(2),
  test1_source: VARCHAR(20),  -- "MANUAL" when saved
  test2_source: VARCHAR(20),
  test3_source: VARCHAR(20),
  test4_source: VARCHAR(20),
  exam_source: VARCHAR(20),
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
}
```

## Performance Notes

- Page loads student list on term selection
- Batch save sends all changes at once (not individual requests)
- Efficient queries with proper indexing on school_id, student_id, term_id
- Suitable for classes up to 100+ students

## Security

- Requires teacher authentication
- Only teachers can access their own classes
- Permission checks based on teacher-class assignments
- All scores saved with teacher ID for audit trail
- Data encrypted in Supabase

## Related Features

- **Subject Score Sheet**: Individual subject score entry
- **Results Page**: View and verify submitted scores
- **CBT Management**: Automatic score import from exams
- **Report Cards**: Generate PDF reports from scores

## Future Enhancements

1. Batch import from CSV/Excel
2. Draft auto-save every 30 seconds
3. Comments/remarks per student
4. Scoring rubrics and templates
5. Import from CBT exams
6. Offline mode with sync
7. Mobile app support
8. Advanced analytics and insights

## Support

For issues or feature requests:
1. Check this guide first
2. Review error messages in browser console
3. Verify term selection and student enrollment
4. Check server logs for backend errors
5. Contact school admin if data issues persist

---

**Last Updated**: August 26, 2026
**Version**: 1.0 - Production Ready
