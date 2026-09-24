# Verification: CBT Score Auto-Sync & Broadcast System

**Status**: Complete diagnostics ready  
**Timeline**: Execute these SQL queries in Supabase to verify both systems  

---

## Part 1: Verify CBT Score Auto-Population Pipeline

### Query 1: Check if CBT Auto-Sync Trigger Exists
```sql
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name LIKE '%cbt%'
  AND trigger_schema = 'public'
ORDER BY trigger_name;
```

**Expected Result**: Should show `trigger_cbt_auto_populate_score_sheets_v2` on `cbt_submissions` table with AFTER INSERT OR UPDATE

---

### Query 2: Count Graded CBT Submissions
```sql
SELECT 
  COUNT(*) as total_graded_submissions,
  COUNT(CASE WHEN score IS NOT NULL THEN 1 END) as with_scores
FROM cbt_submissions
WHERE status = 'GRADED';
```

**Expected Result**: Should show graded submissions with scores > 0

---

### Query 3: Verify Scores Synced to score_sheets
```sql
SELECT 
  COUNT(DISTINCT ss.id) as total_score_sheet_entries,
  COUNT(CASE WHEN ss.exam_source = 'CBT' THEN 1 END) as exam_scores_from_cbt,
  COUNT(CASE WHEN ss.test1_source = 'CBT' THEN 1 END) as ca1_scores_from_cbt,
  COUNT(CASE WHEN ss.test2_source = 'CBT' THEN 1 END) as ca2_scores_from_cbt,
  COUNT(CASE WHEN ss.test3_source = 'CBT' THEN 1 END) as ca3_scores_from_cbt,
  COUNT(CASE WHEN ss.test4_source = 'CBT' THEN 1 END) as ca4_scores_from_cbt
FROM score_sheets ss
WHERE ss.school_id IS NOT NULL;
```

**Expected Result**: Should show scores synced across all assessment types (test1-test4, exam)

---

### Query 4: Check for Graded Submissions NOT Yet Synced
```sql
SELECT 
  COUNT(*) as unsynced_graded_submissions
FROM cbt_submissions cs
WHERE cs.status = 'GRADED'
  AND cs.score IS NOT NULL
  AND cs.cbt_exam_id IN (SELECT id FROM cbt_exams WHERE subject_id IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1 FROM score_sheets ss
    WHERE ss.student_id = cs.student_id
      AND ss.subject_id = (SELECT subject_id FROM cbt_exams WHERE id = cs.cbt_exam_id)
      AND ss.term_id = cs.term_id
      AND (ss.exam_source = 'CBT' OR ss.test1_source = 'CBT' OR ss.test2_source = 'CBT' OR ss.test3_source = 'CBT' OR ss.test4_source = 'CBT')
  );
```

**Expected Result**: Should be 0 (all graded submissions are synced)

---

### Query 5: Sample CBT Scores in score_sheets
```sql
SELECT 
  ss.id,
  st.admission_number,
  subj.name as subject_name,
  ss.test1, ss.test1_source, ss.test1_cbt_source,
  ss.exam, ss.exam_source, ss.exam_cbt_source,
  ss.created_at
FROM score_sheets ss
JOIN students st ON st.id = ss.student_id
JOIN subjects subj ON subj.id = ss.subject_id
WHERE (ss.test1_source = 'CBT' OR ss.exam_source = 'CBT')
LIMIT 5;
```

**Expected Result**: Shows sample records with CBT scores populated

---

### Query 6: Verify Result Pages Can Access Scores
```sql
-- This mimics what result pages query
SELECT 
  st.admission_number,
  st.full_name,
  subj.name,
  ss.test1, ss.test1_source,
  ss.test2, ss.test2_source,
  ss.test3, ss.test3_source,
  ss.test4, ss.test4_source,
  ss.exam, ss.exam_source,
  ss.total,
  ss.grade
FROM score_sheets ss
JOIN students st ON st.id = ss.student_id
JOIN subjects subj ON subj.id = ss.subject_id
WHERE ss.term_id IS NOT NULL
  AND (ss.test1_source = 'CBT' OR ss.test2_source = 'CBT' OR ss.test3_source = 'CBT' OR ss.test4_source = 'CBT' OR ss.exam_source = 'CBT')
LIMIT 10;
```

**Expected Result**: Shows scores with source tracking across all result page data

---

## Part 2: Verify Broadcast System

### Query 7: Check Broadcasts Table Exists
```sql
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'broadcasts'
ORDER BY ordinal_position;
```

**Expected Result**: Should show all broadcast columns: id, school_id, message, sender_id, broadcast_type, created_at, updated_at

---

### Query 8: Verify RLS is Disabled on Broadcasts
```sql
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN ('broadcasts', 'broadcast_recipients')
  AND schemaname = 'public';
```

**Expected Result**: `rowsecurity = false` for both tables (RLS disabled)

---

### Query 9: Check Broadcast Data
```sql
SELECT 
  b.id,
  b.school_id,
  b.broadcast_type,
  b.message,
  b.sender_id,
  COUNT(br.id) as recipients_count,
  SUM(CASE WHEN br.is_read THEN 1 ELSE 0 END) as read_count,
  b.created_at
FROM broadcasts b
LEFT JOIN broadcast_recipients br ON br.broadcast_id = b.id
GROUP BY b.id, b.school_id, b.broadcast_type, b.message, b.sender_id, b.created_at
ORDER BY b.created_at DESC
LIMIT 10;
```

**Expected Result**: Shows broadcasts with recipient counts and read status

---

### Query 10: Verify Broadcast Recipients
```sql
SELECT 
  b.broadcast_type,
  COUNT(DISTINCT br.user_id) as total_recipients,
  SUM(CASE WHEN br.is_read THEN 1 ELSE 0 END) as recipients_read,
  SUM(CASE WHEN NOT br.is_read THEN 1 ELSE 0 END) as recipients_unread
FROM broadcasts b
LEFT JOIN broadcast_recipients br ON br.broadcast_id = b.id
WHERE b.created_at > NOW() - INTERVAL '7 days'
GROUP BY b.broadcast_type;
```

**Expected Result**: Shows active broadcasts with read/unread distribution

---

### Query 11: Check for Orphaned Broadcasts
```sql
SELECT 
  COUNT(DISTINCT br.broadcast_id) as broadcasts_with_recipients,
  COUNT(DISTINCT b.id) as total_broadcasts,
  (SELECT COUNT(*) FROM broadcasts WHERE created_at > NOW() - INTERVAL '30 days') as recent_broadcasts
FROM broadcasts b
LEFT JOIN broadcast_recipients br ON br.broadcast_id = b.id;
```

**Expected Result**: Should show relationships between broadcasts and recipients

---

### Query 12: Verify Result Pages Query Logic

Check if result pages are querying score_sheets (they should):

```sql
-- This is what student result pages should query
SELECT 
  ss.id,
  st.full_name,
  ss.test1, ss.test2, ss.test3, ss.test4,
  ss.exam,
  ss.total,
  ss.grade,
  ss.term_id
FROM score_sheets ss
JOIN students st ON st.id = ss.student_id
WHERE ss.student_id = ? -- student ID
  AND ss.term_id = ? -- term ID
  AND ss.school_id = ? -- school ID
LIMIT 1;
```

**Expected Result**: Should return complete score sheet for the student

---

## Summary of What Should Be Working

### ✅ CBT Score Auto-Population
1. **Trigger exists**: `trigger_cbt_auto_populate_score_sheets_v2` on `cbt_submissions`
2. **Auto-sync active**: When student submits → status='GRADED' → trigger fires → scores in score_sheets
3. **Source tracking**: Each score includes CBT source column (test1_source, exam_source, etc.)
4. **Audit trail**: Submission IDs stored in cbt_source columns for verification

### ✅ Result Pages Show Scores
1. **Student result page**: Queries score_sheets, shows all scores with sources
2. **Teacher scoresheet**: Shows class scores including CBT entries
3. **Principal/Admin dashboard**: Shows school/class results with CBT data
4. **All pages**: Use score_sheets as single source of truth

### ✅ Admin Broadcasts
1. **RLS disabled**: Authenticated users can access broadcasts
2. **Broadcasts table**: Stores message + metadata
3. **Recipients table**: Tracks who receives each broadcast
4. **Read tracking**: Marks when recipients read messages
5. **Admin endpoint**: Can send to all users in school

---

## How to Execute This Verification

1. **Go to Supabase SQL Editor**
2. **Run each query** (1-12) one at a time
3. **Review results** against "Expected Result"
4. **Report any discrepancies**

If all queries return expected results → **All systems working correctly ✅**

If any query shows issues → **We identify and fix specific problem**

---

## Status After 3 Fixes

| System | Status |
|--------|--------|
| Subjects in registration | ✅ Live |
| Student names displaying | ✅ Live |
| CBT term UUIDs | ⏳ After Migration 142 in Supabase |
| **CBT score auto-sync** | ✅ Should be working (verify with queries) |
| **Result pages** | ✅ Should be working (verify with queries) |
| **Admin broadcasts** | ✅ Should be working (verify with queries) |

---

**Next Step**: Execute these 12 SQL queries in Supabase to verify everything is working. Report any issues found.
