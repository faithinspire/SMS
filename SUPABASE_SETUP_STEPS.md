# SUPABASE SETUP - STEP BY STEP

## CRITICAL: Follow these steps in order to get the registration system working

---

## STEP 1: Disable RLS (Row Level Security)

Go to Supabase SQL Editor and run this query:

```sql
-- Disable RLS on all registration tables
ALTER TABLE class_arm_combos DISABLE ROW LEVEL SECURITY;
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE arms DISABLE ROW LEVEL SECURITY;
ALTER TABLE subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE schools DISABLE ROW LEVEL SECURITY;
```

**Expected result:** `ALTER TABLE` (no errors)

---

## STEP 2: Create Test School

Run this query:

```sql
INSERT INTO schools (id, name, type, email, phone, subscription_plan, status)
VALUES (
  '18459a61-7e93-494c-b951-6cef5d589a88'::UUID,
  'Faith Inspire Academy',
  'BOTH',
  'admin@faithinspire.com',
  '+234803456789',
  'premium',
  'ACTIVE'
)
ON CONFLICT DO NOTHING;
```

**Expected result:** `INSERT 0 1` (or 0 if already exists)

---

## STEP 3: Create Primary Classes

Run this query:

```sql
INSERT INTO classes (id, school_id, name, level, type)
VALUES 
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Primary 1', 1, 'PRIMARY'),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Primary 2', 2, 'PRIMARY'),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Primary 3', 3, 'PRIMARY'),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Primary 4', 4, 'PRIMARY'),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Primary 5', 5, 'PRIMARY'),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Primary 6', 6, 'PRIMARY'),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'JSS 1', 7, 'SECONDARY'),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'JSS 2', 8, 'SECONDARY'),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'JSS 3', 9, 'SECONDARY'),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'SSS 1', 10, 'SECONDARY'),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'SSS 2', 11, 'SECONDARY'),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'SSS 3', 12, 'SECONDARY')
ON CONFLICT DO NOTHING;
```

**Expected result:** `INSERT 0 12`

---

## STEP 4: Create Arms (A, B, C) for each class

Run this query:

```sql
-- Get all class IDs and create arms for each
INSERT INTO arms (id, class_id, school_id, name, capacity)
SELECT 
  gen_random_uuid(),
  c.id,
  '18459a61-7e93-494c-b951-6cef5d589a88'::UUID,
  arm_name,
  40
FROM classes c,
(SELECT 'A' AS arm_name UNION ALL SELECT 'B' UNION ALL SELECT 'C') arms
WHERE c.school_id = '18459a61-7e93-494c-b951-6cef5d589a88'::UUID
ON CONFLICT DO NOTHING;
```

**Expected result:** `INSERT 0 36` (12 classes × 3 arms = 36)

---

## STEP 5: Create Class-Arm Combinations

Run this query:

```sql
-- Insert class_arm_combos for all combinations
INSERT INTO class_arm_combos (id, school_id, class_id, arm_id)
SELECT 
  gen_random_uuid(), 
  '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 
  c.id,
  a.id
FROM classes c
JOIN arms a ON a.class_id = c.id
WHERE c.school_id = '18459a61-7e93-494c-b951-6cef5d589a88'::UUID
ON CONFLICT DO NOTHING;
```

**Expected result:** `INSERT 0 36` (same as arms = 36 combinations)

---

## STEP 6: Create Subjects

Run this query:

```sql
INSERT INTO subjects (id, school_id, name, code, applicable_to_levels)
VALUES 
  -- Primary Subjects
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'English Language', 'ENG', ARRAY[1,2,3,4,5,6]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Mathematics', 'MATH', ARRAY[1,2,3,4,5,6]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Science', 'SCI', ARRAY[1,2,3,4,5,6]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Social Studies', 'SS', ARRAY[1,2,3,4,5,6]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Civic Education', 'CIV', ARRAY[1,2,3,4,5,6]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Physical Education', 'PE', ARRAY[1,2,3,4,5,6]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Art & Craft', 'ART', ARRAY[1,2,3,4,5,6]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Music', 'MUS', ARRAY[1,2,3,4,5,6]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Home Economics', 'HE', ARRAY[1,2,3,4,5,6]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Information Technology', 'ICT', ARRAY[3,4,5,6]),
  -- Secondary Subjects
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'English', 'ENG', ARRAY[7,8,9,10,11,12]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Mathematics', 'MATH', ARRAY[7,8,9,10,11,12]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Biology', 'BIO', ARRAY[7,8,9,10,11,12]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Chemistry', 'CHEM', ARRAY[7,8,9,10,11,12]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Physics', 'PHY', ARRAY[7,8,9,10,11,12]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'History', 'HIST', ARRAY[7,8,9,10,11,12]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Geography', 'GEO', ARRAY[7,8,9,10,11,12]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Civic Education', 'CIV', ARRAY[7,8,9,10,11,12]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Physical Education', 'PE', ARRAY[7,8,9,10,11,12]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Agricultural Science', 'AGR', ARRAY[7,8,9,10,11,12]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Technical Drawing', 'TD', ARRAY[7,8,9,10,11,12]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Computer Science', 'CS', ARRAY[7,8,9,10,11,12]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Economics', 'ECON', ARRAY[10,11,12]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Accounting', 'ACC', ARRAY[10,11,12]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Government', 'GOV', ARRAY[10,11,12]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Literature In English', 'LIT', ARRAY[10,11,12]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Further Mathematics', 'FM', ARRAY[10,11,12])
ON CONFLICT (school_id, name) DO NOTHING;
```

**Expected result:** `INSERT 0 27`

---

## STEP 7: Verify Data

Run this query to verify everything was created:

```sql
SELECT 'Schools' as entity, COUNT(*) as count FROM schools WHERE id = '18459a61-7e93-494c-b951-6cef5d589a88'::UUID
UNION ALL
SELECT 'Classes', COUNT(*) FROM classes WHERE school_id = '18459a61-7e93-494c-b951-6cef5d589a88'::UUID
UNION ALL
SELECT 'Arms', COUNT(*) FROM arms WHERE school_id = '18459a61-7e93-494c-b951-6cef5d589a88'::UUID
UNION ALL
SELECT 'Class-Arm Combos', COUNT(*) FROM class_arm_combos WHERE school_id = '18459a61-7e93-494c-b951-6cef5d589a88'::UUID
UNION ALL
SELECT 'Subjects', COUNT(*) FROM subjects WHERE school_id = '18459a61-7e93-494c-b951-6cef5d589a88'::UUID;
```

**Expected results:**
- Schools: 1
- Classes: 12
- Arms: 36
- Class-Arm Combos: 36
- Subjects: 27

---

## STEP 8: Test in Browser

1. Go to: http://localhost:3000
2. Log in to dashboard
3. Click **+ Register Teacher** or **+ Register Student**
4. Check DevTools Console (F12) - you should see:
   - ✅ "🔍 Starting data load for schoolId: 18459a61-7e93-494c-b951-6cef5d589a88"
   - ✅ "📚 Fetching class_arm_combos..."
   - ✅ "✅ Combos response: { count: 36, error: null }"
   - ✅ "✅ Classes response: { count: 12, error: null }"
   - ✅ "✅ Arms response: { count: 36, error: null }"
   - ✅ "📚 Fetching subjects..."
   - ✅ "✅ Subjects response: { count: 27, error: null }"

5. In the modal, you should see:
   - **Classes dropdown populated with 36 options** (e.g., "Primary 1 - A", "Primary 1 - B", etc.)
   - **Subjects dropdown populated with 27 options** (e.g., "English Language", "Mathematics", etc.)

---

## IF SOMETHING GOES WRONG

**Problem:** Still showing empty dropdowns
**Solution:** 
1. Run verification query (Step 7)
2. Check console for errors (F12)
3. If RLS error: Run Step 1 again

**Problem:** "No subjects available"
**Solution:** Verify subject levels match class level (run Step 7 verification)

---

## NEXT: Commit and Push

After verification passes:

```bash
cd c:\Users\OLU\Desktop\SMS
git add .
git commit -m "Fixed: RLS disabled and test data inserted for registration system"
git push origin main
```

---

**Ready to execute? Follow steps 1-7 in Supabase SQL Editor NOW** 🚀
