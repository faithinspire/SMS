# Database Migrations - Run These in Order

**Status**: Ready to Execute  
**Date**: August 28, 2026  
**Critical**: Run in exact order shown below  

---

## Migrations to Execute (In Order)

### 1. BLOCKER FIXES (Already Created)
```
✅ 049_add_academic_session_to_scores.sql
   - Creates academic_sessions table
   - Adds academic_session_id to score_sheets
   - Adds RLS policies
```

### 2. SCHEMA EXPANSION (Next)
```
050_expand_subjects_schema.sql
   - Adds: section, level, department, is_active, subject_type, description, created_by
   - Creates indexes for efficient querying
```

```
051_expand_students_schema.sql
   - Adds: gender, section, photo_url, passport_photo_url, parent info, address
   - Adds: status field (ACTIVE, GRADUATED, WITHDRAWN, SUSPENDED)
   - Creates indexes for filtering
```

### 3. DATA POPULATION (Last)
```
052_populate_comprehensive_subjects.sql
   - Populates all Nigerian curriculum subjects
   - Creates subjects for Primary (Levels 1-6)
   - Creates subjects for JSS (Levels 7-9)
   - Creates subjects for SSS (Levels 10-12) - All streams
   - Handles CORE and ELECTIVE subjects
```

---

## How to Execute

### Option A: Via Supabase Dashboard
1. Go to Supabase → SQL Editor
2. Copy each migration file content
3. Execute in order (049 → 050 → 051 → 052)
4. Check for "completed successfully" messages

### Option B: Via Database CLI
```bash
# If using psql
psql -h [supabase-host] -U postgres -d [db-name] -f migrations/049_add_academic_session_to_scores.sql
psql -h [supabase-host] -U postgres -d [db-name] -f migrations/050_expand_subjects_schema.sql
psql -h [supabase-host] -U postgres -d [db-name] -f migrations/051_expand_students_schema.sql
psql -h [supabase-host] -U postgres -d [db-name] -f migrations/052_populate_comprehensive_subjects.sql
```

---

## Verification After Each Migration

### After 049 (Academic Sessions)
```sql
-- Check table created
SELECT COUNT(*) as session_count FROM academic_sessions;

-- Check columns added to score_sheets
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'score_sheets' 
AND column_name IN ('academic_session_id', 'session_year');
```

### After 050 (Subjects Schema)
```sql
-- Check new columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'subjects'
AND column_name IN ('section', 'level', 'department', 'is_active', 'subject_type');

-- Check indexes created
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'subjects' 
AND indexname LIKE 'idx_subjects%';
```

### After 051 (Students Schema)
```sql
-- Check new columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'students'
AND column_name IN ('gender', 'section', 'photo_url', 'status');

-- Check indexes
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'students' 
AND indexname LIKE 'idx_students%';
```

### After 052 (Subject Population)
```sql
-- Check subject count per school
SELECT school_id, COUNT(*) as subject_count
FROM subjects
GROUP BY school_id;

-- Check subjects by level
SELECT level, COUNT(*) as count
FROM subjects
WHERE school_id = [YOUR_SCHOOL_ID]
GROUP BY level;

-- Check subjects by section
SELECT section, COUNT(*) as count
FROM subjects
WHERE school_id = [YOUR_SCHOOL_ID]
GROUP BY section;
```

---

## Expected Results After Migration 052

**Primary School (Type: PRIMARY)**
- Levels 1-6: English, Math, Science, Social Studies (CORE)
- Plus electives: Civic Ed, PE, Music, Art, ICT
- Total: ~40-50 subjects

**Secondary School (Type: SECONDARY)**
- JSS (Levels 7-9): 10 CORE + 7 ELECTIVES per level
- SSS Science (Levels 10-12): 5 CORE + 7 ELECTIVES per level
- SSS Humanities (Levels 10-12): 5 CORE + 7 ELECTIVES per level
- SSS Commercial (Levels 10-12): 5 CORE + 7 ELECTIVES per level
- Total: ~150+ subjects

**Both Types**
- All subjects properly categorized
- Levels, sections, departments assigned
- Ready for filtering and assignment

---

## IMPORTANT NOTES

1. **Migration 052 depends on schools existing in database**
   - Run after you have created at least one test school
   - The migration automatically covers all existing schools

2. **No data loss**
   - All migrations use `IF NOT EXISTS` or `IF NOT ALREADY EXISTS`
   - Safe to re-run without duplication

3. **RLS policies**
   - academic_sessions table has RLS enabled
   - Teachers can only see sessions for their school
   - Admins can manage sessions

4. **Backup before running**
   - Optional but recommended
   - Especially if you have existing subjects to preserve

---

## After Migrations Complete

1. ✅ Verify all tables and columns created
2. ✅ Test subject queries in teacher/student registration
3. ✅ Verify subject filtering works
4. ✅ Test new student and subject fields in forms
5. ✅ Move to next fix phase (FIX 4+)

---

**STATUS: READY TO EXECUTE**

Next step: Run migrations 049 → 050 → 051 → 052 in order
