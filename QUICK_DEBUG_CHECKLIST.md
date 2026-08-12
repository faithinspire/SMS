# Quick Debug Checklist - StudentRegistrationModal Issues

Use this when the StudentRegistrationModal doesn't load classes/subjects data.

---

## Pre-Flight Check (Do This First)

- [ ] Dev server is running (`npm run dev`)
- [ ] You're logged in to school admin dashboard
- [ ] Browser has no JavaScript errors (console clean before opening modal)
- [ ] `.env.local` has Supabase credentials
- [ ] Hard refresh browser: `Ctrl+Shift+R`

---

## IMMEDIATE: Open Modal and Check Console

**Action:** Click "Register Student" button

**Check Console tab for:**
```
📚 Loading classes and subjects for school: [uuid]
```

**Result:**
- [ ] **YES** → Skip to "Network Tab Check" below
- [ ] **NO** → Check for error messages → See "Error Messages" section
- [ ] **NO MESSAGE AT ALL** → See "Modal Not Firing" section

---

## Network Tab Check

**Action:** Open Network tab, click "Register Student" again

**Look for requests to:**
- `class_arm_combos` ← Should return 200
- `subjects` ← Should return 200

**For each request:**
- [ ] Status is **200** (green)
- [ ] Response shows array `[...]` or `[]`
- [ ] Response is not an error object

**If Status is 403:**
```
→ RLS Policy Issue (See "RLS Policy" section)
```

**If Status is 404:**
```
→ Table doesn't exist (See "Database" section)
```

**If Status is 500:**
```
→ Supabase server error (Wait and retry)
```

---

## Console Messages Expected

After clicking modal, you should see:

```
📚 Loading classes and subjects for school: [schoolId]
✅ Loaded classes: 3
✅ Loaded subjects: 12
```

**If you see instead:**
```
❌ Error loading classes: ...
→ See "Error Messages" section

❌ Error loading subjects: ...
→ See "Error Messages" section

❌ Error loading data: ...
→ See "Error Messages" section
```

---

## Error Messages Guide

### Error: "Failed to load classes: permission denied"
```
❌ Error loading classes: PGRST116 permission denied...
```

**Quick Fix:**
1. Supabase Dashboard
2. Authentication → Policies
3. `class_arm_combos` table
4. Check SELECT policy
5. Policy should check user's school_id matches

**Check this query in Supabase SQL:**
```sql
SELECT * FROM class_arm_combos LIMIT 1;
```
- If it works here but fails in app → RLS policy not configured for authenticated users

### Error: "Table does not exist"
```
❌ Error loading classes: 42P01 relation "class_arm_combos" does not exist
```

**Quick Fix:**
1. Run migrations: `npm run db:migrate`
2. Check Supabase Tables section
3. Verify these tables exist:
   - [ ] `class_arm_combos`
   - [ ] `classes`
   - [ ] `arms`
   - [ ] `subjects`

### Error: "401 Unauthorized"
```
❌ Error loading classes: 401 Unauthorized
```

**Quick Fix:**
1. Check if you're logged in (dashboard shows username)
2. Check DevTools → Application → Cookies
3. Look for supabase session token
4. If missing → Login again

### Error: "CORS"
```
❌ Error loading classes: Failed to fetch (CORS error)
```

**Quick Fix:**
1. Check `.env.local` file
2. Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
3. Format should be: `https://[project].supabase.co`
4. Restart dev server: `Ctrl+C` then `npm run dev`

---

## Modal Not Firing loadData()

**Symptoms:**
- Modal opens visually
- No console messages
- No network requests

**Check These:**

1. **Is schoolId being passed?**
   - Dashboard should have: `<StudentRegistrationModal schoolId={user?.schoolId || ''} ...`
   - Check if `user.schoolId` is set
   - Console: `const {schoolId} = JSON.parse(sessionStorage.getItem('user') || '{}'); console.log(schoolId);`
   - [ ] schoolId is a valid UUID
   - [ ] schoolId is empty string `""` → Problem found!

2. **Is useEffect hook firing?**
   - Open DevTools Sources tab
   - Set breakpoint in StudentRegistrationModal.tsx at line ~54 (useEffect)
   - Open modal again
   - Should pause at breakpoint

   - [ ] Breakpoint fires → useEffect running
   - [ ] No breakpoint → useEffect not running → Problem found!

3. **Is isOpen prop true?**
   - Check dashboard component state
   - `[showStudentModal, setShowStudentModal] = useState(false)`
   - After button click, should be true

---

## Data is Loading (200 responses) but Modal is Empty

**Symptoms:**
- Console shows "✅ Loaded classes: X"
- Network tab shows 200 responses
- But dropdown is empty or subjects don't appear

**Check These:**

1. **Are there actually classes/subjects?**
   - If "Loaded classes: 0" → No data in database
   - This is expected for new school
   - Manually create test data:

   ```sql
   -- In Supabase SQL Editor:
   INSERT INTO classes (name, level, type, school_id) 
   VALUES ('JSS 1', 1, 'SECONDARY', 'PASTE_YOUR_SCHOOL_ID');
   
   INSERT INTO subjects (name, code, school_id, applicable_to_levels)
   VALUES ('Math', 'MTH', 'PASTE_YOUR_SCHOOL_ID', '[1,2,3,4,5,6]');
   ```

2. **Is response data malformed?**
   - Network tab → class_arm_combos request → Response tab
   - Check if it's valid JSON array `[...]`
   - [ ] Looks like valid JSON
   - [ ] Error message or garbage → Report to developer

3. **Is React state updating?**
   - Add to browser console:
   ```javascript
   // Open DevTools Console
   // Try to manually call the function
   // (Advanced: requires access to component state)
   ```

---

## RLS Policy Issue Details

**File:** Database migrations

**If getting "permission denied" errors:**

1. **Current Policy Might Be:**
```sql
CREATE POLICY "only_own_school"
ON class_arm_combos
FOR SELECT
USING (school_id = auth.uid());  -- ❌ WRONG
```

2. **Should Be:**
```sql
CREATE POLICY "school_read_access"
ON class_arm_combos
FOR SELECT
USING (school_id = (
  SELECT school_id FROM users WHERE id = auth.uid()
));  -- ✓ CORRECT
```

**Or if RLS is disabled:**
```sql
ALTER TABLE class_arm_combos DISABLE ROW LEVEL SECURITY;
```

**Action Items:**
- [ ] Check migrations: `database/migrations/`
- [ ] Look for RLS setup
- [ ] Check Supabase Dashboard → Tables → RLS section
- [ ] Verify policy logic

---

## Database Check Commands

**Run these in Supabase SQL Editor:**

```sql
-- Check if classes exist for your school
SELECT * FROM class_arm_combos 
WHERE school_id = 'YOUR_SCHOOL_ID' 
LIMIT 5;

-- Check if subjects exist
SELECT * FROM subjects 
WHERE school_id = 'YOUR_SCHOOL_ID' 
LIMIT 5;

-- Check how many of each exist
SELECT 
  (SELECT COUNT(*) FROM class_arm_combos WHERE school_id = 'YOUR_SCHOOL_ID') as classes,
  (SELECT COUNT(*) FROM subjects WHERE school_id = 'YOUR_SCHOOL_ID') as subjects;

-- Check table structure
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'class_arm_combos';

-- Check RLS is disabled or policy allows reads
SELECT tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('class_arm_combos', 'subjects');
```

---

## File Locations Reference

When looking for related code:

| Issue | File |
|-------|------|
| Modal logic | `src/components/admin/StudentRegistrationModal.tsx` |
| Dashboard page | `src/app/school-admin/dashboard/page.tsx` |
| Supabase config | `src/lib/supabase-client.ts` |
| Database schema | `database/migrations/*.sql` |
| User service | `src/services/user-registration.service.ts` |

---

## Step-by-Step Minimal Test

1. **Open DevTools Console**
2. **Go to school admin dashboard**
3. **Click "Register Student"**
4. Check Console shows:
   ```
   📚 Loading classes and subjects for school: [UUID]
   ✅ Loaded classes: [NUMBER ≥ 0]
   ✅ Loaded subjects: [NUMBER ≥ 0]
   ```
5. Check Network tab shows 2 requests (classes, subjects)
6. Check both return Status 200
7. Check modal dropdown has values
8. **If all YES → Working correctly ✓**

---

## Nothing Here Helped?

1. **Enable debug logging:**
   - Edit `StudentRegistrationModal.tsx`
   - Add `console.log()` at each step
   - Check line by line

2. **Check React DevTools:**
   - Install React DevTools extension
   - Inspect modal component props
   - Check if `schoolId` and `isOpen` are correct

3. **Check Network Authentication:**
   - Network tab → class_arm_combos request
   - Check Headers → Authorization
   - Should have Bearer token

4. **Check .env.local:**
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

---

## Report Template

If you need to report a bug, provide:

```
1. Console message (screenshot or exact text)
2. Network tab status codes (screenshot)
3. Network tab response (JSON)
4. Steps to reproduce
5. Expected vs actual behavior
```

---
