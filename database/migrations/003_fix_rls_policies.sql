-- Fix RLS Policies for SuperAdmin Operations
-- SIMPLIFIED: Avoid recursive calls and stack overflow
-- Using Service Role API for sensitive operations instead of RLS

-- ============================================================================
-- IMPORTANT: RLS POLICIES ARE NOW SIMPLIFIED
-- Service operations (register, update, delete schools) use the API endpoints
-- which use SUPABASE_SERVICE_KEY to bypass RLS entirely
-- ============================================================================

-- ============================================================================
-- 1. DISABLE RLS ON SCHOOLS TABLE (Service Key will handle access)
-- ============================================================================

-- Disable RLS on schools to allow API operations
ALTER TABLE schools DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. ALLOW PUBLIC READ ACCESS TO SCHOOLS
-- ============================================================================

-- Allow anyone to read schools (for landing page, login pages)
-- This is safe since we don't expose sensitive data
GRANT SELECT ON schools TO authenticated, anon;

-- ============================================================================
-- 3. SIMPLE RLS FOR USERS TABLE (Multi-tenancy)
-- ============================================================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow users to read from their school or read themselves
CREATE POLICY users_select_own_school ON users
  FOR SELECT
  USING (
    -- Users can see themselves
    auth.uid() = id OR
    -- Users can see others from their school
    school_id = (SELECT school_id FROM users WHERE id = auth.uid() LIMIT 1)
  );

-- Allow authenticated users to update their own record
CREATE POLICY users_update_own ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- 4. SIMPLE RLS FOR MULTI-TENANT TABLES
-- ============================================================================

-- Students: Can only see students from their school
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
CREATE POLICY students_school_scope ON students
  FOR SELECT
  USING (school_id = (SELECT school_id FROM users WHERE id = auth.uid() LIMIT 1));

-- Classes: Can only see classes from their school
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY classes_school_scope ON classes
  FOR SELECT
  USING (school_id = (SELECT school_id FROM users WHERE id = auth.uid() LIMIT 1));

-- Subjects: Can only see subjects from their school
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY subjects_school_scope ON subjects
  FOR SELECT
  USING (school_id = (SELECT school_id FROM users WHERE id = auth.uid() LIMIT 1));

-- Staff: Can only see staff from their school
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_school_scope ON staff
  FOR SELECT
  USING (school_id = (SELECT school_id FROM users WHERE id = auth.uid() LIMIT 1));

-- Terms: Can only see terms from their school
ALTER TABLE terms ENABLE ROW LEVEL SECURITY;
CREATE POLICY terms_school_scope ON terms
  FOR SELECT
  USING (school_id = (SELECT school_id FROM users WHERE id = auth.uid() LIMIT 1));

-- ============================================================================
-- 5. GRANT PERMISSIONS
-- ============================================================================

GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT ON schools TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;
GRANT SELECT ON classes, subjects, staff, students, terms TO authenticated;

-- ============================================================================
-- NOTES FOR IMPLEMENTATION
-- ============================================================================
/*
IMPORTANT: These RLS policies assume:
1. The JWT token contains 'role' = 'SUPER_ADMIN' for super admins
2. The JWT token contains 'school_id' for regular users
3. The current_user_school_id() function can access these JWT values

If using Supabase Auth:
- When registering SuperAdmin, set user metadata: { role: 'SUPER_ADMIN' }
- When registering school users, set metadata: { role: 'ADMIN', school_id: 'uuid' }

If the is_super_admin() function doesn't work:
- Check that auth.jwt() contains the role field
- Verify user metadata is being set during registration
- May need to use: (auth.jwt() ->> 'app_metadata' ->> 'role') instead
*/
