# EXECUTE MIGRATION 126 - CBT Results Pipeline Fix

## 🎯 OBJECTIVE
Fix CBT exam results not appearing in teacher scoresheets, results pages, and student result pages.

## 🔧 WHAT THIS MIGRATION DOES

**Problem:** CBT exam results are stored in `cbt_submissions` but aren't syncing to `score_sheets` table where they're displayed.

**Root Cause:** Migration 120's trigger watches the wrong table (`cbt_results` instead of `cbt_submissions`).

**Solution:** Migration 126 creates a corrected trigger on the right table and backfills all existing submissions.

---

## 📋 STEP-BY-STEP EXECUTION

### Step 1: Go to Supabase Console
1. Open [Supabase Dashboard](https://supabase.com)
2. Select your project
3. Go to **SQL Editor** (left sidebar)

### Step 2: Create New Query
1. Click **"New Query"**
2. Name it: `Migration 126 - CBT Results Pipeline`

### Step 3: Copy & Paste SQL
Copy the **entire** SQL from `database/migrations/126_fix_cbt_results_pipeline.sql`:

```sql
-- [Paste entire contents of the migration file here]
```

### Step 4: Execute
1. Click **"RUN"** button (or press Ctrl+Enter)
2. Wait for completion (may take 10-30 seconds)

### Step 5: Verify Success
After running, you should see output like:
```
status                                      | total_graded_submissions | score_sheets_from_cbt | eligible_for_sync
CBT Results Pipeline Verification           | 15                       | 12                     | 15
```

**What this means:**
- `total_graded_submissions`: Total CBT submissions marked as GRADED
- `score_sheets_from_cbt`: How many were backfilled to score_sheets
- `eligible_for_sync`: How many are eligible for syncing

---

## ✅ VERIFICATION CHECKLIST

After running the migration, verify the trigger is working:

### Check 1: Trigger Exists
Run this query:
```sql
SELECT trigger_name, event_object_table, action_timing
FROM information_schema.triggers
WHERE trigger_name LIKE '%cbt_auto_populate%'
ORDER BY trigger_name;
```

**Expected Result:** Should show `trigger_cbt_auto_populate_score_sheets_v2` on table `cbt_submissions`

### Check 2: Backfill Success
Run this query:
```sql
SELECT 
  COUNT(*) as total_backfilled,
  COUNT(CASE WHEN exam_source = 'CBT' THEN 1 END) as exam_scores,
  COUNT(CASE WHEN test1_source = 'CBT' THEN 1 END) as ca1_scores,
  COUNT(CASE WHEN test2_source = 'CBT' THEN 1 END) as ca2_scores,
  COUNT(CASE WHEN test3_source = 'CBT' THEN 1 END) as ca3_scores,
  COUNT(CASE WHEN test4_source = 'CBT' THEN 1 END) as ca4_scores
FROM score_sheets
WHERE exam_source = 'CBT' 
   OR test1_source = 'CBT' 
   OR test2_source = 'CBT' 
   OR test3_source = 'CBT' 
   OR test4_source = 'CBT';
```

**Expected Result:** Should show counts > 0 for at least one score type

### Check 3: Sample Score Sheet Entry
Run this query:
```sql
SELECT 
  ss.student_id,
  st.admission_number,
  ss.subject_id,
  s.name as subject_name,
  ss.test1, ss.test1_source, ss.test1_cbt_source,
  ss.exam, ss.exam_source, ss.exam_cbt_source,
  ss.created_at
FROM score_sheets ss
LEFT JOIN students st ON st.id = ss.student_id
LEFT JOIN subjects s ON s.id = ss.subject_id
WHERE ss.exam_source = 'CBT' OR ss.test1_source = 'CBT'
LIMIT 5;
```

**Expected Result:** Shows sample CBT scores with source tracking

---

## 🧪 TEST CASES (After Migration)

### Test 1: New CBT Submission Auto-Syncs
1. Have a student **submit a new CBT exam**
2. **Teacher Scoresheet:** Should show the score immediately
3. **Results Page:** Should display the score in appropriate CA column
4. **Student Results:** Should show in their results

### Test 2: Check Source Tracking
1. Go to any score_sheets entry with CBT scores
2. Verify `test1_source = 'CBT'` and `test1_cbt_source = [submission_id]`
3. This ensures we can track which CBT submission created the score

### Test 3: Teacher Manual Entry Still Works
1. If a teacher manually enters a score in CA1 (before CBT)
2. Later CBT CA1 submission should **NOT override** the manual entry
3. Both scores should coexist (handled by COALESCE in migration)

---

## 🚀 DEPLOYMENT

After migration is executed in Supabase:

1. **Commit changes:**
```bash
git add database/migrations/126_fix_cbt_results_pipeline.sql
git commit -m "feat: Fix CBT results auto-sync pipeline (migration 126)"
```

2. **Push to origin/main:**
```bash
git push origin main
```

3. **Vercel will auto-deploy** (watch deployment dashboard)

---

## 📊 DATA FLOW AFTER MIGRATION

```
Student Submits CBT
        ↓
/api/student/cbt/submit endpoint
        ↓
Auto-grades & updates cbt_submissions status='GRADED'
        ↓
🆕 TRIGGER FIRES (on cbt_submissions table)
        ↓
auto_populate_score_sheets_from_cbt() function
        ↓
Inserts/Updates score_sheets with:
  - Score column: test1, test2, test3, test4, or exam
  - Source: 'CBT'
  - CBT Source: submission_id (for tracking)
        ↓
score_sheets now populated ✅
        ↓
Teacher Scoresheet API queries score_sheets ✅
Results Page queries score_sheets ✅
Student Results queries score_sheets ✅
        ↓
🎉 SCORES APPEAR EVERYWHERE
```

---

## 🆘 TROUBLESHOOTING

### Problem: Migration fails to execute
**Solution:** 
- Check if tables `cbt_submissions`, `cbt_exams`, `score_sheets`, `students` exist
- Verify schema hasn't changed
- Run migration in transaction mode (BEGIN/COMMIT already included)

### Problem: Trigger doesn't fire for new submissions
**Solution:**
- Verify trigger exists: `SELECT * FROM information_schema.triggers WHERE trigger_name LIKE '%cbt_auto%'`
- Check if cbt_exams has subject_id and total_marks populated
- Check if student record has class_arm_combo_id

### Problem: Scores don't appear in results pages
**Solution:**
- Verify score_sheets has entries: `SELECT COUNT(*) FROM score_sheets WHERE exam_source = 'CBT'`
- Check if student is enrolled in the subject: `SELECT * FROM student_subjects WHERE student_id = [id]`
- Check academic_session_id is populated in score_sheets

---

## 📞 SUPPORT

If issues occur:
1. Check verification queries above
2. Review error message from Supabase SQL console
3. Inspect score_sheets data manually
4. Check cbt_submissions and cbt_exams for data integrity
