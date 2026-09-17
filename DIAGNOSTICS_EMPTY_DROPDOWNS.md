# DIAGNOSTICS - Empty Dropdowns Issue

## Problem
Result pages show empty dropdowns even after auto-data creation API deployment.

## Root Cause Investigation

### What We Know
1. ✅ Vercel deployment successful
2. ✅ Result pages load
3. ✅ No JavaScript errors in browser
4. ❌ Dropdowns remain empty
5. ❌ "Select Session" and "Select Term" show no options
6. ❌ Classes show (0)

### Hypothesis Testing

#### Hypothesis 1: academic_sessions table is empty
**Symptom:** No sessions returned by API
**Evidence:** Dropdowns show "-- Select Session --" with no options

#### Hypothesis 2: ensure-school-data API never executes
**Symptom:** Classes not created
**Evidence:** "No classes found" message

#### Hypothesis 3: API queries are being blocked by RLS
**Symptom:** Queries fail silently
**Evidence:** Graceful error handling hides failures

#### Hypothesis 4: school_id mismatch
**Symptom:** Data exists but for different school
**Evidence:** API filters by school_id that may not match current user

### How to Diagnose

#### Step 1: Check Vercel Logs
1. Go to https://vercel.com/dashboard
2. Find SMS project
3. Click on "Functions" or "Logs"
4. Look for `[API-Sessions]` log entries
5. Check if API is even being called
6. Look for specific error messages

#### Step 2: Open Browser Console
1. Go to result page (Principal/Admin/Headteacher)
2. Press F12 to open DevTools
3. Go to Console tab
4. Look for logs starting with `[Principal]`, `[SchoolAdmin]`, `[HeadTeacher]`
5. Take note of:
   - School loaded: XXX
   - API error messages
   - Session/term count

#### Step 3: Check Network Tab
1. In DevTools, go to Network tab
2. Reload the page
3. Look for `/api/results/school-sessions-and-terms` request
4. Click on it
5. Check:
   - Status code (should be 200)
   - Response body (should show sessions and terms)
   - Debug information

#### Step 4: Manual Database Check
If you have Supabase access:

```sql
-- Check if academic_sessions exist
SELECT COUNT(*) as session_count FROM academic_sessions;
SELECT * FROM academic_sessions LIMIT 5;

-- Check if academic_terms exist
SELECT COUNT(*) as term_count FROM academic_terms;
SELECT * FROM academic_terms LIMIT 5;

-- Check what schools exist
SELECT id, name FROM schools LIMIT 5;

-- Check if there are any classes
SELECT COUNT(*) as class_count FROM class_arm_combos;
```

### Common Issues & Solutions

#### Issue 1: API Returns 500 Error
**Log Evidence:** `[API-Sessions] Exception: ...`
**Solution:** Check error message in Network tab → Response

#### Issue 2: API Returns Empty Arrays
**Log Evidence:** `[API-Sessions] Found from academic_sessions: 0`
**Solution:** 
- Check if sessions exist in database
- Check if school_id parameter is correct
- Check if school_id matches logged-in user's school

#### Issue 3: ensure-school-data Never Ran
**Log Evidence:** No logs starting with `[EnsureData]`
**Solution:**
- Check if fetch call succeeds
- Check browser console for errors
- Check Vercel function logs

#### Issue 4: RLS Policy Blocking Access
**Log Evidence:** Supabase error messages about permissions
**Solution:**
- Check if RLS policies exist on academic_sessions table
- Verify policies allow SELECT for authenticated users
- Consider running: `ALTER TABLE academic_sessions DISABLE ROW LEVEL SECURITY;`

### What to Look For in Logs

```
// GOOD - Sessions API is being called
[Principal] Loading sessions and terms...
[API-Sessions] Fetching sessions and terms for school: XXXX-XXXX-XXXX
[API-Sessions] Found from academic_sessions: 3
[API-Sessions] Fetching terms for sessions: [...]
[API-Sessions] Found terms: 9
[Principal] Sessions and terms loaded: {...}

// BAD - Sessions API not called or failed
[Principal] Loading sessions and terms...
[API-Sessions] Exception: TypeError: Cannot read property 'select' of undefined
OR
No API logs at all
```

### Specific Checks

**Check 1: Is school_id being passed?**
```
Look for: [API-Sessions] Fetching sessions and terms for school: 
Expected: UUID format
If shows: null/undefined → Authentication issue
```

**Check 2: Is academic_sessions table found?**
```
Look for: [API-Sessions] Found from academic_sessions:
Expected: > 0
If shows: 0 → No sessions created
```

**Check 3: Are terms being fetched?**
```
Look for: [API-Sessions] Found terms:
Expected: 3 (First, Second, Third)
If shows: 0 → No terms linked to sessions
```

## Next Steps Based on Findings

### If sessions = 0:
1. Check if ensure-school-data ran
2. If yes, check Vercel logs for ensure-school-data errors
3. If not, check why fetch failed
4. May need to manually create sessions via SQL

### If terms = 0:
1. Sessions exist but terms weren't created
2. Check Vercel logs for term creation errors
3. May need to manually create terms via SQL

### If classes = 0:
1. Sessions/terms exist but classes weren't created
2. Check Vercel logs for class creation errors
3. May need to manually create classes via SQL

### If API returns 500:
1. Check specific error message
2. May be RLS policy issue
3. May be connection issue
4. May be schema mismatch

## Temporary Workaround

If database shows sessions/terms but dropdowns are empty:

1. Hard refresh: Ctrl+Shift+R
2. Clear browser cache: Ctrl+Shift+Delete
3. Check if new data appears
4. If not, check if there's frontend JavaScript error

## Questions to Answer

Before debugging further, answer these:

1. When you loaded the page, did you see a loading spinner briefly?
   - **Yes** → Page is trying to load data
   - **No** → Page didn't even try

2. Do you see any error messages in the browser console?
   - **Yes** → Copy the error message
   - **No** → No JavaScript errors

3. In the Network tab, do you see a request to `/api/results/school-sessions-and-terms`?
   - **Yes** → Check its response status
   - **No** → API not being called (frontend issue)

4. Can you access Supabase dashboard?
   - **Yes** → Check database directly
   - **No** → Can't verify data exists

## Success Criteria

Once fixed, you should see:

✅ Dropdowns show options
✅ "2025/2026" in session dropdown
✅ "First Term", "Second Term", "Third Term" in term dropdown
✅ Classes show with student counts
✅ Clicking class shows students
✅ Students show with scores and grades

---

**Status:** Investigation mode
**Action Required:** Collect diagnostic information from your system
**Expected Resolution:** Once we identify where data flow breaks, we'll fix it
