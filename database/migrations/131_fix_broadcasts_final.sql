-- ============================================================================
-- Migration 131: Fix Broadcasts Final - Restore Proper Schema
-- ============================================================================
-- PROBLEM:
-- Migration 081 dropped broadcast_recipients with UUID FKs
-- Migration 127 attempted partial fix but left schema broken
-- API tries to use broadcast_recipients but table may not exist or have wrong schema
--
-- SOLUTION:
-- 1. Ensure broadcasts table has correct UUID schema
-- 2. Ensure broadcast_recipients table exists with proper FK constraints
-- 3. Verify no duplicate tables exist
-- ============================================================================

-- Drop old/wrong tables if they exist
DROP TABLE IF EXISTS broadcast_notifications CASCADE;

-- Ensure broadcasts table exists with correct schema
CREATE TABLE IF NOT EXISTS broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  broadcast_type VARCHAR(50) DEFAULT 'GENERAL',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_broadcasts_schools FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
);

-- Ensure broadcast_recipients table exists with correct schema
CREATE TABLE IF NOT EXISTS broadcast_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID NOT NULL,
  user_id UUID NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_broadcast_recipients_broadcasts FOREIGN KEY (broadcast_id) REFERENCES broadcasts(id) ON DELETE CASCADE,
  CONSTRAINT fk_broadcast_recipients_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT uq_broadcast_recipient UNIQUE(broadcast_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_broadcasts_school_id ON broadcasts(school_id);
CREATE INDEX IF NOT EXISTS idx_broadcasts_sender_id ON broadcasts(sender_id);
CREATE INDEX IF NOT EXISTS idx_broadcasts_created_at ON broadcasts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_broadcast_id ON broadcast_recipients(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_user_id ON broadcast_recipients(user_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_is_read ON broadcast_recipients(is_read);

-- Add comments
COMMENT ON TABLE broadcasts IS 'Stores broadcast messages sent by school admins/principals to staff';
COMMENT ON TABLE broadcast_recipients IS 'Tracks which users have received which broadcasts and whether they have read them';

-- Verify tables exist
SELECT 
  'broadcasts' as table_name,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'broadcasts')::TEXT as exists
UNION ALL
SELECT 
  'broadcast_recipients' as table_name,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'broadcast_recipients')::TEXT as exists;
