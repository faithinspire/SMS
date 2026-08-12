# Quick Start Guide - New Features

## How to Use the New Features

### 1. SCHOOL ADMIN DASHBOARD

**Access:** Login as School Admin → Dashboard

#### Staff Management
```
✏️ Edit Button:
- Click to open staff profile editor
- Modify name, email, phone, payment details
- Change class assignment or teaching subjects
- Save changes

📄 Letter Button:
- Click to generate employment letter
- Preview letter content
- Download, Print, Copy, or Share options
```

#### Student Management
```
✏️ Edit Button:
- Click to open student profile editor
- Modify name, email, class, department
- Change student subjects
- Save changes

🎓 Letter Button:
- Click to generate admission letter
- Preview letter content
- Download, Print, Copy, or Share options
```

---

### 2. STUDENT REGISTRATION

**Access:** School Admin Dashboard → Students Tab → "+ Register Student"

**Three-Step Process:**

**Step 1: Student Information**
- Full Name (required)
- Email Address (required)
- Password (required, min 6 chars)
- Profile Picture (optional, with preview)
- Admission Number (auto-generated after class selection)

**Step 2: Class & Academic Assignment** ← REQUIRED FIELDS
- Select Class (required) ✅
- Select Department (required for secondary) ✅
- Select Subjects (required for secondary) ✅
- Primary students: Subjects assigned by teacher

**Requirements to Complete:**
- Class MUST be selected
- If Secondary: Department MUST be selected
- If Secondary: At least 1 subject MUST be selected
- All validations must pass

---

### 3. TEACHER REGISTRATION

**Access:** School Admin Dashboard → Staff Tab → "+ Register Teacher"

**Three-Step Process:**

**Step 1: Basic Information**
- Full Name (required)
- Email Address (required)
- Password (required, min 6 chars)

**Step 2: Payment & Employment Details**
- Bank Name (required)
- Account Number (required)
- Account Holder Name (optional)
- Monthly Salary (required, > 0)
- Employment Date (required)
- *Data saved for accountant dashboard*

**Step 3: Class & Subjects Assignment** ← REQUIRED FIELD
- Class Teacher Assignment (optional)
- Teaching Subjects (required) ✅ - Must select at least 1

**Requirements to Complete:**
- At least 1 subject MUST be selected
- Button only enables after selecting subjects

---

### 4. PROFILE EDITING

#### For Staff/Teachers
**How to Access:**
1. Dashboard → Staff Tab
2. Find the teacher/staff member
3. Click "✏️ Edit" button
4. Modal opens with editable form

**What Can Be Edited:**
- Personal: Name, Email, Phone
- Employment: Employment Date
- Payment: Bank, Account, Salary details
- Class: Change class teacher assignment
- Subjects: Add/remove teaching subjects

**How to Save:**
1. Make changes to desired fields
2. Click "Save Changes" button
3. See success message
4. Dashboard table auto-updates

#### For Students
**How to Access:**
1. Dashboard → Students Tab
2. Find the student
3. Click "✏️ Edit" button
4. Modal opens with editable form

**What Can Be Edited:**
- Personal: Name, Email
- Academic: Class, Department (if secondary)
- Subjects: Modify student subjects
- Note: Admission number is read-only

**How to Save:**
1. Make changes to desired fields
2. Click "Save Changes" button
3. See success message
4. Dashboard table auto-updates

---

### 5. LETTER GENERATION

#### For Teachers (Employment Letter)
**How to Generate:**
1. Dashboard → Staff Tab
2. Find the teacher
3. Click "📄 Letter" button
4. Letter generation modal opens
5. Click "✨ Generate Letter"
6. Letter preview appears

**Actions Available:**
- 📋 **Copy:** Copy full letter text to clipboard
- 💾 **Download:** Save as .txt file to computer
- 🖨️ **Print:** Open print dialog
- 💬 **WhatsApp:** Share via WhatsApp
- ✉️ **Email:** Share via email

**Letter Includes:**
- Teacher name and ID
- School name
- Position and monthly salary
- Start date
- Employment terms and conditions
- Responsibilities and benefits
- Leave and allowance information
- Professional signature line

#### For Students (Admission Letter)
**How to Generate:**
1. Dashboard → Students Tab
2. Find the student
3. Click "🎓 Letter" button
4. Letter generation modal opens
5. Click "✨ Generate Letter"
6. Letter preview appears

**Actions Available:**
- 📋 **Copy:** Copy full letter text to clipboard
- 💾 **Download:** Save as .txt file to computer
- 🖨️ **Print:** Open print dialog
- 💬 **WhatsApp:** Share via WhatsApp
- ✉️ **Email:** Share via email

**Letter Includes:**
- Student name and admission number
- School name
- Class/Level assignment
- Department (if secondary)
- Registration information
- School fees details
- Conduct and discipline policy
- Attendance requirements
- Academic expectations
- Health and safety guidelines
- Orientation programme info

---

### 6. SHARING VIA WHATSAPP

**How to Share:**
1. Open letter (see Letter Generation above)
2. Click "💬 WhatsApp" button
3. Enter recipient phone number:
   - Format: +234XXXXXXXXXX (international)
   - Format: 0XXXXXXXXXX (Nigerian)
   - Format: XXXXXXXXXX (10-13 digits)
4. System validates number
5. Click "✓ Send via WhatsApp"
6. WhatsApp Web opens with pre-filled message
7. Click Send in WhatsApp

**Important:**
- Phone number must be valid Nigerian format
- System auto-corrects format (0 → +234)
- WhatsApp must be set up on recipient's phone
- Message includes letter preview

---

### 7. SHARING VIA EMAIL

**How to Share:**
1. Open letter (see Letter Generation above)
2. Click "✉️ Email" button
3. Enter recipient email address
4. System validates email format
5. Click "✓ Send via Email"
6. Default email client opens (if no API configured)
7. Or email sent via SendGrid (if API configured)

**What Recipient Gets:**
- Professional email with formatted subject
- Complete letter in email body
- Ready to forward or print

---

### 8. VALIDATION & ERROR MESSAGES

#### During Registration
```
❌ "Please select a class"
→ You must select a class before proceeding

❌ "Please select a department for secondary students"
→ Secondary students need department selection

❌ "Please select at least one subject for secondary students"
→ Secondary students need subject assignment

❌ "Please select at least one subject to teach"
→ Teachers must teach at least 1 subject

❌ "Please fill in all payment details"
→ All payment fields required for teachers
```

#### During Sharing
```
❌ "Invalid phone number. Please use Nigerian format."
→ Use +234, 0, or 10-13 digit format

❌ "Invalid email address"
→ Check email format (example@domain.com)
```

#### During Saving
```
❌ Error saving changes
→ Check console logs; try again or contact support

✅ ✓ Staff profile updated successfully!
→ Changes saved; page will refresh

✅ ✓ Student profile updated successfully!
→ Changes saved; page will refresh
```

---

### 9. TIPS & TRICKS

**Fast Registration:**
- Auto-admission number: Select class → Click "🔄 Auto-Gen"
- Profile picture: Drag & drop instead of clicking
- Copy phone from student records to WhatsApp share

**Time Saving:**
- Edit multiple staff profiles before saving
- Use keyboard Tab to navigate fields
- Bulk share letters using copy function

**Best Practices:**
- Always verify phone numbers before WhatsApp share
- Use email for formal communications
- Download letter copies for records
- Update salary when reviewing performance

---

### 10. COMMON QUESTIONS

**Q: Can I change a student's admission number?**
A: No, admission numbers are permanent and read-only

**Q: Can I register a teacher without payment details?**
A: No, payment details are required for all teachers

**Q: What happens if WhatsApp share fails?**
A: Check phone number format or try email instead

**Q: Can I edit classes and subjects from the dashboard?**
A: No, use School Settings or registration modals

**Q: Are generated letters stored?**
A: Yes, in the generated_letters table (optional feature)

**Q: Can students edit their own profiles?**
A: No, only school admins can edit profiles

**Q: What if registration email is wrong?**
A: Edit student/teacher profile and update email

**Q: Can I bulk register students?**
A: Currently one-by-one; bulk feature coming soon

---

### 11. KEYBOARD SHORTCUTS

```
Tab     - Navigate to next field
Shift+Tab - Navigate to previous field
Enter   - Submit form (when focused on button)
Escape  - Close modal
```

---

### 12. ACCESSIBILITY

- ✅ Keyboard navigation supported
- ✅ Screen reader compatible
- ✅ High contrast text
- ✅ Clear error messages
- ✅ Color not only indicator
- ✅ Responsive on mobile

---

### 13. TROUBLESHOOTING

**Issue:** Classes not showing in dropdown
**Solution:** Ensure school has been registered; classes auto-created

**Issue:** Edit button not working
**Solution:** Refresh page; ensure authenticated as School Admin

**Issue:** Letter won't generate
**Solution:** Check teacher/student has all required info

**Issue:** WhatsApp not opening
**Solution:** Ensure WhatsApp installed; check phone number format

**Issue:** Email not sending
**Solution:** Check email format; ensure SendGrid key configured

---

### 14. VIDEO TUTORIALS

(Would be links to video guides)
- Student Registration Complete
- Teacher Registration Complete
- Profile Editing
- Letter Generation & Sharing
- WhatsApp Integration
- Email Integration

---

## SUMMARY

**Key Takeaways:**

✅ Class selection is now REQUIRED for students
✅ Subject selection is now REQUIRED for students (secondary)
✅ Subject selection is now REQUIRED for teachers
✅ You can now edit staff and student profiles
✅ You can generate professional letters
✅ You can share letters via WhatsApp or Email
✅ Letters can be printed, downloaded, or copied

**Next Steps:**
1. Login to School Admin Dashboard
2. Register a student or teacher
3. Edit their profile
4. Generate a letter
5. Share via WhatsApp or Email

**Support:**
- Check error messages for guidance
- Review validation requirements
- Verify all required fields filled
- Contact support for additional help

---

*Last Updated: August 12, 2026*
*Version: 1.0*
