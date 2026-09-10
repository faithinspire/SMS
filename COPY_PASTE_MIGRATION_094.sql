-- ============================================================================
-- COPY THIS ENTIRE FILE AND PASTE INTO SUPABASE SQL EDITOR
-- ============================================================================
-- Migration 094: Safe Schema Consolidation for Supabase
-- This fixes all database schema issues and enables all features
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Add teacher_id to assignments if missing
-- ============================================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assignments' AND column_name = 'teacher_id'
  ) THEN
    ALTER TABLE assignments ADD COLUMN teacher_id UUID;
    
    -- Create index for teacher_id
    CREATE INDEX idx_assignments_teacher_id ON assignments(teacher_id);
    
    -- Add foreign key constraint
    ALTER TABLE assignments 
    ADD CONSTRAINT fk_assignments_teacher_id 
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Add file upload columns to assignments
-- ============================================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assignments' AND column_name = 'file_path'
  ) THEN
    ALTER TABLE assignments ADD COLUMN file_path TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assignments' AND column_name = 'file_name'
  ) THEN
    ALTER TABLE assignments ADD COLUMN file_name TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assignments' AND column_name = 'file_size'
  ) THEN
    ALTER TABLE assignments ADD COLUMN file_size BIGINT;
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Add status column to assignments if missing
-- ============================================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assignments' AND column_name = 'status'
  ) THEN
    ALTER TABLE assignments ADD COLUMN status VARCHAR(50) DEFAULT 'ACTIVE';
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Add file upload columns to assignment_submissions
-- ============================================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assignment_submissions' AND column_name = 'file_path'
  ) THEN
    ALTER TABLE assignment_submissions ADD COLUMN file_path TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assignment_submissions' AND column_name = 'file_name'
  ) THEN
    ALTER TABLE assignment_submissions ADD COLUMN file_name TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assignment_submissions' AND column_name = 'file_size'
  ) THEN
    ALTER TABLE assignment_submissions ADD COLUMN file_size BIGINT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assignment_submissions' AND column_name = 'submission_status'
  ) THEN
    ALTER TABLE assignment_submissions ADD COLUMN submission_status VARCHAR(50) DEFAULT 'SUBMITTED';
  END IF;
END $$;

-- ============================================================================
-- STEP 5: Create broadcasts table (if not exists)
-- ============================================================================
CREATE TABLE IF NOT EXISTS broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  broadcast_type VARCHAR(50) DEFAULT 'GENERAL',
  target_role VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STEP 6: Create indexes for broadcasts (if not exists)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_broadcasts_school_id ON broadcasts(school_id);
CREATE INDEX IF NOT EXISTS idx_broadcasts_created_by ON broadcasts(created_by);
CREATE INDEX IF NOT EXISTS idx_broadcasts_created_at ON broadcasts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_broadcasts_target_role ON broadcasts(target_role);

-- ============================================================================
-- STEP 7: Create broadcast_read_status table (if not exists)
-- ============================================================================
CREATE TABLE IF NOT EXISTS broadcast_read_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(broadcast_id, user_id)
);

-- ============================================================================
-- STEP 8: Create indexes for broadcast_read_status (if not exists)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_broadcast_read_status_broadcast_id ON broadcast_read_status(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_read_status_user_id ON broadcast_read_status(user_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_read_status_created_at ON broadcast_read_status(created_at DESC);

COMMIT;

-- ============================================================================
-- ✅ MIGRATION COMPLETE
-- ============================================================================
-- All tables and columns created/updated successfully!
-- You can now:
-- ✅ Create assignments with teacher_id
-- ✅ Upload files for assignments
-- ✅ Students submit assignments with files
-- ✅ Send broadcasts to staff
-- ✅ Track broadcast read status
-- ============================================================================
