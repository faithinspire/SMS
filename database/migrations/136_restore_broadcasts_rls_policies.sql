-- ============================================================================
-- Migration 136: Restore RLS Policies for Broadcasts System
-- ============================================================================
-- ISSUE: Migrations 127-132 rebuilt broadcasts tables but NEVER re-enabled RLS
-- This caused INSERT/UPDATE/SELECT to fail with 500 errors (permission denied)
--
-- ROOT CAUSE:
-- - Migration 132 dropped and recreated broadcasts/broadcast_recipients tables
-- - Did NOT include any ENABLE ROW LEVEL SECURITY statements
-- - Did NOT restore the RLS policies from Migration 062
-- - Result: Tables have RLS disabled with no fallback permissions
-- - Supabase defaults to DENY when RLS is off and no role permissions exist
--
-- FIX:
-- 1. Enable RLS on broadcasts table
-- 2. Enable RLS on broadcast_recipients table
-- 3. Create proper INSERT/SELECT/UPDATE policies for authenticated users
-- 4. Ensure school_id isolation is enforced
-- ============================================================================

-- STEP 1: Enable RLS on broadcasts table
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;

-- STEP 2: Create SELECT policy - users can view broadcasts from their school
CREATE POLICY "broadcasts_select_own_school"
  ON broadcasts FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM users WHERE id = auth.uid()
    )
  );

-- STEP 3: Create INSERT policy - only school admins/principals can send broadcasts
CREATE POLICY "broadcasts_insert_admin_only"
  ON broadcasts FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND school_id = broadcasts.school_id
        AND role IN ('SCHOOL_ADMIN', 'PRINCIPAL', 'HEAD_TEACHER')
    )
  );

-- STEP 4: Create UPDATE policy - only sender can update their broadcast
CREATE POLICY "broadcasts_update_sender_only"
  ON broadcasts FOR UPDATE
  TO authenticated
  USING (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND school_id = broadcasts.school_id
        AND role IN ('SCHOOL_ADMIN', 'PRINCIPAL', 'HEAD_TEACHER')
    )
  )
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND school_id = broadcasts.school_id
        AND role IN ('SCHOOL_ADMIN', 'PRINCIPAL', 'HEAD_TEACHER')
    )
  );

-- STEP 5: Enable RLS on broadcast_recipients table
ALTER TABLE broadcast_recipients ENABLE ROW LEVEL SECURITY;

-- STEP 6: Create SELECT policy - users can view their own recipient records
-- OR admins can view all recipients for broadcasts they sent
CREATE POLICY "recipients_select_own_or_admin"
  ON broadcast_recipients FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM broadcasts b
      WHERE b.id = broadcast_recipients.broadcast_id
        AND b.sender_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM users
          WHERE id = auth.uid()
            AND role IN ('SCHOOL_ADMIN', 'PRINCIPAL', 'HEAD_TEACHER')
        )
    )
  );

-- STEP 7: Create INSERT policy - only admins creating broadcasts can add recipients
CREATE POLICY "recipients_insert_admin_only"
  ON broadcast_recipients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM broadcasts b
      WHERE b.id = broadcast_recipients.broadcast_id
        AND b.sender_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM users
          WHERE id = auth.uid()
            AND role IN ('SCHOOL_ADMIN', 'PRINCIPAL', 'HEAD_TEACHER')
        )
    )
  );

-- STEP 8: Create UPDATE policy - only users can mark their own broadcasts as read
CREATE POLICY "recipients_update_read_status"
  ON broadcast_recipients FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- STEP 9: Verify RLS is enabled
SELECT 
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename IN ('broadcasts', 'broadcast_recipients');

-- STEP 10: List all policies created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual AS using_condition
FROM pg_policies
WHERE tablename IN ('broadcasts', 'broadcast_recipients')
ORDER BY tablename, policyname;
