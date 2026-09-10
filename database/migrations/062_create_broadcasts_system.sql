-- ============================================================================
-- MIGRATION 062: Create Broadcasts System for Admin/Principal to Staff/Teachers
-- ============================================================================
-- 
-- PROBLEM: Need a system for principal/admin to send announcements/broadcasts
-- to teachers and staff across the school
--
-- SOLUTION: Create broadcasts table and broadcast_recipients table for
-- tracking which staff/teachers received which broadcasts
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE broadcasts TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  broadcast_type VARCHAR(50) NOT NULL DEFAULT 'GENERAL', -- GENERAL, URGENT, HOLIDAY, etc
  recipient_type VARCHAR(50) NOT NULL DEFAULT 'STAFF', -- STAFF, TEACHERS, ALL_STAFF, CLASS_SPECIFIC
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_archived BOOLEAN DEFAULT false
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS broadcasts_school_id_idx ON broadcasts(school_id);
CREATE INDEX IF NOT EXISTS broadcasts_created_by_idx ON broadcasts(created_by);
CREATE INDEX IF NOT EXISTS broadcasts_created_at_idx ON broadcasts(created_at DESC);
CREATE INDEX IF NOT EXISTS broadcasts_school_created_at_idx ON broadcasts(school_id, created_at DESC);

-- ============================================================================
-- STEP 2: CREATE broadcast_recipients TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS broadcast_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for recipient queries
CREATE INDEX IF NOT EXISTS broadcast_recipients_broadcast_id_idx ON broadcast_recipients(broadcast_id);
CREATE INDEX IF NOT EXISTS broadcast_recipients_user_id_idx ON broadcast_recipients(user_id);
CREATE INDEX IF NOT EXISTS broadcast_recipients_user_broadcast_idx ON broadcast_recipients(user_id, broadcast_id);
CREATE INDEX IF NOT EXISTS broadcast_recipients_is_read_idx ON broadcast_recipients(is_read);

-- ============================================================================
-- STEP 3: ENABLE RLS AND CREATE POLICIES
-- ============================================================================

-- Enable RLS on broadcasts table
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;

-- Allow users to view broadcasts for their school
CREATE POLICY "broadcasts_view_school_broadcasts"
ON broadcasts FOR SELECT
TO authenticated
USING (school_id IN (SELECT school_id FROM users WHERE id = auth.uid()));

-- Allow school admin/principal to create broadcasts
CREATE POLICY "broadcasts_create_admin_principal"
ON broadcasts FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND school_id = broadcasts.school_id
    AND role IN ('SCHOOL_ADMIN', 'PRINCIPAL', 'HEAD_TEACHER')
  )
);

-- Allow admin/principal to update their broadcasts
CREATE POLICY "broadcasts_update_admin_principal"
ON broadcasts FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND school_id = broadcasts.school_id
    AND role IN ('SCHOOL_ADMIN', 'PRINCIPAL', 'HEAD_TEACHER')
  )
)
WITH CHECK (
  created_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND school_id = broadcasts.school_id
    AND role IN ('SCHOOL_ADMIN', 'PRINCIPAL', 'HEAD_TEACHER')
  )
);

-- Enable RLS on broadcast_recipients table
ALTER TABLE broadcast_recipients ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own recipient records
CREATE POLICY "recipients_view_own_broadcasts"
ON broadcast_recipients FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM broadcasts b
    WHERE b.id = broadcast_recipients.broadcast_id
    AND b.created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('SCHOOL_ADMIN', 'PRINCIPAL', 'HEAD_TEACHER')
    )
  )
);

-- Allow users to update read status of their broadcasts
CREATE POLICY "recipients_update_own_read_status"
ON broadcast_recipients FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Allow admins/principals to create recipient records
CREATE POLICY "recipients_create_admin_principal"
ON broadcast_recipients FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM broadcasts b
    WHERE b.id = broadcast_recipients.broadcast_id
    AND b.created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('SCHOOL_ADMIN', 'PRINCIPAL', 'HEAD_TEACHER')
    )
  )
);

-- ============================================================================
-- STEP 4: CREATE HELPER FUNCTION TO SEND BROADCASTS
-- ============================================================================

CREATE OR REPLACE FUNCTION send_broadcast_to_staff(
  p_school_id UUID,
  p_sender_id UUID,
  p_title VARCHAR,
  p_message TEXT,
  p_recipient_type VARCHAR DEFAULT 'STAFF',
  p_broadcast_type VARCHAR DEFAULT 'GENERAL'
)
RETURNS UUID AS $$
DECLARE
  v_broadcast_id UUID;
  v_recipient RECORD;
BEGIN
  -- Create the broadcast
  INSERT INTO broadcasts (
    school_id,
    created_by,
    title,
    message,
    broadcast_type,
    recipient_type
  ) VALUES (
    p_school_id,
    p_sender_id,
    p_title,
    p_message,
    p_broadcast_type,
    p_recipient_type
  )
  RETURNING id INTO v_broadcast_id;

  -- Add recipients based on type
  IF p_recipient_type = 'ALL_STAFF' THEN
    -- Add all staff and teachers
    INSERT INTO broadcast_recipients (broadcast_id, user_id)
    SELECT v_broadcast_id, id FROM users
    WHERE school_id = p_school_id
    AND role IN ('TEACHER', 'STAFF', 'HEAD_TEACHER', 'PRINCIPAL', 'ACCOUNTANT')
    AND id != p_sender_id;
    
  ELSIF p_recipient_type = 'TEACHERS' THEN
    -- Add only teachers
    INSERT INTO broadcast_recipients (broadcast_id, user_id)
    SELECT v_broadcast_id, id FROM users
    WHERE school_id = p_school_id
    AND role IN ('TEACHER', 'HEAD_TEACHER', 'PRINCIPAL')
    AND id != p_sender_id;
    
  ELSIF p_recipient_type = 'STAFF' THEN
    -- Add only non-teaching staff
    INSERT INTO broadcast_recipients (broadcast_id, user_id)
    SELECT v_broadcast_id, id FROM users
    WHERE school_id = p_school_id
    AND role IN ('STAFF', 'ACCOUNTANT')
    AND id != p_sender_id;
  END IF;

  RETURN v_broadcast_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RESULT AFTER THIS MIGRATION:
-- ============================================================================
-- ✅ broadcasts table: Stores broadcast messages from admin/principal
-- ✅ broadcast_recipients table: Tracks which staff/teachers received broadcasts
-- ✅ RLS policies: Only admins/principals can create, staff can view their own
-- ✅ Helper function: send_broadcast_to_staff() simplifies sending broadcasts
-- ============================================================================
