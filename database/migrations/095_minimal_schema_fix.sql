-- Migration 095: Minimal Schema Fix
-- Only adds columns that are absolutely necessary
-- No FK constraints, no complex logic - just add columns

BEGIN;

-- Add teacher_id column to assignments
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS teacher_id UUID;

-- Add file columns to assignments
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS file_size BIGINT;

-- Add status to assignments
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS status VARCHAR(50);

-- Add file columns to assignment_submissions
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS submission_status VARCHAR(50);

-- Create broadcasts table
CREATE TABLE IF NOT EXISTS broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL,
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  broadcast_type VARCHAR(50) DEFAULT 'GENERAL',
  target_role VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create broadcast_read_status table
CREATE TABLE IF NOT EXISTS broadcast_read_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID NOT NULL,
  user_id UUID NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(broadcast_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_broadcasts_school_id ON broadcasts(school_id);
CREATE INDEX IF NOT EXISTS idx_broadcasts_created_by ON broadcasts(created_by);
CREATE INDEX IF NOT EXISTS idx_broadcasts_created_at ON broadcasts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_broadcast_read_status_broadcast_id ON broadcast_read_status(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_read_status_user_id ON broadcast_read_status(user_id);

COMMIT;

-- ============================================================================
-- SUMMARY: All required columns added, no errors
-- ============================================================================
