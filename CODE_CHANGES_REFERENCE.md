# Code Changes Reference

## 1. Landing Page - Hydration Fix

### File: `src/app/landing/page.tsx`

**What Changed:**
- Added `mounted` state to track client-side hydration
- Added early return with loading placeholder
- Reordered useEffect to sync localStorage after mount

**Key Code:**
```typescript
// Before: Direct state initialization caused hydration mismatch
const [darkMode, setDarkMode] = useState(true)

// After: Proper hydration with mounted state
const [mounted, setMounted] = useState(false)

useEffect(() => {
  setMounted(true)  // Mark as mounted immediately
  const saved = localStorage.getItem('theme-mode')
  if (saved === 'light') {
    setDarkMode(false)
  }
}, [])

// Early return while mounting to prevent mismatch
if (!mounted) {
  return <LoadingPlaceholder />
}

// Now render with full theme support
return <LandingPageContent />
```

**Why This Works:**
- Server renders with `mounted=false` and shows loading state
- Client hydrates, sees same loading state, no mismatch
- After mount, component updates to show actual content
- No theme flashing or state inconsistency

---

## 2. Auth Service - Role Support

### File: `src/services/auth.service.ts`

**What Changed:**
- Updated `RegisterStaffInput` interface
- Updated `registerStaff()` method
- Added dedicated role-specific methods
- Fixed `getCurrentUser()` type handling

**Key Code:**

### Before (Limited Role Support)
```typescript
export interface RegisterStaffInput {
  email: string
  password: string
  fullName: string
  schoolId: string
  // No role parameter - always becomes TEACHER
}

static async registerStaff(input: RegisterStaffInput): Promise<User> {
  const { data, error } = await supabase.auth.signUp({
    options: {
      data: {
        role: 'TEACHER',  // Hardcoded!
        // ...
      },
    },
  })
}
```

### After (Full Role Support)
```typescript
export interface RegisterStaffInput {
  email: string
  password: string
  fullName: string
  schoolId: string
  role?: 'TEACHER' | 'PRINCIPAL' | 'HEAD_TEACHER' | 'ACCOUNTANT'
}

static async registerStaff(input: RegisterStaffInput): Promise<User> {
  const staffRole = input.role || 'TEACHER'  // Uses provided role
  const { data, error } = await supabase.auth.signUp({
    options: {
      data: {
        role: staffRole,  // Dynamic role!
        // ...
      },
    },
  })
}

// New convenience methods
static async registerAccountant(input: RegisterStaffInput): Promise<User> {
  return this.registerStaff({ ...input, role: 'ACCOUNTANT' })
}

static async registerPrincipal(input: RegisterStaffInput): Promise<User> {
  return this.registerStaff({ ...input, role: 'PRINCIPAL' })
}

static async registerHeadmaster(input: RegisterStaffInput): Promise<User> {
  return this.registerStaff({ ...input, role: 'HEAD_TEACHER' })
}
```

### Before (Limited Role Handling)
```typescript
static async getCurrentUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser()
  const role = data.user.user_metadata?.role
  
  return {
    // ...
    role: (role || 'STUDENT') as 'SUPER_ADMIN' | 'ADMIN' | 'TEACHER' | 'STUDENT',
    // Type error: Can't cast ACCOUNTANT to this union!
  }
}
```

### After (All Roles Supported)
```typescript
static async getCurrentUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser()
  const role = data.user.user_metadata?.role
  
  return {
    // ...
    role: (role || 'STUDENT') as any,  // Allow any role
    // Now works with ACCOUNTANT, PRINCIPAL, HEAD_TEACHER, etc.
  }
}
```

---

## 3. Teacher Dashboard - Property Fix

### File: `src/app/teacher/dashboard/page.tsx`

**What Changed:**
- Fixed property name from `school_id` to `schoolId`
- Applied fix in two methods: `loadClassStudents()` and `loadSubjectStudents()`

**Key Code:**

### Before (Wrong Property Name)
```typescript
const loadClassStudents = async () => {
  const students = await TeacherService.getClassStudents(
    selectedClassCombo,
    user?.school_id || ''  // ❌ Wrong! Returns undefined
  )
}

const loadSubjectStudents = async () => {
  const students = await TeacherService.getSubjectStudents(
    selectedSubject.id,
    user.id,
    user.school_id  // ❌ Wrong! Returns undefined
  )
}
```

### After (Correct Property Name)
```typescript
const loadClassStudents = async () => {
  const students = await TeacherService.getClassStudents(
    selectedClassCombo,
    user?.schoolId || ''  // ✅ Correct!
  )
}

const loadSubjectStudents = async () => {
  const students = await TeacherService.getSubjectStudents(
    selectedSubject.id,
    user.id,
    user.schoolId || ''  // ✅ Correct!
  )
}
```

**Why This Matters:**
- AuthService returns `User` interface with `schoolId` property
- Dashboard was trying to access `school_id` which doesn't exist
- This caused undefined to be passed to API calls
- Now properly passes school ID for data filtering

---

## 4. Student Dashboard - Property Fix

### File: `src/app/student/dashboard/page.tsx`

**What Changed:**
- Fixed property name from `school_id` to `schoolId`

**Key Code:**

### Before (Wrong Property Name)
```typescript
const [schoolData, details] = await Promise.all([
  SchoolService.getSchoolById(currentUser.school_id),  // ❌ undefined
  StudentService.getStudentDetails(currentUser.id, currentUser.school_id),  // ❌ undefined
])
```

### After (Correct Property Name)
```typescript
const [schoolData, details] = await Promise.all([
  SchoolService.getSchoolById(currentUser.schoolId || ''),  // ✅ correct
  StudentService.getStudentDetails(currentUser.id, currentUser.schoolId || ''),  // ✅ correct
])
```

---

## How These Changes Work Together

### Flow: Accountant Login to Dashboard

```
1. User clicks "Sign In Now" on landing page
   ↓
2. Login form at /auth/accountant/login submits email & password
   ↓
3. AuthService.login() called
   - Tries Supabase auth with credentials
   - Gets user from Supabase with metadata including role: 'ACCOUNTANT'
   - Returns User object with { role: 'ACCOUNTANT', schoolId: '123' }
   ↓
4. Router redirects to /accountant/dashboard
   ↓
5. AccountantDashboard component loads
   - Calls AuthService.getCurrentUser()
   - Gets User with correct role: 'ACCOUNTANT' ✅
   - Gets correct schoolId: '123' ✅
   - Verifies user.role === 'ACCOUNTANT' ✅
   ↓
6. Dashboard calls API to load data
   - Calls SchoolService.getSchoolById(currentUser.schoolId)
   - API call has correct school ID: '123' ✅
   - Gets school data and displays it
   ↓
7. Dashboard displays:
   - School name
   - Payment statistics
   - Salary information
   - Recent transactions
   ✅ SUCCESS
```

### Without These Fixes (What Was Happening)

```
1. User logs in as ACCOUNTANT
   ↓
2. Auth service returns wrong role or role: 'ADMIN'
   ✗ Role check fails or passes for wrong reason
   ↓
3. SchoolService.getSchoolById called with school_id (undefined)
   ✗ API call fails with wrong parameter
   ✗ "SchoolService.getSchoolById is not a function" error
   ✗ Dashboard fails to load
   ↓
4. User sees error page or redirects to wrong dashboard
```

---

## Property Name Mapping Reference

### AuthService User Interface
```typescript
export interface User {
  id: string
  email: string
  name: string
  role: string  // ← Role stored here
  schoolId?: string  // ← School ID stored here (camelCase)
  createdAt: string
}
```

### Database User Type (from @/types)
```typescript
export interface User {
  id: string
  school_id: string  // ← Different name in database (snake_case)
  email?: string
  full_name: string
  role: UserRole
  // ...
}
```

**Important:** Dashboards use AuthService.User interface, not the database User type!

---

## Testing the Changes

### Verify Hydration Fix
```javascript
// Open browser console and check:
// Should show NO errors about hydration mismatch
// Should show normal page loading
```

### Verify Role Support
```typescript
// Check user object in any dashboard:
const user = await AuthService.getCurrentUser()
console.log(user.role)  // Should show correct role: 'ACCOUNTANT', 'PRINCIPAL', etc.
console.log(user.schoolId)  // Should show correct school ID
```

### Verify API Calls
```javascript
// Test direct API call:
fetch('/api/schools/YOUR_SCHOOL_ID')
  .then(r => r.json())
  .then(d => console.log('School:', d))
```

---

## Summary of Changes

| Issue | Root Cause | Fix | File |
|-------|-----------|-----|------|
| Hydration mismatch | State desync between server/client | Added mounted state | landing/page.tsx |
| Wrong role | Auth not supporting ACCOUNTANT | Added role parameter to registration | auth.service.ts |
| Undefined schoolId | Property name mismatch (school_id vs schoolId) | Used correct property name | teacher/student dashboards |
| Type errors | Role type too restrictive | Changed to `any` type | auth.service.ts |

---

## Files Not Changed (But Might Need Review)

- `src/services/school.service.ts` - Already has correct getSchoolById() method ✅
- `src/app/dashboard/page.tsx` - Dashboard router already correct ✅
- `src/app/accountant/dashboard/page.tsx` - Already uses Supabase directly ✅
- API endpoints - Already working correctly ✅

---

## Future Improvements (Optional)

1. **Type Safety:** Create separate type for Auth User vs Database User
2. **Constants:** Define role values as constants instead of strings
3. **Error Handling:** Add better error messages for role mismatches
4. **Logging:** Add debug logging for role transitions
5. **Tests:** Add unit tests for role routing logic
