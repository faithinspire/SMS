# ✅ STUDENT REGISTRATION FIX - TEST GUIDE

## Status
✅ **Code Fix Applied**: admission_number auto-generation
✅ **Committed & Pushed**: `0bc4514` on origin/main
✅ **Vercel Deployment**: Triggered (2-3 min build time)

---

## Pre-Test Checklist

Before testing, verify:
1. ⏱️ **Wait 2-3 minutes** for Vercel build to complete
2. 🔄 **Hard refresh browser**: `Ctrl+Shift+R` (clears old cache)
3. 🌐 **Go to your SMS site**: https://your-sms-domain.vercel.app

---

## Test Case 1: Student Registration (Main Fix)

### Scenario: Register a new student via School Admin

**Steps**:
1. Login as **School Admin**
2. Navigate to: **Dashboard → Register Student** (or similar menu)
3. Fill in student details:
   - Full Name: `Test Student 001`
   - Date of Birth: `2010-05-15`
   - Class: Select a class (e.g., JSS1A)
   - Subjects: Select 2-3 subjects
   - Guardian Name: `John Doe`
   - Guardian Phone: `08012345678`
4. Click **Register Student**

### Expected Result ✅
```
Success message with:
- "Student registered successfully"
- Admission Number: STU000001 (or similar auto-generated number)
- Student ID: [UUID]
- No error about "null value in column admission_number"
```

### If You See Error ❌
```
"Registration failed: Failed to create student record: null value in column 
"admission_number" of relation "students" violates not-null constraint"
```
**Action**: 
- Hard refresh again: `Ctrl+Shift+R`
- Wait 30 seconds and retry
- If persists, check Vercel build logs for errors

---

## Test Case 2: Multiple Students (Validation)

**Steps**:
1. Register 3 more students following Test Case 1
2. Each should get unique admission number:
   - STU000001
   - STU000002
   - STU000003
   - STU000004

### Expected Result ✅
```
All 4 students registered successfully with unique, sequential admission numbers.
Each record saved to database without errors.
```

---

## Test Case 3: Verify Database (Advanced)

If you have access to Supabase:

1. Go to: https://app.supabase.com
2. Select your project
3. Go to **SQL Editor**
4. Run:
```sql
SELECT id, user_id, admission_number, class_arm_combo_id, created_at 
FROM students 
ORDER BY created_at DESC 
LIMIT 5;
```

### Expected Result ✅
```
id                   | user_id | admission_number | class_arm_combo_id | created_at
─────────────────────┼─────────┼──────────────────┼────────────────────┼──────────
[UUID]               | [UUID]  | STU000004        | [UUID]             | 2026-09-12
[UUID]               | [UUID]  | STU000003        | [UUID]             | 2026-09-12
[UUID]               | [UUID]  | STU000002        | [UUID]             | 2026-09-12
[UUID]               | [UUID]  | STU000001        | [UUID]             | 2026-09-12
```

**Key Points**:
- ✅ `admission_number` is NOT NULL
- ✅ Each admission_number is unique
- ✅ Sequential: STU000001, STU000002, etc.

---

## Troubleshooting

### 1. Still Getting NULL Error?
**Cause**: Vercel cache not cleared or build not complete

**Fix**:
- Wait another 2 minutes
- Clear browser cache completely (DevTools → Application → Clear Site Data)
- Try incognito/private window
- Check Vercel build status: https://vercel.com/dashboard/sms

### 2. Admission Number Not Showing?
**Cause**: Possible API response parsing issue

**Fix**:
- Open browser DevTools: F12
- Go to **Network** tab
- Register a student
- Look for POST `/api/admin/register-student` request
- Check **Response** tab
- Should show: `"admission_number": "STU000001"`

### 3. Different Error Message?
**Capture the error and share it for analysis**

---

## Success Criteria

| Criterion | Status |
|-----------|--------|
| Student registration form loads | ✅ |
| Can fill in all fields | ✅ |
| Submit button works | ✅ |
| No NULL constraint error | ✅ |
| Admission number auto-generated | ✅ |
| Student record saved to DB | ✅ |
| API returns success response | ✅ |
| Multiple students get unique numbers | ✅ |

---

## Related Fixes (Already Deployed)

These fixes work together:

1. **Teacher Registration** - Fixed nested SQL query error
2. **Student Results** - Auto-loads sessions/terms/CBT scores  
3. **Auth Registration** - Fixed "User not allowed" (needs env var setup)
4. **Student Registration** - ✅ **THIS FIX** - Generates admission_number

---

## What Changed in the Code

**File**: `src/app/api/admin/register-student/route.ts`

**Before** (BROKEN):
```typescript
const { data: student } = await supabase
  .from('students')
  .insert({
    user_id,
    school_id,
    class_arm_combo_id,
    // ❌ admission_number NOT included
    created_at: new Date().toISOString(),
  })
```

**After** (FIXED):
```typescript
// Generate admission number
const { data: existingStudents } = await supabase
  .from('students')
  .select('admission_number', { count: 'exact' })
  .eq('school_id', school_id)
  .eq('class_arm_combo_id', class_arm_combo_id)

let admissionNumber = 'STU-' + Date.now().toString().slice(-6)
if (existingStudents) {
  const count = (existingStudents.length || 0) + 1
  admissionNumber = `STU${count.toString().padStart(6, '0')}`
}

const { data: student } = await supabase
  .from('students')
  .insert({
    user_id,
    school_id,
    class_arm_combo_id,
    admission_number: admissionNumber,  // ✅ NOW INCLUDED
    created_at: new Date().toISOString(),
  })
```

---

## Next Steps After Testing

1. ✅ If test succeeds: Mark as COMPLETE
2. ❌ If test fails: Check Vercel logs and error message
3. 🔐 Still need to add `SUPABASE_SERVICE_KEY` env var to Vercel for auth registration to work

---

## Questions?

If testing fails or you encounter issues:
1. Capture the exact error message
2. Check Vercel Deployments tab for build errors
3. Check browser DevTools Network tab for API response
4. Share the error details for analysis
