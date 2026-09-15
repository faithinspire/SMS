-- FORENSIC FIX: Manual SQL to apply immediately in Supabase
-- This must be run in the Supabase SQL editor right now

-- Step 1: Drop the existing NOT NULL constraint on class_arm_combo_id
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_class_arm_combo_id_fkey;
ALTER TABLE students ALTER COLUMN class_arm_combo_id DROP NOT NULL;

-- Step 2: Recreate the FK constraint as optional
ALTER TABLE students
  ADD CONSTRAINT students_class_arm_combo_id_fkey
  FOREIGN KEY (class_arm_combo_id) 
  REFERENCES class_arm_combos(id) 
  ON DELETE RESTRICT;

-- Step 3: Verify the column is now nullable
-- You should see: "integer | false" for is_nullable
SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'students' AND column_name = 'class_arm_combo_id';

-- Expected output: class_arm_combo_id | YES (meaning nullable)
