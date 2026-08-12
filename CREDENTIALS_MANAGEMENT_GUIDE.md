# School Admin Credentials Management Guide

## 📊 Database Storage

### Schools Table Schema

```sql
CREATE TABLE schools (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  logo_url VARCHAR(255),
  type VARCHAR(50), -- 'PRIMARY', 'SECONDARY', 'BOTH'
  
  -- ✅ CREDENTIALS COLUMNS (NOW SAVED)
  admin_email VARCHAR(255) NOT NULL,  -- School admin login email
  admin_password VARCHAR(255),         -- School admin password (encrypt in production)
  
  status VARCHAR(50) DEFAULT 'ACTIVE', -- 'ACTIVE' or 'SUSPENDED'
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### Where Credentials Are Saved

**Column Names:**
- `admin_email` - Email used by school admin to login
- `admin_password` - Password used by school admin to login

**Example Record:**
```json
{
  "id": "school-uuid-123",
  "name": "ABC Primary School",
  "email": "school@abc.edu",
  "phone": "+234-800-000-0000",
  "address": "123 Main Street, Lagos",
  "type": "PRIMARY",
  "admin_email": "principal@abc.edu",     ← STORED HERE
  "admin_password": "secure_password_123", ← STORED HERE
  "status": "ACTIVE",
  "created_at": "2026-08-10T12:00:00Z",
  "updated_at": "2026-08-10T12:00:00Z"
}
```

---

## 🔐 How Credentials Are Created

### Flow 1: Super Admin Registers School

```
Super Admin Dashboard
    ↓
1. Fills Registration Form:
   - School Name: "ABC Primary School"
   - Admin Email: "principal@abc.edu"
   - Admin Password: "secure123"
    ↓
2. Submits Form
    ↓
3. Backend:
   - Creates school record with admin_email & admin_password
   - Auto-creates user in "users" table with role "SCHOOL_ADMIN"
    ↓
4. School Admin can now login at /landing with these credentials
```

### Code Implementation

**File:** `src/services/school.service.ts`

```typescript
static async registerSchool(data: Partial<School>): Promise<School> {
  // Create school with admin credentials
  const { data: school, error } = await supabase
    .from('schools')
    .insert({
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      type: data.type || 'BOTH',
      admin_email: data.admin_email,      // ← SAVED
      admin_password: data.admin_password, // ← SAVED
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    })
    .select()
    .single()

  // Auto-create school admin user
  if (school && data.admin_email && data.admin_password) {
    await supabase
      .from('users')
      .insert({
        school_id: school.id,
        email: data.admin_email,        // ← USE admin_email
        full_name: `${data.name} Admin`,
        role: 'SCHOOL_ADMIN',
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
      })
  }

  return school
}
```

---

## 👀 Where Super Admin Sees Credentials

### Super Admin Dashboard
**File:** `src/app/superadmin/dashboard/page.tsx`

Schools table displays:
```
┌─────────────┬──────────┬──────────────────┬─────────┬──────────┐
│ School Name │ Type     │ Admin Email      │ Status  │ Actions  │
├─────────────┼──────────┼──────────────────┼─────────┼──────────┤
│ ABC Primary │ Primary  │ principal@abc.ed │ Active  │ ⏸ 🗑    │
│             │          │ u                │         │          │
└─────────────┴──────────┴──────────────────┴─────────┴──────────┘
```

The `admin_email` column is visible in the schools table for Super Admin reference.

---

## 🔑 Login Process

### School Admin Login Flow

```
1. Go to /landing
2. Click "School Admin" role
3. Click "Sign In" button → redirects to /auth/school-admin/login
4. Enter:
   - Email: principal@abc.edu (from admin_email)
   - Password: secure123 (from admin_password)
5. Click "Sign In"
6. AuthService.login() makes request to Supabase Auth
7. If credentials match:
   - JWT token created
   - Redirects to /school-admin/dashboard
   - User can now register staff/students
```

---

## 📋 Database Verification

### Check Saved Credentials

**SQL Query to verify:**
```sql
SELECT 
  id,
  name,
  admin_email,
  admin_password,
  status
FROM schools
WHERE name = 'ABC Primary School';
```

**Expected Output:**
```
id                                   | name              | admin_email        | admin_password | status
────────────────────────────────────┼──────────────────┼────────────────────┼────────────────┼────────
550e8400-e29b-41d4-a716-446655440000 | ABC Primary Sch. | principal@abc.edu  | secure123      | ACTIVE
```

### Check Auto-Created User

**SQL Query:**
```sql
SELECT 
  id,
  email,
  role,
  school_id,
  status
FROM users
WHERE email = 'principal@abc.edu';
```

**Expected Output:**
```
id                                   | email              | role        | school_id                             | status
────────────────────────────────────┼────────────────────┼─────────────┼───────────────────────────────────────┼────────
550e8400-e29b-41d4-a716-446655440001 | principal@abc.edu  | SCHOOL_ADMIN | 550e8400-e29b-41d4-a716-446655440000 | ACTIVE
```

---

## ⚠️ SECURITY NOTES

### Development Phase
- Credentials stored as **plaintext**
- Acceptable for development/testing

### Before Production
- **MUST encrypt passwords** using bcrypt or similar
- Never expose passwords in API responses
- Use HTTPS only
- Implement password reset functionality
- Add password strength validation
- Add account lockout after failed attempts

### Recommended Production Setup

```typescript
// Use bcrypt to hash passwords
import bcrypt from 'bcrypt'

// When saving:
const hashedPassword = await bcrypt.hash(adminPassword, 10)

// When comparing (during login):
const isValid = await bcrypt.compare(password, school.admin_password)
```

---

## 📞 Support & Testing

### Test Registration
1. Go to Super Admin Dashboard
2. Fill registration form
3. Submit
4. Check Super Admin table - admin_email should be visible
5. Try logging in with those credentials

### Test Login
1. Get credentials from Super Admin dashboard
2. Go to /landing
3. Select School Admin
4. Enter credentials
5. Should see dashboard

### Troubleshooting
- If login fails: Check `admin_email` and `admin_password` match exactly
- If credentials don't show: Refresh page
- If table is empty: Register a school first

---

## 📊 Credentials Table Summary

| Location | View | Edit | Secure |
|----------|------|------|--------|
| Database (`schools.admin_email`) | ✅ Super Admin | ✅ Super Admin | ❌ Plaintext |
| Database (`schools.admin_password`) | ✅ Super Admin | ✅ Super Admin | ❌ Plaintext |
| Dashboard Schools Table | ✅ Super Admin | ❌ Not editable | ❌ Email visible |
| Login Process | ❌ Hidden | ✅ Required | ✅ Password masked |
| School Admin Credentials | ✅ Provided by Super Admin | ✅ Supabase Auth | ✅ Auth protected |

---

## ✅ Verification Checklist

Before going to production:

- [ ] Admin credentials are saved when school is registered
- [ ] Super Admin can see admin_email in schools table
- [ ] School admin can login using saved credentials
- [ ] Theme toggle works on all pages
- [ ] 3D animations visible on landing page
- [ ] No 404 errors when registering school
- [ ] No console errors
- [ ] Database migrations applied
- [ ] Supabase Auth enabled
- [ ] Email verification disabled (for development)
- [ ] Password hashing implemented (for production)

---

**Last Updated:** August 10, 2026  
**Status:** Complete ✅
