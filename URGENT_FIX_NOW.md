# URGENT FIX - RLS Error Solution

## 🔴 Current Problem

```
Error: Failed to run sql query: ERROR: 42P01: relation "submissions" does not exist
```

**Cause:** Previous SQL tried to disable RLS on tables that don't exist

**Solution:** Use corrected SQL that only references ACTUAL tables

---

## ✅ ONE MINUTE FIX

### Copy This (Exactly as shown):

```sql
ALTER TABLE schools DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON schools TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO anon, authenticated;
```

### Steps:

1. **Open:** https://app.supabase.com
2. **Project:** egdreueuspmuxhezdpqm
3. **SQL Editor** (left sidebar) → **New Query**
4. **Delete** any previous query
5. **Copy & Paste** the 4 lines above
6. **Click:** Run ⚡
7. **Wait:** See "Query successful" ✅

### Result:

✅ No more errors
✅ RLS disabled on schools & users
✅ Ready for login

---

## 🧪 Test Immediately After

```
1. Open: http://localhost:3000/landing
2. Click: "Login as School Admin"
3. Email: [admin email from registration]
4. Password: [admin password from registration]
5. Expected: ✅ Dashboard loads
```

---

## ✨ If That Works

Continue with full SQL to enable all features:

**File:** `DISABLE_RLS_CORRECTED.md` (for all tables)

---

## ❌ If Still Gets Error

**Check:**
- Copy is exact (no extra spaces/quotes)
- No leftover text from previous query
- All 4 lines included

**Try:**
- Clear query editor
- Paste again carefully
- Click Run

---

## 📞 Support

If error persists:
1. Take screenshot of SQL and error
2. Copy exact error message
3. Report what you see

---

**⏰ Time:** 1 minute
**🎯 Goal:** Login works after this
**🚀 Next:** Full RLS disable for all features

