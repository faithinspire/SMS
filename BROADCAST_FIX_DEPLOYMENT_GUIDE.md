# 🔧 BROADCAST FIX - COMPLETE DEPLOYMENT GUIDE

## 🚨 ROOT CAUSE ANALYSIS

**Error:** `POST https://sms-gold-eta.vercel.app/api/broadcasts/send-to-recipients 500 (Internal Server Error)`

**Root Cause:** 
1. Migrations 127-132 rebuilt the broadcasts tables but **NEVER re-enabled RLS (Row Level Security)**
2. RLS is currently **DISABLED** on both `broadcasts` and `broadcast_recipients` tables
3. **No RLS policies exist** - all original policies from Migration 062 were lost
4. When RLS is disabled with no role permissions, Supabase defaults to **DENY** on all operations
5. Result: Any INSERT attempt returns **500 Permission Denied error**

**Evidence:**
- Migration 132: Rebuilt tables but has NO `ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY`
- Migration 131: Same issue - created tables without enabling RLS
- Migration 127: Also missing RLS re-enablement
- Current state: `pg_tables.rowsecurity = false` for both tables

---

## ✅ THE FIX

### Part 1: Database Migration (Execute in Supabase)

**File:** `database/migrations/136_restore_broadcasts_rls_policies.sql`

**What it does:**
1. Enables RLS on `broadcasts` table
2. Enables RLS on `broadcast_recipients` table
3. Creates 8 comprehensive security policies:
   - SELECT policy: Users see broadcasts from their school only
   - INSERT policy: Only SCHOOL_ADMIN, PRINCIPAL, HEAD_TEACHER can create broadcasts
   - UPDATE policy: Only the sender can update their broadcasts
   - Similar policies for broadcast_recipients (read/write permissions)

**Security enforced:**
- ✅ Multi-tenancy: Users only see broadcasts from their school (`school_id` isolation)
- ✅ Authorization: Only admins can send broadcasts
- ✅ Ownership: Only sender can update their broadcasts
- ✅ Privacy: Users only see their own recipient records (unless they're the admin)

---

## 📋 DEPLOYMENT STEPS

### Step 1: Execute Migration 136 in Supabase

1. Go to: https://app.supabase.com → Your Project → SQL Editor
2. Click **"New Query"**
3. Copy entire contents of `database/migrations/136_restore_broadcasts_rls_policies.sql`
4. Paste into the SQL editor
5. Click **"Run"**
6. **Expected output:**
   ```
   tablename | rls_enabled
   -----------|------------
   broadcasts | t
   broadcast_recipients | t
   ```
   (The "t" = true, meaning RLS is now ENABLED)

7. Scroll down and verify the policies are created:
   ```
   tablename | policyname | permissive | roles
   ----------|------------|-----------|-------
   broadcasts | broadcasts_select_own_school | t | authenticated
   broadcasts | broadcasts_insert_admin_only | t | authenticated
   ... (8 policies total)
   ```

### Step 2: Deploy Code to Vercel

The API code at `/src/app/api/broadcasts/send-to-recipients/route.ts` is already correct and doesn't need changes. The 500 error was purely a database permission issue.

1. Make sure code is committed locally:
   ```bash
   git status
   # Should show "nothing to commit" or only migration file changes
   ```

2. Push the migration to GitHub:
   ```bash
   git add database/migrations/136_restore_broadcasts_rls_policies.sql
   git commit -m "Migration 136: Restore broadcasts RLS policies - fixes 500 error"
   git push origin main
   ```

3. Vercel will auto-deploy (2-5 minutes)

### Step 3: Verify the Fix

**Test 1: Broadcast Creation**
1. Login to SMS as SCHOOL_ADMIN
2. Go to Dashboard → Broadcast tab
3. Enter a message
4. Click "Send Broadcast"
5. **Expected:** Success message (not 500 error)

**Test 2: Broadcast Delivery**
1. Login as TEACHER in same school
2. Go to Broadcasts/Inbox
3. **Expected:** Broadcast from admin appears

**Test 3: Permission Check**
1. Create new school with only STUDENT (no staff)
2. Login as student
3. Go to broadcasts send page
4. **Expected:** Should not see broadcast send option (students can't send)

---

## 🔍 TECHNICAL DETAILS

### What Was Wrong (Before Migration 136)

```sql
-- Current state in database:
SELECT rowsecurity FROM pg_tables 
WHERE tablename = 'broadcasts';

-- Returns: FALSE ❌
-- Meaning: RLS is disabled, Supabase blocks all operations by default
```

### What's Fixed (After Migration 136)

```sql
-- After migration:
SELECT rowsecurity FROM pg_tables 
WHERE tablename = 'broadcasts';

-- Returns: TRUE ✅
-- Now: RLS policies are enforced, admins can INSERT
```

### Why RLS Was Disabled

Timeline of events:
1. **Migration 062:** Created broadcasts with RLS ENABLED + policies ✅
2. **Migration 081:** DROPPED broadcast_recipients, replaced with broken schema ❌
3. **Migration 127:** Fixed schema but forgot to re-enable RLS ⚠️
4. **Migration 131:** Same - recreated tables without RLS ⚠️
5. **Migration 132:** Nuclear reset - rebuilt cleanly but NO RLS statement ❌
6. **Migration 134:** Fixed function but not RLS ⚠️
7. **Migration 136:** **FINAL FIX** - Re-enable RLS + restore policies ✅

---

## 📊 RLS POLICIES CREATED

### broadcasts table (4 policies)

| Policy | Operation | Condition |
|--------|-----------|-----------|
| `broadcasts_select_own_school` | SELECT | User's school_id matches broadcast.school_id |
| `broadcasts_insert_admin_only` | INSERT | sender_id = current user AND role ∈ {SCHOOL_ADMIN, PRINCIPAL, HEAD_TEACHER} |
| `broadcasts_update_sender_only` | UPDATE | sender_id = current user AND (same role check) |
| (DELETE) | DELETE | Not included - admins shouldn't delete broadcasts |

### broadcast_recipients table (4 policies)

| Policy | Operation | Condition |
|--------|-----------|-----------|
| `recipients_select_own_or_admin` | SELECT | user_id = current user OR user sent the broadcast |
| `recipients_insert_admin_only` | INSERT | Current user is admin sending the broadcast |
| `recipients_update_read_status` | UPDATE | user_id = current user (only updating own read status) |
| (DELETE) | DELETE | Not included |

---

## ✨ TESTING CHECKLIST

After deploying Migration 136:

- [ ] Migration 136 executed successfully in Supabase
- [ ] RLS is now ENABLED on broadcasts table
- [ ] RLS is now ENABLED on broadcast_recipients table
- [ ] 8 policies are created (verify in pg_policies)
- [ ] No errors in Supabase Query Log
- [ ] Vercel deployment completed
- [ ] Test broadcast creation (SCHOOL_ADMIN sends message)
- [ ] Test broadcast delivery (TEACHER receives message)
- [ ] Test permission denial (STUDENT cannot send broadcast)

---

## 🚀 FINAL STATUS

| Component | Before | After |
|-----------|--------|-------|
| broadcasts RLS status | DISABLED ❌ | ENABLED ✅ |
| broadcasts policies | NONE ❌ | 4 policies ✅ |
| broadcast_recipients RLS | DISABLED ❌ | ENABLED ✅ |
| broadcast_recipients policies | NONE ❌ | 4 policies ✅ |
| Broadcast INSERT operation | 500 error ❌ | Works ✅ |
| Multi-tenancy enforcement | None ❌ | school_id isolation ✅ |
| Authorization enforcement | None ❌ | Admin-only send ✅ |

---

## 📞 TROUBLESHOOTING

**Issue:** Still getting 500 error after executing migration

**Solution:**
1. Verify migration executed: Check Supabase SQL logs
2. Verify RLS is enabled: 
   ```sql
   SELECT rowsecurity FROM pg_tables WHERE tablename = 'broadcasts';
   -- Should return: true
   ```
3. Verify policies exist:
   ```sql
   SELECT policyname FROM pg_policies WHERE tablename = 'broadcasts';
   -- Should return 4 rows
   ```
4. Check user role in Supabase:
   ```sql
   SELECT id, role, school_id FROM users WHERE id = [current-user-id];
   -- Role should be SCHOOL_ADMIN, PRINCIPAL, or HEAD_TEACHER
   ```

**Issue:** Broadcast visible to wrong school

**Solution:**
The SELECT policy enforces:
```sql
school_id IN (SELECT school_id FROM users WHERE id = auth.uid())
```
This ensures users only see broadcasts from their school. Verify users table has correct school_id values.

---

## 📝 QUICK REFERENCE

**Execute this migration now:**
```bash
# 1. In Supabase SQL Editor
COPY_PASTE: database/migrations/136_restore_broadcasts_rls_policies.sql

# 2. Then push code to GitHub
git add database/migrations/136_restore_broadcasts_rls_policies.sql
git commit -m "Migration 136: Restore broadcasts RLS policies"
git push origin main
```

**That's it!** Vercel deploys automatically. Test within 5 minutes.
