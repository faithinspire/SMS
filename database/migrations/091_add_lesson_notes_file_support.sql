-- Migration 091: Add file upload support to lesson_notes table
-- This ensures file_path, file_name, and file_size columns exist

BEGIN;

-- Add file upload columns to lesson_notes if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lesson_notes' AND column_name = 'file_path'
  ) THEN
    ALTER TABLE lesson_notes ADD COLUMN file_path TEXT DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lesson_notes' AND column_name = 'file_name'
  ) THEN
    ALTER TABLE lesson_notes ADD COLUMN file_name TEXT DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lesson_notes' AND column_name = 'file_size'
  ) THEN
    ALTER TABLE lesson_notes ADD COLUMN file_size BIGINT DEFAULT NULL;
  END IF;
END $$;

-- Ensure status, reviewed_by, reviewed_at columns exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lesson_notes' AND column_name = 'status'
  ) THEN
    ALTER TABLE lesson_notes ADD COLUMN status VARCHAR(50) DEFAULT 'SUBMITTED';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lesson_notes' AND column_name = 'reviewed_by'
  ) THEN
    ALTER TABLE lesson_notes ADD COLUMN reviewed_by UUID DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lesson_notes' AND column_name = 'reviewed_at'
  ) THEN
    ALTER TABLE lesson_notes ADD COLUMN reviewed_at TIMESTAMP DEFAULT NULL;
  END IF;
END $$;

-- Ensure max_marks column exists on assignments table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assignments' AND column_name = 'max_marks'
  ) THEN
    ALTER TABLE assignments ADD COLUMN max_marks INTEGER DEFAULT 100;
  END IF;
END $$;

COMMIT;
