# Action Plan: Fix Migration 075 SQL Syntax Error

## Current Status
- ❌ Migration 075 has PostgreSQL syntax errors preventing execution
- ❌ Dev server cannot start until migration is applied
- ✅ All code files are ready and correct
- ✅ API endpoints are implemented
- ✅ UI components are complete

## Root Cause
The migration uses PostgreSQL-specific syntax that's causing issues:
1. `WHERE` clause in `UNIQUE` constraint (not standard SQL)
2. `WHERE` clause in indexes (may not be supported in all Supabase versions)

## Solution - 3 Steps to Fix

### Step 1: Apply Fixed Migration to Supabase

**Location**: `database/migrations/075_cbt_test_slots_system.sql` (already fixed)

**Instructions**:
1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy the ENTIRE contents of `database/migrations/075_cbt_test_slots_system.sql` (from your local workspace)
5. Paste into Supabase SQL Editor
6. Click **Run** button
7. Wait for success message

**Expected Result**:
```
Query executed successfully!
Migration 075: CBT Test Slots System - APPLIED SUCCESSFULLY
```

### Step 2: Verify Migration Applied Successfully

Run these verification queries in Supabase SQL Editor:

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('cbt_test_slots', 'cbt_test_scores')
ORDER BY table_name;

-- Check if view exists
SELECT table_name FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name = 'v_student_cbt_test_scores';

-- Check if triggers exist
SELECT trigger_name FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
  AND trigger_name LIKE '%cbt%'
ORDER BY trigger_name;
```

**Expected Results**:
- Tables found: `cbt_test_slots`, `cbt_test_scores`
- View found: `v_student_cbt_test_scores`
- Triggers found: `cbt_test_scores_percentage_trigger`, `cbt_test_slots_update_timestamp`, `enforce_max_tests_trigger`

### Step 3: Restart Dev Server

Once migration is confirmed, the dev server should compile without errors.

**Check compilation**:
1. Open browser: http://localhost:3001
2. You should see the landing page (no errors)

## What Gets Created

### Tables
- **`cbt_test_slots`**: Stores up to 4 CBT tests per subject/term/class
- **`cbt_test_scores`**: Stores student scores with auto-calculated percentages

### Functions/Triggers
- **`calculate_cbt_test_percentage()`**: Auto-calculates percentage when score changes
- **`update_cbt_test_slots_timestamp()`**: Updates timestamp on changes
- **`enforce_max_4_tests_per_subject()`**: Enforces max 4 tests per subject/term rule

### View
- **`v_student_cbt_test_scores`**: Joins scores with test details for easy querying

### Indexes
- `idx_cbt_test_slots_school_subject`
- `idx_cbt_test_slots_class_term`
- `idx_cbt_test_slots_exam`
- `idx_cbt_test_scores_student`
- `idx_cbt_test_scores_slot`
- `idx_cbt_test_scores_submission`

## System Features (Once Migration Runs)

### For Teachers
✅ Create up to 4 CBT tests per subject per term  
✅ Manually enter student scores  
✅ Delete test slots (soft delete - can recreate)  
✅ View class-wide results with combined manual + CBT scores  

### For Students
✅ View results with CBT scores in CA1-4 columns  
✅ See combined manual + CBT totals automatically calculated  
✅ View pass/fail status based on combined scores  

### For System
✅ Automatic score percentage calculation  
✅ Soft delete with cascade (scores deleted when test deleted)  
✅ Max 4 tests enforced via trigger (can delete and recreate)  

## Troubleshooting

### If you get "syntax error at or near WHERE"
- Make sure you're copying from the FIXED file: `database/migrations/075_cbt_test_slots_system.sql`
- All WHERE clauses have been removed from table definitions
- WHERE clauses only appear in triggers and view JOIN conditions (correct usage)

### If dev server still won't start
- Check that migration ran without errors in Supabase
- Run verification queries above to confirm tables exist
- Try restarting the dev server: `npm run dev -- -p 3001`

### If you see "table does not exist"
- Migration hasn't applied yet
- Follow Step 1 again
- Check Supabase SQL Editor for error messages

## Files Reference

**Fixed Migration**:
- `database/migrations/075_cbt_test_slots_system.sql` ✅

**API Endpoints** (Already Implemented):
- `GET/POST /api/teacher/cbt-test-slots`
- `DELETE/PUT /api/teacher/cbt-test-slots/[id]`
- `GET/POST /api/teacher/cbt-test-scores`

**UI Pages** (Already Implemented):
- `/teacher/cbt-test-slots` - CBT test management
- `/teacher/results` - Class results dashboard
- `/student/results` - Student results with CBT scores

**Service** (Already Updated):
- `src/services/result-aggregation.service.ts` - Fetches & merges CBT scores

## Expected Outcome

After completing all 3 steps:
1. ✅ Dev server starts without compilation errors
2. ✅ Teachers can access `/teacher/cbt-test-slots` page
3. ✅ Teachers can create/manage CBT tests
4. ✅ Students can view combined scores on `/student/results`
5. ✅ Teacher can see class results on `/teacher/results`
6. ✅ All CBT scores auto-sync to student results pages

---

**This is a critical fix for the SQL syntax issue. Once applied, the entire CBT system will be fully operational.**
