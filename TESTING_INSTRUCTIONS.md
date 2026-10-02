# 🧪 TESTING INSTRUCTIONS - Complete Verification

**Deployment Status:** ✅ Live at https://sms-gold-eta.vercel.app

---

## ✅ COMPLETE TESTING PROCEDURE

### **Section 1: Role Assignment & Login Routing**

#### Test 1A: Teacher Registration & Login
```
1. Go to /auth/staff/register
2. Fill out all required information
3. In "Employment Information" stage:
   - Select Role: "Teacher"
4. Complete registration
5. Go to /auth/staff/login
6. Login with the same email/password
7. VERIFY: Routes to /teacher/dashboard ✅
8. VERIFY: In top left, see "Teacher" (not "STAFF") ✅

SQL CHECK:
SELECT id, email, role FROM users WHERE role = 'TEACHER' ORDER BY created_at DESC LIMIT 1;
Expected: role = 'TEACHER' ✅
```

#### Test 1B: Accountant Registration & Login
```
1. Go to /auth/staff/register
2. Fill all required information
3. In "Employment Information" stage:
   - Select Role: "Accountant"
4. Complete registration
5. Go to /auth/staff/login
6. Login with same email/password
7. VERIFY: Routes to /accountant/dashboard ✅

SQL CHECK:
SELECT id, email, role FROM users WHERE role = 'ACCOUNTANT' ORDER BY created_at DESC LIMIT 1;
Expected: role = 'ACCOUNTANT' ✅
```

#### Test 1C: Principal Registration & Login
```
1. Go to /auth/staff/register
2. Fill all required information
3. In "Employment Information" stage:
   - Select Role: "Principal"
4. Complete registration
5. Go to /auth/staff/login
6. Login with same email/password
7. VERIFY: Routes to /principal/dashboard ✅

SQL CHECK:
SELECT id, email, role FROM users WHERE role = 'PRINCIPAL' ORDER BY created_at DESC LIMIT 1;
Expected: role = 'PRINCIPAL' ✅
```

#### Test 1D: Head Teacher Registration & Login
```
1. Go to /auth/staff/register
2. Fill all required information
3. In "Employment Information" stage:
   - Select Role: "Head Teacher"
4. Complete registration
5. Go to /auth/staff/login
6. Login with same email/password
7. VERIFY: Routes to /headteacher/dashboard ✅

SQL CHECK:
SELECT id, email, role FROM users WHERE role = 'HEAD_TEACHER' ORDER BY created_at DESC LIMIT 1;
Expected: role = 'HEAD_TEACHER' ✅
```

#### Test 1E: Student Login
```
1. Register as a student (use /auth/student/register)
2. Go to /auth/student/login
3. Login with email/password
4. VERIFY: Routes to /student/dashboard ✅
```

---

### **Section 2: Staff Management Page**

#### Test 2A: Staff Page Loading
```
1. Login as School Admin
2. Go to /school-admin/staff
3. VERIFY: Page loads without timeout ✅
4. VERIFY: Staff list displays (or "No staff found" if empty) ✅
5. Browser Console: Check for API errors ✅
```

#### Test 2B: Staff Filtering & Search
```
1. Go to /school-admin/staff
2. Enter search term (part of a staff name or email)
3. VERIFY: Results filter in real-time ✅
4. Try status filter dropdown
5. VERIFY: Status filter works ✅
```

#### Test 2C: Staff Edit Modal
```
1. Go to /school-admin/staff
2. Find a staff member, click "Edit" button
3. VERIFY: Modal opens with gradient blue header ✅
4. VERIFY: Form has organized sections:
   - 👤 Personal Information ✅
   - 💼 Employment Information ✅
   - 🎯 Role (read-only) ✅
5. Edit a field (e.g., name)
6. Click "Save Changes"
7. VERIFY: Staff list updates ✅
8. VERIFY: Changes saved in database ✅
```

#### Test 2D: Generate Staff Letter
```
1. Go to /school-admin/staff
2. Find a staff member, click "Letter" button
3. VERIFY: Letter Preview Modal opens ✅
4. VERIFY: Appointment letter generated with staff details ✅
5. VERIFY: Letter shows staff name, position, school info ✅
```

---

### **Section 3: Students Management Page**

#### Test 3A: Students Page Loading
```
1. Login as School Admin
2. Go to /school-admin/students
3. VERIFY: Page loads without timeout ✅
4. VERIFY: Students list displays ✅
```

#### Test 3B: Students Filtering
```
1. Go to /school-admin/students
2. Enter search term (student name or admission #)
3. VERIFY: Results filter ✅
4. Try class filter dropdown
5. VERIFY: Class filter works ✅
```

#### Test 3C: Generate Student Letter
```
1. Go to /school-admin/students
2. Find a student, click "Letter" button
3. VERIFY: Letter Preview Modal opens ✅
4. VERIFY: Admission letter generated with student details ✅
5. VERIFY: Letter shows student name, admission #, class ✅
```

---

### **Section 4: Letter Features**

#### Test 4A: Letter Edit Feature
```
1. Generate a letter (staff or student)
2. Letter Modal opens
3. VERIFY: "✏️ Edit" button visible ✅
4. Click "Edit" button
5. VERIFY: Switches to edit mode ✅
6. VERIFY: Text area with HTML content appears ✅
7. Make a small change (e.g., add text)
8. Click "✓ Save Changes"
9. VERIFY: Letter updates with your changes ✅
```

#### Test 4B: Letter Preview
```
1. Generate a letter
2. VERIFY: Letter displays in preview/iframe ✅
3. Click "✏️ Edit"
4. VERIFY: Switches to edit mode ✅
5. Click back to preview (or "Cancel" edit)
6. VERIFY: Back to preview mode ✅
```

#### Test 4C: Letter Download
```
1. Generate a letter
2. Click "📥 Download"
3. VERIFY: HTML file downloads ✅
4. Open downloaded file in browser
5. VERIFY: Formatted letter displays ✅
```

#### Test 4D: Letter Print
```
1. Generate a letter
2. Click "🖨️ Print"
3. VERIFY: Print dialog opens ✅
4. Select printer or "Save as PDF"
5. VERIFY: Letter prints/saves correctly ✅
```

#### Test 4E: Letter Email Share
```
1. Generate a letter
2. VERIFY: "📧 Email" button visible ✅
3. Click "Email"
4. VERIFY: Email client opens OR mailto link generated ✅
5. Mail should be pre-filled with letter reference ✅
```

#### Test 4F: Letter WhatsApp Share
```
1. Generate a letter
2. VERIFY: "💬 WhatsApp" button visible ✅
3. Click "WhatsApp"
4. VERIFY: WhatsApp opens or wa.me link generated ✅
5. Message should reference the letter ✅
```

#### Test 4G: Letter Copy HTML
```
1. Generate a letter
2. Click "📋 Copy"
3. VERIFY: Message shows "HTML copied to clipboard" ✅
4. Paste elsewhere (notepad, text area)
5. VERIFY: HTML content pasted successfully ✅
```

---

### **Section 5: Results Page**

#### Test 5A: Results Page Session Loading
```
1. Login as School Admin
2. Go to /school-admin/results
3. VERIFY: Page loads ✅
4. VERIFY: Academic Session dropdown populated ✅
5. VERIFY: Shows BOTH active AND inactive sessions ✅
```

#### Test 5B: Historical Sessions
```
1. Go to /school-admin/results
2. In Session dropdown, look for old/inactive sessions
3. VERIFY: Past academic years visible ✅
4. Select an old session
5. VERIFY: Can load terms and results for that session ✅
```

#### Test 5C: Results by Term
```
1. Go to /school-admin/results
2. Select a session
3. VERIFY: Term dropdown populates ✅
4. Select a term
5. VERIFY: Classes and students load ✅
6. VERIFY: Results display by class with scores ✅
```

---

### **Section 6: Role Display Verification**

#### Test 6A: Staff Role Display
```
1. Go to /school-admin/staff
2. Look at staff list table "Role" column
3. For each staff member, VERIFY:
   - Teacher shows "TEACHER" (not "STAFF") ✅
   - Accountant shows "ACCOUNTANT" ✅
   - Principal shows "PRINCIPAL" ✅
   - Head Teacher shows "HEAD_TEACHER" ✅
```

#### Test 6B: Current User Role Display
```
1. Login as different role (TEACHER, ACCOUNTANT, PRINCIPAL)
2. Check dashboard title/header for role display
3. VERIFY: Correct role shown ✅
4. VERIFY: Dashboard specific to that role ✅
```

---

### **Section 7: API Integration Verification**

#### Test 7A: Check API Endpoints
```
Browser Console Network Tab:
1. Go to /school-admin/staff
2. Open Dev Tools → Network tab
3. Filter by "Fetch/XHR"
4. VERIFY: Request to /api/school/staff ✅
5. VERIFY: Response status 200 ✅
6. VERIFY: Data includes staff list ✅

Repeat for /school-admin/students:
7. VERIFY: Request to /api/school/students ✅
```

#### Test 7B: Check Error Handling
```
1. Go to /school-admin/staff
2. Disconnect internet
3. VERIFY: Proper error message displays ✅
4. Reconnect internet
5. Retry loading
6. VERIFY: Data loads successfully ✅
```

---

## 📋 Verification Checklist

Print this out or use for verification:

```
ROLE ASSIGNMENT & ROUTING
[ ] Teacher registered with role='TEACHER'
[ ] Accountant registered with role='ACCOUNTANT'
[ ] Principal registered with role='PRINCIPAL'
[ ] Head Teacher registered with role='HEAD_TEACHER'
[ ] Teacher login routes to /teacher/dashboard
[ ] Accountant login routes to /accountant/dashboard
[ ] Principal login routes to /principal/dashboard
[ ] Head Teacher login routes to /headteacher/dashboard
[ ] Student login routes to /student/dashboard
[ ] Role display shows correct role (not "STAFF")

STAFF MANAGEMENT
[ ] Staff page loads via API
[ ] Staff list displays all staff
[ ] Search filter works
[ ] Status filter works
[ ] Edit button opens modal
[ ] Modal has professional design
[ ] Can edit and save staff
[ ] Can generate appointment letter
[ ] Letter displays correctly

STUDENTS MANAGEMENT
[ ] Students page loads via API
[ ] Students list displays
[ ] Search filter works
[ ] Class filter works
[ ] Can generate admission letter
[ ] Letter displays correctly

LETTER FEATURES
[ ] Edit button available
[ ] Can edit letter HTML
[ ] Can preview letter
[ ] Download button works
[ ] Print button works
[ ] Email share button works
[ ] WhatsApp share button works
[ ] Copy HTML button works

RESULTS PAGE
[ ] Page loads
[ ] All sessions visible (active and inactive)
[ ] Can select inactive session
[ ] Terms load correctly
[ ] Results display by class
[ ] Student scores visible

API INTEGRATION
[ ] /api/school/staff endpoint working
[ ] /api/school/students endpoint working
[ ] No timeout errors
[ ] Proper error handling
```

---

## 🆘 TROUBLESHOOTING

### Problem: Teacher shows as "STAFF"
**Solution:**
1. Check users table: `SELECT id, email, role FROM users WHERE email='teacher@email.com';`
2. If role is NULL or 'STAFF', re-register the teacher
3. Verify registration form passed correct role

### Problem: Login routes to wrong dashboard
**Solution:**
1. Check browser console for login routing log
2. Verify users table has correct role
3. Check AuthService.login() is fetching from users table
4. Clear browser cache and try again

### Problem: Staff/Students page not loading
**Solution:**
1. Check browser Network tab for /api/school/staff response
2. Verify API returns status 200
3. Check browser console for errors
4. Try incognito mode (clear cache)

### Problem: Letter not generating
**Solution:**
1. Check browser console for errors
2. Verify staff/student record exists
3. Verify school data exists
4. Try refreshing page

---

## 📝 FINAL CHECKLIST

When all tests pass, mark as COMPLETE:

```
✅ All tests passed
✅ No console errors
✅ No network errors
✅ All roles routing correctly
✅ Staff/students loading via API
✅ Letters generating correctly
✅ Letter edit/share features working
✅ Results page showing all sessions
✅ Ready for production use
```

---

**Testing Complete When:** All checkboxes above are checked  
**Expected Time:** 30-45 minutes  
**Support:** Check FIX_GUIDE_PROFESSIONAL.md for root cause explanations
