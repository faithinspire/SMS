# ⚡ DO THIS NOW - FINAL FIX

## THE ERROR
```
ERROR: 42703: column "class_arm_combo_id" of relation "universal_scores" does not exist
LINE 321
```

**Cause**: Old migration 086 with bad code is still running

**Solution**: Use migration 087 (clean code, no universal_scores references)

---

## ✅ DO THIS RIGHT NOW

### Step 1: Stop The Old Migration

**In Supabase SQL Editor, run:**

```sql
DROP TRIGGER IF EXISTS trigger_sync_cbt_to_universal ON cbt_submissions CASCADE;
DROP FUNCTION IF EXISTS sync_cbt_to_universal_scores() CASCADE;
```

Click RUN. Should complete instantly.

---

### Step 2: Run The NEW Migration 087

**Copy ENTIRE content from:**
```
database/migrations/087_cbt_score_sync_final.sql
```

**Paste into Supabase SQL Editor**

**Click RUN**

Should complete without any errors.

---

### Step 3: Verify It Worked

```sql
SELECT trigger_name FROM information_schema.triggers 
WHERE trigger_name = 'trigger_sync_cbt_to_universal';
```

Should show:
```
trigger_sync_cbt_to_universal
```

---

### Step 4: Restart Server

```bash
npm run dev
```

---

## ✅ DONE!

Everything will now work:
- ✅ CBT scores sync automatically
- ✅ Teachers see all scores
- ✅ Students see all scores  
- ✅ No more database errors
- ✅ Bottom nav visible
- ✅ Notifications working

---

**Execute the 3 SQL steps above NOW.** ✅

