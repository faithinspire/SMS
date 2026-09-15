-- Migration 108: Allow NULL class_arm_combo_id to support immediate student registration
-- The class_arm_combo_id foreign key will be populated later via admin interface
-- This unblocks student registration while class assignment workflow is improved

BEGIN;

-- Drop the existing foreign key constraint
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_class_arm_combo_id_fkey;

-- Recreate the foreign key as optional (nullable)
-- Note: class_arm_combo_id is already nullable in the table definition
-- This just clarifies the constraint allows NULL values

ALTER TABLE students
  ADD CONSTRAINT students_class_arm_combo_id_fkey
  FOREIGN KEY (class_arm_combo_id) 
  REFERENCES class_arm_combos(id) 
  ON DELETE RESTRICT
  MATCH FULL
  DEFERRABLE INITIALLY DEFERRED;

COMMIT;
