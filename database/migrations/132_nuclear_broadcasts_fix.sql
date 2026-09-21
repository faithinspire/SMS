-- ============================================================================
-- Migration 132: NUCLEAR Broadcasts Fix - Complete Reset
-- ============================================================================
-- This is a COMPLETE reset of the broadcasts system
-- Drops everything and rebuilds from scratch with correct schema
-- ============================================================================

-- STEP 1: Drop all old/broken tables
DROP TABLE IF EXISTS broadcast_notifications CASCADE;
DROP TABLE IF EXISTS broadcast_recipients CASCADE;
DROP TABLE IF EXISTS broadcasts CASCADE;

-- STEP 2: Create broadcasts table - MINIMAL, CORRECT schema
CREATE TABLE broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  broadcast_type VARCHAR(50) DEFAULT 'GENERAL',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 3: Create broadcast_recipients table - MINIMAL, CORRECT schema
CREATE TABLE broadcast_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(broadcast_id, user_id)
);

-- STEP 4: Create indexes
CREATE INDEX idx_broadcasts_school_id ON broadcasts(school_id);
CREATE INDEX idx_broadcasts_sender_id ON broadcasts(sender_id);
CREATE INDEX idx_broadcasts_created_at ON broadcasts(created_at DESC);
CREATE INDEX idx_broadcast_recipients_broadcast_id ON broadcast_recipients(broadcast_id);
CREATE INDEX idx_broadcast_recipients_user_id ON broadcast_recipients(user_id);

-- STEP 5: Verify schema
SELECT 'broadcasts table' as table_name, COUNT(*) as column_count 
FROM information_schema.columns 
WHERE table_name = 'broadcasts'
UNION ALL
SELECT 'broadcast_recipients' as table_name, COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'broadcast_recipients';
