# 🎯 POPULATE YOUR SCHOOL WITH CLASSES & SUBJECTS

## THE SITUATION

Your school already has some classes/subjects from previous migrations, but the registration dropdowns are still empty. This guide will help you populate missing data.

## THE SOLUTION

### Method 1: Use the API Endpoint (RECOMMENDED - 1 minute)

This endpoint intelligently checks what exists and only adds missing data.

```bash
curl -X POST http://localhost:3000/api/setup/init-school-data \
  -H "Content-Type: application/json" \
  -d '{"schoolId": "YOUR_SCHOOL_UUID_HERE"}'
```

**What Happens:**
- ✅ Checks if school exists
- ✅ Checks if classes already exist
- ✅ Creates missing classes (12 total)
- ✅ Creates missing arms (36 total)
- ✅ Creates missing class-arm combos
- ✅ Creates missing streams (skips if already exist)
- ✅ Creates missing subjects (skips duplicates)
- ✅ Returns success with statistics

**Response Example:**
```json
{
  "status": "success",
  "message": "School data initialized for Faith Academy",
  "data": {
    "schoolId": "607a0df5-d402-4ffd-afcf-79f65f444024",
    "stats": {
      "classCount": 12,
      "armCount": 36,
      "comboCount": 36,
      "streamCount": 4,
      "subjectCount": 27,
      "totalSubjectsNeeded": 27
    }
  }
}
```

---

## HOW TO GET YOUR SCHOOL UUID

### From Supabase Dashboard (Fastest)
1. Go to https://app.supabase.io
2. Select your project
3. Click SQL Editor
4. Run this query:
```sql
SELECT id, name FROM schools ORDER BY created_at DESC LIMIT 5;
```
5. Copy the UUID from first row

### From Your Browser Console
1. Log in as school admin
2. Open DevTools (F12)
3. Go to Network tab
4. Look for request to `/api/schools/`
5. UUID is in the request path

---

## WHAT GETS CREATED

When you run the endpoint, your school gets:

### Classes (12 total)
```
Primary Section:
  Primary 1, Primary 2, Primary 3
  Primary 4, Primary 5, Primary 6

Secondary Section:
  JSS 1, JSS 2, JSS 3
  SSS 1, SSS 2, SSS 3
```

### Arms per Class (3 each)
```
Each class has:
  Arm A (40 students)
  Arm B (40 students)
  Arm C (40 students)

Total: 12 classes × 3 arms = 36 arms
```

### Class-Arm Combinations (36 total)
```
All 36 combinations ready for teacher assignment
e.g., Primary 1-Arm A, Primary 1-Arm B, JSS 2-Arm C, etc.
```

### Streams (4 total)
```
For SS1/SS2/SS3 students to select:
  Science
  Commercial
  Humanities
  Technical
```

### Subjects (27 total)

**Primary Subjects (Levels 1-6):**
- English Language, Mathematics, Science
- Social Studies, Civic Education, Physical Education
- Art & Craft, Music, Home Economics, IT

**Secondary Subjects (Levels 7-12):**
- English, Mathematics, Biology, Chemistry, Physics
- History, Geography, Civic Education, Physical Education
- Agricultural Science, Technical Drawing, Computer Science

**SSS Only (Levels 10-12):**
- Economics, Accounting, Government
- Literature In English, Further Mathematics

---

## STEP-BY-STEP PROCESS

### Step 1: Get Your School UUID (1 minute)

**Option A: From Supabase**
```
Go to: app.supabase.io → SQL Editor
Run: SELECT id, name FROM schools ORDER BY created_at DESC LIMIT 5;
Copy: UUID from your school
```

**Option B: From Browser**
```
Log in → Open DevTools (F12) → Network tab
Look for /api/schools/ request
Copy UUID from URL
```

### Step 2: Run the API Endpoint (1 minute)

```bash
curl -X POST http://localhost:3000/api/setup/init-school-data \
  -H "Content-Type: application/json" \
  -d '{"schoolId": "YOUR_UUID"}'
```

**Expected Response:**
```
✅ Status: success
✅ Classes: 12
✅ Arms: 36
✅ Combinations: 36
✅ Streams: 4
✅ Subjects: 27
```

### Step 3: Verify Data in Registration Modal (2 minutes)

1. Hard refresh browser: `Ctrl+Shift+Delete` → `Ctrl+F5`
2. Log in as school admin
3. Click "+ Register Teacher"
4. Go to Step 4
5. **CHECK:**
   - ✅ Class dropdown shows options
   - ✅ Subjects list shows subjects

---

## HANDLING DUPLICATE ERRORS

### What If API Says "Already Exists"?
```json
{
  "status": "already_exists",
  "message": "School already has classes",
  "classCount": 12
}
```

**This is OK!** It means the data was already created.

- Registration will still work
- You can proceed to test

### What If You See "Duplicate Key" Error?
```
ERROR: duplicate key value violates unique constraint
```

**This means:**
- School has some subjects already
- API is designed to skip duplicates
- Rest of data will be created

**Solution:**
- Run the API command again (it will skip existing data)
- Or just proceed to test (registration will work)

---

## TROUBLESHOOTING

### "School not found" Error
- **Problem:** UUID is wrong or doesn't exist
- **Solution:** Double-check UUID from Supabase dashboard

### Empty Dropdowns Still After Running API
- **Problem:** Browser cache not cleared
- **Solution:** `Ctrl+Shift+Delete` → `Ctrl+F5`

### API Endpoint Returns 404
- **Problem:** Dev server crashed or restarted
- **Solution:** Check terminal shows `✓ Ready in X.Xs`

### Subjects List Still Empty
- **Problem:** Subjects didn't insert (schema issue)
- **Solution:** 
  1. Check Supabase SQL: `SELECT COUNT(*) FROM subjects WHERE school_id = 'YOUR_UUID';`
  2. If count is 0: Try API endpoint again
  3. If still 0: Check schema/migrations

---

## VERIFYING DATA WAS CREATED

### In Supabase SQL Editor

Check classes:
```sql
SELECT COUNT(*) as class_count FROM classes WHERE school_id = 'YOUR_UUID';
```
Expected: 12

Check subjects:
```sql
SELECT COUNT(*) as subject_count FROM subjects WHERE school_id = 'YOUR_UUID';
```
Expected: 27

Check arms:
```sql
SELECT COUNT(*) as arm_count FROM arms WHERE school_id = 'YOUR_UUID';
```
Expected: 36

Check streams:
```sql
SELECT COUNT(*) as stream_count FROM streams WHERE school_id = 'YOUR_UUID';
```
Expected: 4

### In Your Browser

Check via API:
```bash
curl "http://localhost:3000/api/debug/registration-data?schoolId=YOUR_UUID"
```

Should show:
```json
{
  "classCount": 12,
  "armCount": 36,
  "comboCount": 36,
  "streamCount": 4,
  "subjectCount": 27
}
```

---

## TESTING THE REGISTRATION

### Teacher Registration
1. Click "+ Register Teacher"
2. Step 4 should show:
   - **Class dropdown** with options like "Primary 1 - Arm A"
   - **Subjects list** with options like "English", "Mathematics", etc.
3. Select a class and 1+ subjects
4. Click "Complete Registration"
5. Check Supabase: Should appear in `users` table with role='TEACHER'

### Student Registration
1. Click "+ Register Student"
2. Step 3 should show:
   - **Section selector** (Primary/Secondary)
   - **Class dropdown** with options
   - **Stream selector** (for SS1-SS3 only)
3. Step 4 should show:
   - **Subjects list** with options
4. Select section/class/subjects
5. Click "Complete Registration"
6. Check Supabase: Should appear in `students` table

---

## FOR MULTIPLE SCHOOLS

To populate data for all schools:

```bash
# Get list of school UUIDs
curl http://localhost:3000/api/schools | jq '.[] | .id'

# Run for each UUID
for uuid in $(curl http://localhost:3000/api/schools | jq -r '.[] | .id'); do
  echo "Populating: $uuid"
  curl -X POST http://localhost:3000/api/setup/init-school-data \
    -H "Content-Type: application/json" \
    -d "{\"schoolId\": \"$uuid\"}"
  echo ""
done
```

---

## AUTOMATION

To make this automatic for every new school:

Edit: `src/app/api/superadmin/register-school/route.ts`

After school creation, add:
```typescript
// Auto-populate school with default data
try {
  const response = await fetch('http://localhost:3000/api/setup/init-school-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ schoolId: newSchool.id }),
  })
  const result = await response.json()
  console.log('School data initialized:', result)
} catch (err) {
  console.warn('Auto-population warning (non-critical):', err)
  // Don't fail registration if auto-population fails
}
```

Then every new school automatically has classes and subjects! ✅

---

## QUICK CHECKLIST

- [ ] Got school UUID
- [ ] Dev server running (`✓ Ready in X.Xs`)
- [ ] Ran API endpoint successfully
- [ ] Got "success" response
- [ ] Hard refreshed browser
- [ ] Logged in as school admin
- [ ] Opened teacher registration
- [ ] Step 4 shows class dropdown with options
- [ ] Step 4 shows subjects list with options
- [ ] Able to complete registration

**If all checked: ✅ SYSTEM IS WORKING!**

---

## NEXT STEPS

1. ✅ Get your school UUID
2. ✅ Run the API endpoint
3. ✅ Hard refresh browser
4. ✅ Test registration
5. ✅ Register test teacher/student
6. ✅ Verify data in Supabase

**Total time: ~10 minutes**

---

**System is ready! 🚀**



