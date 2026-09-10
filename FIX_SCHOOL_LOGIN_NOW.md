# 🔴 CRITICAL: SCHOOL LOGIN BROKEN - FIX IT NOW (2 MINUTES)

**Problem**: Schools can't login after registration  
**Fix Location**: Supabase  
**Fix Time**: 2 minutes  
**Difficulty**: Copy-paste 1 SQL statement

---

## 🚨 THE PROBLEM

```
Super Admin registers school → Shows success with credentials
↓
School admin tries to login with those credentials
↓
Result: "Invalid email or password" ❌
```

---

## ✅ THE SOLUTION (Already Coded, Just Need Database Update)

**1 SQL statement to execute**

---

## 🟢 EXECUTE NOW (2 MIN)

### Step 1: Open Supabase (30 sec)
→ https://app.supabase.com  
→ Select project  
→ SQL Editor → New Query

### Step 2: Copy-Paste This SQL (30 sec)

```sql
ALTER TABLE schools
ADD COLUMN IF NOT EXISTS admin_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS admin_password TEXT,
ADD CONSTRAINT unique_admin_email_per_school UNIQUE(admin_email);

CREATE INDEX IF NOT EXISTS idx_schools_admin_email ON schools(admin_email) WHERE admin_email IS NOT NULL;
```

### Step 3: Click Run (30 sec)
Wait for: "executed successfully"

### Step 4: Verify (30 sec)

```sql
SELECT admin_email, admin_password FROM schools LIMIT 1;
```

Should return 2 columns ✅

---

## 🧪 QUICK TEST (2 MIN)

After running migration:

**1. Register School**
- http://localhost:3001
- Super Admin login
- Register New School
- Fill form and register
- See success ✅

**2. Login as School Admin**
- http://localhost:3001/auth/school-admin/login
- Use registered credentials
- Should login ✅

---

## 📊 THAT'S IT

| Before | After |
|--------|-------|
| ❌ Can't login | ✅ Can login |
| ❌ "Invalid credentials" | ✅ Dashboard works |
| ❌ Schools blocked | ✅ Schools functional |

---

## 🎯 NEXT

Do this NOW:
1. Open Supabase
2. Copy SQL above
3. Click Run
4. Test login

**Takes 2 minutes. Unblocks entire school system.**

Go! 🚀

