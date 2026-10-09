# Populate Score Sheets - User Guide

## Problem
Students viewing the Student Results page see "Student record not found" because the `score_sheets` table is empty. This prevents them from viewing their exam results.

## Solution
We've created automated endpoints and migrations to populate the score_sheets table with test data.

## How It Works

### Database Schema
The `score_sheets` table has these key columns:
- `school_id` - Which school
- `student_id` - Which student
- `subject_id` - Which subject
- `term_id` - Which academic term
- `test1`, `test2`, `test3`, `test4` - Test scores (0-10 each)
- `exam` - Exam score (0-60)
- `total` - Auto-calculated sum of all scores
- `grade` - Letter grade assigned

### Migration File
**File:** `database/migrations/171_populate_score_sheets_test_data.sql`

This SQL migration:
1. Selects the first active school
2. Gets up to 10 active students
3. Gets available academic terms (from previous migration 170)
4. Gets subjects from student_subjects enrollment
5. Inserts score records for each student × term × subject combination
6. Generates realistic random scores

### API Endpoint
**Endpoint:** `POST /api/debug/insert-test-data`

#### GET (Check current data)
```bash
curl "http://localhost:3000/api/debug/insert-test-data"
```

Returns:
```json
{
  "debug": true,
  "totalScoreRecords": 0,
  "sampleData": [],
  "message": "Database has 0 score records"
}
```

#### POST (Populate test data)
```bash
curl -X POST "http://localhost:3000/api/debug/insert-test-data" \
  -H "Content-Type: application/json" \
  -d '{"action": "populate"}'
```

Returns:
```json
{
  "success": true,
  "message": "Score data populated successfully",
  "school": "School Name",
  "studentsProcessed": 10,
  "termsProcessed": 3,
  "subjectsPerStudent": 8,
  "recordsGenerated": 240,
  "recordsInDatabase": 240
}
```

#### POST (Clear all data)
```bash
curl -X POST "http://localhost:3000/api/debug/insert-test-data" \
  -H "Content-Type: application/json" \
  -d '{"action": "clear"}'
```

## Running the Population

### Option 1: Using the Migration (Production)
Run this Node.js script:
```bash
node run-migration-171.js
```

This executes the SQL migration against your Supabase database.

### Option 2: Using the API Endpoint (Development/Testing)
1. Ensure the app is running: `npm run dev`
2. In a new terminal, call the endpoint:
```bash
curl -X POST "http://localhost:3000/api/debug/insert-test-data" \
  -H "Content-Type: application/json" \
  -d '{"action": "populate"}'
```

3. Verify it worked:
```bash
curl "http://localhost:3000/api/debug/insert-test-data"
```

### Option 3: Direct Browser Call
Open this URL in your browser:
```
http://localhost:3000/api/debug/insert-test-data
```

For POST, use a tool like Postman or curl with the commands above.

## Verification Steps

### 1. Check API Response
```bash
curl "http://localhost:3000/api/debug/insert-test-data"
```

Should show `totalScoreRecords > 0`

### 2. Navigate to Student Results Page
1. Log in as a student
2. Go to Student Results page
3. Select a Session from dropdown (should load without error)
4. Select a Term from dropdown (should load without error)
5. Select a Class from dropdown (should load without error)
6. Results should display with scores

### 3. Check Teacher Results Page
1. Log in as a teacher
2. Go to Teacher Results page
3. All dropdowns should load without "Failed to load" errors

### 4. Check Score Sheet Page
1. Log in as an admin/teacher
2. Go to Score Sheet page
3. All dropdowns should load correctly

## Data Structure Created

Example data created:
- **Students:** 10 active students
- **Terms:** 3 terms per school (First, Second, Third)
- **Subjects:** ~8 subjects per student (based on enrollment)
- **Scores:** 240 total records (10 students × 3 terms × 8 subjects)

Each score record has:
- Random test scores (0-10)
- Random exam score (0-60)
- Auto-calculated total (sum of all scores, max 100)
- Source: "TEACHER_ENTRY" (can be changed to "CBT", etc.)

## Important Notes

1. **Test Data Only:** These are random test scores for development/testing
2. **Safe to Clear:** You can clear all scores with `action: "clear"`
3. **Repeatable:** Running populate multiple times won't create duplicates (uses UPSERT)
4. **School-Specific:** Only populates for the first active school
5. **Real Enrollments:** Uses actual student_subjects enrollment to determine valid subjects

## Troubleshooting

### Issue: "No active schools found"
- Ensure your school is registered with status = 'ACTIVE'

### Issue: "No active students found"
- Students must be enrolled in the school with status = 'ACTIVE'
- Check the students table

### Issue: "No subject enrollments found"
- Students must be enrolled in subjects via student_subjects table
- This usually happens automatically during student registration

### Issue: Scores still not showing in UI
1. Verify scores exist: `curl "http://localhost:3000/api/debug/insert-test-data"`
2. Check browser console for errors
3. Verify the student is enrolled in the correct term and class
4. Check that Session/Term dropdowns are loading correctly

## Files Created/Modified

### New Files:
- `/src/app/api/debug/insert-test-data/route.ts` - API endpoint
- `/database/migrations/171_populate_score_sheets_test_data.sql` - Migration
- `/run-migration-171.js` - Migration runner script

### Modified Files:
- None (backward compatible)

## Next Steps

1. Run the migration or API call to populate scores
2. Test the Student Results page
3. Verify all dropdowns load without errors
4. Deploy to Vercel
5. Confirm production works

---

**Status:** Ready to deploy
**Last Updated:** 2026-10-08
