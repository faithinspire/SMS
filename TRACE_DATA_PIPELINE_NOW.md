# 🔍 IMMEDIATE DATA PIPELINE DIAGNOSTIC

## RUN THIS NOW TO FIND THE ROOT CAUSE

The registration dropdowns are empty. Before I rebuild anything, I need to know:

**Is the problem:**
1. Database has NO test data?
2. schoolId is not being passed correctly?
3. Queries are failing?
4. Data is being loaded but not displayed?
5. Wrong component is being rendered?

---

## STEP 1: Get Your School ID

When logged in as school admin:

1. Open browser console (F12)
2. Paste this and press Enter:

```javascript
// Get current school from URL or dashboard
const schoolId = localStorage.getItem('schoolId') || 
  new URLSearchParams(window.location.search).get('schoolId') ||
  prompt('Enter your school UUID (from Supabase)')
console.log('School ID:', schoolId)
```

3. Note the schoolId value

---

## STEP 2: Run the Diagnostic

Use this API endpoint to trace the ENTIRE data pipeline:

```bash
curl "http://localhost:3000/api/debug/registration-trace?schoolId=YOUR_SCHOOL_UUID_HERE"
```

Or in browser console:

```javascript
fetch(`/api/debug/registration-trace?schoolId=${schoolId}`)
  .then(r => r.json())
  .then(data => {
    console.log('DIAGNOSTIC RESULTS:')
    console.table(data.diagnostics)
    console.log('REPORT:')
    console.log(data.report)
    console.log('SUMMARY:')
    console.table(data.summary)
  })
```

---

## STEP 3: Interpret Results

Look at the diagnostic output and find the first stage with status ❌ ERROR or ⚠️ EMPTY.

### If CLASSES is EMPTY
```
CLASSES: EMPTY - ⚠️ No classes found (count: 0)
```
**Solution:** Insert test data using Migration 013
```bash
curl -X POST http://localhost:3000/api/debug/insert-test-data \
  -H "Content-Type: application/json" \
  -d '{"schoolId": "your-school-uuid"}'
```

### If SUBJECTS is EMPTY
```
SUBJECTS: EMPTY - ⚠️ No subjects found (count: 0)
```
**Solution:** Insert test data (same as above)

### If CLASS_ARM_COMBOS is EMPTY
```
CLASS_ARM_COMBOS: EMPTY - ⚠️ No combos found (count: 0)
```
**Solution:** Insert test data

### If All Are OK but Dropdowns Still Empty
```
CLASSES: OK - ✅ Found 12 classes
SUBJECTS: OK - ✅ Found 27 subjects
CLASS_ARM_COMBOS: OK - ✅ Found 36 class-arm combos
```
**Problem:** Data exists but component isn't displaying it
**Solution:** Check if the registration component is actually being rendered

### If Query Failed (ERROR)
```
CLASSES: ERROR - ❌ Query failed: permission denied
```
**Solution:** Check Supabase RLS, authentication, or API permissions

---

## STEP 4: Share Results

Once you run the diagnostic, you'll know:

- ✅ Does school exist?
- ✅ Do classes exist for this school?
- ✅ Do subjects exist for this school?
- ✅ Are class-arm combos created?
- ✅ Is data loading correctly?

This will tell me exactly WHERE to fix.

---

## EXAMPLES OF OUTPUTS

### Healthy School (has data)
```
SCHOOL_CHECK: OK - ✅ School exists: My School
CLASSES: OK - ✅ Found 12 classes
ARMS: OK - ✅ Found 36 arms
CLASS_ARM_COMBOS: OK - ✅ Found 36 class-arm combos
SUBJECTS: OK - ✅ Found 27 subjects
```
→ **Next:** Check if component is rendering these

### Empty School (no test data)
```
SCHOOL_CHECK: OK - ✅ School exists: My School
CLASSES: EMPTY - ⚠️ No classes found (count: 0)
ARMS: EMPTY - ⚠️ No arms found (count: 0)
CLASS_ARM_COMBOS: EMPTY - ⚠️ No combos found (count: 0)
SUBJECTS: EMPTY - ⚠️ No subjects found (count: 0)
```
→ **Next:** Insert test data

### Query Failure
```
SCHOOL_CHECK: OK - ✅ School exists
CLASSES: ERROR - ❌ Query failed: permission denied
```
→ **Problem:** Authentication, RLS, or permissions issue

---

## AFTER YOU SHARE THE DIAGNOSTIC RESULTS

I will:

1. ✅ Analyze the exact point of failure
2. ✅ Determine the root cause
3. ✅ Fix it at the source (database, API, or component)
4. ✅ Rebuild the registration UI completely
5. ✅ Verify the dropdowns display with REAL data
6. ✅ Confirm teacher/student registration works end-to-end

---

**DO NOT MODIFY ANYTHING YET**

Just run the diagnostic and show me the results.

This will tell me exactly what's broken and where.
