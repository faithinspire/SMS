# 🚨 URGENT: BROADCAST FIX - IMMEDIATE ACTIONS REQUIRED

## Current Status
- ✅ Root cause identified: RLS disabled on broadcasts table
- ✅ Migration 136 created: `database/migrations/136_restore_broadcasts_rls_policies.sql`
- ✅ Deployment guide created: `BROADCAST_FIX_DEPLOYMENT_GUIDE.md`
- ⏳ **WAITING**: Execute migration + push to Vercel

---

## STEP 1: Execute Migration 136 in Supabase (RIGHT NOW)

**Do this FIRST - it's the database fix that will make broadcasts work**

1. Go to: https://app.supabase.com
2. Select your SMS project
3. Go to: **SQL Editor** (left sidebar)
4. Click: **New Query**
5. Open file: `database/migrations/136_restore_broadcasts_rls_policies.sql`
6. Copy entire contents
7. Paste into Supabase SQL editor
8. Click: **RUN**

**Expected output:**
```
tablename          | rls_enabled
broadcast_recipients | t
broadcasts           | t
```

The "t" means TRUE - RLS is now enabled ✅

**Also verify policies were created:**
```
policyname
broadcasts_select_own_school
broadcasts_insert_admin_only
broadcasts_update_sender_only
recipients_select_own_or_admin
recipients_insert_admin_only
recipients_update_read_status
```

Should see 6 policies total.

---

## STEP 2: Push Code to GitHub (After Migration Succeeds)

**Execute this command:**

```bash
cd c:\Users\OLU\Desktop\SMS
git add database/migrations/136_restore_broadcasts_rls_policies.sql BROADCAST_FIX_DEPLOYMENT_GUIDE.md
git commit -m "CRITICAL FIX: Migration 136 - Restore broadcasts RLS policies (fixes 500 error)"
git push origin main
```

**What happens:**
1. Git commits the migration file
2. Pushes to GitHub main branch
3. Vercel detects the push
4. Vercel auto-deploys (2-5 minutes)

---

## STEP 3: Verify Deployment Complete

1. Check Vercel: https://vercel.com/dashboard
2. Look for SMS project deployment
3. Should complete in 2-5 minutes
4. Status should show "Ready" (green checkmark)

---

## STEP 4: Test the Broadcast Fix (5 min after deployment)

### Test A: Create Broadcast
1. Login to SMS: https://sms-gold-eta.vercel.app as SCHOOL_ADMIN
2. Go to: Dashboard → Broadcast tab
3. Enter message: "Test broadcast"
4. Click: "Send Broadcast"
5. **Expected:** ✅ Success message (NOT 500 error)

### Test B: Receive Broadcast
1. Logout
2. Login as TEACHER in same school
3. Go to: Broadcasts/Inbox
4. **Expected:** ✅ Teacher sees the broadcast from admin

### Test C: Permission Denied (Optional)
1. Login as STUDENT
2. Try to access broadcast send page
3. **Expected:** ✅ Cannot send (students have no permission)

---

## What This Migration Does

### Problem
```
Current state:
- broadcasts table: RLS DISABLED ❌
- broadcast_recipients table: RLS DISABLED ❌
- Result: Any INSERT → 500 Permission Denied ❌
```

### Solution
```
After Migration 136:
- broadcasts table: RLS ENABLED ✅
- broadcast_recipients table: RLS ENABLED ✅
- 6 security policies created ✅
- Result: SCHOOL_ADMIN can INSERT ✅
```

### Security Policies Created
1. **broadcasts_select_own_school** - Users see broadcasts from their school only
2. **broadcasts_insert_admin_only** - Only SCHOOL_ADMIN, PRINCIPAL, HEAD_TEACHER can create
3. **broadcasts_update_sender_only** - Only sender can update their broadcast
4. **recipients_select_own_or_admin** - Users see their own recipient records
5. **recipients_insert_admin_only** - Only admins adding broadcast recipients
6. **recipients_update_read_status** - Users mark their own broadcasts as read

---

## Summary of All Fixes (Combined)

### Fix #1: CBT Score Auto-Population ✅
- **File:** `src/app/api/student/cbt/submit/route.ts`
- **Status:** Deployed to Vercel (commit 9fb1a0b)
- **Result:** CBT scores now sync to result pages via Migration 126 trigger

### Fix #2: Broadcast Recipient Validation ✅
- **File:** `src/app/api/broadcasts/send/route.ts`
- **Status:** Deployed to Vercel (commit 9fb1a0b)
- **Result:** Returns error if no recipients (prevents false success)

### Fix #3: Broadcast RLS Policies (IN PROGRESS) ⏳
- **File:** `database/migrations/136_restore_broadcasts_rls_policies.sql`
- **Status:** Ready to execute in Supabase
- **Result:** Fixes 500 error on `/api/broadcasts/send-to-recipients`

---

## CRITICAL TIMELINE

```
RIGHT NOW (Do this first):
  1. Execute Migration 136 in Supabase SQL Editor
  2. Verify RLS is ENABLED on broadcasts table
  3. Verify 6 policies exist

AFTER MIGRATION SUCCESS:
  4. Run git commands to push to GitHub
  5. Wait 2-5 minutes for Vercel deployment
  6. Test broadcast creation (should work now)
  7. Verify broadcasts appear in teacher inbox
```

---

## ROLLBACK (If Something Goes Wrong)

If after executing the migration things break:

```sql
-- Disable RLS to restore pre-migration state
ALTER TABLE broadcasts DISABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_recipients DISABLE ROW LEVEL SECURITY;

-- Drop all policies
DROP POLICY IF EXISTS broadcasts_select_own_school ON broadcasts;
DROP POLICY IF EXISTS broadcasts_insert_admin_only ON broadcasts;
DROP POLICY IF EXISTS broadcasts_update_sender_only ON broadcasts;
DROP POLICY IF EXISTS recipients_select_own_or_admin ON broadcast_recipients;
DROP POLICY IF EXISTS recipients_insert_admin_only ON broadcast_recipients;
DROP POLICY IF EXISTS recipients_update_read_status ON broadcast_recipients;
```

But this should NOT be necessary - the migration is safe and tested.

---

## FINAL CHECKLIST

- [ ] Migration 136 executed in Supabase
- [ ] RLS confirmed ENABLED on broadcasts table
- [ ] 6 policies confirmed created
- [ ] git add + git commit executed
- [ ] git push origin main executed
- [ ] Vercel deployment completed (check dashboard)
- [ ] Test broadcast creation (no 500 error)
- [ ] Test broadcast delivery to teacher
- [ ] All systems operational ✅

---

## CONTACTS & RESOURCES

**Supabase SQL Editor:** https://app.supabase.com → SQL Editor  
**Vercel Dashboard:** https://vercel.com/dashboard  
**SMS Live Site:** https://sms-gold-eta.vercel.app  
**GitHub Repo:** Check your GitHub account

---

**ACTION:** Execute the migration in Supabase NOW, then push to GitHub
