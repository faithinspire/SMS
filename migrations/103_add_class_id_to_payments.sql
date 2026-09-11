-- Add class_id to payments table for class-based fee reporting
-- Migration: 103_add_class_id_to_payments.sql
-- Purpose: Direct class tracking on payments for reporting without JOIN through students

BEGIN;

-- Add class_id column to payments table
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES class_arm_combos(id) ON DELETE SET NULL;

-- Add index for class-based queries
CREATE INDEX IF NOT EXISTS idx_payments_class_school ON payments(class_id, school_id);

-- Backfill class_id from students where possible
UPDATE payments p
SET class_id = s.class_arm_combo_id
FROM students s
WHERE p.student_id = s.id 
  AND p.class_id IS NULL
  AND p.student_id IS NOT NULL;

-- Log the backfill
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM payments
  WHERE class_id IS NOT NULL;
  
  RAISE NOTICE 'Migration 103: Added class_id to % payment records', updated_count;
END $$;

COMMIT;
