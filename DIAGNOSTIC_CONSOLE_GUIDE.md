# 🔧 DIAGNOSTIC CONSOLE GUIDE - Read This If Things Don't Work

**Purpose**: How to use browser console to debug class/subject loading issues

---

## 📱 Opening DevTools

### Chrome/Edge/Brave
- Press `F12`
- Or: Right-click → "Inspect" → Console tab

### Firefox
- Press `F12`
- Or: Right-click → "Inspect" → Console tab

### Safari
- Enable Developer Menu: Safari → Preferences → Advanced → Show Develop menu
- Press `Cmd+Option+I`

---

## 🎯 CONSOLE LOG REFERENCE

All new logs in fixed code use this format:

### ✅ Green Success Logs
```
✅ Combo data loaded: {combos: 12, subjects: 45, classes: 3, arms: 4}
✅ Selected combo: {id: "abc123", classes: {id: "cls1", name: "Class 1", level: "1"}, arms: {id: "arm1", name: "A"}}
✅ Class level: 1
✅ All subjects loaded: 45
✅ Filtered subjects: 12 for level 1
✅ Subjects loaded: 8
✅ Class arms loaded: 12
```

**What they mean**: Data loaded successfully at that step

### ❌ Red Error Logs
```
❌ Error loading class data: [error details]
❌ Error loading subjects: [error details]
❌ Error fetching data: [error details]
```

**What they mean**: Something failed at that step

### ⚠️ Warning Logs
```
⚠️ Selected combo not found: xyz
⚠️ No class level found in combo
⚠️ Loading subjects... If this persists, no subjects may be configured for this class level
```

**What they mean**: Data exists but might be incomplete or missing

---

## 📋 TROUBLESHOOTING BY CONSOLE OUTPUT

### Scenario 1: Empty Subjects Dropdown

**What you see**: 
- Class dropdown works fine
- After selecting class, subjects section shows "Loading subjects..." message
- It never changes to show subjects

**Check console for**:
1. Look for ✅ logs after selecting class
   ```
   Expected:
   ✅ Selected combo: {...}
   ✅ Class level: 1
   ✅ All subjects loaded: 45
   ✅ Filtered subjects: 12
   ```

2. If you see:
   ```
   ❌ Error loading subjects: Supabase error...
   ```
   → **Database/API issue** - Check Supabase connection

3. If you see:
   ```
   ⚠️ No class level found in combo
   ```
   → **Data structure issue** - Classes don't have level field

4. If you see:
   ```
   ✅ Filtered subjects: 0
   ⚠️ No subjects found for level 1
   ```
   → **No subjects configured for that level** - Check admin panel

---

### Scenario 2: Empty Classes Dropdown

**What you see**:
- School dropdown works
- Select a school
- Classes dropdown stays empty

**Check console for**:
1. Look for ✅ logs after selecting school
   ```
   Expected:
   ✅ Combo data loaded: {combos: 12, subjects: 45, ...}
   ```

2. If you see:
   ```
   ❌ Error loading class data: Supabase error...
   ```
   → **API/Database error** - Check Supabase Dashboard

3. If you see:
   ```
   ✅ Combo data loaded: {combos: 0, subjects: 0, ...}
   ```
   → **No data for this school** - Check if school has classes/arms/combos

---

### Scenario 3: Classes Show "undefined"

**What you see**:
- Classes dropdown shows "undefined - undefined" options

**Check console for**:
1. Look for class loading logs
2. Check if you see errors about nested data

**Solution**: 
- This usually means the Supabase query returned wrong structure
- Check if response has `classes` and `arms` nested objects

---

## 🔍 STEP-BY-STEP DEBUGGING

### For Teacher Registration Form

**Step 1**: Navigate to `/auth/staff/register`
```
Expected in console: No errors yet (page just loading)
```

**Step 2**: Open console, clear it (Ctrl+L or click trash icon)
```
This removes old messages so you can see fresh logs
```

**Step 3**: Select a school from first dropdown
```
Expected in console:
✅ Combo data loaded: {combos: X, subjects: Y, classes: Z, arms: W}

If you see this: ✅ School selection works, move to Step 4
If you see ❌ error: Database/API issue
If you see nothing: Check if console is set to show errors (not warnings only)
```

**Step 4**: Check classes dropdown populated
```
Visual Check: Does "Class to Manage" dropdown have options?

If YES: ✅ Classes loading works, move to Step 5
If NO: 
  - Check console for ❌ errors
  - Run SQL query to verify data exists (see below)
```

**Step 5**: Select a class from dropdown
```
Expected in console (after 1-2 seconds):
✅ Selected combo: {...}
✅ Class level: 1
✅ All subjects loaded: 45
✅ Filtered subjects: 12

If you see this: ✅ Subjects filtering works, move to Step 6
If subjects is 0: No subjects for that level
If error: Check subjects table in Supabase
```

**Step 6**: Check subjects appear
```
Visual Check: Does "Subjects to Teach" section show checkboxes?

If YES: ✅ Everything works!
If NO or "Loading...":
  - Check Step 5 console logs
  - Look for ❌ errors
```

---

## 💾 DATABASE VERIFICATION QUERIES

If console shows data loaded but you see issues, verify database directly.

### In Supabase Dashboard → SQL Editor:

**Query 1**: Check if school has any combos
```sql
SELECT COUNT(*) as combo_count, school_id
FROM class_arm_combos
WHERE school_id = (SELECT id FROM schools WHERE name = 'Your School Name')
GROUP BY school_id;
```

**Expected Result**: 
- combo_count > 0
- If 0: No class-arm combos created for this school

---

**Query 2**: Check combo data structure
```sql
SELECT 
  cac.id,
  cac.class_id,
  cac.arm_id,
  c.name as class_name,
  c.level as class_level,
  a.name as arm_name
FROM class_arm_combos cac
LEFT JOIN classes c ON cac.class_id = c.id
LEFT JOIN arms a ON cac.arm_id = a.id
WHERE cac.school_id = (SELECT id FROM schools WHERE name = 'Your School Name')
LIMIT 5;
```

**Expected Result**:
- All rows should have values (not NULL)
- class_name should show actual names like "Class 1"
- class_level should show numbers like 1, 2, 3
- arm_name should show letters like "A", "B", "C"

If any NULLs: Foreign key relationships broken

---

**Query 3**: Check subjects for that level
```sql
SELECT 
  s.id,
  s.name,
  s.code,
  s.applicable_to_levels
FROM subjects s
WHERE s.school_id = (SELECT id FROM schools WHERE name = 'Your School Name')
  AND s.applicable_to_levels::text LIKE '%1%'  -- For level 1
LIMIT 10;
```

**Expected Result**:
- Multiple rows with subject names
- applicable_to_levels should show JSON like `[1, 2, 3]` or similar

---

## 📡 NETWORK TAB DEBUGGING

### For API/Network Issues

**Step 1**: Open DevTools → Network tab

**Step 2**: Navigate to registration form

**Step 3**: Select a school

**Step 4**: Look for "class_arm_combos" request in network tab

**Step 5**: Click on it, go to Response tab
```
Should see JSON like:
[
  {
    "id": "abc123",
    "classes": {"id": "cls1", "name": "Class 1", "level": "1"},
    "arms": {"id": "arm1", "name": "A"}
  },
  ...
]
```

### If Response shows errors:
- Click request
- Go to "Response" tab
- Look for error message
- Common errors:
  - 401: Authentication failed
  - 403: Permission denied (RLS policy blocking)
  - 404: Table not found
  - 500: Server error

---

## 🛠️ COMMON FIXES

### Issue: "Supabase error" in console

**Fix 1**: Check if .env.local has valid credentials
```bash
# In project root
cat .env.local | grep SUPABASE
```

Should show:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

**Fix 2**: Check Supabase project status
- Go to Supabase dashboard
- Verify project is running (not paused)
- Check if RLS policies are too restrictive

---

### Issue: "Selected combo not found"

**Cause**: Selected class ID doesn't exist in loaded data

**Check**:
1. Console log before selecting:
   ```
   ✅ Combo data loaded: {combos: 0, ...}
   ```
   → No combos loaded (database empty)

2. Or dropdown shows options but selection fails:
   → Data mismatch between dropdown display and actual data

---

### Issue: "No class level found"

**Cause**: Classes table doesn't have level field populated

**Check**: 
```sql
SELECT id, name, level FROM classes LIMIT 5;
```

**Expected**: All rows have a level value  
**If NULL**: Admin needs to populate level field

---

## ✅ SUCCESS INDICATORS

In console, after selecting school and class:
- ✅ Combo data logged with counts > 0
- ✅ Selected combo has classes and arms objects
- ✅ Class level is a number (1, 2, 3, etc.)
- ✅ Filtered subjects count > 0
- ✅ No red ❌ errors

In browser:
- ✅ Classes dropdown shows options
- ✅ Subjects section shows checkboxes
- ✅ Can select subjects and submit form

---

## 📞 IF YOU GET STUCK

1. **Take a screenshot** of the console (F12 → Console tab)
2. **Write down** what you see:
   - What you did (selected school, clicked class, etc.)
   - What happened (nothing, error, undefined, etc.)
   - What console shows (✅ or ❌ logs)
3. **Check database** using SQL queries above
4. **Verify .env.local** has correct Supabase keys

Most issues are:
- 80%: Database doesn't have the data (check SQL queries)
- 15%: Wrong Supabase credentials (.env.local)
- 5%: Actual code bugs (would show ❌ in console)

---

## 🎓 CONSOLE LOG LEGEND

```
✅ = Success - action completed
❌ = Error - action failed
⚠️  = Warning - action mostly worked but something might be wrong
    = Info - just showing data values
```

Look for ❌ first if something breaks!
