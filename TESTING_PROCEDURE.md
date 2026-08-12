# Testing Procedure - School Admin Login Fix

## Overview

This document provides step-by-step instructions to test the complete school registration and login flow.

## Prerequisites

- [ ] Next.js dev server running (`npm run dev`)
- [ ] Access to browser (Chrome/Firefox/Edge)
- [ ] Browser Developer Tools open (F12)
- [ ] Supabase project configured (check `.env.local`)

## Test Scenario 1: Basic School Registration & Login

### Step 1: Verify System Health

1. Open browser and go to: `http://localhost:3000/api/health`
2. You should see JSON with configuration status
3. Verify:
   - `environment`: "development"
   - `supabase.url_configured`: true
   - `supabase.anon_key_configured`: true
   - `supabase.service_key_configured`: true
   - `supabase.connection`: "ok"

**Expected Result**: ✅ All configs present and connection works

### Step 2: Access Super Admin Dashboard

1. Go to: `http://localhost:3000/landing`
2. Click "👑 Super Admin" button in top right
3. Either:
   - Use existing Super Admin credentials, OR
   - Click "Create Account" to register new Super Admin
4. After login, you should see the Super Admin Dashboard

**Expected Result**: ✅ You're logged in as Super Admin

### Step 3: Register a School

1. On Super Admin Dashboard, go to "Schools" tab
2. Fill in the school registration form:
   ```
   School Name:     Test School 001
   School Email:    (optional)
   School Phone:    (optional)
   School Address:  (optional)
   School Type:     BOTH
   Admin Email:     testadmin001@school.com
   Admin Password:  TestPass123
   ```
3. Click "Register School" button
4. **CHECK BROWSER CONSOLE** (F12 → Console tab)

**Expected Logs** (you should see these):
```
📝 School registration request: { name: 'Test School 001', admin_email: 'testadmin001@school.com' }
🔌 Step 1: Creating Supabase Auth user FIRST...
📊 Auth creation response status: 201
✅ Supabase Auth user created with ID: [USER_ID]
🔌 Step 2: Registering school...
📊 School insert response status: 201
✅ School registered with ID: [SCHOOL_ID]
🔌 Step 3: Updating auth user with school ID...
✅ Auth user updated with school ID
🔌 Step 4: Creating user record in users table...
✅ User record created in users table
✅ Full registration completed successfully
```

**Expected Result**: 
- ✅ School appears in "Schools" list
- ✅ No error messages
- ✅ All log messages above appear (no ❌ errors)
- ✅ Success notification shows

**If you see errors**:
- Check console for network errors
- Verify all env vars are set
- See troubleshooting section below

### Step 4: Logout from Super Admin

1. Click logout button or go to: `http://localhost:3000/landing`

### Step 5: Test School Admin Login

1. Go to: `http://localhost:3000/auth/school-admin/login`
2. Enter credentials from Step 3:
   ```
   Email:    testadmin001@school.com
   Password: TestPass123
   ```
3. Click "Sign In"
4. **CHECK BROWSER CONSOLE** (F12 → Console tab)

**Expected Logs**:
```
🔐 Attempting primary login via Supabase Auth...
✅ Primary login successful via Supabase Auth
```

**Expected Result**:
- ✅ Redirects to `/school-admin/dashboard`
- ✅ Dashboard loads
- ✅ School name appears in header
- ❌ Should NOT see "Invalid email or password" error
- ❌ Should NOT see "400 Bad Request" error

### Step 6: Verify School Admin Dashboard

1. On the school admin dashboard:
   - [ ] Your school name is displayed
   - [ ] Menu items appear (Students, Staff, Classes, etc.)
   - [ ] You can view the dashboard

**Expected Result**: ✅ Full dashboard access

### Step 7: Logout and Test Again

1. Logout from school admin dashboard
2. Repeat steps 5-6 to verify login works consistently

**Expected Result**: ✅ Multiple logins work without issues

---

## Test Scenario 2: Multiple Schools

Repeat Test Scenario 1 with different school names:

1. School 2:
   - Name: "Academy International"
   - Email: "admin@academy.com"
   - Password: "AcademyPass123"

2. School 3:
   - Name: "Trinity High School"
   - Email: "principal@trinity.com"
   - Password: "TrinityPrincipal456"

**Expected Result**: ✅ Each school admin can login independently

---

## Test Scenario 3: Error Cases

### Test 3a: Wrong Password

1. Go to: `http://localhost:3000/auth/school-admin/login`
2. Enter:
   - Email: testadmin001@school.com (correct)
   - Password: WrongPassword123 (wrong)
3. Click "Sign In"

**Expected Result**:
- ✅ Shows error: "Invalid email or password"
- ✅ Stays on login page
- ❌ Does NOT hang or loop

### Test 3b: Non-existent Email

1. Go to: `http://localhost:3000/auth/school-admin/login`
2. Enter:
   - Email: nonexistent@email.com
   - Password: AnyPassword123
3. Click "Sign In"

**Expected Result**:
- ✅ Shows error: "Invalid email or password"
- ✅ Stays on login page

### Test 3c: Empty Fields

1. Go to: `http://localhost:3000/auth/school-admin/login`
2. Leave fields empty
3. Click "Sign In"

**Expected Result**:
- ✅ Shows error: "Email and password are required"
- ✅ Does NOT attempt login

---

## Test Scenario 4: Network Issues (Advanced)

This tests the retry logic in the registration API.

### Test 4a: Simulate Network Delay

1. Open Network tab in Developer Tools (F12 → Network)
2. Set network throttling to "Slow 3G"
3. Register a new school
4. Watch the network requests

**Expected Result**:
- ✅ Registration still succeeds despite slow network
- ✅ May take longer but completes
- ✅ See all 4 steps in logs (auth creation, school creation, etc.)

### Test 4b: Restore Network

1. Set network throttling to "No throttling"
2. Test login again

**Expected Result**: ✅ Login works normally at full speed

---

## Test Scenario 5: Fallback Authentication (Advanced)

This tests the fallback mechanism when Supabase Auth fails.

### Prerequisites

- Have a school registered from previous tests
- Have access to Supabase console

### Test 5a: Delete Auth User Manually

1. Go to Supabase console
2. Navigate to Authentication → Users
3. Find the auth user for the test school
4. Delete the user
5. Go back to browser

### Test 5b: Attempt Login

1. Try logging in with the school admin credentials
2. **CHECK CONSOLE**

**Expected Logs** (if fallback works):
```
🔐 Attempting primary login via Supabase Auth...
⚠️ Supabase Auth failed with invalid credentials, attempting fallback login...
🔑 Attempting fallback login for: testadmin001@school.com
✅ Fallback login successful for school: [SCHOOL_ID]
✅ Fallback login successful
```

**Expected Result**:
- ✅ Login still works (via fallback)
- ✅ Dashboard loads
- ✅ User can use the system

### Test 5c: Recreate Auth User

1. Go to Supabase console
2. Manually recreate the auth user for that school:
   - Email: testadmin001@school.com
   - Password: TestPass123
   - Email confirmed: Yes
   - User metadata: Add "role": "SCHOOL_ADMIN"

3. Go back to browser and test login again

**Expected Logs** (primary auth should work again):
```
🔐 Attempting primary login via Supabase Auth...
✅ Primary login successful via Supabase Auth
```

**Expected Result**: ✅ Primary auth works again

---

## Console Monitoring Checklist

### During Registration, You Should See:

- [ ] 4 success messages (auth create, school register, auth update, user record)
- [ ] NO ❌ errors or warnings
- [ ] Response times < 3 seconds each step
- [ ] Auth user ID is logged
- [ ] School ID is logged

### During Login, You Should See:

- [ ] Primary login attempt message
- [ ] ✅ Success message (either "auth" or "fallback")
- [ ] NO ❌ 400 errors
- [ ] NO ❌ "Invalid email or password" repeated multiple times
- [ ] Response time < 2 seconds

### Error Messages You Should NOT See:

- ❌ "relation 'submissions' does not exist"
- ❌ "RLS policy is blocking" (repeated)
- ❌ "Invalid server response"
- ❌ "Failed to fetch" (after registration completes)
- ❌ "Too many retries"

---

## Troubleshooting

### Issue: "Invalid email or password" on first login after registration

**Causes**:
1. Auth user wasn't created
2. Database didn't receive school registration

**Fix**:
1. Check console logs during registration (should see 4 success steps)
2. If auth creation failed, manually create the user in Supabase console
3. If school wasn't created, check Supabase database directly
4. Check network tab to see which API call failed

### Issue: "relation 'submissions' does not exist"

**Causes**:
1. Old RLS policy still referencing non-existent table
2. Migration 006 wasn't applied

**Fix**:
1. Go to Supabase SQL editor
2. Run: `DROP POLICY IF EXISTS ... ON submissions;` for all old policies
3. Or apply migration 006 if not already applied

### Issue: "RLS policy is blocking"

**Causes**:
1. RLS not properly disabled
2. Grants not properly assigned

**Fix**:
1. Run migration 006 again
2. Verify: `ALTER TABLE schools DISABLE ROW LEVEL SECURITY;`
3. Verify: `GRANT SELECT, INSERT, UPDATE, DELETE ON schools TO anon, authenticated;`

### Issue: Registration succeeds but login fails repeatedly

**Causes**:
1. Service key not in environment
2. Auth user wasn't created in step 1

**Fix**:
1. Verify `SUPABASE_SERVICE_KEY` is in `.env.local`
2. Check console logs - should show ✅ for auth creation
3. If step 1 fails, auth user creation failed - check the error

### Issue: Infinite retry loop on login

**Causes**:
1. Network completely down
2. Supabase API endpoint unreachable

**Fix**:
1. Check internet connection
2. Verify Supabase URL is correct in `.env.local`
3. Check Supabase status page
4. Restart Next.js server

---

## Success Criteria

✅ **All tests pass if**:

- [ ] School registration succeeds (all 4 steps show ✅)
- [ ] School admin can login immediately after registration
- [ ] Multiple schools can be registered and login independently
- [ ] Wrong credentials show proper error
- [ ] Non-existent user shows proper error
- [ ] Slow network doesn't break registration
- [ ] Fallback auth works if primary fails
- [ ] Console shows proper logs (no ❌ errors)
- [ ] No "Invalid email or password" repeated multiple times
- [ ] No "400 Bad Request" errors

## Next Steps After Testing

1. **If all tests pass**: ✅
   - Deploy to production
   - Document the working flow
   - Create admin onboarding guide

2. **If any test fails**: 
   - Check troubleshooting section
   - Review console logs carefully
   - Share error logs with development team
   - Do NOT deploy until all tests pass

---

## Support

For questions or issues:
1. Check console logs (F12 → Console)
2. Check Network tab to see failed requests
3. Review this document's troubleshooting section
4. Check `.env.local` configuration
5. Verify migrations are applied in Supabase

---

**Last Updated**: 2026-08-10
**Version**: 1.0
**Status**: Ready for Testing ✅
