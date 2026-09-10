# 🎯 COMPLETE FIX - START HERE

## THE REAL PROBLEMS

1. **Pages not loading** - Static assets 404 (dev server cache issue)
2. **Classes/Subjects empty** - Registration modals show no data
3. **Auth flow broken** - Users redirected to wrong dashboard

---

## SOLUTION - DO THIS NOW

### STEP 1: Stop Everything (2 minutes)

**In your terminal:**
```bash
# Kill the development server
# Press Ctrl+C if running "npm run dev"

# Clear Next.js cache
rm -rf .next
rm -rf node_modules/.cache

# Windows:
# rmdir /s /q .next
# rmdir /s /q node_modules\.cache
```

### STEP 2: Restart Dev Server (3 minutes)

```bash
cd c:\Users\OLU\Desktop\SMS
npm run dev
```

**Wait for:**
```
 ▲ Next.js 14.x.x
 - Local:        http://localhost:3000
 ✓ Ready in 2.5s
```

### STEP 3: Verify Pages Load (2 minutes)

1. Open http://localhost:3000
2. Refresh page (Ctrl+F5 for hard refresh)
3. Check browser console - should have NO 404 errors
4. Static assets should load:
   - ✅ CSS loads
   - ✅ JavaScript loads
   - ✅ Page displays

**If still 404:** Clear browser cache completely
- Press F12 → Application → Clear site data → Clear all

### STEP 4: Insert Test Data (5 minutes)

**Before registration can work, schools need classes and subjects.**

#### Option A: Using API (Easiest)

1. Get your school UUID:
   - Log in as school admin
   - Check browser console for schoolId
   - Or find in Supabase dashboard

2. Make API call:
```bash
curl -X POST http://localhost:3000/api/debug/insert-test-data \
  -H "Content-Type: application/json" \
  -d '{"schoolId": "your-school-uuid-here"}'
```

**Response should show:**
```json
{
  "success": true,
  "data": {
    "classes": 12,
    "arms": 36,
    "combos": 36,
    "subjects": 27
  }
}
```

#### Option B: Using SQL (Direct)

1. Go to https://supabase.com/dashboard
2. Select project: `egdreueuspmuxhezdpqm`
3. **SQL Editor** → **New Query**
4. Copy Migration 013: `database/migrations/013_insert_test_data.sql`
5. Replace `[school_id_uuid]` with your actual school UUID
6. Click **Run**

### STEP 5: Verify Registration Data (3 minutes)

Check that classes and subjects were inserted:

```bash
curl "http://localhost:3000/api/debug/registration-data?schoolId=your-school-uuid"
```

**Should return:**
```json
{
  "classes": {
    "count": 12,
    "sample": [...]
  },
  "subjects": {
    "count": 27,
    "sample": [...]
  }
}
```

### STEP 6: Test Registration Modals (5 minutes)

1. Log in as school admin
2. Go to **School Admin Dashboard**
3. Click **"+ Register Teacher"**
4. Continue through steps → Reach **Step 4: Teaching Assignment**
5. **Verify:**
   - ✅ Class dropdown shows 12 classes
   - ✅ Subjects list shows 27 subjects
   - ✅ Not "No subjects available" message

**If dropdowns still empty:**
- Open browser console (F12)
- Look for `[REGISTRATION DEBUG]` logs
- Check the schoolId value
- Ensure data was inserted for that schoolId

### STEP 7: Run Database Migration (5 minutes)

**Execute Migration 014 in Supabase:**

1. Go to https://supabase.com/dashboard
2. Select project: `egdreueuspmuxhezdpqm`
3. **SQL Editor** → **New Query**
4. Copy entire file: `database/migrations/014_auto_create_users_on_auth_signup.sql`
5. Click **Run**

### STEP 8: Test Full Registration Flow (10 minutes)

**Register a complete teacher:**

1. Go to School Admin Dashboard
2. Click **"+ Register Teacher"**
3. **Step 1:** Select "Primary School"
4. **Step 2:** Enter name, email, password, DOB
5. **Step 3:** Enter bank details (can be fake for testing)
6. **Step 4:** 
   - Select a class (dropdown should show classes)
   - Check 2-3 subjects (list should show subjects)
   - Click "Complete Registration"
7. **Verify:** Success message appears
8. **Check Supabase:**
   - Go to users table
   - New teacher record should exist with status 'ACTIVE'

---

## TROUBLESHOOTING

### Issue: Pages still showing 404 errors

**Fix:**
```bash
# Full clean rebuild
rm -rf .next
npm run build  # (takes 2-3 minutes)
npm run dev
```

### Issue: "No subjects available" in dropdowns

**Cause:** Test data not inserted for this school

**Fix:**
```bash
# 1. Get your schoolId from browser console
# 2. Insert test data:
curl -X POST http://localhost:3000/api/debug/insert-test-data \
  -H "Content-Type: application/json" \
  -d '{"schoolId": "paste-your-uuid-here"}'

# 3. Refresh the registration modal
# 4. Check console for [REGISTRATION DEBUG] logs
```

### Issue: Still being redirected to Student Dashboard

**Cause:** Migration 014 not run yet, or users table still orphaned

**Fix:**
1. Run Migration 014 in Supabase
2. Then in SQL Editor:
   ```sql
   SELECT * FROM public.sync_pending_auth_users();
   ```
3. Logout completely
4. Clear browser cache
5. Login again

### Issue: "Supabase not configured"

**Cause:** Missing environment variables

**Fix:**
1. Check `.env.local` has:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY`
2. If missing, add them
3. Restart dev server

### Issue: Registration fails with error message

**Check:**
1. Browser console for detailed error
2. Network tab to see API response
3. Supabase database:
   - Does school exist?
   - Do classes exist for that school?
   - Do subjects exist for that school?

---

## VERIFICATION CHECKLIST

- [ ] Dev server running, pages load without 404 errors
- [ ] Can log in as school admin
- [ ] Redirected to School Admin Dashboard (not student)
- [ ] Test data inserted for school (12 classes, 27 subjects)
- [ ] Teacher registration modal shows class dropdown
- [ ] Teacher registration modal shows subject checklist
- [ ] Can select a class and 2+ subjects
- [ ] Can complete teacher registration
- [ ] Teacher record appears in Supabase
- [ ] Student registration modal also shows classes/subjects
- [ ] Can register a student
- [ ] Student record appears in Supabase
- [ ] New registrations are queued in pending_auth_users table
- [ ] Migration 014 deployed successfully

---

## FINAL STATUS

After completing all steps:

✅ **Pages load correctly** - No 404 errors
✅ **Registration modals work** - Classes and subjects show
✅ **Can register teachers** - Data saves to database
✅ **Can register students** - Data saves to database
✅ **Auth flow works** - Correct dashboard routing
✅ **Multi-school isolation** - Each school sees only their data

---

## WHAT EACH COMPONENT DOES

### Classes & Subjects in Dropdowns
- **Migration 013** inserts 12 classes and 27 subjects per school
- **TeacherRegistrationModal** queries these via Supabase
- **StudentRegistrationModal** queries these via Supabase
- Debug logs show if data is loading

### Auth & Dashboard Routing
- **Migration 014** queues users for database sync
- **Auth service** maps ADMIN → SCHOOL_ADMIN role
- **Router** sends to correct dashboard based on role

### Test Data Endpoint
- **/api/debug/insert-test-data** - POST to insert classes/subjects
- **/api/debug/registration-data** - GET to verify data exists
- **/api/debug/fix-auth-users** - POST to manually sync pending users

---

## TIME ESTIMATES

| Step | Action | Time |
|------|--------|------|
| 1 | Stop/Clear cache | 2 min |
| 2 | Restart dev server | 3 min |
| 3 | Verify pages load | 2 min |
| 4 | Insert test data | 5 min |
| 5 | Verify data inserted | 3 min |
| 6 | Test registration modal | 5 min |
| 7 | Run Migration 014 | 5 min |
| 8 | Full registration test | 10 min |
| **Total** | **All steps** | **~35 min** |

---

## IF YOU STILL HAVE ISSUES

1. **Don't try to fix multiple things at once**
2. **Follow the checklist step by step**
3. **After each step, verify it worked**
4. **Check browser console for errors**
5. **Check network tab for API responses**
6. **Check Supabase logs for database errors**

---

**Next Action:** Stop dev server and clear cache, then restart
