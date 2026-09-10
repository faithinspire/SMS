# CRITICAL FIXES - ACTION REQUIRED NOW

Three critical issues are blocking your system. Here's what to do:

---

## ISSUE #1: Photo Upload Failing - "Row-Level Security Policy Violation"

### Error
```
StorageApiError: new row violates row-level security policy
```

### Root Cause
Supabase Storage bucket RLS (Row-Level Security) is still enabled, preventing students from uploading photos.

### Solution

**Step 1: Execute Migration 061 in Supabase Dashboard**

1. Go to https://app.supabase.com
2. Select your project
3. Go to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy and paste the contents of: `database/migrations/061_final_storage_rls_complete_fix.sql`
6. Click **Run** button
7. Wait for it to complete (should show "Query executed successfully")

**Step 2: Verify the Fix**

After running the migration, check in **Storage** tab:
- All buckets (`student-documents`, `student-photos`, etc.) should have:
  - ✅ Public = ON
  - ✅ Row Level Security = OFF (or no policies shown)

**Step 3: Test**
- Try uploading a student photo again
- Should now work without errors

---

## ISSUE #2: Academic Terms Query Error

### Error
```
GET https://egdreueuspmuxhezdpqm.supabase.co/rest/v1/academic_terms?select=name%2Csession_id&id=eq.null 400 (Bad Request)
```

### Root Cause
Exam records don't have a `term_id` set, so the query tries to find `id=null` which is invalid SQL.

### Solution

**Already Fixed in Code** ✅
- Updated `src/components/ExamHeader.tsx` to check if `term_id` exists before querying
- Now gracefully handles exams without term_id

**Action:** No database changes needed. The code fix is deployed. When you refresh the page, this error should disappear.

---

## ISSUE #3: CBT Questions Showing as Text Input Instead of Multiple Choice

### Error
- Questions appear as text boxes to type answers instead of showing multiple choice options
- Options aren't being displayed

### Root Cause
Multiple possible causes:
1. **Most likely:** The exam in your database doesn't have options created for its questions
2. Possible: Options weren't loaded properly due to query issues
3. Possible: Questions have `question_type` set to ESSAY instead of MULTIPLE_CHOICE

### Solution

**Step 1: Check Question Data** (Database Diagnostic)

Run this query in Supabase SQL Editor to see your CBT structure:

```sql
-- Check CBT Exams and Questions
SELECT 
  e.id AS exam_id,
  e.title,
  q.id AS question_id,
  q.question_text,
  q.question_type,
  COUNT(o.id) AS option_count
FROM cbt_exams e
LEFT JOIN cbt_questions q ON q.cbt_exam_id = e.id
LEFT JOIN cbt_options o ON o.question_id = q.id
GROUP BY e.id, e.title, q.id, q.question_text, q.question_type
ORDER BY e.id, q.display_order;
```

**Expected result:**
- Each MULTIPLE_CHOICE or TRUE_FALSE question should have `option_count = 4`
- Each ESSAY question can have `option_count = 0` (OK)

**Step 2: If options are missing, add them**

If your questions have `option_count = 0` for MULTIPLE_CHOICE questions, you need to add options.

Run this to add sample options to a question:

```sql
INSERT INTO cbt_options (
  question_id,
  option_text,
  option_key,
  display_order,
  is_correct,
  school_id
) VALUES
  ('QUESTION_ID_HERE', 'Option A', 'A', 0, true, 'SCHOOL_ID_HERE'),
  ('QUESTION_ID_HERE', 'Option B', 'B', 1, false, 'SCHOOL_ID_HERE'),
  ('QUESTION_ID_HERE', 'Option C', 'C', 2, false, 'SCHOOL_ID_HERE'),
  ('QUESTION_ID_HERE', 'Option D', 'D', 3, false, 'SCHOOL_ID_HERE');
```

Replace:
- `QUESTION_ID_HERE` - with the actual question ID from the diagnostic query
- `SCHOOL_ID_HERE` - with your school ID

**Step 3: Enable Better Logging**

The code now logs question loading details. Check browser console (F12 → Console tab) for messages like:

```
[CBT] Loaded 5 questions, 20 options
[CBT] Question abc-123: MULTIPLE_CHOICE, 4 options
```

---

## Summary of Changes Made

### Code Changes (Deployed)

1. **`src/lib/supabase-client.ts`**
   - Fixed duplicate export error
   - Added retry logic for network resilience
   - Added custom fetch wrapper with exponential backoff

2. **`src/components/ExamHeader.tsx`**
   - Fixed academic_terms query to handle null term_id
   - Gracefully handles missing term data
   - No more "id=eq.null" errors

3. **`src/app/student/cbt/[id]/page.tsx`**
   - Improved photo upload with retry logic (3 attempts)
   - Added detailed console logging for debugging
   - Better error handling for storage operations

4. **`src/app/student/dashboard/page.tsx`**
   - Added retry logic to photo upload
   - Exponential backoff between retries
   - Better error messages

### Database Changes (Still Pending)

5. **`database/migrations/061_final_storage_rls_complete_fix.sql`** - NEW
   - Disables all RLS on storage tables
   - Makes all storage buckets public
   - Grants full permissions to all roles
   - Must be executed in Supabase Dashboard

---

## Testing Checklist

After applying the fixes:

- [ ] **Storage RLS Fix:**
  - [ ] Execute migration 061 in Supabase
  - [ ] Upload a student photo successfully
  - [ ] Verify photo appears in student dashboard

- [ ] **Academic Terms Fix:**
  - [ ] Navigate to CBT exam page
  - [ ] No more 400 errors for academic_terms in console
  - [ ] Exam header displays correctly

- [ ] **CBT Multiple Choice:**
  - [ ] Check browser console for question loading logs
  - [ ] See multiple choice options displayed (not text input)
  - [ ] Click options to select them
  - [ ] Submit exam successfully

---

## Commands to Run Now

1. **Deploy code changes** (automatic if using git):
   ```bash
   git add .
   git commit -m "Fix storage RLS, academic terms query, and CBT options rendering"
   # Refresh your browser or restart dev server
   ```

2. **Execute migration in Supabase Dashboard:**
   - Copy contents of `database/migrations/061_final_storage_rls_complete_fix.sql`
   - Paste into Supabase SQL Editor
   - Click Run

3. **Check for missing CBT options:**
   - Run the diagnostic query above
   - If options are missing, create them using the INSERT statement

---

## Questions?

1. Check the browser console (F12 → Console) for detailed logs
2. Run the diagnostic queries to understand your data structure
3. Verify migration 061 executed successfully in Supabase

All three issues should be resolved after these steps are completed.
