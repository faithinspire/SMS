-- Add class_id to payments table for class-based fee reporting
-- Migration: 103_add_class_id_to_payments.sql
-- Purpose: Direct class tracking on payments for reporting without JOIN through students

BEGIN;

-- Add class_id column to payments table
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES class_arm_combos(id) ON DELETE SET NULL;

-- Add index for class-based queries
CREATE INDEX IF NOT EXISTS idx_payments_class_school ON payments(class_id, school_id);

-- Backfill class_id from students where possible (only if student_id column exists)
DO $$
BEGIN
  -- Check if student_id column exists before attempting backfill
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'student_id'
  ) THEN
    UPDATE payments p
    SET class_id = s.class_arm_combo_id
    FROM students s
    WHERE p.student_id = s.id 
      AND p.class_id IS NULL
      AND p.student_id IS NOT NULL;
    
    RAISE NOTICE 'Migration 103: Backfilled class_id from student records';
  ELSE
    RAISE NOTICE 'Migration 103: student_id column does not exist yet, skipping backfill';
  END IF;
END $$;

-- Log completion
DO $$
DECLARE
  total_payments INTEGER;
  with_class_id INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_payments FROM payments;
  SELECT COUNT(*) INTO with_class_id FROM payments WHERE class_id IS NOT NULL;
  
  RAISE NOTICE 'Migration 103 complete: % total payments, % with class_id populated', total_payments, with_class_id;
END $$;

COMMIT;
