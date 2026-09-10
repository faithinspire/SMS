# CBT Creation Error - Diagnostic Steps

## What You Need To Do First

### Step 1: Check Browser Console (F12)
1. Press **F12** to open Developer Tools
2. Go to **Console** tab
3. Try to create a CBT again
4. Look for error messages that start with `[CBT]`
5. **Copy the exact error message and share it with me**

The console will now show:
- `[CBT] Attempting to create CBT with:` - Shows what data is being sent
- `[CBT] Response status:` - HTTP status code (200, 400, 404, 500, etc.)
- `[CBT] API Error Details:` - The exact server error

### Step 2: Check Network Tab (F12)
1. Open DevTools again (F12)
2. Go to **Network** tab
3. Try to create a CBT
4. Look for a request to `/api/teacher/cbt/create`
5. Click on it and check:
   - **Response** tab to see what the server returned
   - **Headers** tab to see request details

### Step 3: Common Error Codes & Solutions

**Error: "Missing required field"**
- Means the API is validating the input
- Make sure you filled in ALL fields:
  - Title ✓
  - Subject ✓
  - Class ✓
  - Term ✓ (NOT session - just term)
  - Duration ✓
  - At least 1 question ✓

**Error: "Teacher not assigned to this subject/class combination"**
- This means the teacher (you) aren't assigned to teach that subject in that class
- **Solution**: Go to School Admin → Subject Management → Verify your subject assignment

**Error: "Invalid term_id: term not found"**
- The term doesn't exist in database
- **Solution**: Go to Supabase and run this to create terms:
  ```sql
  -- First, create an academic session
  INSERT INTO academic_sessions (school_id, session_year, start_year, end_year, is_active, is_current)
  SELECT schools.id, '2025/2026', 2025, 2026, true, true
  FROM schools
  WHERE name = 'Your School Name'
  ON CONFLICT DO NOTHING;
  
  -- Then create terms
  INSERT INTO academic_terms (school_id, session_id, term_name, term_order, is_active)
  SELECT 
    s.id,
    a.id,
    t.name,
    t.order,
    true
  FROM schools s
  CROSS JOIN academic_sessions a
  CROSS JOIN (VALUES ('First Term', 1), ('Second Term', 2), ('Third Term', 3)) as t(name, order)
  WHERE s.name = 'Your School Name' AND a.session_year = '2025/2026'
  ON CONFLICT DO NOTHING;
  ```

**Error: "Subject not found or not available for this school"**
- The subject doesn't exist
- **Solution**: Create the subject in School Admin

**Error: HTTP 500 or "Internal server error"**
- Server issue - check server logs:
  1. If using `npm run dev`, look at terminal output
  2. Check if server needs to be restarted

### Step 4: Debug Checklist

Before trying again, verify:

- [ ] **Academic Sessions Exist**: 
  ```sql
  SELECT * FROM academic_sessions 
  WHERE school_id = 'YOUR_SCHOOL_ID';
  ```
  Should show at least one session

- [ ] **Academic Terms Exist**:
  ```sql
  SELECT * FROM academic_terms 
  WHERE school_id = 'YOUR_SCHOOL_ID';
  ```
  Should show at least 3 terms (First, Second, Third)

- [ ] **Teacher Assignment Exists**:
  ```sql
  SELECT * FROM subject_teacher_assignments
  WHERE teacher_id = 'YOUR_TEACHER_ID'
    AND subject_id = 'SUBJECT_YOU_SELECTED'
    AND class_arm_combo_id = 'CLASS_YOU_SELECTED';
  ```
  Should show at least one row

- [ ] **Subject Exists**:
  ```sql
  SELECT * FROM subjects 
  WHERE school_id = 'YOUR_SCHOOL_ID' 
    AND name = 'SUBJECT_YOU_SELECTED';
  ```
  Should show the subject

- [ ] **Class Exists**:
  ```sql
  SELECT * FROM class_arm_combos 
  WHERE school_id = 'YOUR_SCHOOL_ID';
  ```
  Should show available classes

### Step 5: Do You Need To Restart Server?

**YES - If you:**
- Modified code in `src/app/api/` folder
- Changed environment variables

**NO - If you only:**
- Ran database migrations
- Changed UI code in `src/app/teacher/cbt-management/`

**To restart the dev server:**
1. Find the terminal where it's running
2. Press **Ctrl + C** to stop it
3. Run `npm run dev` again

### Step 6: After Running Migrations

If you haven't run the migrations yet, do this in **Supabase SQL Editor**:

1. Open Supabase console
2. Go to **SQL Editor**
3. Run this to ensure tables exist:
   ```sql
   -- Ensure academic_sessions table
   CREATE TABLE IF NOT EXISTS academic_sessions (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
     session_year VARCHAR(20) NOT NULL,
     start_year INT NOT NULL,
     end_year INT NOT NULL,
     is_active BOOLEAN DEFAULT FALSE,
     is_current BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     UNIQUE(school_id, session_year)
   );

   -- Ensure academic_terms table
   CREATE TABLE IF NOT EXISTS academic_terms (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
     session_id UUID NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
     term_name VARCHAR(50) NOT NULL,
     term_order INT NOT NULL DEFAULT 1,
     start_date DATE,
     end_date DATE,
     is_active BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     UNIQUE(school_id, session_id, term_name)
   );

   -- Add missing columns to cbt_exams
   ALTER TABLE cbt_exams
   ADD COLUMN IF NOT EXISTS assessment_type VARCHAR(20),
   ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES users(id),
   ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'DRAFT',
   ADD COLUMN IF NOT EXISTS academic_session_id UUID REFERENCES academic_sessions(id);
   ```

### Step 7: To Get Exact Error

After making changes above:
1. Go to CBT Management page
2. **Try to create a CBT with test data**:
   - Title: "Test CBT"
   - Subject: Any subject
   - Class: Any class
   - Term: Any term
   - Duration: 60 minutes
   - Total Marks: 100
   - Add 1 question: "What is 2+2?" with options
3. Click Create
4. **Copy the error that appears** and share it

### Troubleshooting Path

```
Error appears
    ↓
Open F12 Console
    ↓
Look for [CBT] messages
    ↓
What does the error say?
    ├→ "Missing required field..." → Fill that field
    ├→ "not assigned to this subject/class" → Assign teacher to subject
    ├→ "term not found" → Create academic session & terms
    ├→ "Subject not found" → Create the subject
    └→ "Internal server error" → Check server logs, may need restart
```

## Next Steps

1. **Open your browser F12 console**
2. **Try creating a CBT again**
3. **Copy the error message from the console**
4. **Share it with me**

I'll be able to pinpoint the exact issue with the detailed error information!
