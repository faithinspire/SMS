# Browser Console & Network Debugging Guide

## Overview
Based on analysis of the code, this guide explains what should happen and what to look for when the StudentRegistrationModal opens.

---

## What SHOULD Happen When Modal Opens

### 1. **Initial Load (Modal Opens)**
- Modal component mounts with `isOpen={true}`
- `useEffect` hook fires: `if (isOpen && schoolId)`
- Calls `loadData()` function
- `loadingData` state becomes `true`

### 2. **API Calls Made**
The modal should make **TWO Supabase queries**:

#### Query 1: Fetch Classes & Arms Combinations
```javascript
// File: StudentRegistrationModal.tsx, line ~77-88
supabase
  .from('class_arm_combos')
  .select(`
    id,
    classes!inner(id, name, level, type),
    arms!inner(name)
  `)
  .eq('school_id', schoolId)
  .order('classes(level)')
```

**Expected console log:**
```
📚 Loading classes and subjects for school: [schoolId]
✅ Loaded classes: [number]
```

#### Query 2: Fetch Subjects
```javascript
// File: StudentRegistrationModal.tsx, line ~91-99
supabase
  .from('subjects')
  .select('id, name, code, applicable_to_levels')
  .eq('school_id', schoolId)
  .order('name')
```

**Expected console log:**
```
✅ Loaded subjects: [number]
```

---

## What to Check in Browser DevTools

### ✅ Step 1: Console Tab
Open DevTools → **Console** tab

**Look for these logs:**
```
📚 Loading classes and subjects for school: [schoolId]
✅ Loaded classes: X
✅ Loaded subjects: Y
```

**If you see errors like:**
```
❌ Error loading classes: [error message]
❌ Error loading subjects: [error message]
❌ Error loading data: [error message]
```

**Common errors:**
- `PGRST116` = permission denied (RLS policy issue)
- `42P01` = table does not exist
- `CORS` = cross-origin issue
- `401 Unauthorized` = authentication failed

---

### ✅ Step 2: Network Tab
Open DevTools → **Network** tab

**Before opening modal:**
- Clear network log (circle with slash icon)

**After clicking "Register Student" button:**
- Look for Supabase API calls to `/rest/v1/`

**Expected network requests:**

1. **POST to `/rest/v1/rpc/...` or similar** (for auth if needed)
2. **GET request to `/rest/v1/class_arm_combos?**`
   - Status: **200** (success) or **403** (permission denied)
   - Response should contain array of classes
   - Size: typically 1-5 KB

3. **GET request to `/rest/v1/subjects?**`
   - Status: **200** (success) or **403** (permission denied)
   - Response should contain array of subjects
   - Size: typically 2-10 KB

**Filter by XHR to see only XMLHttpRequest/Fetch calls:**
- Click "XHR" button in Network tab
- Shows only API requests (filters out images, CSS, etc)

---

### ✅ Step 3: Response Inspection

For each API request in Network tab:

1. **Click on the request name** (e.g., `class_arm_combos?...`)
2. Click **"Response"** tab
3. Check if you see actual data like:

**Classes response should look like:**
```json
[
  {
    "id": "class-123",
    "classes": {
      "id": "class-456",
      "name": "JSS 1",
      "level": 1,
      "type": "SECONDARY"
    },
    "arms": {
      "name": "A"
    }
  }
]
```

**Subjects response should look like:**
```json
[
  {
    "id": "subject-123",
    "name": "Mathematics",
    "code": "MTH",
    "applicable_to_levels": [1, 2, 3, 4, 5, 6]
  }
]
```

---

## Debugging Scenarios

### Scenario 1: No API Calls Appear in Network Tab
**Diagnosis:** Modal might not be opening, or `loadData()` is not being called

**Check:**
1. Is the modal actually visible? (check DOM in Elements tab)
2. Is `schoolId` being passed correctly?
3. Check console for any React errors

**Solution:**
- Add breakpoint in DevTools at StudentRegistrationModal.tsx
- Step through `useEffect` execution

---

### Scenario 2: API Returns 403 Forbidden
**Diagnosis:** Row Level Security (RLS) policies are blocking the query

**Likely causes:**
- RLS policy requires specific user role
- User's school_id doesn't match filter
- RLS policy is too restrictive

**Check in Supabase Dashboard:**
1. Go to SQL Editor
2. Check `class_arm_combos` table → RLS Policies
3. Check `subjects` table → RLS Policies

**Example of what might be wrong:**
```sql
-- ❌ BAD: Too restrictive
CREATE POLICY "schools_isolation"
ON class_arm_combos
FOR SELECT
USING (school_id = auth.uid());  -- This will always fail!

-- ✅ GOOD: Allows school admin
CREATE POLICY "school_access"
ON class_arm_combos
FOR SELECT
USING (school_id = (SELECT school_id FROM auth.users WHERE id = auth.uid()));
```

---

### Scenario 3: API Returns 200 But Empty Array
**Diagnosis:** No data exists, or query parameters are wrong

**Check:**
1. Does your school have classes created?
   - Dashboard → Settings → Check school ID
   - Supabase → SQL Editor → Run: `SELECT * FROM class_arm_combos WHERE school_id = 'YOUR_SCHOOL_ID';`

2. Does your school have subjects created?
   - Supabase → SQL Editor → Run: `SELECT * FROM subjects WHERE school_id = 'YOUR_SCHOOL_ID';`

3. Are the tables even created?
   - Supabase → Tables → Check if `class_arm_combos` and `subjects` exist

---

### Scenario 4: JavaScript Error in Console
**Example errors:**

```
Cannot read property 'classes' of undefined
```
**Cause:** `classCombo.classes` is null/undefined
**Check:** Response contains nested data structure

```
Type error: setClasses is not a function
```
**Cause:** State hook not initialized properly
**Check:** React import and component setup

---

## School Admin Dashboard Debugging

Open school admin dashboard at `/school-admin/dashboard`

### Debugging Steps:

1. **Check Console for Loading Errors**
   ```
   ❌ User role: [role shown]
   ```
   If you see this, user doesn't have proper role

2. **Check if Staff/Students Load**
   - Dashboard has sections for "Staff & Teachers" and "Students"
   - Should show tables with data or "No [item] registered yet"

3. **Click "Register Student" Button**
   - StudentRegistrationModal should open
   - Console should immediately show:
     ```
     📚 Loading classes and subjects for school: [schoolId]
     ```

4. **Network Tab During Load**
   - Should see multiple requests firing:
     - `/rest/v1/class_arm_combos`
     - `/rest/v1/subjects`

---

## Quick Checklist

- [ ] StudentRegistrationModal opens visually
- [ ] Console shows "📚 Loading classes..." message
- [ ] Console shows "✅ Loaded classes: X" with number > 0
- [ ] Console shows "✅ Loaded subjects: Y" with number > 0
- [ ] Network tab shows GET requests to class_arm_combos
- [ ] Network tab shows GET requests to subjects
- [ ] Both requests return Status 200
- [ ] Response bodies contain valid JSON arrays
- [ ] Classes dropdown populates with values
- [ ] Subjects checkboxes appear (for secondary students)

---

## If Everything Fails

### Nuclear Option Debugging
Run these in Supabase SQL Editor to check raw data:

```sql
-- Check if classes exist for your school
SELECT * FROM class_arm_combos 
WHERE school_id = 'YOUR_SCHOOL_ID' 
LIMIT 10;

-- Check if subjects exist
SELECT * FROM subjects 
WHERE school_id = 'YOUR_SCHOOL_ID' 
LIMIT 10;

-- Check RLS policies
SELECT * FROM pg_policies 
WHERE tablename IN ('class_arm_combos', 'subjects');

-- Check if current user has auth session
SELECT auth.uid();
```

---

## Performance Considerations

**Typical response times:**
- Class query: 100-500ms
- Subjects query: 100-500ms
- Total load time: 200-1000ms

**If queries are slow:**
1. Supabase dashboard → Monitoring → check query performance
2. Add indexes to `school_id` column if not present
3. Check if you have many rows (>10,000)

---

## References

**Code Files:**
- Modal component: `src/components/admin/StudentRegistrationModal.tsx`
- Dashboard: `src/app/school-admin/dashboard/page.tsx`
- Supabase client: `src/lib/supabase-client.ts`

**Key Functions:**
- Line 54-104: `loadData()` function with logging
- Line 60-71: Class query
- Line 73-82: Subjects query

**Database Queries:**
- `class_arm_combos`: Junction table linking classes and arms
- `subjects`: Subject records with applicable levels

---
