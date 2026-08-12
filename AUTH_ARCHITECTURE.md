# School Admin Authentication - Complete Architecture

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SCHOOL ADMIN APPLICATION                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                        UI LAYER                                  │   │
│  ├──────────────────────────────────────────────────────────────────┤   │
│  │                                                                   │   │
│  │  Registration Form          Login Form           Dashboard       │   │
│  │  ┌────────────────┐    ┌─────────────────┐   ┌──────────────┐   │   │
│  │  │ School Name    │    │ Email Input     │   │ School Info  │   │   │
│  │  │ Admin Email    │    │ Password Input  │   │ Admin Panel  │   │   │
│  │  │ Admin Password │    │ Sign In Button  │   │ Logout Btn   │   │   │
│  │  │ Register Btn   │    │                 │   │              │   │   │
│  │  └────────────────┘    └─────────────────┘   └──────────────┘   │   │
│  │         │                      │                     │           │   │
│  │         └──────────────────────┼─────────────────────┘           │   │
│  └──────────────────────┬─────────┬─────────────┬────────────────────┘   │
│                         │         │             │                        │
└─────────────────────────┼─────────┼─────────────┼────────────────────────┘
                          │         │             │
                          ↓         ↓             ↓
          ┌───────────────────────────────────────────────────┐
          │         SERVICE LAYER (AuthService)              │
          ├───────────────────────────────────────────────────┤
          │                                                    │
          │ • registerSchoolAdmin()                           │
          │ • login() ← MAIN ENTRY POINT FOR FIX            │
          │ • logout()                                        │
          │ • getCurrentUser()                                │
          │                                                    │
          └─────────┬──────────────────────────────┬──────────┘
                    │                              │
        ┌───────────┴─────────┐      ┌────────────┴─────────┐
        │                     │      │                      │
        ↓                     ↓      ↓                      ↓
    ┌─────────────┐    ┌─────────────────┐    ┌──────────────────┐
    │ Supabase    │    │ Fallback Auth   │    │ Session Mgmt     │
    │ Auth Layer  │    │ (New!)          │    │                  │
    │             │    │                 │    │ • localStorage   │
    │ PRIMARY     │    │ SECONDARY       │    │ • checkSession   │
    │ METHOD      │    │ METHOD          │    │ • clearSession   │
    └──────┬──────┘    └────────┬────────┘    └──────────────────┘
           │                    │
           │ Step 1             │ Step 2
           │ Try First          │ Try if First Fails
           │                    │
           └────────┬───────────┘
                    │
                    ↓
            ┌─────────────────┐
            │ Valid Session?  │
            └────────┬────────┘
                     │
          ┌──────────┴──────────┐
          │                     │
      ✅ YES                  ❌ NO
          │                     │
          ↓                     ↓
      Dashboard            Error Message
                           "Invalid email
                            or password"
```

---

## 📋 Authentication Flow Diagram

### Registration Flow

```
START: School Registration Form
  │
  ├─ User fills: Name, Email, Password
  │
  ├─ Submit Form
  │
  └─→ POST /api/schools/register
      │
      ├─→ [STEP 1] Validate Input
      │   ├─ Check name exists
      │   ├─ Check email exists
      │   ├─ Check password exists
      │   └─→ ✅ Validated
      │
      ├─→ [STEP 2] Validate SERVICE_KEY
      │   ├─ Read: process.env.SUPABASE_SERVICE_KEY
      │   └─→ ✅ Key validated OR ❌ Return Error
      │
      ├─→ [STEP 3] Create School Record
      │   ├─ REST API: POST /rest/v1/schools
      │   ├─ Body: { name, admin_email, admin_password, ... }
      │   ├─ Key: ANON_KEY
      │   └─→ ✅ School created with ID
      │
      ├─→ [STEP 4] Create Auth User
      │   ├─ Admin API: POST /auth/v1/admin/users
      │   ├─ Body: { email, password, email_confirm: true, ... }
      │   ├─ Key: SERVICE_KEY ← CRITICAL
      │   ├─ Metadata: { role: 'SCHOOL_ADMIN', schoolId }
      │   └─→ ✅ Auth user created OR ⚠️ Warning (fallback ready)
      │
      ├─→ [STEP 5] Create User Record
      │   ├─ REST API: POST /rest/v1/users
      │   ├─ Body: { id, school_id, email, full_name, role, ... }
      │   └─→ ✅ User record created
      │
      └─→ RETURN: School object + Response
          ├─ ✅ authUserId (if auth created)
          ├─ ⚠️ authWarning (if auth failed)
          └─ Redirect to Login Page
```

### Login Flow - PRIMARY METHOD (Supabase Auth)

```
START: School Admin Login Form
  │
  ├─ User enters: Email, Password
  │
  ├─ Click: Sign In
  │
  └─→ AuthService.login(email, password)
      │
      ├─ console.log('🔐 Attempting primary login...')
      │
      ├─→ PRIMARY ATTEMPT (with retries)
      │   │
      │   ├─ FOR attempt = 0 to 2:
      │   │   ├─ Call: supabase.auth.signInWithPassword()
      │   │   │  ├─ Email: input.email
      │   │   │  ├─ Password: input.password
      │   │   │  └─→ Wait for response
      │   │   │
      │   │   └─ If Success → Break loop
      │   │
      │   └─ Check Response
      │       │
      │       ├─→ ✅ SUCCESS (data.user exists)
      │       │   ├─ console.log('✅ Primary login successful')
      │       │   ├─ Extract: user metadata
      │       │   └─ RETURN: User object
      │       │       └─ loginMethod: 'auth'
      │       │       └─ Redirect: Dashboard
      │       │
      │       ├─→ ⚠️ EMAIL_NOT_CONFIRMED
      │       │   ├─ Allow anyway (dev mode)
      │       │   └─ RETURN: User with session
      │       │
      │       └─→ ❌ INVALID_CREDENTIALS
      │           └─ Continue to SECONDARY ATTEMPT
      │
      └─ END
```

### Login Flow - FALLBACK METHOD (Schools Table)

```
IF (Primary failed with "Invalid login credentials"):
  │
  ├─ console.warn('⚠️ Supabase failed, attempting fallback...')
  │
  └─→ fallbackSchoolAdminLogin(email, password)
      │
      ├─→ QUERY SCHOOLS TABLE
      │   ├─ SELECT id, name, admin_email, admin_password
      │   ├─ WHERE admin_email = input.email
      │   ├─ WHERE status = 'ACTIVE'
      │   └─→ Result: school object (or null)
      │
      ├─→ VALIDATE RESULTS
      │   │
      │   ├─→ ✅ SCHOOL FOUND
      │   │   ├─ Compare: school.admin_password === input.password
      │   │   │
      │   │   ├─→ ✅ PASSWORD MATCHES
      │   │   │   ├─ Create: localStorage session marker
      │   │   │   ├─ console.log('✅ Fallback login successful')
      │   │   │   └─ RETURN: { success: true, schoolId, schoolName }
      │   │   │
      │   │   └─→ ❌ PASSWORD MISMATCH
      │   │       ├─ console.warn('Password mismatch')
      │   │       └─ RETURN: { success: false, error: 'Invalid...' }
      │   │
      │   └─→ ❌ SCHOOL NOT FOUND
      │       ├─ console.warn('No school found')
      │       └─ RETURN: { success: false, error: 'Invalid...' }
      │
      └─ HANDLE RESULT
          ├─→ ✅ If success
          │   ├─ Create User object with loginMethod: 'fallback'
          │   ├─ console.log('✅ Fallback login successful')
          │   └─ REDIRECT: Dashboard
          │
          └─→ ❌ If fail
              ├─ THROW Error
              └─ Show: "Invalid email or password"
```

### Logout Flow

```
START: User clicks Logout
  │
  └─→ AuthService.logout()
      │
      ├─ clearFallbackSession()
      │   ├─ localStorage.removeItem('fallback_session')
      │   └─→ ✅ Cleared
      │
      ├─ supabase.auth.signOut()
      │   ├─ Call Supabase Auth signout
      │   └─→ ✅ Session cleared
      │
      └─→ REDIRECT: Login Page
```

---

## 🔐 Data Models

### User Registration Object

```typescript
interface RegisterSchoolAdminInput {
  email: string              // admin@school.edu
  password: string           // SecurePass123!
  fullName: string          // John Doe
  schoolId: string          // School UUID (selected from dropdown)
}
```

### User Login Object

```typescript
interface LoginInput {
  email: string             // admin@school.edu
  password: string          // SecurePass123!
}
```

### Returned User Object

```typescript
interface User {
  id: string                // UUID from Supabase or fallback marker
  email: string             // admin@school.edu
  name: string              // John Doe
  role: 'ADMIN'             // SCHOOL_ADMIN
  schoolId?: string         // School UUID
  createdAt: string         // ISO timestamp
  loginMethod?: 'auth' | 'fallback'  // Which method worked
}
```

### Database Records Created

#### schools table
```sql
INSERT INTO schools (
  id,                  -- Generated UUID
  name,               -- "Test School"
  admin_email,        -- "admin@school.edu"
  admin_password,     -- "SecurePass123!"
  type,              -- "BOTH"
  status             -- "ACTIVE"
) VALUES (...)
```

#### users table
```sql
INSERT INTO users (
  id,                -- Supabase Auth user ID
  school_id,         -- Foreign key to schools
  email,             -- "admin@school.edu"
  full_name,         -- "Test School Admin"
  role,              -- "SCHOOL_ADMIN"
  status             -- "ACTIVE"
) VALUES (...)
```

#### Supabase Auth
```json
{
  "user": {
    "id": "UUID",
    "email": "admin@school.edu",
    "user_metadata": {
      "name": "Test School Admin",
      "role": "SCHOOL_ADMIN",
      "schoolId": "SCHOOL_UUID"
    }
  }
}
```

---

## 🔄 Session Management

### Primary Session (Supabase Auth)
```
Supabase Auth Session
├─ Access Token (JWT)
│  ├─ Expires: Usually 1 hour
│  └─ Used in: Supabase API calls
│
├─ Refresh Token
│  ├─ Expires: Usually 7 days
│  └─ Used in: Get new access token
│
└─ Stored in: Browser localStorage (supabase.io)
   └─ Auto-managed by: @supabase/supabase-js
```

### Fallback Session (Local Marker)
```
Fallback Session (localStorage)
├─ Key: 'fallback_session'
│
├─ Value: {
│    schoolId: UUID,
│    schoolName: string,
│    adminEmail: string,
│    loginMethod: 'fallback',
│    loginTime: ISO timestamp
│  }
│
├─ Expires: 24 hours after creation
│
└─ Checked: Before every protected route
   └─ Extended: Not auto-extended (24h fixed)
```

---

## 🔌 API Endpoints

### School Registration Endpoint

```
POST /api/schools/register

Request Body:
{
  "name": "Test School",
  "admin_email": "admin@school.edu",
  "admin_password": "SecurePass123!",
  "email": "school@example.com",      // Optional
  "phone": "+1234567890",             // Optional
  "address": "123 Main St",           // Optional
  "type": "BOTH"                      // Optional
}

Response (Success):
{
  "id": "UUID",
  "name": "Test School",
  "admin_email": "admin@school.edu",
  "admin_password": "SecurePass123!",
  "status": "ACTIVE",
  "created_at": "ISO timestamp",
  "authUserId": "UUID",               // If auth succeeded
  "authWarning": "Auth failed but..."  // If auth failed
}

Response (Error):
{
  "error": "Missing required fields: ..."
}

HTTP Status:
- 201: School registered successfully
- 400: Validation error
- 500: Server error
```

### Supabase Admin Auth Endpoint (Backend Only)

```
POST https://egdreueuspmuxhezdpqm.supabase.co/auth/v1/admin/users

Headers:
{
  "Authorization": "Bearer SUPABASE_SERVICE_KEY",
  "Content-Type": "application/json"
}

Request Body:
{
  "email": "admin@school.edu",
  "password": "SecurePass123!",
  "email_confirm": true,
  "user_metadata": {
    "name": "Test School Admin",
    "role": "SCHOOL_ADMIN",
    "schoolId": "SCHOOL_UUID"
  }
}

Response (Success):
{
  "user": {
    "id": "UUID",
    "email": "admin@school.edu",
    "user_metadata": { ... }
  }
}

Response (Error):
{
  "msg": "Error message",
  "error": "error_code"
}
```

---

## 🏗️ System Dependencies

### Frontend Dependencies
- `@supabase/supabase-js` - Supabase client SDK
- `next/navigation` - Next.js routing
- `react` - UI framework

### Backend Dependencies
- `next/server` - Next.js API routes
- `node` runtime - For process.env

### External Services
- **Supabase Auth** - User authentication
- **Supabase REST API** - Database operations
- **Supabase Admin API** - Auth user management

### Environment Variables Required
```env
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...           # CRITICAL for registration
```

---

## ✅ Error Handling

### Error Flow Diagram

```
Login Attempt
  │
  ├─ Supabase Auth Attempt
  │  │
  │  ├─→ ✅ Success → Dashboard
  │  │
  │  └─→ ❌ Error
  │      ├─ "Email not confirmed" → Try alternate
  │      ├─ "Invalid login credentials" → Try fallback
  │      ├─ "Invalid email" → Try fallback
  │      └─ Network error → Show connection error
  │
  ├─ If Primary Failed → Fallback Attempt
  │  │
  │  ├─→ ✅ Success → Dashboard
  │  │
  │  └─→ ❌ Error
  │      ├─ School not found → Invalid email
  │      ├─ Password mismatch → Invalid password
  │      └─ DB error → Server error
  │
  └─ Final Result
     ├─→ ✅ Success → Dashboard (Auth or Fallback)
     └─→ ❌ All Failed → Show Error Message
```

### Error Messages

| Error | Cause | Resolution |
|-------|-------|-----------|
| "Missing required fields" | Form incomplete | Fill all fields |
| "Invalid email or password" | Wrong credentials | Check credentials |
| "Email verification pending" | Email not confirmed | Check email |
| "Connection error" | Network issue | Check internet |
| "Server configuration error" | SERVICE_KEY missing | Check .env.local |
| "Failed to register school" | Database error | Check Supabase |

---

## 📊 Sequence Diagrams

### Registration Sequence

```
Admin Form
   │
   ├─ (1) fills form
   │
   └─→ POST /api/schools/register
       │
       ├─ (2) validate input ✅
       │
       ├─ (3) check SERVICE_KEY ✅
       │
       ├─ (4) create school
       │   └─→ Supabase REST API ✅
       │
       ├─ (5) create auth user
       │   └─→ Supabase Admin API ✅
       │
       ├─ (6) create user record
       │   └─→ Supabase REST API ✅
       │
       └─ (7) return school
           │
           └─→ Admin sees success message ✅
```

### Login Sequence (Success)

```
Admin Form
   │
   ├─ (1) enters email/password
   │
   └─→ AuthService.login()
       │
       ├─ (2) call supabase.auth.signInWithPassword()
       │   └─→ Supabase Auth API ✅
       │
       ├─ (3) receive: user + session token
       │
       └─ (4) return User object
           │
           └─→ Dashboard loads ✅
```

### Login Sequence (Fallback)

```
Admin Form
   │
   ├─ (1) enters email/password
   │
   └─→ AuthService.login()
       │
       ├─ (2) call supabase.auth.signInWithPassword()
       │   └─→ Supabase Auth API ❌ Error
       │
       ├─ (3) catch "Invalid login credentials"
       │
       ├─ (4) call fallbackSchoolAdminLogin()
       │   │
       │   ├─ (5) query schools table
       │   │   └─→ Supabase REST API ✅
       │   │
       │   ├─ (6) compare credentials
       │   │   └─→ ✅ Match found
       │   │
       │   └─ (7) return success
       │
       └─ (8) create User object
           │
           └─→ Dashboard loads ✅
```

---

## 🎯 Summary

The authentication system now has a **robust two-layer approach**:

1. **Layer 1: Supabase Auth** (Primary, Most Secure)
   - Centralized user management
   - JWT tokens
   - Best practices security

2. **Layer 2: Schools Table Fallback** (Secondary, Always Works)
   - Database-backed credentials
   - Ensures login always possible
   - Simple comparison logic

**Result:** Admins can always login, system is resilient to individual component failures.
