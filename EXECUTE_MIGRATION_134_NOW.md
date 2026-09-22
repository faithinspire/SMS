# Execute Migration 134 - CORRECTED VERSION

**Status:** Fixed and pushed to GitHub ✅

The migration now properly drops the old function before recreating it.

---

## 🚀 EXECUTE NOW in Supabase

**Step 1: Open Supabase SQL Editor**
- Go to your Supabase project dashboard
- Click "SQL Editor" (left sidebar)
- Click "New Query"

**Step 2: Copy-Paste This Exact SQL**

```sql
-- Drop the existing function (required because return type is changing)
DROP FUNCTION IF EXISTS send_broadcast_to_staff(uuid, uuid, text, character varying) CASCADE;

CREATE OR REPLACE FUNCTION send_broadcast_to_staff(
  p_school_id UUID,
  p_sender_id UUID,
  p_message TEXT,
  p_broadcast_type VARCHAR DEFAULT 'GENERAL'
)
RETURNS TABLE(broadcast_id UUID, recipients_count INT) AS $$
DECLARE
  v_broadcast_id UUID;
  v_count INT := 0;
BEGIN
  -- Create the broadcast record
  INSERT INTO broadcasts (school_id, sender_id, message, broadcast_type)
  VALUES (p_school_id, p_sender_id, p_message, p_broadcast_type)
  RETURNING id INTO v_broadcast_id;

  -- Send to all staff in the school - CORRECTED ROLE NAMES
  -- Role values in users table: SUPER_ADMIN | SCHOOL_ADMIN | PRINCIPAL | HEAD_TEACHER | TEACHER | ACCOUNTANT | STAFF | STUDENT
  INSERT INTO broadcast_recipients (broadcast_id, user_id)
  SELECT v_broadcast_id, u.id
  FROM users u
  WHERE u.school_id = p_school_id
    AND u.role IN ('TEACHER', 'PRINCIPAL', 'HEAD_TEACHER', 'ACCOUNTANT', 'SCHOOL_ADMIN', 'STAFF')
    AND u.id != p_sender_id  -- Don't send to self
  ON CONFLICT (broadcast_id, user_id) DO NOTHING;

  -- Get count of recipients
  SELECT COUNT(*) INTO v_count FROM broadcast_recipients WHERE broadcast_id = v_broadcast_id;

  RAISE NOTICE 'Broadcast % sent to % staff members', v_broadcast_id, v_count;

  -- Return both broadcast_id and recipient count
  RETURN QUERY SELECT v_broadcast_id, v_count;
END;
$$ LANGUAGE plpgsql;

-- Verify the function was created successfully
SELECT 'send_broadcast_to_staff function updated' as status;
```

**Step 3: Click Execute**
- Look for the green "Execute" button or press Ctrl+Enter
- You should see a confirmation message

**Step 4: Verify Success**
You should see this result:
```
status
-----------
send_broadcast_to_staff function updated
```

---

## ✅ What This Migration Does

**Before:**
- Function used `'HEADTEACHER'` (wrong - DB uses `HEAD_TEACHER`)
- Missing `'STAFF'` role
- Return type was `UUID` (incomplete)

**After:**
- ✅ Uses correct role names: `HEAD_TEACHER`, `TEACHER`, `PRINCIPAL`, etc.
- ✅ Includes `STAFF` role
- ✅ Returns `TABLE(broadcast_id UUID, recipients_count INT)`
- ✅ Safely drops old function before recreating

---

## 🧪 Test After Migration

### Quick Test: Verify Function Exists
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'send_broadcast_to_staff';
```

Should return: `send_broadcast_to_staff`

### Full Test: Send Broadcast via Function
```sql
-- Test calling the function directly
SELECT * FROM send_broadcast_to_staff(
  'school_uuid_here',  -- Replace with actual school ID
  'sender_uuid_here',  -- Replace with actual sender ID
  'Test broadcast message',
  'GENERAL'
);
```

Should return 2 columns: `broadcast_id` and `recipients_count`

---

## ⚠️ Troubleshooting

### Error: "column "broadcast_id" does not exist in table"
- **Cause:** broadcast_recipients table missing columns
- **Fix:** Check broadcast_recipients table has: broadcast_id, user_id, is_read

### Error: "role IN clause syntax error"
- **Cause:** Incorrect role names
- **Fix:** Make sure using: 'TEACHER', 'PRINCIPAL', 'HEAD_TEACHER', etc.

### Error: "could not find function"
- **Cause:** Function not created yet
- **Fix:** Run the CREATE FUNCTION statement alone first

---

## 📋 Checklist

- [ ] Opened Supabase SQL Editor
- [ ] Created new query
- [ ] Copied entire SQL above
- [ ] Clicked Execute
- [ ] Saw success message
- [ ] Function returns broadcast_id and recipients_count

---

## ✨ After This Completes

Once migration executes successfully:

1. **Vercel code** is already deployed (lesson notes, broadcast validation, CBT fixes)
2. **Database migration** is NOW applied (broadcast role fix)
3. **All 4 issues are fixed:**
   - ✅ Lesson notes show with teacher names
   - ✅ School admin broadcasts work without errors
   - ✅ Principal broadcasts reach correct recipients
   - ✅ CBT scores auto-populate to sheets

---

**Status:** Ready to execute ✅

Go to Supabase now and run the migration above!
