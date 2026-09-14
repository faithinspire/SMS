# Immediate Action Items - Subject Selection Fix

## ⚠️ CRITICAL: Before Testing Can Begin

### Step 1: Execute Migration 107 in Supabase (REQUIRED)

**Status**: Not yet executed
**Importance**: CRITICAL - Testing cannot proceed without this

**Action Required**:
1. Go to [Supabase Dashboard](https://supabase.com)
2. Select your SMS project
3. Navigate to "SQL Editor" → "New Query"
4. Copy entire contents of: `database/migrations/107_comprehensive_subject_master_list.sql`
5. Paste into SQL editor
6. Click "Run" button
7. Wait for success message (should complete in 2-5 seconds)

**Verification After Execution**:
```sql
-- Run these queries to verify migration was successful

-- Check 1: No empty applicable_to_levels remain
SELECT COUNT(*) as broken_records
FROM subjects
WHERE applicable_to_levels = '{}' OR applicable_to_levels IS NULL;
-- Expected: 0

-- Check 2: Subject counts per level
SELECT COUNT(DISTINCT s.id) as total_subjects
FROM subjects s
WHERE s.applicable_to_levels @> ARRAY[5];  -- Change 5 to test other levels
-- Expected: 8+ for Primary 3

-- Check 3: Department mapping for SS
SELECT name, department FROM subjects
WHERE applicable_to_levels @> ARRAY[12] AND department IS NOT NULL
ORDER BY department, name;
-- Expected: Science (Biology, Chemistry, Physics, Further Math), 
--           Commercial (Accounting, Economics, Business), 
--           Humanities (Government, Literature)
```

**Troubleshooting**:
- If migration fails with error, check error message and refer to MIGRATION_EXECUTION_GUIDE.md
- If queries return 0 records, migration may not have executed - try again

---

### Step 2: Deploy Code Changes (REQUIRED)

**Status**: Not yet deployed
**Importance**: CRITICAL - UI changes won't be visible without deployment

**Files Changed**:
- `src/services/canonical-subject.service.ts` - New department-aware filtering methods
- `src/components/admin/StudentRegistrationModal.tsx` - Department selection UI
- `src/components/admin/TeacherRegistrationModal.tsx` - Department filtering logic

**Action Required**:
1. Commit changes to git:
   ```bash
   git add -A
   git commit -m "Fix: Subject selection system - class-aware and department-aware filtering"
   ```

2. Deploy to production (via Vercel or your CI/CD):
   ```bash
   git push origin main
   # Or trigger deployment via Vercel dashboard
   ```

3. Wait for deployment to complete (usually 2-5 minutes)

4. Verify deployment:
   - Go to https://your-app.vercel.app/admin (or your production URL)
   - Open browser console (F12)
   - Check for any errors
   - Try accessing School Admin Dashboard

---

### Step 3: Clear Browser Cache (REQUIRED)

**Status**: Not done
**Importance**: HIGH - Old code cached in browser will cause failures

**Action Required**:
1. **Clear Cache**:
   - Windows: `Ctrl + Shift + Delete`
   - Mac: `Cmd + Shift + Delete`
   
2. **Close and Reopen Browser**:
   - Close all tabs to your app
   - Close and reopen browser completely
   - Clear cookies if needed

3. **Or Use Incognito Mode**:
   - Open Private/Incognito window
   - Navigate to your app
   - This bypasses cache entirely

---

## ✅ Pre-Test Checklist

Before running any tests, verify all items:

### Database
- [ ] Migration 107 executed in Supabase
- [ ] Query: `SELECT COUNT(*) FROM subjects WHERE applicable_to_levels = '{}'` returns 0
- [ ] Query: `SELECT COUNT(*) FROM subjects WHERE applicable_to_levels @> ARRAY[5]` returns 8+
- [ ] Query: `SELECT COUNT(*) FROM subjects WHERE applicable_to_levels @> ARRAY[12] AND department = 'SCIENCE'` returns 4+

### Code Deployment
- [ ] All changes committed to git
- [ ] Changes pushed to main branch
- [ ] Vercel deployment shows "Ready" status
- [ ] No errors in deployment logs

### Browser
- [ ] Cache cleared
- [ ] Browser restarted
- [ ] Not using cache (check Network tab shows fresh downloads)

### Test Environment
- [ ] School admin account created and logged in
- [ ] Test school selected (KINGSWAY SCHOOLS or similar)
- [ ] Classes exist for all levels (Prep, KG, Nursery, Primary 1-6, JSS1-3, SS1-3)
- [ ] Arms exist for each class
- [ ] Streams exist for SS classes

### Test Plan
- [ ] TEST_PLAN_AND_RESULTS.md reviewed
- [ ] All 21 test cases understood
- [ ] Test device/browser ready
- [ ] No errors in console during app load

---

## 📋 Test Execution Steps

Once all pre-test items are complete:

1. **Run Test Group 1-3** (Early Years, Primary, JSS):
   - Simple path: No department selection needed
   - Quick verification that basic filtering works
   - Should take ~15 minutes

2. **Run Test Group 4-6** (SS Streams):
   - Test department selection UI appears
   - Verify filtering works correctly per stream
   - Should take ~20 minutes

3. **Run Test Group 7** (Teacher Registration):
   - Verify teacher component works
   - Check department filtering in teacher context
   - Should take ~10 minutes

**Total Test Time**: ~45 minutes

---

## 🚀 Success Criteria

All 21 tests must PASS for subject selection system to be considered fixed:

✅ **PASS criteria**:
- [ ] Early Years tests: Subject lists correct for Nursery, Prep, KG
- [ ] Primary tests: Subject lists correct for Primary 1, 3, 5
- [ ] JSS tests: Subject lists correct for JSS1, 2, 3 (NOT showing SS subjects)
- [ ] SS Science tests: Only science subjects visible when SCIENCE selected
- [ ] SS Commercial tests: Only commercial subjects visible when COMMERCIAL selected
- [ ] SS Humanities tests: Only humanities subjects visible when HUMANITIES selected
- [ ] Teacher tests: Same filtering works in teacher registration

❌ **FAIL criteria** (any of these is failure):
- Empty subject lists for any class level
- Wrong subjects appearing (e.g., SS subjects in Primary)
- Department filtering not working in SS classes
- Blank dropdowns or no subjects visible

---

## 📞 If Something Goes Wrong

### Problem: "No subjects available for this class" appears

**Cause**: Migration didn't execute or subjects not populated
**Fix**:
1. Re-run the migration verification queries
2. If still empty, re-execute migration 107
3. Clear cache again
4. Refresh page

### Problem: "Still seeing old subject list" after deployment

**Cause**: Browser cache not cleared
**Fix**:
1. Clear cache completely (Ctrl+Shift+Delete on Windows, Cmd+Shift+Delete on Mac)
2. Close browser
3. Restart browser
4. Go to app in new tab

### Problem: Department selection UI not appearing for SS classes

**Cause**: Code changes not deployed
**Fix**:
1. Check Vercel deployment status
2. Verify files were committed and pushed
3. If necessary, manually trigger Vercel deployment
4. Clear cache and restart browser

### Problem: "TypeError: getSubjectsForDepartment is not a function"

**Cause**: Old service code cached or not deployed
**Fix**:
1. Verify code changes are deployed to Vercel
2. Clear browser cache
3. Restart browser
4. Check browser console for errors

---

## 📝 Documentation Generated

The following documents have been created to support testing:

1. **SUBJECT_MASTER_REFERENCE.md** - Complete subject catalog and level mappings
2. **MIGRATION_EXECUTION_GUIDE.md** - Detailed migration execution instructions
3. **TEST_PLAN_AND_RESULTS.md** - Comprehensive test plan with 21 test cases
4. **IMMEDIATE_ACTION_ITEMS.md** (this file) - Quick reference checklist

---

## 🎯 Next Steps

1. **NOW**: Execute migration 107 in Supabase (Step 1 above)
2. **THEN**: Deploy code changes (Step 2 above)
3. **THEN**: Clear browser cache and restart (Step 3 above)
4. **THEN**: Run all 21 test cases from TEST_PLAN_AND_RESULTS.md
5. **FINALLY**: Document results and sign off

---

## Summary

| Item | Status | Action |
|------|--------|--------|
| Migration 107 | ❌ Not executed | Execute in Supabase SQL Editor |
| Code deployment | ❌ Not deployed | Push to main, verify Vercel deployment |
| Cache cleared | ❌ Not cleared | Clear & restart browser |
| Tests ready | ✅ Ready | TEST_PLAN_AND_RESULTS.md prepared |

**Estimated Time to Complete Testing**: 1-2 hours (including all 3 pre-test steps + 21 tests)

