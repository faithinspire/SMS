# PHASE 11 Quick Start - What Changed

## 🎯 TL;DR - 5 Critical Fixes

| Issue | What Was Wrong | What's Fixed |
|-------|---|---|
| **1. Null term_id** | CBT exams created without term | ✅ Term now REQUIRED on creation |
| **2. No options** | Multi-choice showed no options | ✅ Shows A, B, C, D with validation |
| **3. Dept error** | "Violates constraint" on student edit | ✅ Validates department enum |
| **4. No scores** | CBT scores never saved | ✅ Auto-creates score_sheets + logs |
| **5. UI issues** | Next button unclear behavior | ✅ Proper UX (Next disabled on last Q) |

---

## 🚀 Deploy & Test

### 1. Apply Migrations (In Order)
```bash
# Terminal: Run in Supabase SQL editor or psql

-- FIRST: Fix null term_id
psql $DATABASE_URL < database/migrations/059_fix_cbt_term_id_required.sql

-- SECOND: Enforce 4 options per question
psql $DATABASE_URL < database/migrations/060_enforce_cbt_options_requirements.sql

-- THIRD: Standardize department values
psql $DATABASE_URL < database/migrations/061_standardize_department_values.sql
```

### 2. Restart Dev Server
```bash
# Kill current server (Ctrl+C)
# Restart:
npm run dev
```

### 3. Quick Test (5 minutes)

**As Teacher:**
1. Go to `/teacher/cbt-management`
2. Create exam → **Must select Term** ← NEW
3. Add question → **Add exactly 4 options** ← NEW
4. Set one as correct answer

**As Student:**
1. Go to `/student/exams` (or CBT page)
2. See exam with **4 options labeled A, B, C, D** ← FIXED
3. Select option B (correct)
4. Click Submit

**Check Results:**
1. Open browser console (F12)
2. Look for logs starting with `[CBT Submit]`
3. Should see: `hasStudent: true, hasSubjectId: true, hasAssessmentType: true, hasTermId: true`
4. If all true → **✅ Score auto-created!**

**As Teacher:**
1. Go to scoresheet
2. See student's CA1 score ← NEW

**As Student:**
1. Go to results page
2. See math score ← NEW

---

## 📋 Files Changed

### Migrations (Run These First)
- `database/migrations/059_fix_cbt_term_id_required.sql` ← **CRITICAL**
- `database/migrations/060_enforce_cbt_options_requirements.sql`
- `database/migrations/061_standardize_department_values.sql`

### Code Changes (Auto-reloaded)
- `src/app/api/teacher/cbt/questions/route.ts` → Option validation
- `src/app/api/student/cbt/submit/route.ts` → Enhanced logging
- `src/components/admin/EditStudentModal.tsx` → Uppercase departments
- `src/components/admin/StudentRegistrationModal.tsx` → Uppercase departments
- `src/services/student.service.ts` → Department validation

### Documentation
- `PHASE_11_CBT_TEST_VERIFICATION.md` ← Detailed testing guide
- `PHASE_11_COMPLETION_SUMMARY.md` ← Full technical summary

---

## 🔍 How to Verify Each Fix

### Fix #1: Term_id Required
```sql
-- Check: Can exam exist without term_id? Should be NO
SELECT * FROM cbt_exams WHERE term_id IS NULL;
-- Expected: 0 rows (after migration runs)
```

### Fix #2: Options Display
```sql
-- Check: Do questions have 4 options?
SELECT q.id, q.question_text, COUNT(o.id) as options
FROM cbt_questions q
LEFT JOIN cbt_options o ON o.question_id = q.id
GROUP BY q.id
HAVING COUNT(o.id) != 4;  -- Shows problematic questions
-- Expected: 0 rows (all questions have exactly 4)
```

### Fix #3: Dept Validation
```sql
-- Check: Are all departments valid?
SELECT DISTINCT department FROM students 
WHERE department NOT IN ('SCIENCE','COMMERCIAL','HUMANITIES','TECHNICAL','VOCATIONAL');
-- Expected: 0 rows (all valid or NULL)
```

### Fix #4: Scores Auto-Created
```sql
-- Check: Does every submission have a score_sheets entry?
SELECT s.id, s.status, ss.id as score_sheet_id
FROM cbt_submissions s
LEFT JOIN score_sheets ss ON ss.school_id = s.school_id 
  AND ss.student_id = s.student_id 
  AND ss.term_id = s.term_id
WHERE s.status = 'LOCKED'
AND ss.id IS NULL;  -- Shows submissions without scores
-- Expected: 0 rows (all submissions have scores)
```

### Fix #5: UI Behavior
**Expected**: Next button disabled ONLY on final question
- Question 1/5: Next enabled, Previous disabled
- Question 3/5: Next enabled, Previous enabled  
- Question 5/5: Next DISABLED, Previous enabled, Submit enabled

---

## ⚠️ Common Issues & Fixes

### Error: "Unknown migration"
**Fix**: Make sure files are in `database/migrations/` folder

### Error: "Violates constraint students_department_check"
**Fix**: Run migration 061 to standardize department values
```sql
UPDATE students SET department = 'SCIENCE' WHERE department = 'science';
-- etc.
```

### Error: "Could not find FK relationship"
**Fix**: This means migration 059 didn't run. Run it now:
```bash
psql $DATABASE_URL < database/migrations/059_fix_cbt_term_id_required.sql
```

### Scores Still Not Appearing
**Check Logs**:
1. Open browser console (F12)
2. Submit exam again
3. Look for `[CBT Submit]` messages
4. Check which condition is false

### Options Not Showing
**Check Database**:
```sql
SELECT * FROM cbt_options 
WHERE question_id = '<your-question-id>'
ORDER BY display_order;
-- Should have 4 rows with option_key IN ('A','B','C','D')
```

---

## 📞 Support

### Can't figure it out?
1. Check `PHASE_11_CBT_TEST_VERIFICATION.md` for detailed steps
2. Run SQL queries above to inspect data
3. Check browser console for error messages
4. Review `PHASE_11_COMPLETION_SUMMARY.md` for technical details

### Still stuck?
- ✅ All conditions in [CBT Submit] logs = true? → Score should be created
- ✅ Score created but not showing? → Check teacher scoresheet view
- ✅ Teacher sees score but student doesn't? → Check student results page reload

---

## ✅ Done!

After migrations run + tests pass:

```
✅ PHASE 11 Complete
✅ Term_id required
✅ Options validate (4 per question)
✅ Dept constraint fixed  
✅ Scores auto-save
✅ Scores visible everywhere
✅ Ready for next phase
```

**Next**: Monitor logs in production for [CBT Submit] messages to catch any edge cases.

