# Subject Master List and Level Mapping Reference

## Overview

This document defines the authoritative subject catalog for the SMS system. All subjects must be mapped to applicable class levels using the `applicable_to_levels INT[] ARRAY` column in the `subjects` table.

**Key Principle**: The filtering logic in registration components (StudentRegistrationModal, TeacherRegistrationModal) is CORRECT. The data was missing. This migration fixes the data.

## Class Level Mapping

| Level | Class Name | Section | Type |
|-------|-----------|---------|------|
| 0 | Nursery | EARLY_YEARS | PRIMARY |
| 1 | Prep | EARLY_YEARS | PRIMARY |
| 2 | KG | EARLY_YEARS | PRIMARY |
| 3 | Primary 1 | PRIMARY | PRIMARY |
| 4 | Primary 2 | PRIMARY | PRIMARY |
| 5 | Primary 3 | PRIMARY | PRIMARY |
| 6 | Primary 4 | PRIMARY | PRIMARY |
| 7 | Primary 5 | PRIMARY | PRIMARY |
| 8 | Primary 6 | PRIMARY | PRIMARY |
| 9 | JSS1 | SECONDARY | SECONDARY |
| 10 | JSS2 | SECONDARY | SECONDARY |
| 11 | JSS3 | SECONDARY | SECONDARY |
| 12 | SS1 | SECONDARY | SECONDARY |
| 13 | SS2 | SECONDARY | SECONDARY |
| 14 | SS3 | SECONDARY | SECONDARY |

## Complete Subject Catalog

### EARLY YEARS SUBJECTS (Levels 0-2: Nursery, Prep, KG)

| Subject | Code | Levels | Category | Compulsory |
|---------|------|--------|----------|-----------|
| English Language | ENG | 0-2 | CORE | ✓ |
| Mathematics | MATH | 0-2 | CORE | ✓ |
| Social Studies | SS | 1-2 | CORE | ✓ |
| Physical Education | PE | 0-2 | GENERAL | ✗ |
| Arts & Crafts | ART | 0-2 | GENERAL | ✗ |
| Music | MUS | 0-2 | GENERAL | ✗ |

### PRIMARY SCHOOL SUBJECTS (Levels 3-8: Primary 1-6)

| Subject | Code | Levels | Category | Compulsory | Notes |
|---------|------|--------|----------|-----------|-------|
| English Language | ENG | 0-8 | CORE | ✓ | All primary + early years |
| Mathematics | MATH | 0-8 | CORE | ✓ | All primary + early years |
| Science | SCI | 2-8 | CORE | ✓ | From KG onwards |
| Social Studies | SS | 1-8 | CORE | ✓ | From Prep onwards |
| Physical Education | PE | 0-8 | GENERAL | ✗ | All primary + early years |
| Arts & Crafts | ART | 0-8 | GENERAL | ✗ | All primary + early years |
| Music | MUS | 0-8 | GENERAL | ✗ | All primary + early years |
| Home Economics | HEC | 6-8 | GENERAL | ✗ | Primary 4-6 only |
| Computer Studies | CST | 5-14 | TECHNICAL | ✗ | Primary 3-6 + all Secondary |
| Agricultural Science | AGR | 7-14 | TECHNICAL | ✗ | Primary 5-6 + all Secondary |

### JSS SUBJECTS (Levels 9-11: JSS1-3)

| Subject | Code | Levels | Category | Compulsory | Notes |
|---------|------|--------|----------|-----------|-------|
| English Language | ENG | 0-14 | CORE | ✓ | All classes |
| Mathematics | MATH | 0-14 | CORE | ✓ | All classes |
| Science | SCI | 2-8 | CORE | ✓ | Primary only |
| Basic Science | BSCI | 9-11 | CORE | ✓ | JSS only |
| Basic Technology | BTECH | 9-11 | CORE | ✓ | JSS only |
| Social Studies | SS | 1-8 | CORE | ✓ | Primary only |
| Civic Education | CIVIC | 9-14 | GENERAL | ✗ | All secondary |
| Biology | BIO | 9-14 | SCIENCE | ✗ | All secondary |
| Chemistry | CHEM | 9-14 | SCIENCE | ✗ | All secondary |
| Physics | PHY | 9-14 | SCIENCE | ✗ | All secondary |
| History | HIST | 9-14 | HUMANITIES | ✗ | All secondary |
| Geography | GEOG | 9-14 | HUMANITIES | ✗ | All secondary |
| French Language | FRE | 9-14 | LANGUAGE | ✗ | All secondary |
| Physical Education | PE | 0-8,9-14 | GENERAL | ✗ | Primary + Secondary |
| Computer Studies | CST | 5-14 | TECHNICAL | ✗ | Primary 3-6 + all Secondary |
| Agricultural Science | AGR | 7-14 | TECHNICAL | ✗ | Primary 5-6 + all Secondary |

### SS SUBJECTS (Levels 12-14: SS1-3)

**SCIENCE STREAM**:
| Subject | Code | Levels | Department | Category |
|---------|------|--------|-----------|----------|
| Further Mathematics | FMATH | 12-14 | SCIENCE | SCIENCE |
| Biology | BIO | 9-14 | SCIENCE | SCIENCE |
| Chemistry | CHEM | 9-14 | SCIENCE | SCIENCE |
| Physics | PHY | 9-14 | SCIENCE | SCIENCE |

**COMMERCIAL STREAM**:
| Subject | Code | Levels | Department | Category |
|---------|------|--------|-----------|----------|
| Economics | ECON | 12-14 | COMMERCIAL | COMMERCIAL |
| Accounting | ACC | 12-14 | COMMERCIAL | COMMERCIAL |
| Business Studies | BUS | 12-14 | COMMERCIAL | COMMERCIAL |

**HUMANITIES STREAM**:
| Subject | Code | Levels | Department | Category |
|---------|------|--------|-----------|----------|
| Government | GOV | 12-14 | HUMANITIES | HUMANITIES |
| Literature in English | LIT | 12-14 | HUMANITIES | HUMANITIES |
| History | HIST | 9-14 | HUMANITIES | HUMANITIES |
| Geography | GEOG | 9-14 | HUMANITIES | HUMANITIES |

**ALL STREAMS**:
| Subject | Code | Levels | Category |
|---------|------|--------|----------|
| English Language | ENG | 0-14 | CORE |
| Mathematics | MATH | 0-14 | CORE |
| Civic Education | CIVIC | 9-14 | GENERAL |
| Physical Education | PE | 0-14 | GENERAL |

## Database Structure

### subjects table schema

```sql
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  applicable_to_levels INT[] NOT NULL DEFAULT '{}',  -- ✅ KEY FIELD
  section VARCHAR(50) DEFAULT 'GENERAL',
  is_active BOOLEAN DEFAULT TRUE,
  compulsory BOOLEAN DEFAULT FALSE,
  department VARCHAR(100) DEFAULT NULL,  -- For SS stream filtering
  category VARCHAR(100) DEFAULT 'GENERAL',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, name)
);
```

**Critical Column**: `applicable_to_levels INT[] ARRAY`
- Contains array of class levels where subject is offered
- Example: `{3,4,5,6,7,8}` means subject is available in Primary 1-6
- PostgreSQL queries use `@>` operator for array containment: `WHERE applicable_to_levels @> ARRAY[5]`
- Empty array `{}` causes filtering to fail

### Query Examples

**Get all subjects for Primary 5 (level 5)**:
```sql
SELECT * FROM subjects 
WHERE school_id = 'xxx' 
  AND applicable_to_levels @> ARRAY[5]
  AND is_active = TRUE
ORDER BY name;
```

**Get all subjects for JSS1 (level 9)**:
```sql
SELECT * FROM subjects 
WHERE school_id = 'xxx' 
  AND applicable_to_levels @> ARRAY[9]
  AND is_active = TRUE
ORDER BY name;
```

**Get all subjects for SS1 Science stream (level 12)**:
```sql
SELECT * FROM subjects 
WHERE school_id = 'xxx' 
  AND applicable_to_levels @> ARRAY[12]
  AND (department IS NULL OR department = 'SCIENCE')
  AND is_active = TRUE
ORDER BY name;
```

**Find subjects with empty levels (broken records)**:
```sql
SELECT name, code, applicable_to_levels
FROM subjects 
WHERE applicable_to_levels = '{}' 
  OR applicable_to_levels IS NULL;
```

## Registration Component Integration

### StudentRegistrationModal.tsx (Step 4: Subject Selection)

```typescript
// Load subjects when class is selected
const loadSubjects = async () => {
  const allSubjects = await RegistrationConfigService.getSubjectsForSchool(schoolId)
  const selectedClass = classes.find(c => c.id === selectedClassId)
  
  if (selectedClass) {
    // ✅ This filtering logic is CORRECT
    // It relies on applicable_to_levels being properly populated
    const filtered = allSubjects.filter(s =>
      s.applicable_to_levels.includes(selectedClass.level)
    )
    setSubjects(filtered)
  }
}

// For SS classes, also filter by department if selected
const getSubjectsForStream = () => {
  if (!selectedStreamId) return subjects
  
  const stream = streams.find(s => s.id === selectedStreamId)
  if (!stream?.department) return subjects
  
  return subjects.filter(s =>
    s.department === null ||  // General subjects for all streams
    s.department === stream.department
  )
}
```

### TeacherRegistrationModal.tsx (Step 4: Teaching Assignment)

```typescript
// Get subjects for the selected class+arm combo
const getSubjectsForCombo = () => {
  if (!selectedComboId) return []
  
  const combo = combos.find(c => c.id === selectedComboId)
  if (!combo) return []
  
  const level = combo.classes?.level
  if (level === undefined || level === null) return []
  
  // ✅ This filtering logic is CORRECT
  // It relies on applicable_to_levels being properly populated
  return subjects.filter(s => s.applicable_to_levels.includes(level))
}

// For SS classes, filter by department
const getSubjectsForDepartment = () => {
  const filtered = getSubjectsForCombo()
  
  if (!selectedDepartment) return filtered
  
  return filtered.filter(s =>
    s.department === null ||  // General subjects for all streams
    s.department === selectedDepartment
  )
}
```

## Migration Execution

Run migration 107 in Supabase:

```bash
# Via SQL editor in Supabase console:
-- Copy entire contents of database/migrations/107_comprehensive_subject_master_list.sql
-- Paste into Supabase SQL editor
-- Execute

# Via CLI (if connected):
supabase db push
```

**What migration 107 does**:
1. ✅ Deletes broken records from migration 105 (using non-existent `level` column)
2. ✅ Populates all Early Years subjects (Nursery, Prep, KG) - Levels 0-2
3. ✅ Populates all Primary subjects (Primary 1-6) - Levels 3-8
4. ✅ Populates all JSS subjects (JSS1-3) - Levels 9-11
5. ✅ Populates all SS subjects (SS1-3) - Levels 12-14
6. ✅ Adds department field for stream-based filtering
7. ✅ Fixes any remaining empty `applicable_to_levels` arrays
8. ✅ Creates verification reports

## Verification

After running migration 107, verify the subjects are properly populated:

```sql
-- Check total subjects per school
SELECT 
  COUNT(*) as total_subjects,
  COUNT(CASE WHEN applicable_to_levels = '{}' THEN 1 END) as broken_records
FROM subjects
WHERE school_id = (SELECT id FROM schools LIMIT 1);

-- Should show: total_subjects = ~50+, broken_records = 0

-- Check subjects for each level
SELECT DISTINCT 
  s.name,
  s.code,
  s.applicable_to_levels
FROM subjects s
WHERE s.applicable_to_levels @> ARRAY[5]  -- Change 5 to test different levels
ORDER BY s.name;
```

Expected result for level 5 (Primary 3):
- English Language
- Mathematics
- Science
- Social Studies
- Physical Education
- Arts & Crafts
- Music
- Computer Studies (optional for Primary 3)

## Troubleshooting

**Issue**: Still seeing blank dropdowns in Student/Teacher Registration
**Cause**: Migration 107 hasn't been executed in production Supabase
**Fix**: Run migration 107 in Supabase SQL editor

**Issue**: Subject lists not updating after running migration
**Cause**: Browser cache or component not re-fetching data
**Fix**: Hard refresh (Ctrl+Shift+R) and re-load registration modal

**Issue**: SS streams still show wrong subjects
**Cause**: `department` field not properly populated or filtering not implemented
**Fix**: Verify department filtering is enabled in registration components and re-run tests

## Future Enhancements

1. Add subject-level permissions (which teachers can teach which subjects)
2. Implement subject prerequisites (e.g., Chemistry requires Basic Science)
3. Add subject elective groups (e.g., choose 2 of 4 humanities electives)
4. Implement streaming logic for automatic subject assignment
5. Add subject performance analytics

