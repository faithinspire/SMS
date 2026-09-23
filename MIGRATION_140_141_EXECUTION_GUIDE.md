# Migration 140 & 141: Complete Curriculum Population (Prep→SS3)

## Overview

**Migration 140**: Populates COMPLETE NERDC-aligned curriculum for ALL EXISTING SCHOOLS
**Migration 141**: Auto-initializes curriculum for NEW schools (via trigger)

**Result**: Every school (existing + new) automatically receives:
- PREP: 18 subjects
- KG/Nursery: 19 subjects each
- Primary 1-3: 13 subjects (core + Nigerian language variants)
- Primary 4-6: 16 subjects (core + languages)
- JSS 1-3: 22 subjects (core + languages + 6 trade options)
- SS 1-3: 46 subjects (5 core + 10 science + 14 humanities + 4 business + 6 trade)

Total: **215 subjects per school** (all school-scoped with stable subject_code)

---

## KEY DESIGN DECISIONS

✅ **School-Scoped**: Every subject has `school_id` (NOT NULL constraint satisfied)
✅ **Idempotent**: Uses `ON CONFLICT (school_id, subject_code) DO NOTHING`
✅ **Stable Codes**: Subject codes like `PREP-ENG`, `SS-BIO`, `JSS-TRADE-SOLAR` prevent duplicates
✅ **All Schools**: Migration 140 loops through EVERY school
✅ **Auto-Init**: Migration 141 trigger fires on new school creation
✅ **Department Field**: SS subjects organized by CORE/SCIENCE/HUMANITIES/BUSINESS/TRADE

---

## EXECUTION STEPS

### Step 1: Backup Database (Recommended)

In Supabase:
1. Go to Dashboard → Project Settings → Backups
2. Click "Create Manual Backup" (optional but recommended)

---

### Step 2: Execute Migration 140 (Populate Existing Schools)

**In Supabase SQL Editor:**

Copy the entire contents of `database/migrations/140_complete_curriculum_all_schools.sql` and paste into the SQL editor.

Click **"Run"** or press `Ctrl+Enter`.

**Expected Output:**
```
NOTICE:  Migration 140: Curriculum population complete for all schools
```

**Wait for**: ~2-5 seconds (depends on number of schools)

---

### Step 3: Execute Migration 141 (Setup Auto-Init Trigger)

Copy the entire contents of `database/migrations/141_auto_initialize_school_curriculum.sql` and paste into the SQL editor.

Click **"Run"** or press `Ctrl+Enter`.

**Expected Output:**
```
-- Migration runs silently on success
-- Check: SELECT pg_get_triggerdef(oid) FROM pg_trigger WHERE tgname = 'trigger_initialize_school_curriculum';
```

---

### Step 4: Verify Migration 140 Results

Run this SQL query in Supabase SQL Editor:

```sql
-- Check: How many schools were processed?
SELECT COUNT(DISTINCT school_id) as schools_with_curriculum
FROM subjects
WHERE subject_code IN ('PREP-ENG', 'JSS-ENG', 'SS-ENG');

-- Expected: Returns number of existing schools

-- Check: How many PREP subjects per school?
SELECT school_id, COUNT(*) as prep_subject_count
FROM subjects
WHERE subject_code LIKE 'PREP-%'
GROUP BY school_id
ORDER BY school_id;

-- Expected: 18 subjects per school

-- Check: How many SS subjects per school?
SELECT school_id, COUNT(*) as ss_subject_count
FROM subjects
WHERE subject_code LIKE 'SS-%'
GROUP BY school_id;

-- Expected: 46 subjects per school

-- Check: Verify NO duplicates
SELECT school_id, subject_code, COUNT(*) as count
FROM subjects
WHERE subject_code IS NOT NULL
GROUP BY school_id, subject_code
HAVING COUNT(*) > 1;

-- Expected: Returns 0 rows (no duplicates)

-- Check: Verify departments are set for SS subjects
SELECT DISTINCT department, COUNT(*) as count
FROM subjects
WHERE level = 5 AND department IS NOT NULL
GROUP BY department;

-- Expected: 
-- CORE: 4
-- SCIENCE: 10
-- HUMANITIES: 14
-- BUSINESS: 4
-- TRADE: 6
```

---

### Step 5: Verify Trigger Setup (Migration 141)

Run this SQL query:

```sql
-- Check: Is the trigger created?
SELECT 
  tgname as trigger_name,
  tgrelname as table_name,
  pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger
WHERE tgname = 'trigger_initialize_school_curriculum';

-- Expected: Returns 1 row with trigger definition
```

---

### Step 6: Test Auto-Init with NEW School

Create a test school via API or directly in SQL:

```sql
-- Test: Create a new school
INSERT INTO schools (name, type, email, phone, address, status)
VALUES ('Test School Auto-Init', 'BOTH', 'test@school.com', '1234567890', 'Test Address', 'ACTIVE')
RETURNING id;

-- Copy the returned school ID (v_test_school_id)

-- Verify: Check if subjects were auto-created for this school
SELECT COUNT(*) as subject_count_for_new_school
FROM subjects
WHERE school_id = 'v_test_school_id';

-- Expected: 215 subjects (or check for PREP-ENG, SS-ENG, etc.)
```

---

## INTEGRATION WITH FRONTEND

### Student Registration Component

Update to use centralized curriculum:

```typescript
// BEFORE (hard-coded):
const subjects = ['English', 'Mathematics', 'Science'];

// AFTER (centralized):
const subjects = await fetch(`/api/school/${schoolId}/subjects?level=${studentClass.level}`);
const subjectList = subjects.json();
```

### Teacher Registration Component

```typescript
// BEFORE (hard-coded):
const teacherSubjects = ['English', 'Mathematics'];

// AFTER (centralized):
const teacherSubjects = await fetch(`/api/school/${schoolId}/subjects?assignable=true`);
```

### CBT System

```typescript
// BEFORE (hard-coded):
const cbtSubjects = ['English', 'Mathematics', 'Science'];

// AFTER (centralized):
const cbtSubjects = await fetch(`/api/school/${schoolId}/subjects?level=${classLevel}`);
```

### Results System

```typescript
// BEFORE (hard-coded):
const resultSubjects = ['English', 'Mathematics'];

// AFTER (centralized):
const resultSubjects = await fetch(`/api/school/${schoolId}/subjects?level=${studentClass.level}`);
```

---

## API ENDPOINTS TO CREATE

### GET `/api/school/:schoolId/subjects`

**Query Params:**
- `level` (optional): Filter by education level (0=PREP, 1=KG/NUR, 2=PRI1-3, 3=PRI4-6, 4=JSS, 5=SS)
- `department` (optional): For SS subjects (CORE, SCIENCE, HUMANITIES, BUSINESS, TRADE)
- `assignable` (optional): true/false for teacher-assignable subjects

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "school_id": "uuid",
      "name": "English Studies",
      "subject_code": "PRI-ENG",
      "level": 2,
      "department": null,
      "created_at": "2025-09-23T..."
    }
  ]
}
```

---

## VERIFICATION CHECKLIST

After executing both migrations:

- [ ] Migration 140 executes without errors
- [ ] Migration 141 trigger is created
- [ ] All existing schools have 215+ subjects (verify via SQL query)
- [ ] No duplicate subjects (subject_code unique per school)
- [ ] Department column correctly set for SS subjects
- [ ] Test: Create new school → verify subjects auto-created
- [ ] Test: Register student Primary 1 → subjects load correctly
- [ ] Test: Register student SS1 Science → core + science subjects load
- [ ] Test: Register student SS1 Business → core + business subjects load
- [ ] Test: Multi-school isolation (School A subjects ≠ School B subjects)
- [ ] Existing results still reference valid subjects (no orphans)
- [ ] Existing CBT exams still reference valid subjects

---

## ROLLBACK (If Needed)

If you need to rollback (not recommended unless critical error):

```sql
-- Drop the auto-init trigger
DROP TRIGGER IF EXISTS trigger_initialize_school_curriculum ON schools;
DROP FUNCTION IF EXISTS trigger_init_school_curriculum();
DROP FUNCTION IF EXISTS initialize_school_curriculum(UUID);

-- To remove subjects created by Migration 140:
-- WARNING: This will delete ALL subjects that were created recently
-- Only execute if you have a backup and are certain
-- DELETE FROM subjects WHERE subject_code LIKE 'PREP-%' OR subject_code LIKE 'SS-%';
```

---

## NEXT STEPS

1. ✅ Execute Migration 140 (NOW)
2. ✅ Execute Migration 141 (NOW)
3. Create `/api/school/:schoolId/subjects` endpoint
4. Update student registration to use `/api/school/:schoolId/subjects`
5. Update teacher registration to use `/api/school/:schoolId/subjects`
6. Update CBT system to use `/api/school/:schoolId/subjects`
7. Update results system to use `/api/school/:schoolId/subjects`
8. Update all subject dropdowns throughout app
9. Test: Register new student → verify subjects work
10. Test: Create new school → verify auto-init works
11. Deploy to production

---

## SUPPORT

If migrations fail:

1. Check Supabase logs (Dashboard → Logs)
2. Verify schema matches (especially `subject_code`, `level`, `department` columns exist)
3. If constraint error: ensure `school_id` is NOT NULL on all inserts
4. If unique constraint error: migrations are idempotent, safe to re-run

For detailed logs in Supabase:
- Dashboard → Logs → Functions
- Check for any errors during migration execution
