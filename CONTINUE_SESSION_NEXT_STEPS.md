# Production System - Next Steps to Complete

## ✅ COMPLETED IN PREVIOUS SESSION

1. **Teacher Registration Fix** - Classes and subjects now load correctly
2. **UUID Display Fixes** - All services return human-readable names
3. **Service Layer Rewrite** - Database schema alignment complete
4. **Auto-Generated Admission Numbers** - Implemented in StudentService
5. **Student Assignment/Lessons Pages** - Redirect issues fixed
6. **Development Server** - Running on http://localhost:3000

---

## 🔧 REMAINING TASKS

### TASK 1: Create Supabase Storage Bucket (CRITICAL)
The photo upload feature requires a public storage bucket in Supabase.

**What's Needed:**
1. Go to https://app.supabase.com → Your Project → Storage
2. Click "Create Bucket"
3. Bucket name: `student-documents`
4. Set to PUBLIC (allow public read access)
5. Save

**Why:** Current error: `StorageApiError: Bucket not found` when uploading student photos

**After Creation:**
- Student registration will allow photo uploads
- If bucket still doesn't exist, photo upload gracefully skips (optional feature)
- System has error handling to continue registration without photos

---

### TASK 2: End-to-End Test - Student Registration

**Test Admission Number Auto-Generation:**

1. Navigate to: `http://localhost:3000/school-admin/dashboard`
2. Login with school admin credentials
3. Click "Register New Student"
4. Complete the 4-step form:
   - Step 1: Personal info (name, email, password, DOB)
   - Step 2: Guardian info (name, phone, email)
   - Step 3: Academic placement (select section, class, stream if needed)
   - Step 4: Subject selection (pick at least one subject)
5. Click "Complete Registration"

**Verify Success:**
- ✓ Success message displays: "Student registered successfully!"
- ✓ **Admission Number** is shown (format: `YYYY-CLASS-SEQUENCE`, e.g., `2026-SSA-0001`)
- ✓ **Student PIN** is shown for login
- ✓ Form resets and modal closes
- ✓ Student appears in Students list on dashboard
- ✓ Admission number is UNIQUE (not duplicated for multiple registrations)

**If Photo Upload Selected:**
- ✓ Photo uploads and stores in Supabase (if bucket exists)
- ✓ Or gracefully skips if bucket doesn't exist
- ✓ Registration completes either way

---

### TASK 3: Verify No UUIDs Displayed

**Check all admin pages display human-readable names:**

1. **Students Tab:**
   - Verify students show admission number (not UUID)
   - Verify class name displays (e.g., "SSA" not UUID)
   - Verify all names are readable

2. **Staff/Teachers Tab:**
   - Verify teacher names display (not UUIDs)
   - Verify qualifications/departments display correctly
   - Verify class assignments show names (not UUIDs)

3. **Student/Teacher Dashboards:**
   - Verify all displayed data uses names not IDs
   - Check subject names display
   - Check class names display

**Expected Result:** NO UUIDs visible to any user - all UI shows human-readable names

---

### TASK 4: Build Verification

**Run build to catch any TypeScript issues:**

```bash
npm run build
```

**Verify:**
- ✓ Build completes without errors
- ✓ No TypeScript compilation errors
- ✓ Next.js build succeeds
- ✓ Ready for production deployment

---

## 📝 KNOWN ISSUES & WORKAROUNDS

### Photo Upload - Bucket Not Found
- **Status:** Gracefully handled in code
- **Fix:** Create `student-documents` bucket in Supabase Storage (Task 1)
- **Current Behavior:** If bucket missing, registration continues, photo upload is skipped (optional)
- **Note:** Error messages in browser console explain how to fix it

### 404 Errors in Dev Server
- **Files:** `main.js`, `_app.js`, `react-refresh.js`, `_error.js`
- **Status:** Normal Next.js rebuild artifacts - NOT blocking
- **Impact:** None - these are HMR (Hot Module Reload) files
- **Fix:** Ignore - disappear after page refresh

---

## 🔐 USER CREDENTIALS FOR TESTING

**School Admin (from setup):**
- Email: Check `.env.local` for `NEXT_PUBLIC_TEST_ADMIN_EMAIL`
- Password: Check `.env.local` for `NEXT_PUBLIC_TEST_ADMIN_PASSWORD`

**Or:** Use the school admin that was created during initial setup

---

## 📚 FILES MODIFIED IN THIS SESSION

### Core Services
- `src/services/student.service.ts` - Complete rewrite with auto-generation
- `src/services/teacher.service.ts` - Schema alignment fixes
- `src/services/class.service.ts` - New query methods
- `src/services/registration-config.service.ts` - Data loading improvements

### Components
- `src/components/admin/TeacherRegistrationModal.tsx` - Fixed UUID display
- `src/components/admin/StudentRegistrationModal.tsx` - Uses auto-generation
- `src/components/forms/StudentRegistrationForm.tsx` - Removes manual admission entry
- `src/app/student/assignments/page.tsx` - Fixed redirect logic
- `src/app/student/lessons/page.tsx` - Fixed redirect logic

---

## 🎯 SUCCESS CRITERIA

All items below should be checked ✓ before considering work complete:

- [ ] Storage bucket `student-documents` created in Supabase (PUBLIC)
- [ ] Student registration form works end-to-end
- [ ] Admission number auto-generates with correct format (YYYY-CLASS-SEQUENCE)
- [ ] Admission numbers are unique across registrations
- [ ] Student PIN auto-generates and displays
- [ ] Photo upload works (or gracefully skips if no bucket)
- [ ] Student appears in admin dashboard after registration
- [ ] No UUIDs displayed anywhere in UI
- [ ] All class/subject/teacher names display correctly
- [ ] Build succeeds: `npm run build`
- [ ] Dev server running without blocking errors

---

## 🚀 NEXT SESSION - READY FOR

Once all tasks complete, system is ready for:
1. Teacher photo uploads (same bucket can be reused)
2. Student result submissions and grading
3. Report card generation
4. Student portal features
5. Production deployment

---

## 📞 TROUBLESHOOTING

**Admission number shows as "2026-ADM-xxxx" instead of class-specific format:**
- Check class name is properly formatted
- Verify class data loaded correctly
- Check database `classes` table has proper `name` field

**Subject list empty in student registration:**
- Verify subjects added to school
- Check `subjects` table has `applicable_to_levels` set
- Run migration 018: `fix_subject_applicable_levels.sql`

**Photo upload still fails after creating bucket:**
- Verify bucket is PUBLIC (not private)
- Check `student-documents` name matches exactly
- Clear browser cache and reload page
- Check Supabase project has enough storage quota

**Students list not showing after registration:**
- Refresh browser page
- Check student appeared in database
- Verify school_id matches current admin's school
- Check browser console for JavaScript errors
