# 🔴 URGENT: Fix "No Subjects Available" Error

**Issue**: When admin or teacher selects a class during registration, they see "No subjects available" error even though subjects exist in database.

**Root Cause**: Subjects table has empty `applicable_to_levels` array. This column controls which class levels can use each subject.

**Solution**: Execute SQL migration to populate `applicable_to_levels` for all subjects.

**Time to Fix**: 5 minutes

---

## STEP 1: Go to Supabase SQL Editor

1. Open Supabase dashboard: https://app.supabase.com
2. Select your project
3. Click "SQL Editor" in left sidebar
4. Click "+ New Query"

---

## STEP 2: Verify Current State (Optional - For Debugging)

Copy and run this query to see which subjects have empty levels:

```sql
SELECT 
  COUNT(*) as total_subjects,
  COUNT(CASE WHEN applicable_to_levels IS NULL OR applicable_to_levels = '{}' THEN 1 END) as empty_levels,
  COUNT(CASE WHEN applicable_to_levels != '{}' AND applicable_to_levels IS NOT NULL THEN 1 END) as populated
FROM subjects;
```

**Expected before fix**: Should show `empty_levels` > 0

---

## STEP 3: Execute the Fix

Copy and run these UPDATE statements to populate applicable_to_levels:

```sql
-- Primary subjects (levels 1-6)
UPDATE subjects 
SET applicable_to_levels = ARRAY[1,2,3,4,5,6]
WHERE applicable_to_levels = '{}' OR applicable_to_levels IS NULL
AND name IN (
  'English Language', 'English',
  'Mathematics', 'Math',
  'Science',
  'Social Studies', 'Social Science',
  'Civic Education', 'Civics',
  'Physical Education', 'PE', 'Physical Educ',
  'Art & Craft', 'Art',
  'Music',
  'Home Economics',
  'Information Technology', 'ICT', 'Computer Studies'
);

-- Secondary subjects (levels 9-14 for JSS/SSS)
UPDATE subjects
SET applicable_to_levels = ARRAY[9,10,11,12,13,14]
WHERE applicable_to_levels = '{}' OR applicable_to_levels IS NULL
AND name IN (
  'English', 'English Language',
  'Mathematics', 'Math',
  'Biology', 'Chemistry', 'Physics',
  'History', 'Geography',
  'Civic Education', 'Civics',
  'Physical Education', 'PE',
  'Agricultural Science', 'Agriculture',
  'Technical Drawing',
  'Computer Science', 'Computing', 'Computer Studies'
);

-- SSS-only subjects (levels 12-14)
UPDATE subjects
SET applicable_to_levels = ARRAY[12,13,14]
WHERE applicable_to_levels = '{}' OR applicable_to_levels IS NULL
AND name IN (
  'Economics', 'Accounting', 'Government',
  'Literature In English', 'Literature',
  'Further Mathematics'
);

-- Fallback: For any STILL-EMPTY subjects, make them available to all secondary levels
UPDATE subjects
SET applicable_to_levels = ARRAY[9,10,11,12,13,14]
WHERE applicable_to_levels = '{}' OR applicable_to_levels IS NULL;
```

---

## STEP 4: Verify the Fix

Copy and run this query to confirm subjects now have levels:

```sql
SELECT 
  COUNT(*) as total_subjects,
  COUNT(CASE WHEN applicable_to_levels IS NULL OR applicable_to_levels = '{}' THEN 1 END) as empty_levels,
  COUNT(CASE WHEN applicable_to_levels != '{}' AND applicable_to_levels IS NOT NULL THEN 1 END) as populated
FROM subjects;
```

**Expected after fix**: Should show `empty_levels = 0` and `populated > 0`

You can also see sample subjects:
```sql
SELECT name, code, applicable_to_levels, array_length(applicable_to_levels, 1) as num_levels
FROM subjects 
LIMIT 10;
```

---

## STEP 5: Test in Browser

1. Go to http://localhost:3001
2. Login as admin or teacher
3. Try to register a new teacher or student
4. Select a class
5. Check if Subject dropdown now shows subjects instead of "No subjects available"

**Expected**: ✅ Subjects appear in dropdown

---

## IF IT STILL SHOWS "NO SUBJECTS AVAILABLE"

### Debug: Check what subjects actually exist
Run this in Supabase SQL Editor:
```sql
SELECT id, name, code FROM subjects LIMIT 10;
```

### Debug: Check what class levels exist
Run this:
```sql
SELECT id, name, level, type FROM classes LIMIT 10;
```

### Debug: Check subject-level mapping for specific class
Replace `12` with an actual class level:
```sql
SELECT s.name, s.applicable_to_levels
FROM subjects s
WHERE applicable_to_levels @> ARRAY[12]::integer[]
LIMIT 10;
```

If this returns nothing: The subject levels still aren't populated correctly.

---

## COMMON ISSUES

### Issue: "No subjects available" still appears after fix

**Possible Causes**:
1. Page not refreshed - try Ctrl+Shift+R (hard refresh)
2. Database transaction didn't commit - check if UPDATE statement ran successfully
3. Subject table might be empty - check if subjects exist with above queries

**Solution**: 
- Hard refresh browser (Ctrl+Shift+R)
- Verify UPDATE statements executed and returned results
- Check if subjects table has any data

### Issue: UPDATE statement shows "0 rows affected"

**Cause**: Either subjects table is empty OR all subjects already have levels populated

**Check**:
```sql
SELECT COUNT(*) as total FROM subjects;
```

If 0: No subjects in database. This is a separate issue - contact admin to populate initial subjects.

---

## AFTER FIX VERIFICATION CHECKLIST

- [ ] Supabase SQL executed successfully (see result count)
- [ ] Verification query shows `empty_levels = 0`
- [ ] Browser hard refresh done (Ctrl+Shift+R)
- [ ] Login page loads at http://localhost:3001
- [ ] Can navigate to teacher/student registration
- [ ] Select a class - subjects appear in dropdown
- [ ] Can see actual subject names (not "No subjects available")
- [ ] Can select subjects and register

---

## REFERENCE: What Each Level Means

| Level | Name | Description |
|-------|------|-------------|
| 1-6 | Primary | Elementary/Primary School |
| 9-11 | JSS | Junior Secondary School (Forms 1-3) |
| 12-14 | SSS | Senior Secondary School (Forms 4-6) |

The `applicable_to_levels` array stores which levels can teach this subject. For example:
- `{1,2,3,4,5,6}` = Available for all Primary levels
- `{9,10,11,12,13,14}` = Available for all Secondary levels
- `{12,13,14}` = Only for SSS

---

## WHAT THIS FIXES

After executing the migration:

✅ "No subjects available" error will be gone  
✅ Subject dropdowns will populate correctly  
✅ Teachers can register with subject assignments  
✅ Students can register with subject selection  
✅ Admin can register teachers with subject selection  
✅ Subject filtering will work correctly in dropdowns  

---

## TIME ESTIMATE

- Execution in Supabase: **< 1 minute**
- Verification: **2 minutes**
- Browser refresh: **1 minute**
- Testing: **2 minutes**

**Total: 5-10 minutes**

---

## NEXT STEPS AFTER THIS FIX

1. ✅ Fix "No subjects available" (THIS)
2. Test teacher results page (scores entering)
3. Test CBT page (exam creation)
4. Test complete registration flows
5. Verify all dropdowns populate correctly

---

**STATUS**: Ready to execute  
**DIFFICULTY**: Very Easy (Just copy-paste SQL)  
**RISK**: None (Only updating data, not schema)

Do this NOW and let me know when it's complete!

