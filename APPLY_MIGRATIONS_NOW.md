# APPLY MIGRATIONS IMMEDIATELY

**CRITICAL**: Run these migrations in Supabase SQL Editor to enable all the fixes

## Step 1: Open Supabase Dashboard

Go to: https://app.supabase.com → Select your project → SQL Editor

## Step 2: Create Academic Sessions Table

Copy and paste this SQL:

```sql
-- Migration 049: Add academic session tracking to score sheets
CREATE TABLE IF NOT EXISTS academic_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  session_string TEXT NOT NULL,
  start_year INT NOT NULL,
  end_year INT NOT NULL,
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(school_id, session_string)
);

CREATE INDEX IF NOT EXISTS idx_academic_sessions_school_current 
  ON academic_sessions(school_id, is_current);

-- Add columns to score_sheets if not exists
ALTER TABLE score_sheets 
ADD COLUMN IF NOT EXISTS academic_session_id UUID REFERENCES academic_sessions(id) ON DELETE SET NULL;

ALTER TABLE score_sheets 
ADD COLUMN IF NOT EXISTS session_year TEXT;

CREATE INDEX IF NOT EXISTS idx_score_sheets_academic_session 
  ON score_sheets(academic_session_id);

-- Populate default sessions for existing schools
INSERT INTO academic_sessions (school_id, session_string, start_year, end_year, is_current)
SELECT 
  s.id,
  '2026/2027',
  2026,
  2027,
  TRUE
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM academic_sessions 
  WHERE school_id = s.id 
  AND session_string = '2026/2027'
);

SELECT 'Migration 049 completed' AS status;
```

Click **Execute** and verify you see "Migration 049 completed"

## Step 3: Expand Subjects Schema

```sql
-- Migration 050: Expand subjects table
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS section VARCHAR(50) DEFAULT 'GENERAL';
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS level INT;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS subject_type VARCHAR(50) DEFAULT 'CORE';
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS created_by UUID;

CREATE INDEX IF NOT EXISTS idx_subjects_school_active 
  ON subjects(school_id, is_active);
CREATE INDEX IF NOT EXISTS idx_subjects_school_level 
  ON subjects(school_id, level);
CREATE INDEX IF NOT EXISTS idx_subjects_school_section 
  ON subjects(school_id, section);

SELECT 'Migration 050 completed' AS status;
```

Click **Execute**

## Step 4: Expand Students Schema

```sql
-- Migration 051: Expand students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS gender VARCHAR(10);
ALTER TABLE students ADD COLUMN IF NOT EXISTS section VARCHAR(50);
ALTER TABLE students ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS passport_photo_url TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_name VARCHAR(255);
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_phone VARCHAR(20);
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_email VARCHAR(255);
ALTER TABLE students ADD COLUMN IF NOT EXISTS residential_address TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS date_registered TIMESTAMP DEFAULT NOW();
ALTER TABLE students ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_students_school_class_active 
  ON students(school_id, class_arm_combo_id)
  WHERE status = 'ACTIVE';

SELECT 'Migration 051 completed' AS status;
```

Click **Execute**

## Step 5: Verify All Changes

```sql
-- Check if new columns exist
SELECT column_name 
FROM information_schema.columns 
WHERE table_name IN ('academic_sessions', 'score_sheets', 'subjects', 'students')
ORDER BY table_name, column_name;

-- Check academic sessions created
SELECT COUNT(*) as session_count FROM academic_sessions;

-- Check subjects by school
SELECT school_id, COUNT(*) as subject_count 
FROM subjects 
GROUP BY school_id;
```

Click **Execute** to verify

## Step 6: Restart the Server

The server (http://localhost:3000) should auto-reload. If not:
1. Stop the running server
2. Run: `npm run dev`
3. Test at http://localhost:3000

## VERIFICATION CHECKLIST

After migrations complete, verify:

- [ ] Go to Supabase → Table Editor
- [ ] Check "academic_sessions" table exists
- [ ] Check "score_sheets" table has new columns (academic_session_id, session_year)
- [ ] Check "subjects" table has new columns (section, level, department, is_active)
- [ ] Check "students" table has new columns (gender, section, status)

## TEST THE CBT SYSTEM

1. Go to http://localhost:3000/student/[school-id]/exam
2. Start a CBT exam
3. Submit an answer
4. Complete the exam
5. Check Supabase: score_sheets table should have:
   - academic_session_id populated ✅
   - session_year populated ✅
   - exam_source = 'CBT' ✅

## CRITICAL FIXES APPLIED

✅ BLOCKER 1: Student-subject-teacher linking in registration
   - File: /src/services/user-registration.service.ts
   - Change: Query subject_teacher_assignments, populate subject_teacher_id

✅ BLOCKER 2: Academic session tracking in scores
   - File: /src/app/api/student/cbt/submit/route.ts
   - Change: Get session from term, set academic_session_id and session_year

✅ BLOCKER 3: Type safety - class_arm_combo_id required
   - File: /src/types/index.ts
   - Change: Made class_arm_combo_id non-optional in Student interface

---

**CRITICAL**: Apply migrations before testing. Server is running but needs database updates.

Status: ✅ Server running at http://localhost:3000
Status: ⏳ Waiting for migrations to be applied
