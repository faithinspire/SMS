-- ============================================================================
-- Migration 134: Fix Broadcast Role Matching
-- ============================================================================
-- ISSUE: Stored procedure send_broadcast_to_staff() was filtering by wrong role names
-- - Used 'HEADTEACHER' instead of 'HEAD_TEACHER'
-- - Missed 'STAFF' role
-- - Principal broadcasts sent to staff but role mismatch excluded recipients
--
-- FIX: Recreate stored procedure with correct role matching
-- ============================================================================

CREATE OR REPLACE FUNCTION send_broadcast_to_staff(
  p_school_id UUID,
  p_sender_id UUID,
  p_message TEXT,
  p_broadcast_type VARCHAR DEFAULT 'GENERAL'
)
RETURNS TABLE(broadcast_id UUID, recipients_count INT) AS $$
DECLARE
  v_broadcast_id UUID;
  v_count INT := 0;
BEGIN
  -- Create the broadcast record
  INSERT INTO broadcasts (school_id, sender_id, message, broadcast_type)
  VALUES (p_school_id, p_sender_id, p_message, p_broadcast_type)
  RETURNING id INTO v_broadcast_id;

  -- Send to all staff in the school - CORRECTED ROLE NAMES
  -- Role values in users table: SUPER_ADMIN | SCHOOL_ADMIN | PRINCIPAL | HEAD_TEACHER | TEACHER | ACCOUNTANT | STAFF | STUDENT
  INSERT INTO broadcast_recipients (broadcast_id, user_id)
  SELECT v_broadcast_id, u.id
  FROM users u
  WHERE u.school_id = p_school_id
    AND u.role IN ('TEACHER', 'PRINCIPAL', 'HEAD_TEACHER', 'ACCOUNTANT', 'SCHOOL_ADMIN', 'STAFF')
    AND u.id != p_sender_id  -- Don't send to self
  ON CONFLICT (broadcast_id, user_id) DO NOTHING;

  -- Get count of recipients
  SELECT COUNT(*) INTO v_count FROM broadcast_recipients WHERE broadcast_id = v_broadcast_id;

  RAISE NOTICE 'Broadcast % sent to % staff members', v_broadcast_id, v_count;

  -- Return both broadcast_id and recipient count
  RETURN QUERY SELECT v_broadcast_id, v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Verify the function was created successfully
-- ============================================================================
SELECT 'send_broadcast_to_staff function updated' as status;
