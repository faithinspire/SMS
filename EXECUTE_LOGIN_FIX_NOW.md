# ⚡ QUICK FIX: SCHOOL LOGIN NOT WORKING - EXECUTE NOW

**Problem**: Can't login as school admin after registration  
**Fix Time**: 5 minutes  
**Difficulty**: Copy-paste SQL + test  

---

## 🟢 STEP-BY-STEP FIX (5 MIN)

### Step 1: Open Supabase (30 sec)
1. Go to https://app.supabase.com
2. Select your project
3. Click "SQL Editor" → "New Query"

---

### Step 2: Execute Migration (1 min)

**Copy this SQL**:

```sql
ALTER TABLE schools
ADD COLUMN IF NOT EXISTS admin_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS admin_password TEXT,
ADD CONSTRAINT unique_admin_email_per_school UNIQUE(admin_email);

CREATE INDEX IF NOT EXISTS idx_schools_admin_email ON schools(admin_email) WHERE admin_email IS NOT NULL;
```

**Then**:
- Paste into SQL Editor
- Click "Run"
- You should see "executed successfully"

---

### Step 3: Verify (30 sec)

**Run this verification query**:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'schools' 
AND column_name IN ('admin_email', 'admin_password');
```

**Expected**: 2 rows returned ✅

---

### Step 4: Register a School (2 min)

1. Go to http://localhost:3001
2. Login as Super Admin
3. Click "Register New School"
4. Fill the form with test data:
   - School Name: "Test Academy"
   - School Email: "school@test.com"
   - Admin Name: "Mr. Test"
   - Admin Email: "admin@test.com"
   - Admin Password: "Test123!@#"
   - Phone: "+2348012345678"
   - Address: "123 Main St"
5. Click "Register School"
6. Should see success message ✅

---

### Step 5: Test Login (1 min)

1. Go to http://localhost:3001/auth/school-admin/login
2. Enter:
   - Email: `admin@test.com`
   - Password: `Test123!@#`
3. Click "Sign In"

**Expected**: Redirects to school admin dashboard ✅

---

## ✅ VERIFICATION

After login works, verify in database:

```sql
SELECT name, admin_email, admin_password 
FROM schools 
WHERE admin_email = 'admin@test.com';
```

**Expected result**:
```
name          | admin_email      | admin_password
Test Academy  | admin@test.com   | Test123!@#
```

---

## 🎯 SUCCESS CRITERIA

All these must work:
- [ ] Migration executes without error
- [ ] Verification query returns 2 rows
- [ ] Can register new school
- [ ] See success message after registration
- [ ] Can login with the registered credentials
- [ ] Dashboard loads after login
- [ ] Database shows stored credentials

---

## 🚨 IF SOMETHING FAILS

### Migration gives error
- Copy SQL exactly as shown
- Run in Supabase SQL Editor
- Not in terminal

### Login still fails
- Check: Did you register school AFTER migration?
- Old schools won't have credentials
- Register a new school to test

### Can't see the columns
- Wait 10 seconds
- Refresh page
- Run verification query again

---

## 📊 WHAT THIS FIXES

| Issue | Status |
|-------|--------|
| Can't register school | ✅ Works |
| Email not saving | ✅ FIXED |
| Password not saving | ✅ FIXED |
| Can't login | ✅ FIXED |
| "Invalid email/password" error | ✅ FIXED |
| School admin dashboard | ✅ Works |

---

## ⏱️ TIMELINE

| Step | Time |
|------|------|
| 1: Open Supabase | 30 sec |
| 2: Execute SQL | 1 min |
| 3: Verify | 30 sec |
| 4: Register school | 2 min |
| 5: Test login | 1 min |
| **TOTAL** | **5 min** |

---

## 🚀 START NOW

1. **Open**: https://app.supabase.com
2. **Copy SQL above**
3. **Paste and Run**
4. **Verify success**
5. **Test login**

**That's it! School login will work.** 🎉

