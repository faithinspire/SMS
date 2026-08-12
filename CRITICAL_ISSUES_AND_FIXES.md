# 🚨 CRITICAL ISSUES & COMPREHENSIVE FIX PLAN

**Status:** Issues Identified & Solutions Mapped  
**Priority:** HIGH - Fixes Required  

---

## 📋 ISSUE #1: School Admin Logging in as Student

**Error:** Gateway International admin logs in but dashboard shows as STUDENT  
**Root Cause:** Auth service not properly fetching user profile role  
**Location:** `src/services/auth.service.ts` - `getCurrentUser()` method

**Fix:** Verify user role from users table, not just metadata

---

## 📋 ISSUE #2: API Errors (400/406) on Student Dashboard

### Error Details:
```
GET https://.../rest/v1/schools?select=*&id=eq.undefined 400 (Bad Request)
GET https://.../rest/v1/students?select=id&user_id=eq.cc6f26... 406 (Not Acceptable)
```

### Root Causes:
1. **Undefined school_id query** - When `currentUser.schoolId` is undefined
2. **Undefined student_id query** - When `profileData?.id` is still loading
3. **Queries before data ready** - Race conditions between dependencies

### Files to Fix:
- `src/app/student/dashboard/page.tsx` (line 54-71)
- `src/app/teacher/dashboard/page.tsx` 
- `src/app/student/cbt-portal/page.tsx`

### Solution Pattern:
```typescript
// BEFORE (causes 400/406):
const { data: profileData } = await supabase
  .from('students')
  .select('*')
  .eq('user_id', currentUser.id)
  .single()

// THEN (using undefined profileData.id):
const { data: subjectsData } = await supabase
  .from('student_subjects')
  .select('*')
  .eq('student_id', profileData?.id)  // FAILS!

// AFTER (fix with error handling):
let profileData = null
try {
  const response = await supabase
    .from('students')
    .select('*')
    .eq('user_id', currentUser.id)
    .single()
  profileData = response.data
  if (response.error) throw response.error
} catch (err) {
  console.warn('Student profile not found:', err)
  // Handle gracefully
}

// Only query subjects if we have profileData
if (profileData?.id) {
  const { data: subjectsData } = await supabase
    .from('student_subjects')
    .select('*')
    .eq('student_id', profileData.id)
  setSubjects(subjectsData || [])
}
```

---

## 📋 ISSUE #3: School Logo & Name Not Displaying in Dashboards

**Missing From:**
- ❌ Student dashboard header
- ❌ Teacher dashboard header
- ❌ Staff dashboard header
- ❌ School admin dashboard header
- ❌ CBT portal header

**Fix:** Add header component with school branding

**Implementation:**
```typescript
// Create: src/components/DashboardHeader.tsx
export function DashboardHeader({ school, user, darkMode, onThemeToggle }) {
  return (
    <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {school?.logo_url && (
            <img src={school.logo_url} alt={school.name} className="h-12 w-12 rounded-full" />
          )}
          <div>
            <h2 className="text-xl font-bold">{school?.name}</h2>
            <p className="text-purple-100">{user?.name} • {user?.role}</p>
          </div>
        </div>
        <div className="flex gap-3 items-center">
          <button onClick={onThemeToggle}>
            {darkMode ? '☀️' : '🌙'}
          </button>
          <button onClick={onLogout} className="bg-red-600 px-4 py-2 rounded">
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}
```

---

## 📋 ISSUE #4: Student Pages Not Fully Responsive

**Issues on Mobile:**
- ❌ Header text overflow
- ❌ Tab navigation cramped
- ❌ Cards too narrow
- ❌ Tables overflow not handled
- ❌ Grid gaps too large

**Solution:** Add tailwind responsive classes & mobile-first approach

**Fix Pattern:**
```tsx
// BEFORE:
<div className="grid grid-cols-4 gap-6">

// AFTER (mobile-first):
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
```

---

## 📋 ISSUE #5: Real-Time Data Updates Not Implemented

**Current Issue:** Data loads once on mount, no live updates

**Solution:** Add Supabase real-time subscriptions

```typescript
// After initial load:
const subscription = supabase
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'score_sheets',
      filter: `student_id=eq.${profileData.id}`,
    },
    (payload) => {
      console.log('New update:', payload)
      // Refresh grades
      loadGrades()
    }
  )
  .subscribe()

// Cleanup:
return () => {
  subscription.unsubscribe()
}
```

---

## 📋 ISSUE #6: Student Subject Add/Remove Without Teacher Confirmation

**Requirement:** 
- Students can request to add/remove subjects
- Teachers must approve requests
- Link class/subject to student

**Implementation:**

### 1. Create request table
```sql
CREATE TABLE student_subject_requests (
  id UUID PRIMARY KEY,
  student_id UUID REFERENCES students(id),
  subject_id UUID REFERENCES subjects(id),
  action VARCHAR(20), -- 'ADD' or 'REMOVE'
  status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
  requested_at TIMESTAMP,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  reason TEXT
);
```

### 2. Add UI to student dashboard
```tsx
// Subject management section
<button onClick={() => setShowAddSubject(true)}>+ Add Subject</button>

// Modal to request subject
<Modal>
  <select>{availableSubjects}</select>
  <textarea placeholder="Why do you need this subject?"></textarea>
  <button onClick={requestSubjectAdd}>Request</button>
</Modal>
```

### 3. Add teacher approval page
```tsx
// /teacher/student-subject-requests
const [requests, setRequests] = useState([])

const approveRequest = async (requestId) => {
  await fetch('/api/teacher/approve-subject-request', {
    method: 'POST',
    body: JSON.stringify({ request_id: requestId, approved: true })
  })
}
```

### 4. Create API endpoint
```typescript
// /api/teacher/approve-subject-request
export async function POST(req: NextRequest) {
  const { request_id, approved } = await req.json()
  
  if (approved) {
    // Add to student_subjects
    await supabase
      .from('student_subjects')
      .insert({ ... })
    
    // Update request status
    await supabase
      .from('student_subject_requests')
      .update({ status: 'APPROVED', approved_by: teacherId })
      .eq('id', request_id)
  }
}
```

---

## 📋 ISSUE #7: Role Mismatch - Admin Showing as Student

**Fix:** Verify role from users table, not just session

```typescript
// In auth.service.ts getCurrentUser():
const { data: { user }, error: userError } = await supabase.auth.getUser()

if (user) {
  // PRIMARY: Get role from users table
  const { data: userRecord } = await supabase
    .from('users')
    .select('role, school_id')
    .eq('id', user.id)
    .single()
  
  if (userRecord) {
    return {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || 'User',
      role: userRecord.role, // Use database role, not metadata
      schoolId: userRecord.school_id,
      ...
    }
  }
}
```

---

## 🛠️ FILES TO MODIFY (Priority Order)

### CRITICAL (Do First):
1. ✅ `src/services/auth.service.ts` - Fix role verification
2. ✅ `src/app/student/dashboard/page.tsx` - Fix API errors
3. ✅ `src/app/teacher/dashboard/page.tsx` - Fix API errors
4. ✅ `src/app/student/cbt-portal/page.tsx` - Fix API errors

### HIGH (Do Second):
5. ✅ Create `src/components/DashboardHeader.tsx` - School branding
6. ✅ Update all dashboard pages - Add header component
7. ✅ `src/app/student/dashboard/page.tsx` - Responsive fixes
8. ✅ `src/app/student/cbt-portal/page.tsx` - Responsive fixes

### MEDIUM (Do Third):
9. ✅ Add real-time subscriptions to dashboards
10. ✅ Create student subject request system
11. ✅ Create teacher approval endpoints

### LOW (Do Last):
12. ✅ Staff dashboard header
13. ✅ Animations & polish

---

## 📊 IMPLEMENTATION CHECKLIST

### Auth Fix:
- [ ] Update `getCurrentUser()` to fetch role from users table
- [ ] Test with school admin login
- [ ] Verify correct role displays

### API Error Fixes:
- [ ] Add error handling in student dashboard
- [ ] Add error handling in teacher dashboard
- [ ] Add error handling in CBT portal
- [ ] Test with missing data

### School Branding:
- [ ] Create DashboardHeader component
- [ ] Add to student dashboard
- [ ] Add to teacher dashboard
- [ ] Add to school admin dashboard
- [ ] Add to CBT portal
- [ ] Verify logos display

### Responsive Design:
- [ ] Test on mobile (375px)
- [ ] Test on tablet (768px)
- [ ] Test on desktop (1024px)
- [ ] Fix header overflow
- [ ] Fix tab overflow
- [ ] Fix card sizing

### Real-Time Updates:
- [ ] Add Supabase subscriptions to student dashboard
- [ ] Add refresh button
- [ ] Test live updates

### Subject Management:
- [ ] Create request table
- [ ] Add request UI to student dashboard
- [ ] Create teacher approval page
- [ ] Add approval API endpoint
- [ ] Test full flow

---

## 🚀 ESTIMATED TIME

| Task | Time |
|------|------|
| Auth fix | 15 min |
| API error fixes | 20 min |
| School branding | 25 min |
| Responsive fixes | 30 min |
| Real-time updates | 20 min |
| Subject management | 40 min |
| **Total** | **~2.5 hours** |

---

## ✅ TESTING CHECKLIST

- [ ] School admin logs in with correct role
- [ ] Student dashboard loads without 400/406 errors
- [ ] School logo displays in all dashboards
- [ ] School name displays in all dashboards
- [ ] Mobile layout works (< 768px)
- [ ] Tablet layout works (768-1024px)
- [ ] Desktop layout works (>1024px)
- [ ] Real-time grade updates work
- [ ] Student can request subject addition
- [ ] Teacher can approve subject request
- [ ] No console errors

---

## 📝 NEXT STEPS

1. Wait for approval to proceed
2. Start with critical auth fix
3. Move to API error fixes
4. Add school branding
5. Fix responsive issues
6. Implement real-time updates
7. Add subject management system
8. Full testing

**All fixes documented and ready to implement.**
