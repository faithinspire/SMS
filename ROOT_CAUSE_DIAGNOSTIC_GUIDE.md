# ROOT CAUSE DIAGNOSIS - REGISTRATION DATA FLOW

## CRITICAL: DO NOT REBUILD THE UI AGAIN

The UI exists and is correct. The problem is that **classes and subjects data is not reaching the form from Supabase**.

---

## STEP 1: OPEN BROWSER DEVELOPER TOOLS

1. Open http://localhost:3000/school-admin/dashboard
2. Press **F12** to open Developer Tools
3. Go to **Console** tab
4. Look for any messages starting with `[REGISTRATION DEBUG]`

---

## STEP 2: TRIGGER THE REGISTRATION MODAL

1. Click **"+ Register Teacher"** button
2. In the modal, click **"Continue +"** to go to Step 2
3. Click **"Continue"** again to go to Step 3
4. Click **"Continue"** again to go to **Step 4: Teaching Assignment**
5. **This is where dropdowns are empty**

---

## STEP 3: CHECK CONSOLE LOGS

Look in the browser console (F12) for these diagnostic messages in order:

```
🔍 [REGISTRATION DEBUG] TeacherRegistrationModal.loadData() called
🔍 [REGISTRATION DEBUG] schoolId: [UUID]
🔍 [REGISTRATION DEBUG] schoolId type: string
🔍 [REGISTRATION DEBUG] schoolId is empty? false
📡 [REGISTRATION DEBUG] Fetching class_arm_combos for schoolId: [UUID]
📡 [REGISTRATION DEBUG] class_arm_combos response: {count: 0, error: null}
📡 [REGISTRATION DEBUG] Fetching subjects for schoolId: [UUID]
📡 [REGISTRATION DEBUG] subjects response: {count: 0, error: null}
```

---

## STEP 4: INTERPRET THE RESULTS

### Scenario A: schoolId is undefined or empty
```
🔍 [REGISTRATION DEBUG] schoolId: 
🔍 [REGISTRATION DEBUG] schoolId is empty? true
```
**Root Cause:** The dashboard is NOT passing the schoolId correctly
**Fix Location:** `src/app/school-admin/dashboard/page.tsx` line 376
**Next Action:** Jump to FIX A

### Scenario B: schoolId exists BUT count is 0
```
📡 [REGISTRATION DEBUG] class_arm_combos response: {count: 0, error: null}
📡 [REGISTRATION DEBUG] subjects response: {count: 0, error: null}
```
**Root Cause:** Database has no records for this schoolId
**Fix Location:** Supabase database - need to insert test data
**Next Action:** Jump to FIX B

### Scenario C: schoolId exists, API error
```
📡 [REGISTRATION DEBUG] class_arm_combos response: {count: null, error: "<error message>"}
```
**Root Cause:** Supabase query is failing
**Possible Errors:**
- `42P01`: Table does not exist
- `PGRST116`: This endpoint does not allow this method
- Other PostgreSQL errors

**Next Action:** Jump to FIX C

---

## FIX A: schoolId is undefined

**File:** `src/app/school-admin/dashboard/page.tsx`

**Line 376 currently shows:**
```typescript
schoolId={user?.schoolId || ''}
```

**Problem:** `user?.schoolId` is undefined

**Diagnostic Check:**
In the dashboard component, before rendering the modal, add this log:
```typescript
console.log('📋 [DASHBOARD] user object:', user)
console.log('📋 [DASHBOARD] user.schoolId:', user?.schoolId)
console.log('📋 [DASHBOARD] user.school_id:', user?.school_id)
```

**Root Cause Options:**
1. `user` is null → user is not logged in
2. `user.schoolId` doesn't exist → the User object uses `school_id` not `schoolId`
3. `user.school_id` is undefined → school_id value was not populated

**Solution:**
Change line 376 to use the correct field:
```typescript
schoolId={user?.school_id || user?.schoolId || ''}
```

Or check what AuthService.getCurrentUser() is actually returning.

---

## FIX B: Supabase has NO data for this school

**Diagnostic Query:**
Test manually by going to: `/api/debug/registration-data?schoolId=[THE_UUID_FROM_CONSOLE]`

Example: http://localhost:3000/api/debug/registration-data?schoolId=10459a61-7e93-494c-b951-6cef5d589a88

**Response will show:**
```json
{
  "schoolId": "10459a61-7e93-494c-b951-6cef5d589a88",
  "classes": {
    "count": 0,
    "error": null,
    "sample": []
  },
  "arms": {
    "count": 0,
    "error": null,
    "sample": []
  },
  "classArmCombos": {
    "count": 0,
    "error": null,
    "sample": []
  },
  "subjects": {
    "count": 0,
    "error": null,
    "sample": []
  }
}
```

**Root Cause:** The school has not been configured with any classes or subjects

**Solution:** Insert test data for this specific schoolId

**Steps:**
1. Note the `schoolId` from the API response
2. Go to: `/debug/insert-data` page
3. Click "Insert Test Data Now"
4. System will insert classes, arms, and subjects for that school
5. Refresh the registration modal
6. Dropdowns should now populate

---

## FIX C: Supabase query is failing

**Diagnostic Check:**
Look at the error message in console:

```
❌ [REGISTRATION DEBUG] combos error: {message: "..."}
```

**Common errors:**

### Error: "relation \"class_arm_combos\" does not exist"
**Cause:** Table doesn't exist
**Fix:** Run migrations to create the tables
```bash
# Check if migrations are up to date
# In Supabase dashboard, go to Migrations
```

### Error: "column \"school_id\" does not exist"
**Cause:** The table doesn't have a `school_id` column
**Fix:** Check the schema and update the query to use the correct column name

### Error: RLS policy error
**Cause:** Even though RLS is disabled, check that it's actually disabled
**Fix:** Run: `ALTER TABLE class_arm_combos DISABLE ROW LEVEL SECURITY;`

---

## VERIFICATION: Test the Debug API

Before trying the registration form, verify your schoolId has data:

1. **Get your schoolId from the console:**
   - Open registration modal
   - Check console for: `🔍 [REGISTRATION DEBUG] schoolId: [copy this UUID]`

2. **Query the debug API:**
   - Go to: `http://localhost:3000/api/debug/registration-data?schoolId=[PASTE_UUID]`

3. **Interpret the response:**
   - If `classes.count: > 0` → classes exist in database ✅
   - If `subjects.count: > 0` → subjects exist in database ✅
   - If both are 0 → need to insert test data

---

## DATABASE VERIFICATION (Direct)

If the API approach doesn't work, verify directly in Supabase:

1. Go to https://supabase.com/dashboard
2. Select your project: `egdreueuspmuxhezdpqm`
3. Go to **SQL Editor**
4. Run:
```sql
SELECT COUNT(*) FROM class_arm_combos WHERE school_id = '10459a61-7e93-494c-b951-6cef5d589a88'::UUID;
SELECT COUNT(*) FROM subjects WHERE school_id = '10459a61-7e93-494c-b951-6cef5d589a88'::UUID;
SELECT COUNT(*) FROM classes WHERE school_id = '10459a61-7e93-494c-b951-6cef5d589a88'::UUID;
```

**Expected:**
- Each query should return: `count > 0`

**If count = 0:**
- This school has not been set up with classes and subjects
- Use the test data insertion process

---

## FINAL CHECKLIST

- [ ] Opened browser console (F12)
- [ ] Triggered registration modal
- [ ] Found `[REGISTRATION DEBUG]` logs
- [ ] Identified which scenario (A, B, or C)
- [ ] Applied the corresponding fix
- [ ] Refreshed the registration modal
- [ ] Verified that Class dropdown now has options
- [ ] Verified that Subjects list is not empty
- [ ] Completed a test registration
- [ ] Confirmed data was saved to database

---

**Status:** Ready for user to execute diagnostic steps and report findings
