# ⚡ QUICK TEST CHECKLIST - 20 MINUTE VERIFICATION

**Start Time**: NOW  
**Expected End**: 20 minutes  
**Server**: http://localhost:3001 (port 3001, not 3000!)  
**Console**: F12 to open  

---

## TEST 1: Teacher Registration (5 min)

📍 **URL**: http://localhost:3001/auth/staff/register

### Steps:
- [ ] 1. Page loads (no errors)
- [ ] 2. Select a school from dropdown
- [ ] 3. Wait 2-3 seconds
- [ ] 4. Classes dropdown populates
- [ ] 5. Select a class
- [ ] 6. Subjects section appears with checkboxes
- [ ] 7. Select at least one subject
- [ ] 8. Fill: Full Name, Email, Password
- [ ] 9. Click "Create Account"
- [ ] 10. Success message appears

### Console Check:
- [ ] Open F12 → Console
- [ ] Look for ✅ logs (should see multiple)
- [ ] No ❌ red errors

### PASS / FAIL: ____

---

## TEST 2: School Admin Dashboard (5 min)

📍 **URL**: http://localhost:3001/school-admin/dashboard

**NOTE**: Only works if you have school admin credentials. If not, skip to TEST 3.

### Steps:
- [ ] 1. Login as school admin (if credentials available)
- [ ] 2. Dashboard loads (no "Failed to get school" error)
- [ ] 3. Look for school logo in header (if uploaded)
- [ ] 4. School name displays correctly
- [ ] 5. Staff list shows members
- [ ] 6. Student list shows students
- [ ] 7. No errors on page

### Console Check:
- [ ] Open F12 → Console
- [ ] Should see ✅ "User authenticated"
- [ ] Should see ✅ "School loaded"
- [ ] Should see ✅ "Staff loaded"
- [ ] No ❌ red errors

### PASS / FAIL: ____

---

## TEST 3: Teacher CBT Form (5 min)

📍 **URL**: http://localhost:3001/teacher/cbt

**NOTE**: Only works if logged in as teacher. If not, skip to TEST 4.

### Steps:
- [ ] 1. Page loads
- [ ] 2. Subject/Class selector shows options (not empty)
- [ ] 3. Options formatted like "Subject - Class - Arm"
- [ ] 4. Click "Create Exam" button
- [ ] 5. Form appears
- [ ] 6. Can fill Title, Subject, Class fields
- [ ] 7. Form looks functional

### Console Check:
- [ ] Open F12 → Console
- [ ] Should see ✅ "Total subject-class combos: X"
- [ ] No ❌ red errors

### PASS / FAIL: ____

---

## TEST 4: Student CBT Portal (5 min)

📍 **URL**: http://localhost:3001/student/cbt-portal

**NOTE**: Only works if logged in as student. If not, skip.

### Steps:
- [ ] 1. Page loads
- [ ] 2. Exams display (if any created)
- [ ] 3. Only exams for student's subjects show
- [ ] 4. Exams categorized (Upcoming, Active, Completed)
- [ ] 5. No exams from other subjects visible

### Console Check:
- [ ] Open F12 → Console
- [ ] Should show filtering logic working
- [ ] No ❌ red errors

### PASS / FAIL: ____

---

## BONUS: Logo Display Check (2 min)

### Dashboards with Logos:
- [ ] School Admin Dashboard - Logo in header
- [ ] Teacher Dashboard - Logo visible (if logged in)
- [ ] Student Dashboard - Logo visible (if logged in)
- [ ] Principal Dashboard - Logo visible (if logged in)

### PASS / FAIL: ____

---

## CONSOLE LOG VERIFICATION

### Teacher Registration Expected Logs:
```
✅ Combo data loaded via service: {combos: X, subjects: Y, ...}
✅ Selected combo: {...}
✅ Class level: 1
✅ All subjects loaded: Y
✅ Filtered subjects: Z for level 1
```

### Admin Dashboard Expected Logs:
```
✅ User authenticated: [user-id]
📍 School ID: [school-id]
🔄 Loading school...
✅ School loaded: [School Name]
🔄 Loading staff...
✅ Staff loaded: X
```

### Teacher CBT Expected Logs:
```
🔄 Loading teacher dashboard data...
✅ Dashboard data: {...}
✅ Added class-subject combo: {subject: ..., class: ..., arm: ...}
✅ Total subject-class combos: X
```

---

## FINAL RESULTS

### Overall Status: ___/4 PASSED

- Test 1 (Registration): ___/✓
- Test 2 (Admin): ___/✓
- Test 3 (CBT): ___/✓
- Test 4 (Student Portal): ___/✓

### Notes:
```
[Write any issues found]
[Write any unexpected behavior]
[Write any console errors]
```

---

## IF SOMETHING FAILS

### Quick Fixes (try these first):
1. [ ] Hard refresh browser (Ctrl+Shift+R)
2. [ ] Close browser and reopen
3. [ ] Check console for specific error message
4. [ ] Wait 5 seconds and try again
5. [ ] Check if school has test data in database

### Still Failing?
- [ ] Take screenshot of error
- [ ] Note the exact error message
- [ ] Note which page/feature failed
- [ ] Check DIAGNOSTIC_CONSOLE_GUIDE.md

---

## WHEN ALL TESTS PASS ✅

Next steps:
1. [ ] Document test results
2. [ ] Proceed to Phase 2
3. [ ] Start building principal dashboard
4. [ ] Build accountant dashboard

---

## TIME TRACKING

| Test | Start | End | Duration | Result |
|------|-------|-----|----------|--------|
| 1 | _:__ | _:__ | ___ | ✓/✗ |
| 2 | _:__ | _:__ | ___ | ✓/✗ |
| 3 | _:__ | _:__ | ___ | ✓/✗ |
| 4 | _:__ | _:__ | ___ | ✓/✗ |
| **TOTAL** | _:__ | _:__ | **20 min** | **_/4** |

---

## 🎯 SUCCESS CRITERIA

### All tests passed if:
- ✅ Classes load in registration
- ✅ Subjects appear after class selection
- ✅ Admin dashboard loads without errors
- ✅ Logo displays in headers
- ✅ Teacher CBT shows classes
- ✅ Student CBT filtered correctly
- ✅ Console shows mostly ✅ logs
- ✅ No ❌ red errors

---

**Server Port**: 3001 ⚠️  
**Console**: F12  
**Test Time**: 20 minutes  
**Go**: http://localhost:3001  

Ready? Let's test! 🚀
