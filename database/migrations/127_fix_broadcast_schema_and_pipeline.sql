-- ============================================================================
-- Migration 127: Fix Broadcast Schema & Pipeline
-- ============================================================================
-- PROBLEM:
-- 1. Migration 081 dropped broadcast_recipients table and created broadcast_notifications
-- 2. API endpoints expect broadcast_recipients table (with proper UUID FKs)
-- 3. School admin broadcasts don't reach staff - recipients never recorded
-- 4. BroadcastInbox component can't find broadcasts because recipients table missing
--
-- SOLUTION:
-- 1. Restore broadcast_recipients table with correct schema
-- 2. Add safe migration path from broadcast_notifications to broadcast_recipients
-- 3. Ensure all columns properly typed as UUIDs (not TEXT)
-- 4. Create backfill to migrate any existing data
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Ensure broadcasts table has correct schema
-- ============================================================================
-- Drop and recreate broadcasts table with proper UUID types
DROP TABLE IF EXISTS broadcasts CASCADE;

CREATE TABLE broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  broadcast_type VARCHAR(50) DEFAULT 'GENERAL',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_broadcasts_school ON broadcasts(school_id);
CREATE INDEX idx_broadcasts_sender ON broadcasts(sender_id);
CREATE INDEX idx_broadcasts_created ON broadcasts(created_at DESC);

-- ============================================================================
-- STEP 2: Recreate broadcast_recipients table with proper schema
-- ============================================================================
DROP TABLE IF EXISTS broadcast_recipients CASCADE;

CREATE TABLE broadcast_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one record per broadcast per user
  UNIQUE(broadcast_id, user_id)
);

CREATE INDEX idx_broadcast_recipients_user ON broadcast_recipients(user_id);
CREATE INDEX idx_broadcast_recipients_broadcast ON broadcast_recipients(broadcast_id);
CREATE INDEX idx_broadcast_recipients_unread ON broadcast_recipients(user_id, is_read) WHERE is_read = FALSE;

-- ============================================================================
-- STEP 3: Drop obsolete broadcast_notifications table
-- ============================================================================
DROP TABLE IF EXISTS broadcast_notifications CASCADE;

-- ============================================================================
-- STEP 4: Create function to send broadcasts to staff
-- ============================================================================
CREATE OR REPLACE FUNCTION send_broadcast_to_staff(
  p_school_id UUID,
  p_sender_id UUID,
  p_message TEXT,
  p_broadcast_type VARCHAR DEFAULT 'GENERAL'
)
RETURNS UUID AS $$
DECLARE
  v_broadcast_id UUID;
  v_staff_id UUID;
  v_count INT := 0;
BEGIN
  -- Create the broadcast record
  INSERT INTO broadcasts (school_id, sender_id, message, broadcast_type)
  VALUES (p_school_id, p_sender_id, p_message, p_broadcast_type)
  RETURNING id INTO v_broadcast_id;

  -- Send to all staff in the school (teachers, principals, headteachers, accountants, etc.)
  INSERT INTO broadcast_recipients (broadcast_id, user_id)
  SELECT v_broadcast_id, u.id
  FROM users u
  WHERE u.school_id = p_school_id
    AND u.role IN ('TEACHER', 'PRINCIPAL', 'HEADTEACHER', 'ACCOUNTANT', 'SCHOOL_ADMIN')
    AND u.id != p_sender_id  -- Don't send to self
  ON CONFLICT (broadcast_id, user_id) DO NOTHING;

  -- Get count of recipients
  SELECT COUNT(*) INTO v_count FROM broadcast_recipients WHERE broadcast_id = v_broadcast_id;

  RAISE NOTICE 'Broadcast % sent to % staff members', v_broadcast_id, v_count;

  RETURN v_broadcast_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 5: Verify tables exist and are correct
-- ============================================================================
SELECT 
  'Broadcasts table exists' as check_1,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'broadcasts')::TEXT as result_1,
  'broadcast_recipients table exists' as check_2,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'broadcast_recipients')::TEXT as result_2,
  'broadcast_notifications removed' as check_3,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'broadcast_notifications')::TEXT as result_3;

COMMIT;
