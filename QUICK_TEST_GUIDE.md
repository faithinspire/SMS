# Quick Test Guide - Post Deployment

## 🚀 What to Test Right Now

After Vercel shows "Ready":

### 1. Teacher Dashboard (2 minutes)
```
1. Login as teacher
2. Go to /teacher/dashboard
3. Look at "My Classes" section
4. ✅ Check: Classes show names like "Primary 1 - A" (not "Unknown")
5. ✅ Click on a class → student list appears with names
6. Open browser console (F12) → NO PGRST201 errors
```

### 2. Admin Results (2 minutes)
```
1. Login as school admin
2. Go to /school-admin/results (or admin/results/page)
3. Wait for page to load
4. ✅ Check: Classes list appears
5. ✅ Click on a class → students appear with names
6. Open browser console (F12) → NO PGRST200 errors
```

### 3. Principal Results (2 minutes)
```
Same as Admin Results above but go to /principal/results
```

### 4. Headteacher Results (2 minutes)
```
Same as Admin Results above but go to /headteacher/results
```

### 5. Broadcasts (1 minute)
```
1. Check any dashboard top header area
2. Look for broadcasts/notifications
3. ✅ Check: Messages load without errors
4. Open browser console (F12) → NO PGRST200 errors
```

---

## ⚠️ If You See These Errors - FIXED ✅

| Error | What It Means | Status |
|-------|---------------|--------|
| `PGRST201` | Users FK ambiguous | ✅ FIXED - use explicit FK names |
| `PGRST200` | Relationship not found | ✅ FIXED - broadcasts schema corrected |
| Students showing empty | Wrong column join | ✅ FIXED - proper users join added |
| Classes = "Unknown" | Missing arm_id | ✅ FIXED - arm_id added to select |

---

## 💾 If Accountant Dashboard Empty

1. Open SQL Editor in Supabase
2. Run this query:
```sql
SELECT COUNT(*) FROM transactions WHERE school_id = '<your-school-id>';
```

3. If result is 0, call this endpoint:
```
POST /api/results/ensure-school-data?schoolId=<school-id>
```

This creates test data including students, classes, and sample transactions.

---

## 🔍 Quick Console Check

Open Developer Tools: **F12** → **Console**

### Should See ✅
- Normal log messages
- No red error icons

### Should NOT See ❌
- `PGRST201` error
- `PGRST200` error
- "Could not embed" error
- "Could not find a relationship" error

---

## 📊 Test Data Verification

In Supabase SQL Editor, run:

```sql
-- Check 1: Students exist
SELECT COUNT(*) as student_count FROM students;

-- Check 2: Classes exist  
SELECT COUNT(*) as class_count FROM class_arm_combos;

-- Check 3: Student names accessible
SELECT u.full_name, s.admission_number 
FROM students s
JOIN users u ON s.user_id = u.id
LIMIT 5;
```

---

## ✅ Green Light Checklist

All boxes checked = **READY FOR PRODUCTION** ✅

- [ ] Teacher dashboard classes show names
- [ ] Admin dashboard students appear
- [ ] No PGRST errors in console
- [ ] Broadcasts load without errors
- [ ] No red errors in browser F12
- [ ] Classes display with arms (e.g., "Primary 1 - A")
- [ ] Student names show (not "N/A" or empty)

---

## 🆘 Troubleshooting

### Classes still show "Unknown"
**Check:** Are there students assigned to this class?
```sql
SELECT COUNT(*) FROM students WHERE class_arm_combo_id = '<class-id>';
```

### Students list still empty
**Check:** Are students properly linked to users?
```sql
SELECT COUNT(*) FROM students 
WHERE user_id IS NOT NULL AND class_arm_combo_id IS NOT NULL;
```

### Broadcast still error
**Check:** Clear browser cache (Ctrl+Shift+Del) and refresh

### Accountant shows no data
**Check:** Do transactions exist?
```sql
SELECT COUNT(*) FROM transactions;
```
If 0, run ensure-school-data endpoint.

---

## 📞 Need Help?

1. **Check Console (F12)** - Look for error messages
2. **Check SQL** - Use Supabase SQL Editor to verify data
3. **Run Diagnostic** - See VERIFY_DATA_INTEGRITY.sql file
4. **Check Status** - Visit deployment details in Vercel

---

Done! 5-10 minutes total testing time.
