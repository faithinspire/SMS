-- Migration 137: Clean rebuild of broadcasts system
-- Purpose: Drop and recreate broadcasts tables with simple, reliable schema
-- RLS: DISABLED (public access)

BEGIN;

-- Drop old tables if they exist (cascade to remove dependencies)
DROP TABLE IF EXISTS broadcast_recipients CASCADE;
DROP TABLE IF EXISTS broadcasts CASCADE;

-- Create broadcasts table - simple, clean schema
CREATE TABLE broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL,
  message TEXT NOT NULL,
  sender_id UUID NOT NULL,
  broadcast_type VARCHAR(50) DEFAULT 'GENERAL',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create broadcast_recipients table - simple tracking
CREATE TABLE broadcast_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable RLS on both tables (public access for now)
ALTER TABLE broadcasts DISABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_recipients DISABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX idx_broadcasts_school_id ON broadcasts(school_id);
CREATE INDEX idx_broadcasts_created_at ON broadcasts(created_at DESC);
CREATE INDEX idx_broadcast_recipients_broadcast_id ON broadcast_recipients(broadcast_id);
CREATE INDEX idx_broadcast_recipients_user_id ON broadcast_recipients(user_id);
CREATE INDEX idx_broadcast_recipients_is_read ON broadcast_recipients(is_read);

-- Grant permissions to authenticated users
GRANT SELECT, INSERT ON broadcasts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON broadcast_recipients TO authenticated;

-- Grant permissions to anon (if needed)
GRANT SELECT, INSERT ON broadcasts TO anon;
GRANT SELECT, INSERT, UPDATE ON broadcast_recipients TO anon;

COMMIT;
