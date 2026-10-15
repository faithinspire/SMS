# ⚡ RUN THIS MIGRATION NOW TO FIX SUBJECTS

## What This Does
Populates `applicable_to_levels` for ALL subjects in ALL schools, ensuring subjects appear in student registration for both old and new schools.

## Quick Steps

### 1. Open Supabase Dashboard
Go to: https://app.supabase.com/

### 2. Select Your SMS Project
Click on your SMS project

### 3. Go to SQL Editor
Left sidebar → **SQL Editor** (or write a new query)

### 4. Copy This SQL Query
Open the file: `database/migrations/175_populate_subject_levels_all_schools.sql`

Copy ALL the SQL (from line 1 to the end).

### 5. Paste Into Supabase SQL Editor
- Click "New query"
- Paste the entire migration SQL
- Click **"Run"** (or Ctrl+Enter)

### 6. Wait for Completion
Should take 2-5 seconds. You'll see:
```
Query executed successfully (X rows affected)
```

### 7. Verify It Worked
Run this verification query:

```sql
SELECT 
  COUNT(*) as total_subjects,
  COUNT(CASE WHEN applicable_to_levels IS NOT NULL AND array_length(applicable_to_levels, 1) > 0 THEN 1 END) as with_levels
FROM subjects
WHERE is_active = true;
```

Should show something like:
```
total_subjects | with_levels
    500+       |    500+
```

### 8. Test in Browser
1. Refresh your SMS dashboard (clear cache: Ctrl+Shift+Delete)
2. Go to student registration
3. Select a school (test old and new)
4. Select a class
5. **Subjects should appear immediately!** ✅

---

## Troubleshooting

### Query fails with "permission denied"?
- Make sure you're logged into Supabase with an admin account
- Go to your project settings and check your role

### Query completes but subjects still not showing?
1. Hard refresh browser: **Ctrl+Shift+R**
2. Check console (F12) for errors
3. Try different school

### Still showing "Select a class in the previous stage"?
1. Run this check:
```sql
SELECT COUNT(*) FROM subjects 
WHERE applicable_to_levels IS NOT NULL 
AND array_length(applicable_to_levels, 1) > 0;
```
If result is 0, migration didn't work. Try running it again.

2. Check if a specific school has subjects:
```sql
SELECT COUNT(*), school_id FROM subjects 
WHERE is_active = true
GROUP BY school_id LIMIT 5;
```

---

## What Gets Created/Updated

### For EVERY school in your system:
- ✅ 25 core curriculum subjects (if not already there)
- ✅ English, Math, Science for all levels
- ✅ JSS-specific subjects (Levels 9-11)
- ✅ SS-specific subjects (Levels 12-14)
- ✅ Department mapping for Science/Commercial/Humanities

### All subjects get:
- ✅ `applicable_to_levels` array (which class levels they apply to)
- ✅ Category and department info
- ✅ Marked as `is_active = true`

---

## After Running

**Expected behavior:**
- New schools: Get all 25 canonical subjects immediately
- Old schools: Existing subjects get `applicable_to_levels` populated
- Student registration: Shows subjects grouped by class level
- Works for JSS1, JSS2, JSS3, SS1, SS2, SS3, Primary, etc.

**Time to see changes:**
1. Migration runs: ~2-5 seconds
2. Vercel deploys code: ~1-2 minutes (automatic)
3. Browser sees it: immediate after refresh

---

## Done! ✅

After running the migration and refreshing, students should see:
- ✅ Sessions dropdown: populated with years
- ✅ Terms dropdown: populated with terms
- ✅ Classes dropdown: populated with classes
- ✅ **Subjects dropdown: NOW POPULATED with subjects for the selected class!**

Your multi-tenant SMS system now has subjects working for all schools!
