-- Migration 113: Disable RLS on academic_sessions and academic_terms
-- PURPOSE: Fix dropdowns not showing - RLS policies were blocking queries
-- Even though data exists in database, RLS prevents API from returning it

BEGIN;

-- ============================================================================
-- DISABLE RLS ON academic_sessions TABLE
-- ============================================================================

-- First, disable RLS on the table
ALTER TABLE academic_sessions DISABLE ROW LEVEL SECURITY;

-- Drop all existing RLS policies on academic_sessions if any
DROP POLICY IF EXISTS "Enable read for all authenticated users" ON academic_sessions;
DROP POLICY IF EXISTS "Enable read for school members" ON academic_sessions;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON academic_sessions;
DROP POLICY IF EXISTS "Allow all" ON academic_sessions;

-- ============================================================================
-- DISABLE RLS ON academic_terms TABLE
-- ============================================================================

-- Disable RLS on the table
ALTER TABLE academic_terms DISABLE ROW LEVEL SECURITY;

-- Drop all existing RLS policies on academic_terms if any
DROP POLICY IF EXISTS "Enable read for all authenticated users" ON academic_terms;
DROP POLICY IF EXISTS "Enable read for school members" ON academic_terms;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON academic_terms;
DROP POLICY IF EXISTS "Allow all" ON academic_terms;

-- ============================================================================
-- VERIFY RLS IS DISABLED
-- ============================================================================

-- Query to verify RLS status (for documentation)
-- SELECT relname, relrowsecurity 
-- FROM pg_class 
-- WHERE relname IN ('academic_sessions', 'academic_terms');
-- Expected: relrowsecurity = false for both

COMMIT;
