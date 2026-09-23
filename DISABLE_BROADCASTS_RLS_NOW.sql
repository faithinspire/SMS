-- EXECUTE THIS IN SUPABASE SQL EDITOR RIGHT NOW
-- This completely disables RLS on broadcasts tables so broadcasts work

-- Disable RLS on broadcasts table
ALTER TABLE broadcasts DISABLE ROW LEVEL SECURITY;

-- Disable RLS on broadcast_recipients table
ALTER TABLE broadcast_recipients DISABLE ROW LEVEL SECURITY;

-- Verify it worked
SELECT 
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename IN ('broadcasts', 'broadcast_recipients')
ORDER BY tablename;

-- Expected output:
-- broadcast_recipients | f
-- broadcasts           | f
-- (f = FALSE = RLS DISABLED = broadcasts will work)
