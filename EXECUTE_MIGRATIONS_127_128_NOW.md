# EXECUTE MIGRATIONS 127 & 128 - FIX BROADCASTS & CBT SCORES

## 🎯 OBJECTIVE
Fix two critical production issues:
1. **Broadcasts** - School admin messages now reach all staff
2. **CBT Scores** - Student exam scores automatically populate scoresheets and reports

---

## 🚀 EXECUTION STEPS

### STEP 1: Execute Migration 127 (Fix Broadcasts)
```
1. Open Supabase console
2. SQL Editor → New Query
3. Copy entire contents of: database/migrations/127_fix_broadcast_schema_and_pipeline.sql
4. Click RUN
5. Should see verification results showing tables created
```

**What it does:**
- ✅ Recreates `broadcasts` table with proper UUID types
- ✅ Recreates `broadcast_recipients` table (was dropped)
- ✅ Creates function to send broadcasts to all staff
- ✅ Removes obsolete `broadcast_notifications` table

**Expected output:**
```
Broadcasts table exists: 1
broadcast_recipients table exists: 1
broadcast_notifications removed: 0
```

---

### STEP 2: Execute Migration 128 (Sync All CBT Scores)
```
1. In same SQL console
2. Create new query (or continue)
3. Copy entire contents of: database/migrations/128_sync_all_cbt_scores_to_score_sheets.sql
4. Click RUN
5. Should see backfill counts
```

**What it does:**
- ✅ Syncs ALL existing CBT submissions with scores to score_sheets
- ✅ Updates submission statuses to GRADED for consistency
- ✅ Preserves manual teacher scores (doesn't overwrite)
- ✅ Tracks CBT source for all scores

**Expected output:**
```
Status: Migration 128: CBT Score Backfill Complete
total_graded_submissions: [number of GRADED submissions]
total_scored_submissions: [all submissions with scores]
score_sheets_with_cbt: [synced scores]
total_score_sheets: [all score entries]
```

---

### STEP 3: Deploy Application Code Fix
```bash
# Code change already committed:
# src/app/api/student/cbt/submit/route.ts - now sets status='GRADED' explicitly

# If not yet pushed:
git add src/app/api/student/cbt/submit/route.ts
git commit -m "fix: Ensure cbt_submissions status set to GRADED to trigger score_sheets sync"
git push origin main

# Vercel will auto-deploy
```

---

## ✅ VERIFY BROADCASTS FIX

### Test 1: Send Broadcast
```
1. Login as SCHOOL_ADMIN
2. Go to Broadcasts section
3. Send message to staff
4. Check: Message created in broadcasts table
5. Check: Recipients created in broadcast_recipients table
```

### Test 2: Receive Broadcast
```
1. Login as TEACHER
2. Go to Broadcast Inbox
3. Should see message from school admin ✅
4. Can mark as read
```

### SQL Verification:
```sql
-- Check broadcasts created
SELECT COUNT(*) FROM broadcasts;

-- Check recipients recorded
SELECT COUNT(*) FROM broadcast_recipients;

-- See sample broadcast
SELECT b.id, b.message, COUNT(br.id) as recipients
FROM broadcasts b
LEFT JOIN broadcast_recipients br ON br.broadcast_id = b.id
GROUP BY b.id
LIMIT 1;
```

---

## ✅ VERIFY CBT SCORES FIX

### Test 1: Student Completes CBT
```
1. Login as STUDENT
2. Take a CBT exam (answer all questions)
3. Submit exam
4. System auto-grades and shows score ✅
```

### Test 2: Check Submission Status
```
1. In Supabase, check:
   SELECT status, score FROM cbt_submissions 
   WHERE student_id = [test_student_id]
   ORDER BY created_at DESC LIMIT 1;
```
**Should show:** status='GRADED', score=[numeric value]

### Test 3: Check Score Sheet Populated
```
1. In Supabase, check:
   SELECT * FROM score_sheets 
   WHERE student_id = [test_student_id]
   AND exam_source = 'CBT' LIMIT 1;
```
**Should show:** exam=[score], exam_source='CBT', exam_cbt_source=[submission_id]

### Test 4: Teacher Sees Score in Scoresheet
```
1. Login as TEACHER
2. Go to Class Scoresheet
3. Find student
4. Should see CBT score in appropriate column (CA1-4 or Exam) ✅
```

### Test 5: Admin/Principal Sees Score in Reports
```
1. Login as ADMIN/PRINCIPAL/HEADTEACHER
2. Go to Results → Results Management
3. Select same term/session
4. Should see CBT scores in results table ✅
```

### Test 6: Student Sees Score in Their Results
```
1. Login as STUDENT
2. Go to My Results
3. Select session and term
4. Should see CBT score in results table ✅
5. Score counted in overall total and grade ✅
```

---

## 📊 DATA FLOW AFTER FIXES

### BROADCASTS FLOW
```
School Admin sends message
        ↓
/api/broadcasts/send API endpoint
        ↓
INSERT into broadcasts table ✅
        ↓
send_broadcast_to_staff() function executes
        ↓
INSERT INTO broadcast_recipients (for each staff) ✅
        ↓
Staff logs in
        ↓
BroadcastInbox queries broadcast_recipients ✅
        ↓
Staff sees message in inbox ✅
```

### CBT SCORES FLOW
```
Student submits CBT
        ↓
/api/student/cbt/submit endpoint
        ↓
Auto-grades questions ✅
Calculates score ✅
Updates cbt_submissions with status='GRADED' ✅
        ↓
Migration 126 trigger fires automatically ✅
        ↓
auto_populate_score_sheets_from_cbt() executes
        ↓
INSERT/UPDATE score_sheets with CBT score ✅
        ↓
score_sheets now populated ✅
        ↓
┌─────────────────┬──────────────────┬──────────────────┐
│                 │                  │                  │
▼                 ▼                  ▼                  ▼
Teacher      Results Page        Admin/Principal    Student
Scoresheet   Management          Results Page       My Results
sees score   shows score         shows score        sees score
✅            ✅                  ✅                 ✅
```

---

## 🔧 TROUBLESHOOTING

### Issue: Broadcasts still not appearing
**Solution:**
1. Verify broadcast_recipients table exists: `SELECT * FROM information_schema.tables WHERE table_name='broadcast_recipients'`
2. Check if recipients recorded: `SELECT * FROM broadcast_recipients LIMIT 1`
3. Verify BroadcastInbox component queries correct table (should query broadcast_recipients)

### Issue: CBT scores still not in scoresheet
**Solution:**
1. Verify trigger exists: `SELECT * FROM information_schema.triggers WHERE trigger_name LIKE '%auto_populate%'`
2. Check submission status: `SELECT status FROM cbt_submissions WHERE id=[submission_id]`
3. If status not 'GRADED', manually run: `UPDATE cbt_submissions SET status='GRADED' WHERE status='SUBMITTED' AND score IS NOT NULL`
4. Verify backfill ran: `SELECT COUNT(*) FROM score_sheets WHERE exam_cbt_source IS NOT NULL`

### Issue: Score has wrong value
**Solution:**
1. Check exam total_marks: `SELECT total_marks FROM cbt_exams WHERE id=[exam_id]`
2. Verify scaling formula: `(score / total_marks) * max` where max=10 for CA, 60 for EXAM
3. Check score_sheets query calculations in ResultAggregationService

---

## ✨ WHAT CHANGED

### Database
- ✅ Migration 127: Fixed broadcast schema (UUID types, proper relationships)
- ✅ Migration 128: Backfilled all historical CBT scores to score_sheets

### Application Code
- ✅ `src/app/api/student/cbt/submit/route.ts`: Now explicitly sets status='GRADED' to trigger sync

### Result
- ✅ Broadcasts now reach all staff immediately
- ✅ CBT scores automatically populate all views (teacher, admin, student)
- ✅ All existing scores backfilled to score_sheets
- ✅ New submissions automatically sync in real-time

---

## 📞 FINAL VERIFICATION

After both migrations run and code deployed:

```sql
-- Verify everything is working
SELECT 
  'Broadcasts' as item,
  (SELECT COUNT(*) FROM broadcasts)::TEXT as total_broadcasts,
  (SELECT COUNT(*) FROM broadcast_recipients)::TEXT as total_recipients,
  
UNION ALL

SELECT 
  'CBT Scores' as item,
  (SELECT COUNT(*) FROM cbt_submissions WHERE status='GRADED')::TEXT as total_graded,
  (SELECT COUNT(*) FROM score_sheets WHERE exam_cbt_source IS NOT NULL)::TEXT as total_synced;
```

**Expected results:** Both should show meaningful numbers (> 0 if data exists)

---

## 🎉 SUCCESS CRITERIA

- ✅ Broadcasts table exists with proper UUID types
- ✅ broadcast_recipients table exists and populated
- ✅ School admin can send broadcasts
- ✅ All staff receive broadcasts in inbox
- ✅ CBT submissions status='GRADED'
- ✅ score_sheets populated with CBT scores
- ✅ Teacher scoresheet shows CBT scores
- ✅ Results pages show CBT scores
- ✅ Student results show CBT scores
- ✅ All scores properly scaled (0-10 for CA, 0-60 for EXAM)

**Status: READY FOR PRODUCTION** ✅
