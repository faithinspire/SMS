# 🚀 QUICK START - TESTING THE FIXES

## ⚡ 60-SECOND TEST

1. Open: `http://localhost:3000`
2. Login as school admin
3. Go to Dashboard
4. Click "+ Register Teacher"
5. **SEE**: Two-step form with class & subject fields ✅

---

## 🧪 5-MINUTE FULL TEST

### Test Email Validation Fix
```
Dashboard → Staff Tab → + Register Teacher
Step 1: Full Name: John Smith
        Email: jane@gmail.com ← (This was failing)
        Password: Test1234
Click: Next →
SEE: Step 2 form (no "invalid email" error) ✅
```

### Test Teacher Registration
```
Step 2: Select Class: SS1A
        Select Subjects: Math, English
Click: Complete Registration ✓
SEE: Success message, teacher appears in list ✅
```

### Test Student Auto-Linking
```
Go to: Records → Students
Click: + Register New Student
Fill: John Student, ADM/001, john@school.com
Step 2: Select Class: SS1A (same as teacher)
        Select Subjects: Math (same as teacher)
Click: Complete Registration ✓
Go back to: Records → Teachers → SS1A teacher
SEE: John Student appears in class list ✅
```

---

## ❌ TROUBLESHOOTING QUICK FIXES

| Problem | Fix |
|---------|-----|
| "Email is invalid" error | Refresh page (Ctrl+Shift+R), check console (F12) |
| Modal doesn't appear | Clear cache, refresh, check browser console |
| Teacher doesn't appear | Refresh page, check Supabase dashboard |
| Student not showing in teacher list | Check class ID matches, refresh |

---

## 📊 WHAT TO CHECK IN BROWSER F12

### Console Tab
```javascript
// You should see these logs when registering:
📝 Registering teacher: ...
✅ Auth user created: ...
✅ Database user created: ...
✅ Teacher registered successfully
```

### Network Tab
```
POST /api/auth/register ← Should return 201
POST /students ← Should return 201
GET /users ← Should return list
```

### Application Tab
```
Storage → Cookies → Next.js auth cookie present? ✅
```

---

## 🔍 SUPABASE VERIFICATION

### Check Users Created
```sql
-- In Supabase SQL Editor
SELECT email, created_at FROM auth.users 
ORDER BY created_at DESC LIMIT 5;
```

### Check Database Users
```sql
SELECT id, full_name, email, role 
FROM public.users 
ORDER BY created_at DESC LIMIT 5;
```

### Check Teachers
```sql
SELECT user_id, full_name, email 
FROM public.users 
WHERE role = 'TEACHER' 
ORDER BY created_at DESC;
```

---

## ✅ SUCCESS INDICATORS

- ✅ No red errors in console
- ✅ Email validation works (jane@gmail.com accepted)
- ✅ Teacher modal shows with class & subject fields
- ✅ Registration completes without errors
- ✅ Data appears in list immediately
- ✅ Student appears in teacher's dashboard
- ✅ Supabase shows users created

---

## 🎯 NEXT STEPS AFTER TESTING

1. If tests pass → Run full acceptance tests 1-4
2. If tests fail → Check troubleshooting above
3. Document results → Share findings
4. Then proceed to Phase 2 → Teacher/student dashboards

---

## 📞 IMMEDIATE HELP

**Server not running?**
```bash
cd "c:\Users\OLU\Desktop\SMS"
npm run dev
```

**Want to see logs?**
- Check terminal where `npm run dev` runs
- Check browser console (F12)
- Check Supabase dashboard

**Need to restart?**
- Ctrl+C in terminal
- `npm run dev` again

---

**Status**: Ready to test ✅
**Server**: Running ✅
**Fixes**: Applied ✅
