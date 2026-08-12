# 🧪 QUICK TEST - ALL NEW FEATURES

## ⚡ 90-SECOND OVERVIEW TEST

1. **Classes/Subjects Loading** ✅
   - Go to `/school-admin/dashboard`
   - Click "+ Register Teacher"
   - Step 2 should show: Class dropdown + Subject checkboxes
   - If empty, check browser console (F12)

2. **Payment Details Form** ✅
   - Click "+ Register Staff"
   - Should see: Name, Role, Email, Password fields
   - Then: Bank Name, Account Number, Account Holder, Salary fields
   - Fill and submit

3. **Account Dashboard** ✅
   - Login as newly created staff
   - Go to `/staff/account`
   - Should show: Personal info + Bank details + Salary table

4. **Student Auto-Linking** ✅
   - Register student with teacher's class
   - View teacher dashboard (coming Phase 2)
   - Student should appear automatically

---

## 📋 COMPLETE TEST PLAN (10 minutes)

### Test 1: Teacher Registration - Classes Load ⏱️ 2 min
```
1. Go to http://localhost:3000/school-admin/dashboard
2. Click "+ Register Teacher" button
3. Fill: Name: "Mr. John Smith"
        Email: "john.smith@school.com"
        Password: "Test1234"
4. Click "Next →"
5. VERIFY: Class dropdown populated with classes
6. VERIFY: Subject checkboxes show all subjects
7. Select: SS1A (class), Math + English (subjects)
8. Click "Complete Registration ✓"
9. VERIFY: Success message appears
10. VERIFY: Teacher appears in staff list
```

### Test 2: Staff Registration - Payment Details Save ⏱️ 3 min
```
1. Click "+ Register Staff" button
2. Fill Section 1:
   - Name: "Mrs. Jane Okafor"
   - Role: "ACCOUNTANT"
   - Email: "jane.okafor@school.com"
   - Position: "Finance Officer"
   - Password: "Test1234"
3. Fill Section 2 (Bank Details):
   - Bank Name: "First Bank"
   - Account Number: "1234567890"
   - Account Holder: "Jane Okafor"
   - Salary Amount: "50000"
4. Click "Register Staff Member ✓"
5. VERIFY: Success message
6. VERIFY: Staff appears in list
7. Go to: http://localhost:3000/staff/account
8. VERIFY: Bank details display
9. VERIFY: Salary shows in history table
```

### Test 3: Subject Dropdown Working ⏱️ 2 min
```
1. Create another teacher
2. In Step 2: Click subject checkbox area
3. VERIFY: Checkboxes appear for each subject
4. VERIFY: You can select multiple (Math, English, Science)
5. Verify they save and teacher shows selected subjects
```

### Test 4: Auto-Linking Students ⏱️ 3 min
```
1. Register student:
   - Go to Records → Students tab
   - Click "+ Register New Student"
   - Name: "John Okafor", Admission: "ADM/001"
   - Email: "john@school.com"
   - Class: SS1A (same as teacher from Test 1)
   - Subjects: Math (same as teacher)
2. Go to Records → Teachers tab
3. Find "Mr. John Smith" teacher
4. VERIFY: "John Okafor" appears in class students list
5. VERIFY: (In Phase 2) Student shows in subject students
```

---

## 🔍 BROWSER CONSOLE CHECK (F12)

Press F12 while testing, go to Console tab. You should see:

```
✅ "📚 Loading classes and subjects for school: [uuid]"
✅ "✅ Loaded classes: 5"
✅ "✅ Loaded subjects: 12"
✅ "✅ Auth user created: [uuid]"
✅ "✅ Database user created: [uuid]"
```

If you see errors like:
- "Failed to load classes" → Database query issue
- "cannot read property" → Missing data in response
- Any 400/500 errors → API issue

---

## 📊 VERIFICATION POINTS

### ✅ In Dropdown/List:
- [ ] Classes showing: SS1, SS2, SS3, Primary 1, Primary 2, etc.
- [ ] Subjects showing: Math, English, Science, Social Studies, etc.
- [ ] No "undefined" or empty options
- [ ] All items from database appear

### ✅ In Form Submit:
- [ ] Bank details save to database
- [ ] Salary amount saves to database
- [ ] Staff record created
- [ ] User record created
- [ ] All fields populated

### ✅ In Account Dashboard:
- [ ] Personal info displays correctly
- [ ] Bank details show (if entered)
- [ ] Salary table shows (if entered)
- [ ] Payment status displays (PENDING/PAID/OVERDUE)

### ✅ In Lists:
- [ ] Newly created staff/teachers appear immediately
- [ ] Class/subject assignments show
- [ ] Admin can see all staff from school
- [ ] Data is school-specific (multi-tenancy works)

---

## ❌ TROUBLESHOOTING

### "Dropdown is empty"
- Check: Browser console (F12) for errors
- Check: Supabase dashboard → Tables
- Verify: Classes/Subjects exist in database
- Try: Hard refresh (Ctrl+Shift+R)

### "Bank details not saving"
- Check: Are you clicking "Register Staff Member ✓"?
- Check: Are all fields filled?
- Check: Browser console for errors
- Check: Supabase dashboard → staff_accounts table

### "Student not appearing in teacher list"
- Check: Student class matches teacher's class
- Check: Class teacher is assigned (class_arm_combos.class_teacher_id)
- Check: Supabase database relationships
- Check: That you're looking in correct teacher's list

### "Classes/Subjects not loading"
- Restart server (Ctrl+C, npm run dev)
- Hard refresh browser (Ctrl+Shift+R)
- Check network tab (F12 → Network)
- Verify school_id is passed to modals

---

## ✅ SUCCESS INDICATORS

You'll know everything works when:
1. ✅ Class dropdown populates when modal opens
2. ✅ Subject checkboxes appear and can be checked
3. ✅ Payment form shows bank details section
4. ✅ New staff appears in dashboard list with bank details saved
5. ✅ Can view staff account with personal + bank info
6. ✅ Students auto-appear in teacher lists
7. ✅ No red errors in console
8. ✅ No 400/500 server errors

---

## 🎯 TESTS TO RUN (in order)

1. ✅ Test 1: Teacher Registration - Classes Load
2. ✅ Test 2: Staff Registration - Payment Details
3. ✅ Test 3: Subject Dropdown Working
4. ✅ Test 4: Auto-Linking Students

**Total Time**: ~10 minutes
**Server Status**: http://localhost:3000 ✅ RUNNING

Go ahead and test! 🚀
