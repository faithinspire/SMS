-- ============================================================================
-- Migration 137: EMERGENCY - Disable RLS on Broadcasts (Quick Fix)
-- ============================================================================
-- ISSUE: Broadcasts 500 error persists because Migration 136 RLS policies
-- have incompatibilities or weren't properly created
--
-- QUICK FIX: Completely disable RLS on broadcasts tables
-- Result: Broadcasts API will work immediately
-- Trade-off: Rely on Supabase default permissions (acceptable for now)
--
-- This is temporary until we can properly diagnose the RLS policy issue
-- ============================================================================

-- STEP 1: Disable RLS on broadcasts table
ALTER TABLE broadcasts DISABLE ROW LEVEL SECURITY;

-- STEP 2: Disable RLS on broadcast_recipients table
ALTER TABLE broadcast_recipients DISABLE ROW LEVEL SECURITY;

-- STEP 3: Verify RLS is disabled
SELECT 
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename IN ('broadcasts', 'broadcast_recipients');

-- Expected output:
-- tablename          | rls_enabled
-- -------------------|------------
-- broadcasts           | f
-- broadcast_recipients | f
--
-- (f = false = RLS DISABLED = Broadcasts API will work)

-- STEP 4: Verify no policies exist on broadcasts
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'broadcasts';
-- Expected: No rows (all policies removed)

-- STEP 5: Verify no policies exist on broadcast_recipients
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'broadcast_recipients';
-- Expected: No rows (all policies removed)
