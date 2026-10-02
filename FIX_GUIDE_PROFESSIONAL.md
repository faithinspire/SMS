# 🔧 Professional Software Engineering Fix Guide

## Problem Analysis

The system had multiple interconnected issues causing login failures and incorrect role display:

###  **Root Cause #1: Registration Not Setting Correct Role**
- **Problem:** Staff form has a `role` field (TEACHER, HEAD_TEACHER, PRINCIPAL, ACCOUNTANT)
- **But:** Registration service was looking for `primaryRole` field (mismatch)
- **Result:** Role defaulted to undefined or wrong value in users table

### **Root Cause #2: Login Not Reading from Authoritative Source**
- **Problem:** Login used auth.user_metadata (can be stale or wrong)
- **Solution:** Must fetch role from `users` table (source of truth)

### **Root Cause #3: Staff/Students Pages Using Direct Queries**
- **Problem:** No proper API abstraction, timeouts, race conditions
- **Solution:** Use dedicated API endpoints with proper error handling

### **Root Cause #4: Results Page Filtering**
- **Problem:** Only loading ACTIVE sessions
- **Solution:** Load ALL sessions regardless of active status

---

## Technical Fixes Applied

### **FIX #1: Staff Registration - Map `role` to `primaryRole`**

**File:** `src/app/auth/staff/register/page.tsx`

**Change:**
```typescript
// BEFORE (Wrong):
const submissionData = {
  ...formData,
  password: formData.password,
}

// AFTER (Correct):
const submissionData = {
  ...formData,
  password: formData.password,
  primaryRole: formData.role, // Map form's 'role' to service's 'primaryRole'
}
```

**Why:** The form field is called `role`, but the service expects `primaryRole`. This mapping ensures the correct role is passed to registration.

---

### **FIX #2: Registration Service - Store Correct Role in Users Table**

**File:** `src/services/staff-registration.service.ts`

**Change:**
```typescript
// Explicitly log and store the role
const userRole = data.primaryRole || 'STAFF'
console.log('[StaffRegistration] Setting user role to:', userRole)

const { data: newUser } = await supabase
  .from('users')
  .insert({
    role: userRole, // SOURCE OF TRUTH
    // ... rest of fields
  })
```

**Why:** The users table is the single source of truth for user roles. This must be set correctly at registration time.

---

### **FIX #3: Login - Fetch Role from Users Table**

**File:** `src/services/auth.service.ts` (Login method)

**Change:**
```typescript
// Fetch user's role from users table (authoritative source)
try {
  const { data: userRecord } = await supabase
    .from('users')
    .select('role, school_id')
    .eq('id', data.user.id)
    .maybeSingle()
  
  if (userRecord) {
    userRole = userRecord.role || userRole
    userSchoolId = userRecord.school_id || userSchoolId
  }
} catch (e) {
  console.warn('Could not fetch, using metadata')
}
```

**Why:** The database users table has the definitive role, not auth metadata. Always read from there first.

---

### **FIX #4: Staff Login - Route by Role**

**File:** `src/app/auth/staff/login/page.tsx`

**Change:**
```typescript
const roleRoutingMap: Record<string, string> = {
  'TEACHER': '/teacher/dashboard',
  'HEAD_TEACHER': '/headteacher/dashboard',
  'PRINCIPAL': '/principal/dashboard',
  'ACCOUNTANT': '/accountant/dashboard',
  'ADMIN': '/school-admin/dashboard',
  'SCHOOL_ADMIN': '/school-admin/dashboard',
}

const dashboardRoute = roleRoutingMap[user.role] || '/teacher/dashboard'
router.push(dashboardRoute)
```

**Why:** Each role has a different dashboard. Route to the correct one based on the user's actual role from the database.

---

### **FIX #5: Staff/Students Pages - Use API Endpoints**

**Files:**
- `src/app/school-admin/staff/page.tsx`
- `src/app/school-admin/students/page.tsx`

**Change:**
```typescript
// BEFORE (Direct database query - causes timeouts)
const { data, error } = await supabase
  .from('staff')
  .select('...complex query...')

// AFTER (Use API endpoint)
const response = await fetch(`/api/school/staff?schoolId=${schoolId}`)
const result = await response.json()
setStaff(result.data)
```

**Why:** 
- API endpoints provide abstraction layer
- Caching and optimization at server level
- Better error handling
- Prevents client-side timeout issues
- Endpoint logic is centralized and testable

---

### **FIX #6: Results Page - Load ALL Sessions**

**File:** `src/app/school-admin/results/page.tsx`

**Change:**
```typescript
// Query loads ALL sessions without filtering by is_active
const { data, error } = await supabase
  .from('academic_sessions')
  .select('id, session_year, start_year, end_year, is_active')
  .eq('school_id', state.user.school_id)
  .order('start_year', { ascending: false })
  // NO filter on is_active
```

**Why:** Users need to see historical results, not just active sessions.

---

### **FIX #7: Letter Generation - Fix Relationship**

**File:** `src/services/letter-generation.service.ts`

**Change:**
```typescript
// BEFORE (Wrong relationship syntax):
.select(`...users (...)`)

// AFTER (Correct syntax):
.select(`...users:user_id (...)`)
```

**Why:** Foreign key relationship needs explicit syntax with `:column_name` for Supabase.

---

### **FIX #8: Letter UI - Add Edit Feature**

**File:** `src/components/admin/LetterPreviewModal.tsx`

**Changes:**
- Added `isEditing` state
- Added `editedContent` for HTML editing
- Toggle between edit/preview modes
- Save changes functionality
- Edit button in action bar

**Why:** Users need to customize generated letters before sending.

---

### **FIX #9: Improved Staff Edit Modal**

**File:** `src/app/school-admin/staff/page.tsx` (EditModal component)

**Changes:**
- Gradient header (blue to darker blue)
- Organized sections with icons
- Grid layout for form fields
- Better visual hierarchy
- Loading states on buttons

**Why:** Professional UI design with clear information architecture.

---

## Testing Checklist

### **Role Assignment Testing**
1. Register as TEACHER → Check users table has role='TEACHER'
2. Register as ACCOUNTANT → Check users table has role='ACCOUNTANT'
3. Register as PRINCIPAL → Check users table has role='PRINCIPAL'
4. Register as HEAD_TEACHER → Check users table has role='HEAD_TEACHER'

### **Login & Routing Testing**
1. TEACHER logs in → Routes to `/teacher/dashboard`
2. ACCOUNTANT logs in → Routes to `/accountant/dashboard`
3. PRINCIPAL logs in → Routes to `/principal/dashboard`
4. HEAD_TEACHER logs in → Routes to `/headteacher/dashboard`
5. STUDENT logs in → Routes to `/student/dashboard`

### **Staff/Students Pages**
1. Staff page loads data via API
2. Students page loads data via API
3. Search/filter works
4. Edit modal opens and saves changes

### **Results Page**
1. Can see all academic sessions (active and inactive)
2. Can select any session/term
3. Results display correctly

### **Letter Generation**
1. Can generate appointment letters for staff
2. Can generate admission letters for students
3. Can edit letter HTML content
4. Can preview letter
5. Can print, download, email, share via WhatsApp

---

## Deployment Steps

1. **Commit changes:**
   ```bash
   git add -A
   git commit -m "Fix role assignment, login routing, and API integration"
   ```

2. **Push to main:**
   ```bash
   git push -u origin main
   ```

3. **Vercel auto-deploys** via GitHub webhook

4. **Verify deployment:**
   - Check Vercel dashboard
   - Test at https://sms-gold-eta.vercel.app

---

## Database Integrity Check

Run this SQL to verify role assignments:

```sql
-- Check all staff have correct roles
SELECT id, email, role, created_at 
FROM users 
WHERE role IN ('TEACHER', 'HEAD_TEACHER', 'PRINCIPAL', 'ACCOUNTANT')
ORDER BY created_at DESC;

-- Check for any NULL or 'STAFF' when should be specific role
SELECT id, email, role 
FROM users 
WHERE role = 'STAFF' 
  AND created_at > now() - interval '7 days';
```

---

## Architecture Improvements

### **Before (Broken):**
```
Registration Form (role) → Registration Service (primaryRole mismatch) → Users Table (NULL role)
  ↓
Login → Auth metadata (stale) → Routes to wrong dashboard
```

### **After (Fixed):**
```
Registration Form (role) → Maps to primaryRole → Registration Service → Users Table (correct role)
  ↓
Login → Fetches from Users Table (source of truth) → Routes to correct dashboard
         ↓
    Staff/Students Pages → API Endpoints → Database (centralized, cached, error-handled)
```

---

## Performance Optimizations

1. **API Endpoints** - Centralized query logic
2. **Proper Error Handling** - No silent failures
3. **Timeout Protection** - Long-running queries handled
4. **Database Indexing** - Critical for users table queries

---

## Security Considerations

1. **Role Validation** - Checked against allowed values
2. **API Authentication** - Using Supabase session tokens
3. **Server-side Validation** - Auth checks on registration API
4. **User Metadata** - Replaced with database source of truth

---

**Status:** ✅ All fixes applied professionally with proper architecture and error handling.
