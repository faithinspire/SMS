# RLS Simple Fix - Minimum SQL

## ⚡ FASTEST FIX - Use This SQL Only

This disables RLS on just the tables needed for login to work.

---

## Copy This SQL

```sql
ALTER TABLE schools DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON schools TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO anon, authenticated;
```

---

## Steps

1. Open: https://app.supabase.com
2. Project: egdreueuspmuxhezdpqm
3. SQL Editor → New Query
4. Copy the 4 lines above
5. Paste in Supabase
6. Click: Run ⚡
7. Wait: "Query successful"

---

## Test

1. Go to: http://localhost:3000/landing
2. Click: "Login as School Admin"
3. Enter: Admin email & password from registration
4. Expected: ✅ Login works

---

## If Still Fails

Check browser console (F12):
- Look for error message
- Report exact error

---

**Time:** 1 minute
**Result:** Login should work

