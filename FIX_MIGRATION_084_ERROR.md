# Fix for Migration 084 Error

## Error
```
ERROR: 42P07: relation "unique_student_subject_term" already exists
```

## Cause
The constraint `unique_student_subject_term` already exists on the `universal_scores` table, likely from a previous migration or manual creation.

## Solution

### Option 1: If Migration 084 Has NOT Been Applied Yet
Drop the existing constraint first:

```sql
-- Check if constraint exists
SELECT * FROM information_schema.table_constraints 
WHERE table_name = 'universal_scores' 
AND constraint_name = 'unique_student_subject_term';

-- If it exists, drop it
ALTER TABLE universal_scores 
DROP CONSTRAINT IF EXISTS unique_student_subject_term;

-- Now run migration 084
```

### Option 2: If Migration 084 Was Already Applied
Simply skip running it again:

```sql
-- Check what constraints exist on universal_scores
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'universal_scores';

-- If unique_student_subject_term exists, the migration already worked
-- Just continue with testing
```

### Quick Fix in Supabase SQL Editor

1. Open Supabase SQL Editor
2. Run this to drop the duplicate:
```sql
ALTER TABLE universal_scores 
DROP CONSTRAINT IF EXISTS unique_student_subject_term;
```

3. Then re-apply migration 084:
```sql
ALTER TABLE universal_scores
ADD CONSTRAINT unique_student_subject_term UNIQUE (student_id, subject_id, term_id);
```

## Verification

After fixing, verify the constraint exists:

```sql
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'universal_scores' 
AND constraint_name = 'unique_student_subject_term';
```

Should show:
```
constraint_name           | constraint_type
unique_student_subject_term | UNIQUE
```

