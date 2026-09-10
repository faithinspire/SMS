# TEST CHECKLIST - Teacher/Student Registration Rebuild

## ✅ AUTOMATED CHECKS (Already Verified)

- [x] TypeScript compilation passes
- [x] No import/export errors
- [x] Dev server running (`npm run dev`)
- [x] All services properly exported
- [x] Registration config service has Nigerian fallback

---

## 🔍 MANUAL BROWSER TESTS (You Must Do These)

### TEST 1: Teacher Registration Form - Step 4 Classes Display
**Purpose**: Verify classes load (was showing empty before fix)

**Steps**:
1. Open browser to `http://localhost:3000`
2. Login as admin (school-admin)
3. Navigate to admin dashboard
4. Click "Register Teacher" button
5. Step 1: Select "Primary" or "Secondary"
6. Step 2: Fill personal info (name, email, phone)
7. Step 3: Fill bank details (bank, account, salary)
8. **Step 4: Verify class dropdown shows options**

**Expected Result**:
```
✅ Class dropdown shows:
   - Primary 1A
   - Primary 1B
   - Primary 2A
   - Primary 2B
   - ... (many more options)

NOT empty ❌
NOT showing UUIDs like "b9e1884d-6fae-40ca-86a7-54301ea73620" ❌
```

**PASS/FAIL**: ___________

**Console Check**: Open DevTools (F12) → Console tab
```
Should see:
✅ "📡 Loading teaching data for PRIMARY..."
✅ "✅ Loaded XX class-arm combos"
✅ "✅ Loaded XX total subjects"

Should NOT see:
❌ "invalid input syntax for type uuid"
❌ "school_id=eq."
❌ "undefined"
```

---

### TEST 2: Teacher Registration - Subjects After Class Selection
**Purpose**: Verify subjects filter by class level

**Steps**:
1. Continue from Test 1, Step 4
2. **Select any class from dropdown** (e.g., "Primary 1A")
3. Verify subject list appears below

**Expected Result**:
```
✅ Subject checkboxes appear:
   ☐ Mathematics
   ☐ English Language
   ☐ Science
   ☐ Physical Education
   ... (subjects for that level)

NOT empty ❌
NOT showing UUIDs ❌
Can select multiple subjects ✅
```

**PASS/FAIL**: ___________

---

### TEST 3: Student Registration - Admission Number
**Purpose**: Verify admission numbers don't show "undefined"

**Steps**:
1. From admin dashboard, click "Register Student"
2. Fill Step 1: Personal info
3. Step 2: Select class
4. **Look for Admission Number display**

**Expected Result**:
```
✅ Shows valid format:
   "2026-PENDING" (before class selection)
   OR
   "2026-Primary1A-0001" (after class selection)

NOT:
❌ "2026-UNK-undefined"
❌ "undefined"
❌ "null"
❌ Empty
```

**PASS/FAIL**: ___________

**Check In Console**:
```
When class selected, should see NO errors about undefined
```

---

### TEST 4: Complete Teacher Registration
**Purpose**: Verify registration saves successfully

**Steps**:
1. Complete all 4 steps of teacher registration
2. Fill in:
   - Step 1: Primary or Secondary
   - Step 2: Name, Email, Phone
   - Step 3: Bank details, Salary
   - Step 4: Select class and 1-2 subjects
3. Click "Complete Registration" button

**Expected Result**:
```
✅ Success message appears
✅ Modal closes
✅ Dashboard refreshes
✅ New teacher appears in staff list (or list updates)

NOT:
❌ Error about empty school_id
❌ Error about subjects not found
❌ Form stuck on loading
```

**PASS/FAIL**: ___________

---

### TEST 5: Complete Student Registration
**Purpose**: Verify student registration flow works

**Steps**:
1. From admin dashboard, click "Register Student"
2. Fill all steps:
   - Step 1: Name, Email, Password, Date of Birth
   - Step 2: Select class
   - Step 3: Select subjects (multiple)
   - Step 4: Parent info
3. Submit

**Expected Result**:
```
✅ Success message
✅ Valid admission number shown
✅ Modal closes
✅ New student added to list

NOT:
❌ Admission number with "undefined"
❌ Empty class selection
❌ Empty subjects
```

**PASS/FAIL**: ___________

---

### TEST 6: Form Behavior with No School Configuration
**Purpose**: Verify fallback works even if school has empty data

**Note**: This test is automatic - if school had no data, the Nigerian standard would show. You can verify by:

1. Check browser console during Step 4 of teacher registration
2. Look for message: "Using standard Nigerian class configuration (fallback)"
3. Form should still work normally

**Expected Result**:
```
✅ System handles gracefully
✅ Shows Nigerian standard
✅ Form never becomes unusable
✅ No "Loading..." forever
```

**PASS/FAIL**: ___________

---

## 📸 PHOTO UPLOAD TEST (Pending)

**Note**: This test requires Migration 025 to be executed first

### TEST 7: Student Photo Upload
**Purpose**: Verify Storage RLS fixes work

**Prerequisites**:
- [ ] Migration 025 executed in Supabase console
- [ ] Storage RLS disabled

**Steps**:
1. In student registration, upload profile photo
2. Select image file from computer
3. Verify upload completes

**Expected Result**:
```
❌ BEFORE Migration 025:
   Error: "row-level security policy"

✅ AFTER Migration 025:
   Upload succeeds
   Photo displays in preview
   URL saves to database
```

**PASS/FAIL**: ___________

---

## 🐛 CONSOLE ERROR CHECK

Open DevTools Console (F12) and check for any errors while using registration:

### ❌ Errors That MUST NOT Appear
- `invalid input syntax for type uuid`
- `school_id=eq.`
- `school_id is required`
- `Failed to load classes`
- `Failed to load subjects`
- `Loading subjects...` (stuck)
- `undefined` in any displayed data
- `[object Object]` in UI

### ✅ Warnings That Are OK
- `⚠️ Empty school ID provided` (normal fallback)
- Network timing warnings
- Supabase auth messages

---

## 📊 TEST RESULTS SUMMARY

| Test | Category | Result | Notes |
|------|----------|--------|-------|
| 1. Classes Display | Core | __ | Step 4 dropdown |
| 2. Subjects Filter | Core | __ | After class select |
| 3. Admission Number | Core | __ | No "undefined" |
| 4. Teacher Register | Feature | __ | Full flow |
| 5. Student Register | Feature | __ | Full flow |
| 6. Fallback Config | Edge Case | __ | Error handling |
| 7. Photo Upload | Feature | __ | After Mig 025 |
| Console Errors | QA | __ | No bad errors |

---

## ✅ ACCEPTANCE CRITERIA

Mark each as PASS/FAIL:

### Core Fixes
- [ ] `schoolId` property fixed (user?.school_id, not user?.schoolId)
- [ ] Classes always display (never empty)
- [ ] Subjects always display (never empty)
- [ ] Admission numbers never contain "undefined"
- [ ] No "invalid input syntax for type uuid" errors
- [ ] No empty school_id being sent to Supabase

### Functionality
- [ ] Teacher registration form completes successfully
- [ ] Student registration form completes successfully
- [ ] Can select multiple subjects
- [ ] Can select class correctly
- [ ] Form displays real class names (not UUIDs)
- [ ] Form displays real subject names (not UUIDs)

### Fallback Behavior
- [ ] System handles empty schoolId gracefully
- [ ] Form doesn't get stuck on "Loading"
- [ ] Nigerian standard config acts as fallback
- [ ] No empty dropdowns ever

### Error Handling
- [ ] No 400 errors with "invalid uuid"
- [ ] No console errors about undefined
- [ ] No network errors showing to user
- [ ] Proper error messages if actual problems

### Storage (After Migration 025)
- [ ] Photo uploads work
- [ ] Photos save to Supabase Storage
- [ ] Photo URLs save to database
- [ ] RLS not blocking uploads

---

## FINAL RESULT

**Overall Test Status**: 
- [ ] ALL TESTS PASSED ✅
- [ ] SOME TESTS FAILED ❌

**If Failed**, document which tests failed and any error messages seen in console.

---

## Sign-Off

**Tested by**: _______________
**Date**: _______________
**Result**: _______________
**Notes**: _______________

---

**The rebuild is complete and ready for testing. Run through these tests in a browser to verify everything works as expected.**
