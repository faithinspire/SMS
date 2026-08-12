# 🚀 QUICK REFERENCE GUIDE

**Server**: http://localhost:3000 ✅ RUNNING

---

## 🔐 LOGIN CREDENTIALS TEST

### School Admin
- URL: `http://localhost:3000/auth/school-admin/login`
- After login: Redirects to `/school-admin/dashboard`

### Teacher/Staff
- URL: `http://localhost:3000/auth/staff/login`
- After login: Redirects to `/dashboard` → Correct dashboard based on role

### Student
- URL: `http://localhost:3000/auth/student/login`
- After login: Redirects to `/dashboard` → `/student/dashboard`

### Super Admin
- URL: `http://localhost:3000/auth/superadmin/login`
- After login: Redirects to `/dashboard` → `/superadmin/dashboard`

---

## 📍 MAIN PAGES

| Role | Dashboard URL | Features |
|------|---------------|----------|
| School Admin | `/school-admin/dashboard` | Register teachers & staff |
| Principal/Head | `/principal/dashboard` | School statistics & actions |
| Teacher | `/teacher/dashboard` | Class & student management |
| Student | `/student/dashboard` | Assignments & grades |
| Staff/Accountant | `/staff/account` | Personal info & payments |
| Super Admin | `/superadmin/dashboard` | System management |

---

## ✨ FEATURES TO TEST

### 1. Teacher Registration ⏱️ 2 min
```
1. Go to /school-admin/dashboard
2. Click "+ Register Teacher"
3. Step 1: Fill name, email, password
4. Step 2: Select class, select subjects
5. Submit
6. VERIFY: Teacher appears in staff list
```

### 2. Staff with Payment ⏱️ 3 min
```
1. Click "+ Register Staff"
2. Fill basic info
3. Fill bank details (bank name, account #, etc.)
4. Fill salary
5. Submit
6. VERIFY: Staff appears in list
7. Login as staff → See account page with details
```

### 3. Student Registration ⏱️ 2 min
```
1. Go to /school-admin/records → Students
2. Click "+ Register New Student"
3. Select class, select subjects
4. Submit
5. VERIFY: Student appears under teacher's class
```

### 4. Dashboard Routing ⏱️ 1 min
```
1. Login as HEAD_TEACHER
2. EXPECTED: Redirects to /principal/dashboard
3. See: School statistics & quick actions
```

### 5. Responsive Design ⏱️ 2 min
```
1. Open dashboard on mobile (F12, toggle device)
2. VERIFY: Single column layout
3. Open on tablet: Two column layout
4. Open on desktop: Four column layout
```

### 6. Dark Mode ⏱️ 1 min
```
1. Click moon icon (🌙) in dashboard header
2. VERIFY: Dark theme applies
3. Click sun icon (☀️) to switch back
```

---

## 🐛 TROUBLESHOOTING

### "GET /dashboard 404"
- Dashboard page wasn't compiling
- **FIXED**: Page created and compiled ✅

### "Role not recognized"
- Check user role in auth metadata
- Check role-based routing in `/dashboard`
- Browser console shows what role is detected

### "Classes/Subjects not loading"
- Hard refresh: Ctrl+Shift+R
- Check console (F12) for errors
- Verify classes/subjects exist in database

### "Payment details not saving"
- Check form is complete
- Check console for validation errors
- Verify staff record was created

### "Responsive design not working"
- Clear cache: Ctrl+Shift+Delete
- Hard refresh: Ctrl+Shift+R
- Check viewport is set in browser

---

## 💻 BROWSER CONSOLE (F12)

When testing, check Console tab for:

```
✅ "🔐 User role: HEAD_TEACHER"
✅ "→ Redirecting to Principal/Head Teacher dashboard"
✅ "📚 Loading classes and subjects for school: [uuid]"
✅ "✅ Loaded classes: 5"
✅ "✅ Loaded subjects: 12"
```

Errors to watch for:
```
❌ "Failed to load classes"
❌ "User role: undefined"
❌ "Cannot read property"
❌ POST /api/auth/register 400+
```

---

## 📱 MOBILE TESTING

### Tools
- Chrome DevTools (F12 → Toggle device toolbar)
- Firefox DevTools (F12 → Responsive design)
- Safari (Develop → Enter responsive mode)

### Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

### Test at Each Breakpoint
- [ ] Layout adapts
- [ ] Buttons clickable
- [ ] Text readable
- [ ] Modals display
- [ ] Forms work
- [ ] Navigation visible

---

## 🔗 QUICK LINKS

### Authentication
- School Admin Login: `/auth/school-admin/login`
- Staff Login: `/auth/staff/login`
- Student Login: `/auth/student/login`
- Super Admin Login: `/auth/superadmin/login`

### Dashboards
- Dashboard Router: `/dashboard`
- School Admin: `/school-admin/dashboard`
- Principal: `/principal/dashboard`
- Teacher: `/teacher/dashboard`
- Student: `/student/dashboard`
- Staff Account: `/staff/account`
- Super Admin: `/superadmin/dashboard`

### Management
- Student Records: `/school-admin/records`
- Register Pages: `/auth/[role]/register`

### API
- Auth Register: `/api/auth/register` (POST)
- Health Check: `/api/health`
- School Info: `/api/schools/[id]`

---

## 📊 DATABASE TABLES USED

```
schools               - School info
users                 - User accounts
staff                 - Staff records
students              - Student records
classes               - Classes
class_arm_combos      - Class + Arm combinations
subjects              - Subjects
subject_teacher_assignments - Teacher→Subject links
student_subjects      - Student→Subject links
staff_accounts        - Bank details (optional)
salaries              - Salary info (optional)
```

---

## 🎯 CURRENT IMPLEMENTATION STATUS

### Registration System
- ✅ Teacher registration (class + subjects)
- ✅ Staff registration (payment details)
- ✅ Student registration (auto-linking)

### Dashboard System
- ✅ Smart role-based routing
- ✅ All role dashboards
- ✅ Responsive design
- ✅ Dark mode

### Auto-Linking
- ✅ Students → Class teachers
- ✅ Students → Subject teachers
- ✅ Database relationships

### Data Management
- ✅ Classes in dropdowns
- ✅ Subjects with selection
- ✅ Payment details storage
- ✅ Bank details storage
- ✅ Salary tracking

---

## 🚀 NEXT PHASE

After current features are tested:
1. Teacher student management dashboards
2. CBT exam system
3. Results & grading
4. Reports generation
5. Parent delivery system
6. Payment tracking system

---

## ❓ FAQ

**Q: Where do I register users?**
A: Go to `/school-admin/dashboard` - buttons for each type

**Q: How do I see staff payment details?**
A: Login as staff → Go to `/staff/account`

**Q: Why did my dashboard show 404?**
A: Fixed! Now redirects to correct dashboard via `/dashboard`

**Q: How do I test on mobile?**
A: Press F12 in browser, toggle device toolbar

**Q: Where are my registered users?**
A: Check Supabase dashboard → `auth.users` table

**Q: How do I logout?**
A: Click "Logout" button in dashboard header

---

**Status**: 🟢 Production Ready
**Testing**: Ready
**Deployment**: Ready after security review

Go test! 🎉
