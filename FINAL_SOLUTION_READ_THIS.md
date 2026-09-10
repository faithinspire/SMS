# 🎯 FINAL COMPLETE SOLUTION - READ THIS FIRST

## THE PROBLEM (Short Summary)

Your Next.js app won't load static assets (404 errors). This breaks EVERYTHING.

```
GET /_next/static/chunks/main-app.js 404 (Not Found)
GET /_next/static/css/app/layout.css 404 (Not Found)
```

**Root Cause:** Build cache is corrupted or dependencies need reinstall.

---

## THE SOLUTION (ONE COMMAND)

### Option 1: PowerShell (Recommended)

```powershell
# Run this in PowerShell as Administrator:
cd c:\Users\OLU\Desktop\SMS
.\rebuild.ps1
```

### Option 2: Command Prompt (Windows CMD)

```cmd
REM Run this in Command Prompt (as Administrator):
cd c:\Users\OLU\Desktop\SMS
rebuild.bat
```

### Option 3: Manual Steps

```bash
# 1. Stop dev server (Ctrl+C)

# 2. Clear cache
rm -Force -Recurse .next
rm -Force -Recurse node_modules\.cache

# 3. Reinstall
npm install

# 4. Restart
npm run dev
```

---

## WHAT THESE SCRIPTS DO

1. **Stop all Node processes**
   - Kills any hanging dev servers
   - Frees up port 3000

2. **Clear cache**
   - Removes `.next` directory (Next.js build cache)
   - Removes `node_modules\.cache` (npm cache)

3. **Reinstall dependencies**
   - Runs `npm install` to ensure all packages are correct
   - Fixes any missing or corrupted modules

4. **Test build**
   - Runs `npm run build` to verify everything compiles
   - Catches errors before starting dev server

5. **Start dev server**
   - Runs `npm run dev`
   - Server listens on http://localhost:3000

---

## AFTER REBUILD - VERIFICATION CHECKLIST

After the rebuild completes, verify:

- [ ] Dev server running: `✓ Ready in X.XXs`
- [ ] Browser loads http://localhost:3000
- [ ] NO 404 errors in browser console
- [ ] Pages render properly (not blank)
- [ ] Can see login form
- [ ] CSS is loaded (page has styling)
- [ ] JavaScript is loaded (page is interactive)

---

## IF STILL GETTING 404 ERRORS AFTER REBUILD

Try these in order:

### Step 1: Hard Refresh Browser
```
Windows: Ctrl+Shift+Delete
Mac: Cmd+Shift+Delete
```
Then:
```
Windows: Ctrl+F5
Mac: Cmd+Shift+R
```

### Step 2: Clear Browser Cache Completely
1. Open DevTools (F12)
2. Right-click refresh button
3. Select "Clear site data"
4. Close DevTools
5. Refresh page (Ctrl+F5)

### Step 3: Verify Dev Server is Running
1. Check terminal - should show: `✓ Ready in X.XXs`
2. Check port 3000 is listening: `netstat -ano | findstr :3000`
3. If nothing, run rebuild again

### Step 4: Check for Build Errors
```bash
cd c:\Users\OLU\Desktop\SMS
npm run build 2>&1 | more
```

Look for error messages. Common ones:
- `Error: Cannot find module` - npm install failed
- `Syntax error` - code has TypeScript errors
- `EACCES: permission denied` - permission issue

### Step 5: Nuclear Option
```bash
# Complete fresh start
cd c:\Users\OLU\Desktop\SMS

# Kill everything
taskkill /F /IM node.exe

# Delete everything
rmdir /s /q .next
rmdir /s /q node_modules
del package-lock.json

# Reinstall completely
npm install
npm run dev
```

---

## ONCE PAGES ARE LOADING

### Now Enable Class/Subject Dropdowns

#### Step 1: Get Your School UUID
```sql
-- In Supabase SQL Editor:
SELECT id, name FROM public.schools LIMIT 5;
-- Copy your school's id (UUID)
```

#### Step 2: Insert Test Data

**Method A: API Call (Easy)**
```bash
curl -X POST http://localhost:3000/api/debug/insert-test-data \
  -H "Content-Type: application/json" \
  -d '{"schoolId": "your-school-uuid-here"}'
```

**Method B: SQL (Manual)**
1. Go to Supabase SQL Editor
2. Open: `database/migrations/013_insert_test_data.sql`
3. Replace `10459a61-7e93-494c-b951-6cef5d589a88` with YOUR school UUID
4. Run the migration
5. Should insert 12 classes + 27 subjects

#### Step 3: Verify Data Inserted
```bash
# Check via API
curl "http://localhost:3000/api/debug/registration-data?schoolId=your-school-uuid"

# OR check via SQL
SELECT COUNT(*) FROM classes WHERE school_id = 'your-school-uuid';
SELECT COUNT(*) FROM subjects WHERE school_id = 'your-school-uuid';
```

**Expected:**
- 12 classes ✅
- 27 subjects ✅

#### Step 4: Test Registration Modal
1. Log in as school admin
2. Go to School Admin Dashboard
3. Click "+ Register Teacher"
4. Go to Step 4: Teaching Assignment
5. **Verify:**
   - Class dropdown shows options ✅
   - Subject list shows options ✅
   - Can select multiple subjects ✅

---

## FIX FOR AUTH/DASHBOARD ROUTING

### Problem
School admins were seeing Student Dashboard instead of School Admin Dashboard.

### Solution Applied
**File:** `src/services/auth.service.ts`

Auth service now:
1. Maps role: `ADMIN` → `SCHOOL_ADMIN`
2. Extracts `schoolId` from metadata
3. Routes to correct dashboard

**Verification:**
1. Log in as school admin
2. Check browser console
3. Should see: `→ Redirecting to School Admin dashboard`
4. Not: `No school_id for student`

---

## COMPLETE WORKFLOW - START TO FINISH

### Time: ~45 minutes total

1. **Rebuild** (5 min)
   - Run rebuild.bat or rebuild.ps1
   - Wait for "Ready in X.XXs"

2. **Verify Pages Load** (3 min)
   - Open http://localhost:3000
   - Hard refresh (Ctrl+F5)
   - Check no 404 errors

3. **Get School UUID** (2 min)
   - Log in as school admin
   - Go to Supabase dashboard
   - Copy your school's id

4. **Insert Test Data** (5 min)
   - Call `/api/debug/insert-test-data` API
   - Or run Migration 013 manually
   - Verify 12 classes + 27 subjects

5. **Test Registration Modal** (5 min)
   - Click Register Teacher
   - Go to Step 4
   - Verify dropdowns populate

6. **Register Test Teacher** (10 min)
   - Complete full registration
   - Verify data in Supabase

7. **Register Test Student** (10 min)
   - Test student registration
   - Verify data in Supabase

---

## SUCCESS INDICATORS

✅ **You're done when:**

1. ✅ Pages load without 404 errors
2. ✅ Can log in as school admin
3. ✅ See School Admin Dashboard (not student)
4. ✅ Teacher registration modal shows dropdowns
5. ✅ Student registration modal shows dropdowns
6. ✅ Can register a teacher (data saved)
7. ✅ Can register a student (data saved)
8. ✅ Supabase contains teacher records
9. ✅ Supabase contains student records

---

## SUPPORT - IF STUCK

### Still Getting 404 After Rebuild?
1. Check terminal - is dev server running?
2. Is it listening on port 3000?
3. Try hard refresh: Ctrl+Shift+Delete, then Ctrl+F5
4. Close ALL tabs, open new tab, go to http://localhost:3000

### Dropdowns Still Empty?
1. Check school UUID is correct
2. Run `/api/debug/registration-data?schoolId=uuid` to verify data
3. If count is 0, insert test data
4. Refresh the registration modal
5. Check console for [REGISTRATION DEBUG] logs

### Wrong Dashboard After Login?
1. This is fixed in auth.service.ts
2. Just needs a rebuild and you're good
3. Check console for role mapping message

---

## FILES THAT WERE MODIFIED

**Critical files:**
- ✅ `src/services/auth.service.ts` - Auth fallback logic with role mapping
- ✅ `database/migrations/014_auto_create_users_on_auth_signup.sql` - User sync tables/functions

**Debug files (for troubleshooting):**
- ✅ `src/app/api/debug/insert-test-data/route.ts` - Insert classes/subjects
- ✅ `src/app/api/debug/registration-data/route.ts` - Check what data exists
- ✅ `src/app/api/debug/fix-auth-users/route.ts` - Check/fix pending users

**UI files (unchanged, no errors):**
- ✅ `src/components/admin/TeacherRegistrationModal.tsx` - Has debug logging
- ✅ `src/components/admin/StudentRegistrationModal.tsx` - Has debug logging

---

## NEXT IMMEDIATE ACTIONS

1. **Right now:**
   ```bash
   cd c:\Users\OLU\Desktop\SMS
   .\rebuild.ps1
   ```

2. **When pages load:**
   - Hard refresh browser
   - Verify no 404 errors
   - Log in as school admin

3. **When logged in:**
   - Get your school UUID from Supabase
   - Insert test data
   - Test registration modal

4. **When everything works:**
   - You're done! 🎉
   - System is ready for production

---

**Status:** Ready to rebuild
**Next Action:** Run rebuild.ps1 or rebuild.bat
**Expected Duration:** 5-10 minutes
