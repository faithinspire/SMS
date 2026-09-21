# School Data Backfill - Action Guide

**Problem:** New features only work for schools registered AFTER recent migrations. Old schools are missing:
- Academic sessions & terms
- Streams
- Complete class structure
- Subject catalog

**Solution:** Execute Migration 130 to backfill ALL schools with complete base data

**Time Required:** 5 minutes
**Impact:** All 7 issues now work for ALL schools (old and new)

---

## Step 1: Verify Current Status (2 minutes)

Run these diagnostic queries in **Supabase SQL Editor** to see which schools need data:

### Query A: Schools Missing Academic Sessions
```sql
SELECT s.id, s.name
FROM schools s
LEFT JOIN academic_sessions ast ON s.id = ast.school_id
GROUP BY s.id, s.name
HAVING COUNT(ast.id) = 0;
```

**Expected:** List of old schools missing sessions (or empty if already populated)

### Query B: Schools Missing Complete Subject Catalog
```sql
SELECT s.id, s.name, COUNT(sub.id) as subject_count
FROM schools s
LEFT JOIN subjects sub ON s.id = sub.school_id
GROUP BY s.id, s.name
HAVING COUNT(sub.id) < 23;
```

**Expected:** List of schools missing subjects (or empty if complete)

---

## Step 2: Execute Migration 130 (3 minutes)

### 2.1 Open Supabase SQL Editor
- Go to: https://app.supabase.com
- Select your project
- Click: **SQL Editor** (left sidebar)
- Click: **New Query**

### 2.2 Copy Migration 130
Open file in your IDE:
```
database/migrations/130_backfill_all_schools_with_complete_data.sql
```

Select ALL (Ctrl+A), Copy (Ctrl+C)

### 2.3 Paste & Execute
1. In Supabase SQL Editor, click in the query box
2. Paste (Ctrl+V)
3. Click: **Run** button (or Cmd+Enter)
4. Wait for completion (should say "All schools now have complete base data")
5. Screenshot the results

---

## Step 3: Verify Backfill Success (1 minute)

Re-run the diagnostic queries from Step 1:

### Query A (again)
```sql
SELECT s.id, s.name
FROM schools s
LEFT JOIN academic_sessions ast ON s.id = ast.school_id
GROUP BY s.id, s.name
HAVING COUNT(ast.id) = 0;
```

**Expected after migration:** 0 rows (empty result)

### Query B (again)
```sql
SELECT s.id, s.name, COUNT(sub.id) as subject_count
FROM schools s
LEFT JOIN subjects sub ON s.id = sub.school_id
GROUP BY s.id, s.name
HAVING COUNT(sub.id) < 23;
```

**Expected after migration:** 0 rows (empty result)

---

## Step 4: Test New Features with Old Schools (1 minute)

### 4.1 Test Broadcasts
1. Login as school admin from an OLD school
2. Go to dashboard → Send Broadcast
3. Enter message, select recipients, click Send
4. **Should see:** ✅ "Broadcast sent to X recipients"
5. Login as teacher → Check Broadcast Inbox
6. **Should see:** The broadcast message

### 4.2 Test Lesson Notes
1. Login as teacher from an OLD school
2. Go to dashboard → Submit Lesson Note
3. Fill form: Title, Content, Subject, Class
4. Click Submit
5. **Should see:** ✅ "Lesson note submitted successfully"
6. Login as principal → Lesson Notes Review
7. **Should see:** The submitted note

### 4.3 Test Assignments
1. Login as teacher from an OLD school
2. Go to dashboard → Create Assignment
3. Fill form: Title, Description, Due Date, Class, Subject
4. Click Create
5. **Should see:** ✅ "Assignment created successfully"
6. Login as student in that class → Assignments
7. **Should see:** The assignment in their list

### 4.4 Test CBT
1. Login as student from an OLD school
2. Go to dashboard → Take Exam
3. Select exam, submit answers
4. **Should see:** ✅ "Exam submitted successfully"
5. Login as subject teacher → Score Sheets
6. **Should see:** Student's score auto-populated

---

## What Migration 130 Creates for Each School

After execution, every school will have:

✅ **Academic Sessions:** 36 sessions (2025/2026 through 2060/2061)
✅ **Academic Terms:** 108 total (3 terms × 36 sessions)
✅ **Streams:** 4 streams (Science, Commercial, Humanities, Technical)
✅ **Classes:** 14 classes
  - Nursery, Kindergarten, Primary 1-6 (8 total)
  - JSS 1-3, SS 1-3 (6 total)
✅ **Arms:** 42 arms (3 arms × 14 classes)
✅ **Class-Arm Combos:** 42 combos (for student enrollment)
✅ **Subjects:** 23 subjects
  - 10 primary subjects (English, Math, Science, Social Studies, Civic, PE, Art, Music, Home Econ, ICT)
  - 9 secondary subjects (added English, Biology, Chemistry, Physics, History, Geography, Ag Science, Technical Drawing, CS)
  - 4 SSS-only subjects (Economics, Accounting, Government, Literature, Further Math)

---

## If Migration 130 Fails

### Error: "Column does not exist"
**Cause:** One of the referenced tables doesn't exist
**Fix:** Check that the core migration files executed successfully (001-127)

### Error: "Duplicate key violation"
**Cause:** Data already exists for some schools
**Fix:** This is okay - means those schools already have data. Migration uses ON CONFLICT DO NOTHING to skip duplicates.

### Error: "Foreign key constraint violated"
**Cause:** School ID references don't exist
**Fix:** Unlikely but check that schools table is not empty

### No errors but results seem incomplete
**Cause:** Migration ran but partially completed
**Fix:** Re-run the migration - it's idempotent (safe to run multiple times)

---

## Alternative: Use API Endpoint Instead

If you prefer not to run SQL directly, use the API endpoint:

### For ALL Schools
```bash
curl -X POST http://localhost:3000/api/admin/ensure-complete-school-data \
  -H "Content-Type: application/json" \
  -d '{}'
```

### For Specific School
```bash
curl -X POST http://localhost:3000/api/admin/ensure-complete-school-data \
  -H "Content-Type: application/json" \
  -d '{"school_id": "SCHOOL_UUID_HERE"}'
```

---

## Verification Checklist

After completion, verify:

- [ ] Migration 130 executed without errors in Supabase
- [ ] Diagnostic Query A returns 0 rows (no schools missing sessions)
- [ ] Diagnostic Query B returns 0 rows (no schools missing subjects)
- [ ] Can create broadcast in OLD school → staff receives it
- [ ] Can submit lesson notes in OLD school → principal sees it
- [ ] Can create assignment in OLD school → student sees it
- [ ] Can submit CBT in OLD school → score in scoresheet
- [ ] Code deployed to Vercel (from previous session)
- [ ] Migration 127 executed for broadcasts (from previous session)

---

## What This Fixes

### Before Migration 130:
- ❌ New schools: All features work (they get data during registration)
- ❌ Old schools: New features don't work (missing base data)

### After Migration 130:
- ✅ New schools: All features work (as before)
- ✅ Old schools: All features NOW WORK (backfilled with data)

---

## Summary

| Before | After |
|--------|-------|
| Old schools have empty lesson notes page | Old schools see lesson notes from teachers |
| Old schools can't send broadcasts | Old schools can send broadcasts to staff |
| Old schools don't have assignments | Old schools can create and see assignments |
| Old schools can't do CBT | Old schools can submit CBT and see scores |
| New features only for new schools | New features work for ALL schools |

---

## Timeline

1. **Verify status** (2 min) - Run diagnostic queries
2. **Execute Migration 130** (3 min) - Paste in Supabase SQL Editor
3. **Verify backfill** (1 min) - Re-run diagnostic queries
4. **Test features** (1 min) - Try broadcasts, lessons, assignments, CBT
5. **Deploy** (automatic) - Code already on Vercel, just needs DB fix

**Total Time:** ~7 minutes

---

## Next Actions

1. **Go to Supabase SQL Editor**
2. **Copy & Paste Migration 130**
3. **Click Run**
4. **Wait for completion**
5. **Verify with diagnostic queries**
6. **Test end-to-end**

After this, all 7 production issues are FULLY RESOLVED for ALL schools (old and new).

