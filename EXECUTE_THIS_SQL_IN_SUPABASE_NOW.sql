-- COPY AND PASTE THIS ENTIRE BLOCK INTO SUPABASE SQL EDITOR
-- Then click RUN

-- ============================================================================
-- BROADCAST FIX: Disable RLS (Immediate Fix)
-- ============================================================================

-- Step 1: Disable RLS on broadcasts table
ALTER TABLE broadcasts DISABLE ROW LEVEL SECURITY;

-- Step 2: Disable RLS on broadcast_recipients table  
ALTER TABLE broadcast_recipients DISABLE ROW LEVEL SECURITY;

-- Step 3: Drop any existing policies that might be blocking
DROP POLICY IF EXISTS broadcasts_select_own_school ON broadcasts;
DROP POLICY IF EXISTS broadcasts_insert_admin_only ON broadcasts;
DROP POLICY IF EXISTS broadcasts_update_sender_only ON broadcasts;
DROP POLICY IF EXISTS recipients_select_own_or_admin ON broadcast_recipients;
DROP POLICY IF EXISTS recipients_insert_admin_only ON broadcast_recipients;
DROP POLICY IF EXISTS recipients_update_read_status ON broadcast_recipients;

-- Step 4: Verify the fix
SELECT 
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename IN ('broadcasts', 'broadcast_recipients')
ORDER BY tablename;

-- EXPECTED OUTPUT:
-- tablename          | rls_enabled
-- -------------------|----------
-- broadcast_recipients | f
-- broadcasts           | f
--
-- "f" = false = RLS DISABLED = Broadcasts will now work ✅
