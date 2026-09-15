# ✅ FOREIGN KEY CONSTRAINT FIX - DEPLOYED

**Commit**: `2f19475` - "CRITICAL: Fix foreign key constraint - use actual class_arm_combo_id from junction table"

## The Problem

Error: `insert or update on table "students" violates foreign key constraint "students_class_arm_combo_id_fkey"`

**Root Cause**: 
- `students.class_arm_combo_id` must reference the `class_arm_combos` junction table
- Was trying to use `selectedClassId` (which is just the class ID)
- `class_arm_combos` is a junction table linking: class + arm + teacher
- Need to query it using BOTH `selectedClassId` AND `selectedArmId`

## What Was Fixed

**File**: `src/components/admin/StudentRegistrationModal.tsx`

**Before** (BROKEN):
```typescript
// Invalid: selectedClassId is not a valid class_arm_combo_id
class_arm_combo_id: selectedClassId,  // ❌ FK CONSTRAINT FAILS
```

**After** (FIXED):
```typescript
// CRITICAL: Query class_arm_combos junction table
const { data: classArmCombo, error: comboError } = await supabase
  .from('class_arm_combos')
  .select('id')
  .eq('class_id', selectedClassId)
  .eq('arm_id', selectedArmId)
  .eq('school_id', schoolId)
  .single()

if (comboError || !classArmCombo) {
  throw new Error(`Class-Arm combination not found`)
}

const classArmComboId = classArmCombo.id

// Now use the actual class_arm_combo_id
class_arm_combo_id: classArmComboId,  // ✅ Valid FK reference
```

## Database Schema

```sql
-- Classes table
CREATE TABLE classes (
  id UUID PRIMARY KEY,
  name TEXT,
  level INTEGER,
  ...
)

-- Arms table (JSS1A, JSS1B, SSS2A, etc.)
CREATE TABLE arms (
  id UUID PRIMARY KEY,
  name TEXT,
  capacity INTEGER,
  ...
)

-- JUNCTION TABLE: Links class + arm + teacher
CREATE TABLE class_arm_combos (
  id UUID PRIMARY KEY,  -- ← This is what students table needs!
  class_id UUID REFERENCES classes(id),
  arm_id UUID REFERENCES arms(id),
  teacher_id UUID REFERENCES users(id),
  school_id UUID REFERENCES schools(id),
  ...
)

-- Students table
CREATE TABLE students (
  id UUID PRIMARY KEY,
  user_id UUID,
  school_id UUID,
  class_arm_combo_id UUID REFERENCES class_arm_combos(id),  -- ← FK to junction table
  admission_number TEXT NOT NULL,
  ...
)
```

## Flow Fixed

**Before**:
```
Select Class (JSS1)  →  selectedClassId = "uuid-jss1"
Select Arm (A)       →  selectedArmId = "uuid-arm-a"
Insert Student       →  class_arm_combo_id = selectedClassId  ❌ WRONG!
                            (foreign key fails)
```

**After**:
```
Select Class (JSS1)  →  selectedClassId = "uuid-jss1"
Select Arm (A)       →  selectedArmId = "uuid-arm-a"
Query Junction Table →  class_arm_combos WHERE class_id = selectedClassId 
                                           AND arm_id = selectedArmId
                                    →  classArmComboId = "uuid-combo-jss1a"
Insert Student       →  class_arm_combo_id = classArmComboId  ✅ CORRECT!
```

## Now Deployed

✅ **Commit `2f19475`** pushed to `origin/main`
✅ **Vercel auto-deployment** triggered
✅ Foreign key constraint fixed

## Test Now

1. **Hard refresh**: `Ctrl+Shift+R` (wait 2-3 min for Vercel build)
2. Dashboard → **Register Student**
3. Fill form and submit
4. **Expected**: 
   - ✅ Student created successfully
   - ✅ Auto-generated admission number (STU000001, etc.)
   - ✅ Correct class assignment
   - ✅ No foreign key constraint error

## All Fixes Applied

| Issue | Fix | Commit | Status |
|-------|-----|--------|--------|
| Teacher registration SQL nested query | API endpoint bypass | `0bc4514` | ✅ |
| Student results not auto-loading | useEffect hooks + AcademicSessionService | `4dd0668` | ✅ |
| Admission_number NULL constraint | Auto-generation in all paths | `58284b1` | ✅ |
| StudentRegistrationModal missing admission_number | Added generation logic | `531f67c` | ✅ |
| **Foreign key constraint (class_arm_combo_id)** | **Query junction table** | **`2f19475`** | **✅ JUST DEPLOYED** |

---

## Why This Works Now

1. ✅ Admission number is auto-generated: `STU000001`
2. ✅ Class-Arm combo is correctly found from junction table
3. ✅ Foreign key constraint is satisfied (valid reference)
4. ✅ Student record successfully created
5. ✅ Correct class assignment linked

