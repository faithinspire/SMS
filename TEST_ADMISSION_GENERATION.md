# Admission Number Generation - Test Cases

## Implementation Overview

**File:** `src/services/student.service.ts` (lines 197-230)

**Format:** `YYYY-CLASSPREFIX-SEQUENCE`
- **YYYY** = Current year (2026)
- **CLASSPREFIX** = First 3 letters of class name in uppercase (e.g., SSA → "SSA")
- **SEQUENCE** = Zero-padded counter (0001, 0002, etc.)

**Example:** `2026-SSA-0001`

---

## Implementation Details

### Step 1: Extract Class Name
```typescript
const className: string = "Senior Secondary A" → "SSA"
const classPrefix = className.substring(0, 3).toUpperCase().replace(/\s+/g, '')
// Result: "SSA"
```

### Step 2: Get Sequence Number
```typescript
// Query count of existing students in school
const { data: existingStudents } = await supabase
  .from('students')
  .select('id', { count: 'exact' })
  .eq('school_id', schoolId)

// Increment count for new student
const sequence = ((existingStudents?.length || 0) + 1).toString().padStart(4, '0')
// If 5 students exist: (5 + 1) = 6 → "0006"
```

### Step 3: Combine
```typescript
const year = new Date().getFullYear() // 2026
return `${year}-${classPrefix}-${sequence}`
// Result: "2026-SSA-0006"
```

---

## Test Cases

### Test Case 1: First Student in School
**Input:**
- SchoolId: "school-123"
- ClassArmComboId: "combo-456"
- ClassName: "Primary 1 A"

**Expected Output:** `2026-PRI-0001`

**Steps:**
1. Extract prefix: "PRI" (from "Primary 1 A")
2. Query students in school: 0 existing
3. Sequence: (0 + 1) = "0001"
4. Result: "2026-PRI-0001" ✓

---

### Test Case 2: Subsequent Students (Same School)
**Input:**
- SchoolId: "school-123" (same as Test 1)
- ClassArmComboId: "combo-789"
- ClassName: "Senior Secondary B"

**Expected Output:** `2026-SEN-0002`

**Steps:**
1. Extract prefix: "SEN" (from "Senior Secondary B")
2. Query students in school: 1 existing (from Test 1)
3. Sequence: (1 + 1) = "0002"
4. Result: "2026-SEN-0002" ✓

---

### Test Case 3: New School
**Input:**
- SchoolId: "school-xyz" (different school)
- ClassArmComboId: "combo-999"
- ClassName: "JSS 2 A"

**Expected Output:** `2026-JSS-0001`

**Steps:**
1. Extract prefix: "JSS" (from "JSS 2 A")
2. Query students in school: 0 existing (new school)
3. Sequence: (0 + 1) = "0001"
4. Result: "2026-JSS-0001" ✓

---

### Test Case 4: Class Name Edge Cases

| Input | Prefix | Result |
|-------|--------|--------|
| "SS1" | "SS1" | "2026-SS1-0001" |
| "Senior Secondary 1" | "SEN" | "2026-SEN-0001" |
| "JS1 Arrow" | "JS1" | "2026-JS1-0001" |
| "Primary School One" | "PRI" | "2026-PRI-0001" |
| "123 Test" | "123" | "2026-123-0001" |

---

## Validation Checklist

When testing admission number generation:

- [ ] **Format Correct:** Matches `YYYY-XXX-NNNN` pattern
- [ ] **Year Current:** Uses `new Date().getFullYear()` (2026 in Aug 2026)
- [ ] **Class Prefix:** First 3 chars of class name in uppercase
- [ ] **Sequence Unique:** Each student gets incremented number
- [ ] **School-Scoped:** Different schools get separate sequences
- [ ] **Database Constraint:** UNIQUE constraint prevents duplicates
- [ ] **Fallback Working:** Random sequence if database error
- [ ] **Display in UI:** Shown in success message to admin
- [ ] **Stored Correctly:** Saved to `students.admission_number` field
- [ ] **Query Works:** Can look up student by admission number

---

## Database Validation

### Table: `students`

```sql
-- Verify admission number column
SELECT admission_number, school_id, user_id 
FROM students 
ORDER BY created_at DESC 
LIMIT 10;

-- Check for uniqueness violations
SELECT admission_number, COUNT(*) 
FROM students 
GROUP BY admission_number 
HAVING COUNT(*) > 1;

-- Expected: No rows (all admission numbers are unique)
```

---

## Error Handling

### Scenario 1: Database Query Fails
```typescript
if (countError) {
  console.warn('⚠️ Could not count existing students, using random sequence')
  const randomSeq = Math.floor(Math.random() * 9000) + 1000 // 1000-9999
  return `${year}-${classPrefix}-${randomSeq}`
}
```
**Fallback:** Random 4-digit sequence (1000-9999)

### Scenario 2: Complete Failure
```typescript
catch (err) {
  console.error('Error generating admission number:', err)
  const year = new Date().getFullYear()
  const randomSeq = Math.floor(Math.random() * 9000) + 1000
  return `${year}-ADM-${randomSeq}`
}
```
**Fallback:** Generic format with random sequence (e.g., `2026-ADM-5432`)

---

## How to Verify in Browser

1. **Open Developer Console:** F12
2. **Go to Student Registration:** Admin Dashboard → New Student
3. **Watch Console Output:**
   ```
   ✅ Generated admission number: 2026-SSA-0001
   ✅ Auth user created for student: user-uuid-here
   ✅ Database user created: user-uuid-here
   ✅ Student record created: student-uuid-here
   ✅ Linked student to subjects
   ✅ Guardian record created
   ```
4. **Verify Display:** Success message shows admission number and PIN

---

## Integration Points

### Called By:
- `StudentService.registerStudent()` - Main registration flow
- `StudentRegistrationModal.tsx` - Admin UI (Step 4)

### Uses:
- Supabase SDK: `supabase.from('students').select()`
- Date API: `new Date().getFullYear()`
- String methods: `.substring()`, `.toUpperCase()`, `.padStart()`

### Returns:
- Type: `string`
- Format: Always valid admission number (auto-generated or fallback)
- Never throws (has fallback chain)

---

## Performance Considerations

- **Query Time:** Counts all students (not indexed by class) - O(n) where n = school students
- **Optimization:** Could add database-level sequence generator for high-volume schools
- **Current Limit:** Suitable for schools with < 10k students per year

---

## Future Enhancements

1. **Class-Specific Sequences:** Count students per class (not school)
   - Would allow: `2026-SSA-0003` (3rd student in SSA class)

2. **Database Sequences:** Use PostgreSQL SEQUENCE for atomicity
   - Better for concurrent registrations

3. **Configurable Format:** Allow schools to customize format
   - E.g., `YYYY-SCHOOL_CODE-SEQUENCE`

4. **Bulk Import:** Handle pre-existing admission numbers
   - For schools migrating from other systems
