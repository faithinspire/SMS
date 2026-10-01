# SMS System - Deployment Instructions

## 🚨 CRITICAL FIXES READY FOR DEPLOYMENT

This document guides you through deploying the fixes for the 42P10 ON CONFLICT error and related issues.

---

## STEP 1: Run Migrations in Supabase (REQUIRED FIRST)

**IMPORTANT**: These migrations MUST run in Supabase BEFORE deploying the code.

### Instructions:
1. Open **Supabase Dashboard** → Select your project
2. Go to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy the entire content from: `c:\Users\OLU\Desktop\SMS\RUN_MIGRATIONS_161_162_163.sql`
5. Paste into the SQL editor
6. Click **RUN** (top right) or press `Ctrl+Enter`
7. Wait for all queries to complete successfully

### Expected Output:
```
Migration 161: UNIQUE constraints verified
Migration 162: All problematic functions and triggers removed
Migration 163: end_year constraint fixed
```

### Verification Queries (at bottom of SQL file):
After running the migrations, scroll down and run the verification queries to confirm:
- ✅ UNIQUE constraints exist on academic_sessions and academic_terms
- ✅ end_year column is NOT NULL and has DEFAULT value
- ✅ No triggers exist on schools table
- ✅ No old functions (auto_seed_*, safe_insert_*) exist

---

## STEP 2: Push Code Changes to GitHub

### Instructions:
1. Open **Command Prompt** or **PowerShell**
2. Navigate to project: `cd c:\Users\OLU\Desktop\SMS`
3. Run the push script:
   ```bash
   PUSH_FIXES.bat
   ```
   
   OR manually run:
   ```bash
   git add database/migrations/161_ensure_unique_constraints.sql
   git add database/migrations/162_fix_on_conflict_academic_tables.sql
   git add database/migrations/163_fix_academic_sessions_end_year.sql
   git commit -m "fix: resolve 42P10 ON CONFLICT error - remove triggers, add UNIQUE constraints, fix end_year"
   git push origin main
   ```

### Expected Output:
```
Your branch is up to date with 'origin/main'.
...
 3 files changed, X insertions(+)
 create mode 100644 database/migrations/161_ensure_unique_constraints.sql
 create mode 100644 database/migrations/162_fix_on_conflict_academic_tables.sql
 create mode 100644 database/migrations/163_fix_academic_sessions_end_year.sql
```

---

## STEP 3: Wait for Vercel Auto-Deployment

### What Happens:
1. GitHub receives your push
2. Webhook triggers Vercel deployment
3. Vercel clones repo, installs dependencies, builds project
4. New version deployed to production

### Monitor Deployment:
1. Go to **Vercel Dashboard** (https://vercel.com/dashboard)
2. Select the SMS project
3. Watch deployment progress:
   - Building... (1-2 minutes)
   - Deployment... (30 seconds)
   - Live ✅

### Expected Time: **3-5 minutes total**

---

## STEP 4: Test School Registration (Verify Fix Works)

### Test: Create a New School

**Via Vercel (Production)**:
1. Navigate to: `https://your-sms-app.vercel.app` (replace with your URL)
2. Login as **Super Admin**
3. Click "Register School"
4. Fill in school details:
   - School Name: **"TEST-SCHOOL-2025"**
   - Email: **test@school.com**
   - Admin Email: **admin@testschool.com**
   - Admin Password: **SecurePass123!**
   - Phone: **+2348012345678**
   - Address: **123 Test Street**
   - Subscription Plan: **Premium**
5. Click **Submit**

### Expected Results:
✅ **Success Response** (201 status):
```json
{
  "success": true,
  "school_id": "uuid-here",
  "school_name": "TEST-SCHOOL-2025",
  "message": "School registered successfully with Nigerian curriculum",
  "seeding": {
    "success": true,
    "classesCreated": 12,
    "armsCreated": 36,
    "combosCreated": 36,
    "sessionsCreated": 1
  }
}
```

✅ **No 42P10 Error** in browser console

✅ **Check Supabase** to verify data:
- Query 1: `SELECT COUNT(*) FROM schools WHERE name = 'TEST-SCHOOL-2025';` → Should be 1
- Query 2: `SELECT COUNT(*) FROM academic_sessions WHERE school_id = (SELECT id FROM schools WHERE name = 'TEST-SCHOOL-2025');` → Should be 1
- Query 3: `SELECT COUNT(*) FROM academic_terms WHERE school_id = (SELECT id FROM schools WHERE name = 'TEST-SCHOOL-2025');` → Should be 3

---

## STEP 5: Test School Admin Dashboard

### Test: Login as School Admin

1. Login with credentials from Step 4:
   - Email: **admin@testschool.com**
   - Password: **SecurePass123!**

### Expected Results:
✅ Dashboard loads without errors

✅ **Staff Tab**:
- Click "👨‍🏫 Staff" tab
- Should show empty list (no staff registered yet)
- No errors in console

✅ **Students Tab**:
- Click "👨‍🎓 Students" tab
- Should show empty list (no students registered yet)
- No errors in console

✅ **Academic Tab**:
- Click "📚 Academic" tab
- Sessions section shows: "2024/2025"
- Terms section shows: "First Term", "Second Term", "Third Term"
- Classes section shows count (auto-seeded classes)

---

## STEP 6: Rollback Plan (If Issues Occur)

### If deployment fails or issues appear:

**Option A: Revert Code (Simplest)**:
```bash
git revert HEAD
git push origin main
# Vercel will auto-deploy the previous version
```

**Option B: Revert Migrations in Supabase**:
1. Go to Supabase SQL Editor
2. Drop the new constraints:
   ```sql
   ALTER TABLE academic_sessions DROP CONSTRAINT IF EXISTS academic_sessions_school_id_session_year_key;
   ALTER TABLE academic_terms DROP CONSTRAINT IF EXISTS academic_terms_school_id_session_id_term_order_key;
   ```
3. Re-create old triggers if needed (from backup)

---

## STEP 7: Notify Users

Once deployment is complete and tested:

**Create a release note**:
```
🚀 SMS System Update - V2.1.0

FIXES:
✅ Resolved 42P10 database error blocking school registration
✅ Fixed academic_sessions end_year NOT NULL constraint
✅ Removed all problematic database triggers
✅ Improved school seeding reliability

TESTED & VERIFIED:
✅ Super admin can register schools without errors
✅ Academic sessions/terms auto-created successfully
✅ School admin dashboard loads correctly
✅ All data validates in Supabase

DEPLOYMENT TIME: 3-5 minutes
STATUS: LIVE as of [timestamp]
```

---

## TROUBLESHOOTING

### Issue: 42P10 Error Still Appears After Deployment

**Solution**:
1. Verify migrations ran in Supabase (check STEP 1 verification queries)
2. Check Vercel deployment logs: Dashboard → Deployments → Failed deployment → Logs
3. Clear browser cache: `Ctrl+Shift+Delete` → Clear all
4. Test in incognito window
5. If still failing: Check Supabase logs for database errors

### Issue: Vercel Build Failed

**Solution**:
1. Check build logs in Vercel: Dashboard → Deployments → [latest] → Logs
2. Common issues:
   - TypeScript errors in modified files
   - Missing environment variables
   - Node version mismatch
3. Fix errors locally: `npm run build`
4. Commit and push again

### Issue: School Admin Dashboard Tab Not Loading

**Solution**:
1. Verify school data exists in Supabase
2. Check browser network tab for API errors
3. Verify user.school_id is set in auth context
4. Check Supabase RLS policies (academic_sessions and academic_terms should have RLS disabled)

---

## FINAL CHECKLIST

Before declaring deployment complete:

- [ ] All 3 migrations ran successfully in Supabase
- [ ] Verification queries returned expected results
- [ ] Git push succeeded (check GitHub repo)
- [ ] Vercel deployment shows "LIVE" status
- [ ] No errors in Vercel Function logs
- [ ] Super admin can register a school without 42P10 error
- [ ] School data appears in Supabase
- [ ] School admin can login and see dashboard
- [ ] Academic sessions/terms/classes appear in Supabase
- [ ] Browser console shows no errors
- [ ] End-to-end test passed (school registration → dashboard)

---

## SUPPORT

If you encounter issues:
1. Check this troubleshooting section
2. Review the plan.md file for detailed technical info
3. Check Supabase logs: Dashboard → Logs
4. Check Vercel logs: Dashboard → Deployments
5. Contact development team with logs/screenshots

---

**Deployment Date**: 2025-10-01
**Status**: READY FOR DEPLOYMENT
**Estimated Time**: 5 minutes
**Risk Level**: LOW (database migrations are additive, code is backward compatible)
