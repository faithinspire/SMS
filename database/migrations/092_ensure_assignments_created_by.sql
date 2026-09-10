-- Migration 092: Ensure assignments table has created_by column
-- This migration ensures the created_by column exists on the assignments table

BEGIN;

-- Add created_by column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assignments' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE assignments ADD COLUMN created_by UUID REFERENCES users(id) ON DELETE CASCADE;
    
    -- Create index for created_by
    CREATE INDEX idx_assignments_created_by ON assignments(created_by);
  END IF;
END $$;

COMMIT;
