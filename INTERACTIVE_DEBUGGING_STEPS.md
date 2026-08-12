# Interactive Debugging Steps - StudentRegistrationModal

Follow these steps in order to identify where the issue is.

---

## PHASE 1: Verify Modal Opens and Fires Queries

### Step 1: Open Browser DevTools
1. Press **F12** or right-click → **Inspect**
2. Go to **Console** tab
3. Make sure you're on the **Network** tab ready to monitor

### Step 2: Navigate to School Admin Dashboard
- URL: `http://localhost:3000/school-admin/dashboard`
- Login as school admin if needed

### Step 3: Click "Register Student" Button
- Should see modal appear
- **Immediately check Console tab**

### Expected Console Output:
```
📚 Loading classes and subjects for school: [some-uuid]
```

**RESULT:**
- [ ] I see this message
- [ ] I don't see this message → **Go to PHASE 2: Check if Modal Mounts**
- [ ] I see an error message → **Go to PHASE 3: Debug Error**

---

## PHASE 2: Check if Modal Mounts Properly

### If modal doesn't show console logs:

**Step 1: Check if Modal Renders**
1. DevTools → **Elements** tab (or Inspector)
2. Search for the modal text "Register New Student"
3. Press Ctrl+F, search for `👨‍🎓 Register New Student`

**RESULT:**
- [ ] Found the modal HTML → Modal is rendering
- [ ] Not found → Modal is not rendering → **Contact developer**

**Step 2: Check if isOpen prop is true**
1. In DevTools Console, paste this:
```javascript
// Try to find React component instance
const modal = document.querySelector('[class*="overlay"]');
console.log('Modal element found:', !!modal);
```

**RESULT:**
- [ ] Modal element found: true → Go to PHASE 1 Step 3 again, check console more carefully
- [ ] Modal element found: false → Modal not rendering

---

## PHASE 3: Debug Console Errors

### If you see error messages in console:

**Step 1: Copy the Error**
1. Right-click error in console
2. Select **Copy message**
3. Check error type:

#### Error Type A: "Failed to load classes: ..."
```
❌ Error loading classes: PGRST116 The "class_arm_combos" table does not exist
```

**Cause:** Missing table or permissions
**Next Steps:**
1. Go to Supabase Dashboard
2. Click **SQL Editor**
3. Run: `SELECT * FROM class_arm_combos LIMIT 1;`
4. Check if table exists or if error appears

#### Error Type B: "Failed to load classes: permission denied"
```
❌ Error loading classes: {"code":"PGRST116","message":"The request body exceeds the size limit"}
```

**Cause:** RLS policy blocking access
**Next Steps:** Go to PHASE 4: Check RLS Policies

#### Error Type C: "401 Unauthorized"
```
❌ Error loading classes: 401 Unauthorized
```

**Cause:** User not authenticated
**Next Steps:**
1. Check Console: `curl -H "Authorization: Bearer $(supabase auth current_user)" ...`
2. Verify user is logged in (check top-right of dashboard)

#### Error Type D: "Cannot read property 'classes'"
```
TypeError: Cannot read property 'classes' of undefined
```

**Cause:** Response data is malformed
**Next Steps:** Go to PHASE 5: Check Network Response

---

## PHASE 4: Check RLS Policies

### Step 1: Access Supabase Dashboard
1. Go to https://supabase.io/dashboard
2. Select your project
3. Go to **SQL Editor**

### Step 2: Check class_arm_combos Table
1. Run this query:
```sql
SELECT * FROM class_arm_combos LIMIT 5;
```

**RESULT:**
- [ ] Query returns data → Table and RLS allow reads
- [ ] Query returns empty array → No data in table (expected for new school)
- [ ] Query returns error → RLS policy issue

### Step 3: Check RLS Policies
1. Go to **Authentication** → **Policies**
2. Find `class_arm_combos` table
3. Check each policy:
   - Look for **SELECT** policies
   - Check the policy definition (USING clause)

**Example of working policy:**
```sql
USING (school_id = (SELECT school_id FROM users WHERE id = auth.uid()))
```

**Example of broken policy:**
```sql
USING (created_by = auth.uid())  -- ❌ Won't work for admin users
```

### Step 4: Check subjects Table
Repeat step 3 for `subjects` table

---

## PHASE 5: Check Network Response

### Step 1: Clear Network Log
1. Go to **Network** tab in DevTools
2. Click circle with slash (clear button)
3. Make sure **"Preserve log"** is NOT checked

### Step 2: Open Modal Again
1. Click "Register Student" button
2. Immediately check Network tab

### Step 3: Look for Supabase Requests
1. Filter by **XHR** (or **Fetch**)
2. Look for requests containing:
   - `class_arm_combos`
   - `subjects`

### Step 4: Inspect Request Details

**For each request:**

1. **Click on the request name**
2. Check **Status Code**:
   - 200 = Success ✓
   - 403 = Permission denied → RLS issue
   - 404 = Table not found → Missing table
   - 500 = Server error → Supabase issue

3. Click **Response** tab
4. Check response body format:

**Expected (Classes):**
```json
[
  {
    "id": "uuid-here",
    "classes": {
      "id": "uuid",
      "name": "JSS 1",
      "level": 1,
      "type": "SECONDARY"
    },
    "arms": { "name": "A" }
  }
]
```

**Expected (Subjects):**
```json
[
  {
    "id": "uuid",
    "name": "Mathematics",
    "code": "MTH",
    "applicable_to_levels": [1, 2, 3, 4, 5, 6]
  }
]
```

**Empty Response (valid):**
```json
[]
```

### RESULT of Response Check:
- [ ] Both requests return Status 200 with data → **SUCCESS: Everything working**
- [ ] Requests return Status 200 with empty array → **Data missing, check database**
- [ ] Requests return Status 403 → **RLS policy issue**
- [ ] Requests return Status 404 → **Table missing**
- [ ] Requests return Status 500 → **Supabase server error**

---

## PHASE 6: Check if Classes/Subjects Appear in Modal

### After successful API responses:

### Step 1: Check if Dropdown Populates
1. In the modal, find the "Select Class" dropdown
2. Click on it
3. Should see a list like:
   - "-- Select Class --"
   - "JSS 1 A"
   - "JSS 1 B"
   - "SSS 2 A"
   - etc.

**RESULT:**
- [ ] Classes appear → API working, UI working ✓
- [ ] No classes in dropdown → No data in database (expected for new school)
- [ ] Error message in dropdown → Data format issue

### Step 2: Select a Class
1. Pick any class from dropdown
2. Check Console for logs

**Expected logs:**
```
No new error messages
Modal updates to show department selection (if secondary)
Modal updates to show subjects (if secondary)
```

### Step 3: Check Subjects
1. If secondary school selected, should see subjects list
2. Should be checkboxes like:
   - ☐ Mathematics
   - ☐ English
   - ☐ Physics
   - etc.

**RESULT:**
- [ ] Subjects appear → **SUCCESS: Everything working**
- [ ] Subjects don't appear but no error → Data missing
- [ ] Error appears → Check Phase 3

---

## PHASE 7: Data Availability Check

### If NO data appears in modal (empty dropdown, no subjects):

### Step 1: Check if School is Set Up
1. Dashboard should show school name
2. Go to **Settings** tab
3. Verify school information is shown

### Step 2: Check if Classes Exist in Database
1. Supabase Dashboard → **SQL Editor**
2. Run:
```sql
SELECT 
  COUNT(*) as class_count,
  school_id
FROM class_arm_combos
GROUP BY school_id;
```

**RESULT:**
- [ ] Shows your school_id with count > 0 → Classes exist
- [ ] Shows count 0 → No classes created
- [ ] Your school_id not in results → Wrong school selected

### Step 3: Check if Subjects Exist
```sql
SELECT 
  COUNT(*) as subject_count,
  school_id
FROM subjects
GROUP BY school_id;
```

**RESULT:**
- [ ] Shows your school_id with count > 0 → Subjects exist
- [ ] Shows count 0 → No subjects created
- [ ] Your school_id not in results → Wrong school selected

### Step 4: If No Data - Create Sample Data
Run in Supabase SQL Editor:

```sql
-- Insert sample classes (adjust school_id)
INSERT INTO classes (name, level, type, school_id)
VALUES ('JSS 1', 1, 'SECONDARY', 'YOUR_SCHOOL_ID')
ON CONFLICT DO NOTHING;

-- Insert sample arms
INSERT INTO arms (name)
VALUES ('A'), ('B'), ('C')
ON CONFLICT DO NOTHING;

-- Link them (adjust IDs from previous queries)
INSERT INTO class_arm_combos (class_id, arm_id, school_id)
VALUES (...);

-- Insert sample subjects
INSERT INTO subjects (name, code, school_id, applicable_to_levels)
VALUES 
  ('Mathematics', 'MTH', 'YOUR_SCHOOL_ID', '[1,2,3,4,5,6]'),
  ('English', 'ENG', 'YOUR_SCHOOL_ID', '[1,2,3,4,5,6]'),
  ('Physics', 'PHY', 'YOUR_SCHOOL_ID', '[4,5,6]');
```

---

## PHASE 8: Verify Full Registration Flow

### Once data loads successfully:

### Step 1: Fill Step 1 Form
- Full Name: "Test Student"
- Email: "test@school.com"
- Password: "Test123456"
- Admission Number: (auto-generate or enter)

### Step 2: Click Next
- Should advance to Step 2

### Step 3: Step 2 Form
- Select Class: Pick any class
- Select Department: Pick one (if secondary)
- Select Subjects: Pick 2-3

### Step 4: Click "Complete Registration"
- Should submit
- Should see "Student registered successfully!"
- Modal should close

**RESULT:**
- [ ] Registration completes → **SUCCESS**
- [ ] Error on submit → Go to Phase 3, check error
- [ ] Form doesn't advance → JavaScript error, check console

---

## Summary: Diagnosis Flow

```
Does "📚 Loading classes..." appear in console?
├─ YES
│  ├─ Does "✅ Loaded classes:" appear?
│  │  ├─ YES → Check Network tab for 200 responses
│  │  └─ NO → Check for "❌ Error" messages → Go to Phase 3
│  └─ NO → Modal not firing loadData() → Go to Phase 2
└─ NO → Check if modal is visible → Go to Phase 2
```

---

## Still Stuck? Check This

1. **Verify .env.local has correct Supabase URL and Keys**
   - File: `.env.local`
   - Should have:
     ```
     NEXT_PUBLIC_SUPABASE_URL=...
     NEXT_PUBLIC_SUPABASE_ANON_KEY=...
     ```

2. **Restart dev server**
   - Stop: `Ctrl+C`
   - Start: `npm run dev`

3. **Clear browser cache**
   - Hard refresh: `Ctrl+Shift+R`
   - Or DevTools → Network → Disable cache while DevTools open

4. **Check if you're logged in**
   - Dashboard should show logged-in user name
   - If not, login first

5. **Check if this is the right school**
   - Some schools may have no classes/subjects configured yet
   - Try with another school account if available

---
