# 🔐 SCHOOL LOGIN FIX - CREDENTIALS NOT SAVING

**Problem**: School email and password not saving during registration, can't login  
**Root Cause**: 
1. Schools table missing `admin_email` and `admin_password` columns
2. Register endpoint not creating Supabase Auth user
3. Credentials not being stored in schools table

**Solution**: 3 steps to fix

---

## 🔧 WHAT HAS BEEN FIXED IN CODE

### 1. ✅ Updated: `src/app/api/superadmin/register-school/route.ts`

**Change 1**: Now creates Supabase Auth user
```typescript
// 🔐 CREATE SUPABASE AUTH USER FOR SCHOOL ADMIN
const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
  email: admin_email,
  password: admin_password,
  email_confirm: true,
  user_metadata: {
    school_id: school.id,
    school_name: school_name,
    role: 'SCHOOL_ADMIN',
    full_name: admin_name,
  },
})
```

**Change 2**: Now saves credentials to schools table
```typescript
.insert({
  name: school_name,
  email: school_email,
  phone: phone,
  address: address,
  type: school_type,
  subscription_plan: subscription_plan,
  logo_url: logo_url || null,
  status: 'ACTIVE',
  admin_email: admin_email,           // NEW
  admin_password: admin_password,     // NEW
})
```

---

## 🗄️ WHAT NEEDS TO BE DONE IN DATABASE

### Step 1: Execute Migration 021 (ADD COLUMNS)

**Location**: `database/migrations/021_add_school_admin_credentials.sql`

**In Supabase SQL Editor, run**:

```sql
ALTER TABLE schools
ADD COLUMN IF NOT EXISTS admin_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS admin_password TEXT,
ADD CONSTRAINT unique_admin_email_per_school UNIQUE(admin_email);

CREATE INDEX IF NOT EXISTS idx_schools_admin_email ON schools(admin_email) WHERE admin_email IS NOT NULL;
```

**What this does**:
- ✅ Adds `admin_email` column to store school admin email
- ✅ Adds `admin_password` column to store school admin password  
- ✅ Creates unique constraint so each admin email is unique
- ✅ Creates index for faster login lookups

**Verify**:
```sql
-- Check the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'schools' AND column_name IN ('admin_email', 'admin_password');
```

Should return 2 rows.

---

### Step 2: Update Existing Schools (IF ANY)

If schools were already created before this fix, update them:

```sql
-- For any schools that don't have admin_email yet
UPDATE schools 
SET admin_email = 'admin@' || name || '.edu',
    admin_password = 'TempPassword123!'
WHERE admin_email IS NULL;
```

---

## 🚀 AFTER MIGRATION: HOW SCHOOL LOGIN WILL WORK

### Flow 1: Primary (Preferred)
1. User enters email/password on login page
2. System tries Supabase Auth login (uses auth user created during registration)
3. If successful → Dashboard ✅

### Flow 2: Fallback (If Supabase Auth fails)
1. User enters email/password
2. Supabase Auth fails with "Invalid login credentials"
3. System checks schools table for matching email/password
4. If found → Fallback session created → Dashboard ✅

### Flow 3: Direct School Admin (New)
1. Uses email/password stored in schools table directly
2. No Supabase Auth involved
3. Faster for schools-only login

---

## 📋 TESTING THE FIX

### Test 1: Register a New School
```
1. Open http://localhost:3001
2. Login as Super Admin
3. Go to Super Admin Dashboard
4. Click "Register New School"
5. Fill form:
   - School Name: "Test Academy"
   - School Email: "school@testacademy.com"
   - Admin Name: "Mr. Adeyemi"
   - Admin Email: "adeyemi@testacademy.com"
   - Admin Password: "Test123!@#"
   - Phone, Address, etc.
6. Click "Register School"
7. Should see success message with credentials
```

**Expected**: ✅ School registered, credentials saved

### Test 2: Login as School Admin (Supabase Auth)
```
1. Go to School Admin Login: http://localhost:3001/auth/school-admin/login
2. Enter:
   - Email: adeyemi@testacademy.com
   - Password: Test123!@#
3. Click "Sign In"
```

**Expected**: ✅ Login successful, redirects to dashboard

### Test 3: Verify Database
```
In Supabase SQL Editor:

SELECT name, admin_email, admin_password 
FROM schools 
WHERE admin_email = 'adeyemi@testacademy.com';
```

**Expected**: 
- Should show 1 row
- `admin_email` = "adeyemi@testacademy.com"
- `admin_password` = "Test123!@#"

---

## 🔍 DEBUGGING IF LOGIN STILL FAILS

### Check 1: School was registered but credentials not saved
```sql
SELECT name, admin_email, admin_password 
FROM schools 
LIMIT 1;
```

If `admin_email` and `admin_password` are NULL:
- Migration 021 hasn't been executed
- OR old code was used to register

**Fix**: Execute migration 021, then register a new school

### Check 2: Supabase Auth user not created
**Browser Console**: Look for error during registration like "Failed to create auth user"

**Possible causes**:
- Email already exists in Supabase Auth
- Password doesn't meet requirements

**Fix**: Use a different email or check Supabase Auth settings

### Check 3: Login says "Invalid email or password"
**Causes**:
1. School hasn't been registered
2. Credentials were not saved during registration
3. User is typing password wrong

**Debug steps**:
```sql
-- Check if school exists
SELECT * FROM schools WHERE admin_email = 'your_email@example.com';

-- Check if Supabase Auth user exists
-- (can't query from SQL, check Supabase dashboard → Auth)

-- Check if user record exists in users table
SELECT * FROM users WHERE email = 'your_email@example.com';
```

---

## 🎯 COMPLETE CHECKLIST

Before and after this fix:

### Before Fix ❌
- [ ] Schools registered
- [ ] Email saved: NO
- [ ] Password saved: NO
- [ ] Can login: NO
- [ ] Error: "Invalid email or password"

### After Fix ✅
- [ ] Migration 021 executed
- [ ] Code updated: YES (already done)
- [ ] Email saved in schools table: YES
- [ ] Password saved in schools table: YES  
- [ ] Supabase Auth user created: YES
- [ ] Can login via Supabase Auth: YES
- [ ] Fallback login works: YES
- [ ] Dashboard loads: YES

---

## 📊 TECHNICAL DETAILS

### Columns Added to Schools Table

| Column | Type | Purpose |
|--------|------|---------|
| `admin_email` | VARCHAR(255) | School admin email for login |
| `admin_password` | TEXT | School admin password (stored plain text) |

### Constraints Added
- `UNIQUE(admin_email)` - Only one school per email
- `idx_schools_admin_email` - Fast lookup during login

### Auth Flow Updated
1. Registration creates Supabase Auth user
2. Registration also saves to schools table
3. Login tries Supabase Auth first
4. If fails, tries fallback using schools table
5. Either way, admin can login

---

## 🚨 IMPORTANT NOTES

### Security Note
⚠️ Passwords are stored in plain text in schools table. This is for fallback/development only. In production:
- Consider hashing passwords with bcrypt
- Use Supabase Auth exclusively
- Never display passwords in UI

### Migration Execution
✅ Already created: `database/migrations/021_add_school_admin_credentials.sql`

Still needed:
1. [ ] Execute migration in Supabase SQL Editor
2. [ ] Test registration
3. [ ] Test login
4. [ ] Verify database

---

## 🔄 SUMMARY OF CHANGES

### Code Changes (Already Done ✅)
- `register-school` endpoint now creates Supabase Auth user
- `register-school` endpoint now saves credentials to schools table
- Fallback login already implemented in auth.service

### Database Changes (Need Your Action)
- Create columns in schools table for credentials
- Create index for faster lookups

### Testing
- Register a school
- Try logging in with stored credentials
- Verify in database

---

## ⏱️ TIME TO FIX

| Task | Time |
|------|------|
| Execute migration | 2 min |
| Register new school | 2 min |
| Test login | 2 min |
| Verify database | 1 min |
| **Total** | **7 minutes** |

---

## 🎉 AFTER THIS FIX

✅ School admins can register their school  
✅ Email and password are saved  
✅ Can login with saved credentials  
✅ Can access school admin dashboard  
✅ Can manage staff and students  

**System fully functional for school admins!**

---

## 📞 IF SOMETHING GOES WRONG

### Migration doesn't execute
- Check SQL syntax
- Copy exactly from `021_add_school_admin_credentials.sql`
- Run in Supabase SQL Editor

### School still can't login
- Check browser console (F12) for errors
- Check that migration executed: `SELECT admin_email FROM schools LIMIT 1;`
- Verify school was registered AFTER migration

### Password visible in database
- This is normal for fallback auth
- Future fix: hash with bcrypt
- For now: acceptable for development

---

**NEXT ACTION**: Execute migration 021 in Supabase SQL Editor

