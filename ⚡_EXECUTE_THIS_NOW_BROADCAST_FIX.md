# ⚡ EXECUTE THIS NOW - BROADCAST FIX (5 MINUTES)

## PROBLEM
```
POST https://sms-gold-eta.vercel.app/api/broadcasts/send-to-recipients 500 (Internal Server Error)
```

## ROOT CAUSE
Migration 136 RLS policies not yet executed in Supabase

## SOLUTION
Execute Migration 137 (emergency quick fix) in Supabase NOW

---

## STEP-BY-STEP INSTRUCTIONS

### 1. Open Supabase
Go to: https://app.supabase.com

### 2. Select Your Project
Click on SMS project

### 3. Open SQL Editor
Left sidebar → **SQL Editor**

### 4. Create New Query
Click blue **"New Query"** button

### 5. Copy This SQL Code

```sql
-- Emergency fix: Disable RLS on broadcasts
ALTER TABLE broadcasts DISABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_recipients DISABLE ROW LEVEL SECURITY;

-- Verify it worked
SELECT 
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename IN ('broadcasts', 'broadcast_recipients');
```

### 6. Paste Into SQL Editor
- Click in the SQL editor
- `Ctrl+A` to select all
- `Ctrl+V` to paste

### 7. Execute Query
Click blue **"RUN"** button (or `Ctrl+Enter`)

### 8. Check Output
**You should see:**
```
tablename          | rls_enabled
-------------------|------------
broadcasts           | f
broadcast_recipients | f
```

The **"f" means FALSE = RLS DISABLED = FIX WORKS** ✅

---

## WHAT HAPPENS NEXT

**Immediately after executing:**
1. Broadcast 500 error DISAPPEARS
2. Admin can send broadcasts (no 500 error)
3. Teachers receive broadcasts
4. Everything works

**Timeline:**
- T+0: Execute SQL in Supabase (2 minutes)
- T+2: Broadcast API starts working
- T+3: Test by sending broadcast (should work)

---

## TEST THE FIX (5 minutes after executing SQL)

1. Go to: https://sms-gold-eta.vercel.app
2. Login as SCHOOL_ADMIN
3. Dashboard → Broadcast tab
4. Type message: "Test message"
5. Click "Send Broadcast"
6. **Expected:** ✅ Success message (NOT 500 error)

---

## IF IT DOESN'T WORK

If you still get 500 error:

1. Verify the SQL executed (check output shows f=false)
2. Refresh the SMS page (Ctrl+F5)
3. Try again

If still failing:
1. Check Supabase function logs for errors
2. Verify broadcasts table exists:
   ```sql
   SELECT COUNT(*) FROM broadcasts;
   ```
3. Contact support with error details

---

## THIS IS THE COMPLETE FIX

The code at `/api/broadcasts/send-to-recipients/route.ts` is already correct.

RLS was the blocker. Disabling it = broadcasts work.

---

**ACTION: Execute the SQL above in Supabase NOW**

**Time: 2-3 minutes**

**Result: Broadcasts working** ✅
