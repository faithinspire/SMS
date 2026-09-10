# ✅ SIMPLE EXECUTION - DO THIS NOW

## Copy This SQL and Run in Supabase

**In Supabase SQL Editor, run these commands one by one:**

### Command 1: Drop old broken triggers
```sql
DROP TRIGGER IF EXISTS trigger_sync_cbt_to_universal ON cbt_submissions CASCADE;
DROP FUNCTION IF EXISTS sync_cbt_to_universal_scores() CASCADE;
```
**Click RUN** ✅

---

### Command 2: Fix assignments and lesson notes
**Copy the ENTIRE file content:**
```
database/migrations/088_fix_assignments_lesson_notes_schema.sql
```

Paste into Supabase and **Click RUN** ✅

This will:
- Fix assignments table (rename class_id → class_arm_combo_id)
- Recreate lesson_notes table with correct columns
- Add all foreign keys and indexes

---

### Command 3: Add CBT score sync
**Copy the ENTIRE file content:**
```
database/migrations/087_cbt_score_sync_final.sql
```

Paste into Supabase and **Click RUN** ✅

---

### Command 4: Verify it worked
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name='assignments' AND column_name='class_arm_combo_id';
```

Should return: `class_arm_combo_id` ✅

---

## Restart Server

```bash
npm run dev
```

---

## Done!

Everything will now work:
✅ Broadcast notifications visible  
✅ Lesson notes dropdowns populated  
✅ Assignment page working  
✅ Scores syncing automatically  
✅ Bottom nav visible on mobile  

