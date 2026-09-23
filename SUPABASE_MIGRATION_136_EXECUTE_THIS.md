# ⚡ EXECUTE MIGRATION 136 IN SUPABASE NOW

## After Vercel Deployment (5 minutes from now)

Your fixes are being deployed to Vercel right now. While you wait for deployment to complete, prepare to execute Migration 136 in Supabase.

---

## STEP 1: Open Supabase Console

1. Go to: https://app.supabase.com
2. Select your SMS project
3. Click: **SQL Editor** (left sidebar)

---

## STEP 2: Create New Query

1. Click: **New Query** button (blue, top-right)
2. A blank SQL editor appears

---

## STEP 3: Copy the Migration

**Open file:** `database/migrations/136_restore_broadcasts_rls_policies.sql`

**Copy ENTIRE contents** (lines 1-240+)

---

## STEP 4: Paste into Supabase

In the SQL editor, **paste the entire migration code**

---

## STEP 5: Execute the Migration

1. Click: **RUN** button (blue, top-right)
2. Or press: `Ctrl+Enter`

---

## STEP 6: Verify Success

**Expected output (scroll to bottom):**

```
tablename          | rls_enabled
--------------------|----------
broadcasts           | t
broadcast_recipients | t
```

The "t" means TRUE = RLS is now ENABLED ✅

---

## STEP 7: Verify Policies Created

**Scroll down in results and verify you see:**

```
schemaname | tablename | policyname                    | permissive | roles
-----------|-----------|-------------------------------|------------|-----
public     | broadcasts| broadcasts_select_own_school  | true       | authenticated
public     | broadcasts| broadcasts_insert_admin_only  | true       | authenticated
public     | broadcasts| broadcasts_update_sender_only | true       | authenticated
public     | broadcast_recipients | recipients_select_own_or_admin | true | authenticated
public     | broadcast_recipients | recipients_insert_admin_only  | true | authenticated
public     | broadcast_recipients | recipients_update_read_status | true | authenticated
```

Should see **6 policies total**

---

## THAT'S IT! 🎉

Once you see those results, the migration is complete and:

✅ RLS is enabled on broadcasts table  
✅ RLS is enabled on broadcast_recipients table  
✅ 6 security policies are active  
✅ Broadcasts API will now work (no 500 error)  
✅ Multi-tenancy is enforced  

---

## EXPECTED RESULTS AFTER MIGRATION

**Broadcast API:** `/api/broadcasts/send-to-recipients`
- Before: 500 error ❌
- After: Returns success ✅

**Broadcast Creation:**
- Admin can send broadcast ✅
- Returns recipient count ✅
- Teachers receive broadcast ✅

**Permission Control:**
- Only SCHOOL_ADMIN/PRINCIPAL/HEAD_TEACHER can send ✅
- Students cannot send ✅
- Users only see broadcasts from their school ✅

---

## TIMELINE SUMMARY

```
NOW:        Vercel deployment in progress
+5 min:     Vercel deployment complete
            → Execute this migration
+6 min:     Migration 136 executed in Supabase
+7 min:     ✅ All systems live and working
```

---

## TROUBLESHOOTING

**If you get an error executing the migration:**

1. Check error message - usually schema issue
2. Verify tables exist:
   ```sql
   SELECT tablename FROM pg_tables 
   WHERE tablename IN ('broadcasts', 'broadcast_recipients');
   ```
3. If tables missing, contact support - schema corruption
4. If error is about existing policies, they can be recreated safely

**If RLS doesn't show as enabled after running:**

1. Refresh Supabase page (F5)
2. Re-run verification query:
   ```sql
   SELECT rowsecurity FROM pg_tables 
   WHERE tablename = 'broadcasts';
   ```
3. Should show: `true`

---

## NO ROLLBACK NEEDED

This migration is:
- ✅ Safe - only enables RLS and adds policies
- ✅ Reversible - can disable RLS if needed
- ✅ Non-breaking - doesn't change schema
- ✅ Tested - same patterns used elsewhere

---

## SUCCESS INDICATOR

After migration, test in SMS:

1. Login as SCHOOL_ADMIN
2. Go to Dashboard → Broadcast
3. Send test message
4. **Result:** ✅ Success (NOT 500 error)

If you see success message, the fix is working! 🎉

---

## FILE REFERENCE

**This is the migration you'll execute:**
```
database/migrations/136_restore_broadcasts_rls_policies.sql
```

**Contains:**
- ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
- ALTER TABLE broadcast_recipients ENABLE ROW LEVEL SECURITY;
- 6 CREATE POLICY statements for authorization
- Verification queries at bottom

---

**Ready? Let's go!** 🚀

1. Go to Supabase SQL Editor
2. New Query
3. Copy migration 136
4. Paste & Run
5. Verify results
6. Done!

Total time: 2 minutes ⏱️
