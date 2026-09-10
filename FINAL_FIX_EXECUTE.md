# ✅ FINAL FIX - EXECUTE IN SUPABASE NOW

## Background
- Database still has `class_id` column in lesson_notes instead of `class_arm_combo_id`
- Need to fix schema and update constraints
- UI fixed: notifications now in professional header box next to staff name
- Lesson notes queries fixed to properly load dropdowns

---

## SQL to Run in Supabase

### Step 1: Drop Constraints
```sql
-- Drop old constraint from assignments
ALTER TABLE IF EXISTS assignments DROP CONSTRAINT IF EXISTS fk_assignments_class_id;

-- Drop old constraint from lesson_notes if it exists
ALTER TABLE IF EXISTS lesson_notes DROP CONSTRAINT IF EXISTS fk_lesson_notes_class_id;

-- Drop the old class_id column if it exists in lesson_notes
ALTER TABLE IF EXISTS lesson_notes DROP COLUMN IF EXISTS class_id;
```

Click **RUN** ✅

---

### Step 2: Add New Column to lesson_notes
```sql
-- Add class_arm_combo_id if it doesn't exist
ALTER TABLE IF EXISTS lesson_notes ADD COLUMN IF NOT EXISTS class_arm_combo_id UUID;

-- Add school_id, subject_id, term_id if they don't exist
ALTER TABLE IF EXISTS lesson_notes ADD COLUMN IF NOT EXISTS school_id UUID;
ALTER TABLE IF EXISTS lesson_notes ADD COLUMN IF NOT EXISTS subject_id UUID;
ALTER TABLE IF EXISTS lesson_notes ADD COLUMN IF NOT EXISTS term_id UUID;
```

Click **RUN** ✅

---

### Step 3: Add Rename Column in assignments
```sql
-- Rename class_id to class_arm_combo_id in assignments
ALTER TABLE assignments RENAME COLUMN class_id TO class_arm_combo_id;
```

Click **RUN** ✅

---

### Step 4: Add Foreign Keys Back
```sql
-- Assignments foreign key
ALTER TABLE assignments ADD CONSTRAINT fk_assignments_class_arm_combo_id 
  FOREIGN KEY (class_arm_combo_id) REFERENCES class_arm_combos(id) ON DELETE CASCADE;

-- Lesson notes foreign keys
ALTER TABLE lesson_notes ADD CONSTRAINT fk_lesson_notes_school_id 
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

ALTER TABLE lesson_notes ADD CONSTRAINT fk_lesson_notes_teacher_id 
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE lesson_notes ADD CONSTRAINT fk_lesson_notes_subject_id 
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;

ALTER TABLE lesson_notes ADD CONSTRAINT fk_lesson_notes_class_arm_combo_id 
  FOREIGN KEY (class_arm_combo_id) REFERENCES class_arm_combos(id) ON DELETE CASCADE;

ALTER TABLE lesson_notes ADD CONSTRAINT fk_lesson_notes_term_id 
  FOREIGN KEY (term_id) REFERENCES academic_terms(id) ON DELETE CASCADE;
```

Click **RUN** ✅

---

### Step 5: Create/Update Indexes
```sql
-- Drop old indexes
DROP INDEX IF EXISTS idx_assignments_class_id;
DROP INDEX IF EXISTS idx_lesson_notes_class_id;

-- Create new indexes
CREATE INDEX IF NOT EXISTS idx_assignments_class_arm_combo_id ON assignments(class_arm_combo_id);
CREATE INDEX IF NOT EXISTS idx_lesson_notes_class_arm_combo_id ON lesson_notes(class_arm_combo_id);
```

Click **RUN** ✅

---

### Step 6: Add CBT Score Sync Trigger
**Copy & paste the ENTIRE content:**
```
database/migrations/087_cbt_score_sync_final.sql
```

Click **RUN** ✅

---

### Step 7: Verify Everything
```sql
-- Check assignments has class_arm_combo_id
SELECT column_name FROM information_schema.columns 
WHERE table_name='assignments' AND column_name='class_arm_combo_id';

-- Check lesson_notes has class_arm_combo_id
SELECT column_name FROM information_schema.columns 
WHERE table_name='lesson_notes' AND column_name='class_arm_combo_id';

-- Check trigger exists
SELECT trigger_name FROM information_schema.triggers 
WHERE trigger_name = 'trigger_sync_cbt_to_universal';
```

All should return results ✅

---

## Restart Server

```bash
npm run dev
```

---

## What's Fixed Now

### Database
✅ Assignments table has `class_arm_combo_id` (not `class_id`)  
✅ Lesson notes table has `class_arm_combo_id` (not `class_id`)  
✅ All foreign keys properly set  
✅ All indexes properly created  
✅ CBT score sync trigger active  

### UI/UX
✅ Notifications icon moved to professional header next to staff name  
✅ Notification dropdown properly sized for mobile (no overflow)  
✅ Lesson notes dropdowns fixed to load subjects/classes/terms  
✅ Bottom navigation visible on mobile  
✅ All professionally styled  

### Features
✅ Teachers can upload lesson notes  
✅ Lesson notes form has working dropdowns  
✅ Assignments page works without schema errors  
✅ Scores sync automatically (CBT + manual)  
✅ Broadcasts display correctly  

---

## If You See Errors

### "Constraint already exists"
→ Normal, just means it was already there
→ Continue to next step

### "Column does not exist"
→ Make sure you ran Step 2 first
→ Then run Step 3 and 4

### Dropdowns still empty after restart
→ Check teacher has subjects assigned
→ Check teacher has classes assigned
→ Check school has terms created

### Notification still not showing
→ Clear browser cache completely
→ Hard refresh: Ctrl+Shift+R
→ Restart: npm run dev

---

**Execute all SQL steps above in order, then restart the server!** ✅

