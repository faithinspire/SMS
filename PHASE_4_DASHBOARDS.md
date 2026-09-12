# Phase 4: Dashboard Systems

## Overview
Build comprehensive dashboards for all user roles:
- **School Admin Dashboard** - School overview, user management
- **Teacher Dashboard** - Class management, subject teaching, CBT management
- **Student Dashboard** - Class info, subjects, CBT portal, results
- **Accountant Dashboard** - Payment tracking (already partially built)

## Architecture

### School Admin Dashboard
File: `src/app/school-admin/dashboard/page.tsx` (UPDATE)
- Overview cards (total students, teachers, classes)
- Quick actions (register teacher, register student)
- Recent activities feed
- Statistics by class/subject
- Financial overview

### Teacher Dashboard
File: `src/app/teacher/dashboard/page.tsx` (UPDATE/VERIFY)
- My Classes (list of assigned classes)
- My Subjects (list of teaching assignments)
- Students in my class (if class teacher)
- Students in my subjects (if subject teacher)
- CBT Management link
- Recent activities

### Student Dashboard
File: `src/app/student/dashboard/page.tsx` (UPDATE/VERIFY)
- My School (display school name)
- My Class (class and arm info)
- My Subjects (enrolled subjects with teacher names)
- My CBT Portal link (new tests)
- My Results link
- Recent scores

### Accountant Dashboard
File: `src/app/accountant/dashboard/page.tsx` (VERIFY)
- Payment collection overview
- Outstanding fees by class
- Payment statistics
- Transaction history
- Ledger export

## Key Queries Needed

### Get Teacher's Classes
```sql
SELECT DISTINCT ca.id, c.name, a.name as arm_name, COUNT(s.id) as student_count
FROM class_arm_combos ca
JOIN classes c ON ca.class_id = c.id
JOIN arms a ON ca.arm_id = a.id
LEFT JOIN students s ON s.class_arm_combo_id = ca.id
WHERE ca.class_teacher_id = $1 AND ca.school_id = $2
GROUP BY ca.id, c.name, a.name
```

### Get Teacher's Subjects
```sql
SELECT DISTINCT s.id, s.name, s.code, COUNT(DISTINCT sts.student_id) as student_count
FROM subject_teacher_assignments sta
JOIN subjects s ON sta.subject_id = s.id
LEFT JOIN student_subjects sts ON sts.subject_id = s.id
WHERE sta.teacher_id = $1 AND s.school_id = $2
GROUP BY s.id, s.name, s.code
```

### Get Student's Class & Subjects
```sql
SELECT 
  st.id,
  c.name as class_name,
  a.name as arm_name,
  str.name as stream_name,
  ss.subject_id,
  s.name as subject_name,
  s.code as subject_code,
  sst.teacher_id,
  u.full_name as teacher_name
FROM students st
JOIN class_arm_combos ca ON st.class_arm_combo_id = ca.id
JOIN classes c ON ca.class_id = c.id
JOIN arms a ON ca.arm_id = a.id
LEFT JOIN streams str ON st.stream_id = str.id
LEFT JOIN student_subjects ss ON ss.student_id = st.id
LEFT JOIN subjects s ON ss.subject_id = s.id
LEFT JOIN student_subject_teachers sst ON sst.student_id = st.id AND sst.subject_id = s.id
LEFT JOIN users u ON sst.teacher_id = u.id
WHERE st.id = $1
```

## UI Components to Build/Update

### AdminDashboard
- StatCard (total count, trend)
- QuickActionButton
- ActivityFeed
- ClassStatistics

### TeacherDashboard
- MyClassesCard (list classes)
- MySubjectsCard (list subjects)
- StudentManagementCard
- CBTManagementCard

### StudentDashboard
- SchoolInfoCard
- ClassInfoCard
- SubjectListCard
- CBTPortalCard
- ResultsCard

## Data Flow

### Loading Admin Dashboard
```
Fetch User → Verify SCHOOL_ADMIN role
  ↓
GET /api/admin/stats → Fetch:
  - School name and info
  - Total students, teachers, classes
  - Recent registrations
  - Fee collection status
  ↓
Display Dashboard with real data
```

### Loading Teacher Dashboard
```
Fetch User → Verify TEACHER role
  ↓
GET /api/teacher/dashboard → Fetch:
  - Assigned classes (where class_teacher_id = user_id)
  - Teaching subjects (from subject_teacher_assignments)
  - Student counts per class/subject
  - Recent activities
  ↓
Display Dashboard with assignments
```

### Loading Student Dashboard
```
Fetch User → Verify STUDENT role
  ↓
GET /api/student/dashboard → Fetch:
  - Student record (find class_arm_combo_id)
  - Class details (class name, arm, stream)
  - Enrolled subjects
  - Subject teachers
  - Recent exam results
  ↓
Display Dashboard with class and subject info
```

## Success Criteria
✅ Admin sees accurate school statistics
✅ Teacher sees assigned classes and subjects
✅ Student sees their class and enrolled subjects
✅ All data comes from Supabase queries (not hardcoded)
✅ Real-time updates when user navigates
✅ Loading states while fetching
✅ Error states with helpful messages
