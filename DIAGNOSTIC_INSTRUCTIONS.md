# 🔍 DIAGNOSTIC: How to Find Why Data Isn't Loading

**Status:** Deployed with detailed console logging

---

## What I Did

Added **extensive debug logging** to the dashboard. Now when you load it, the browser console will show:

1. What school_id the admin is using
2. ALL users in that school (to verify they exist)
3. Staff count and records
4. Students count and records
5. Any errors from the database

---

## How to Check the Logs

### Step 1: Open the Dashboard
Go to: https://sms-gold-eta.vercel.app/school-admin/dashboard

### Step 2: Open Browser Console
- **Windows:** Press `F12` or `Ctrl+Shift+I`
- **Mac:** Press `Cmd+Option+I`

### Step 3: Look for "[Dashboard]" Logs
You'll see output like:

```
[Dashboard] Current user: {id: "...", role: "SCHOOL_ADMIN", school_id: "12345"}
[Dashboard] ===== FETCHING DATA FOR SCHOOL_ID: 12345 =====
[Dashboard] Query 1: Fetching ALL users table records for this school...
[Dashboard] ALL users in school: {count: 5, records: [...]}
[Dashboard] Query 2: Fetching staff (TEACHER, PRINCIPAL, etc)...
[Dashboard] Staff fetch: {count: 3, error: null, records: [...]}
[Dashboard] Query 3: Fetching students table...
[Dashboard] Students table (raw): {count: 2, error: null, records: [...]}
[Dashboard] Query 4: Fetching students with user data...
[Dashboard] Students with join: {count: 2, error: null, records: [...]}
[Dashboard] ===== FINAL RESULT =====
[Dashboard] Staff count: 3
[Dashboard] Students count: 2
```

---

## Possible Scenarios

### Scenario 1: school_id is NULL
```
[Dashboard] Current user: {id: "...", role: "SCHOOL_ADMIN", school_id: null}
```

**Problem:** User wasn't linked to a school when created
**Fix:** Need to update user in database with correct school_id

---

### Scenario 2: ALL users in school shows 0
```
[Dashboard] ALL users in school: {count: 0, records: []}
```

**Problem:** Either:
- No users created for this school
- Users have NULL school_id
- Users have different school_id

**Fix:** Check Supabase - query `users` table directly with the school_id from Step 1

---

### Scenario 3: ALL users shows 5, but staff shows 0
```
[Dashboard] ALL users in school: {count: 5, records: [...]}
[Dashboard] Staff fetch: {count: 0, error: null, records: [...]}
```

**Problem:** Users exist but none have roles in ['TEACHER', 'PRINCIPAL', 'ACCOUNTANT', 'HEAD_TEACHER', 'STAFF']

**Fix:** Check what roles the users actually have in Supabase

---

### Scenario 4: Students table shows 0 but users exist
```
[Dashboard] ALL users in school: {count: 5, records: [...]}
[Dashboard] Students table (raw): {count: 0, error: null, records: []}
```

**Problem:** Student records not created in `students` table

**Fix:** Need to create student records (or they were created for a different school)

---

### Scenario 5: Students table shows records but join fails
```
[Dashboard] Students table (raw): {count: 2, error: null, records: [...]}
[Dashboard] Students with join: {count: 0, error: null, records: [...]}
```

**Problem:** Join to users table failed - student user_id doesn't match any user

**Fix:** Check that student.user_id values exist in users table

---

## What to Send Me

After checking the console, **screenshot or copy the entire "[Dashboard]" section and send it to me**. 

This will tell me exactly what data exists and why it's not showing.

---

## Quick Supabase Check (Optional)

If you have Supabase access, run these queries:

### Check 1: Users in this school
```sql
SELECT id, full_name, email, role, school_id, status 
FROM users 
WHERE school_id = 'SCHOOL_ID_FROM_CONSOLE' 
LIMIT 20;
```

### Check 2: Students in this school
```sql
SELECT id, user_id, admission_number, school_id 
FROM students 
WHERE school_id = 'SCHOOL_ID_FROM_CONSOLE' 
LIMIT 20;
```

### Check 3: Current admin user
```sql
SELECT id, full_name, email, role, school_id 
FROM users 
WHERE id = 'ADMIN_ID_FROM_CONSOLE';
```

---

## Expected Output If Everything Works

```
[Dashboard] Staff count: 10
[Dashboard] Students count: 45
```

Then the dashboard shows staff and students.

---

## Next Steps

1. **Open dashboard**
2. **Open console (F12)**
3. **Check [Dashboard] logs**
4. **Send me the output**

This will tell me exactly where the problem is!
