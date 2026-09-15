-- Migration 108: Allow NULL class_arm_combo_id to support immediate student registration
-- The class_arm_combo_id foreign key will be populated later via admin interface
-- This unblocks student registration while class assignment workflow is improved

BEGIN;

-- CRITICAL: Drop the existing foreign key constraint FIRST
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_class_arm_combo_id_fkey;

-- CRITICAL: Make the class_arm_combo_id column NULLABLE
-- This is the essential fix - the column must allow NULL values at the column level
ALTER TABLE students ALTER COLUMN class_arm_combo_id DROP NOT NULL;

-- Recreate the foreign key constraint as optional
-- The column is now nullable, so NULL values will be allowed
ALTER TABLE students
  ADD CONSTRAINT students_class_arm_combo_id_fkey
  FOREIGN KEY (class_arm_combo_id) 
  REFERENCES class_arm_combos(id) 
  ON DELETE RESTRICT;

COMMIT;
