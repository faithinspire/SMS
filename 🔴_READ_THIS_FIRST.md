# 🔴 READ THIS FIRST - Final Action Required

**Status:** ✅ All code deployed  
**Remaining:** ⏳ Execute 1 database migration (2 minutes)  
**Time to Full Fix:** ~15 minutes total

---

## What's Done ✅

- ✅ All 4 production issues fixed in code
- ✅ 4 commits deployed to Vercel (live now)
- ✅ Lesson notes API fixed
- ✅ School admin broadcast validation added
- ✅ CBT assessment_type mapping added
- ✅ Broadcast API role names corrected
- ✅ All changes enforce multi-tenancy

---

## What's Left ⏳

**ONLY 1 THING:** Execute migration in Supabase (2 minutes)

This fixes the broadcast stored procedure to use correct role names.

---

## 🚀 DO THIS NOW

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase dashboard
2. Click "SQL Editor" (left menu)
3. Click "New Query"

### Step 2: Copy This SQL

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

### Step 3: Paste into Editor
- Select all (Ctrl+A) and delete any placeholder text
- Paste the SQL above
- Click "Execute" (green button or Ctrl+Enter)

### Step 4: Verify Success
You should see:
```
status
-----------
send_broadcast_to_staff function updated
```

✅ If you see this message, **you're done!**

---

## ✅ After Execution

All 4 issues are now fixed in production:

1. **Lesson Notes** - Teachers show with names (API fixed ✅)
2. **School Admin Broadcast** - No validation errors (validation added ✅)
3. **Principal Broadcast** - Recipients added correctly (migration executing now ⏳)
4. **CBT Scores** - Auto-populate to sheets (mapping fixed ✅)

---

## 🧪 Quick Test After Migration

### Test Principal Broadcast
1. Login as PRINCIPAL
2. Send broadcast
3. Check staff received it

### Test Lesson Notes
1. Login as PRINCIPAL
2. View lesson notes page
3. See teacher names (not null)

### Test CBT
1. Teacher creates exam with test_number=1
2. Student completes exam
3. Score appears in score_sheets.test1

---

## 📞 If Migration Fails

### Error: "cannot change return type"
- **Status:** This means old function still exists
- **Solution:** Run the DROP FUNCTION line first, then CREATE

### Error: "syntax error"
- **Status:** Copy might be incomplete
- **Solution:** Copy the entire SQL block above again

### Error: "role does not exist"
- **Status:** Wrong role names in WHERE clause
- **Solution:** Verify: 'TEACHER', 'PRINCIPAL', 'HEAD_TEACHER', etc.

### Error: "table does not exist"
- **Status:** broadcast_recipients table missing
- **Solution:** Run earlier migrations first, or check schema

---

## 📋 Checklist

- [ ] Opened Supabase SQL Editor
- [ ] Created new query
- [ ] Copied entire SQL above
- [ ] Pasted into editor
- [ ] Clicked Execute
- [ ] Saw success message
- [ ] Tested at least one issue

---

## 🎉 Done!

That's it. Your production fixes are complete.

**All 4 issues:**
- ✅ Fixed
- ✅ Deployed to Vercel
- ✅ Database updated
- ✅ Ready for users

---

**Execute the migration now!** See Supabase SQL Editor.
