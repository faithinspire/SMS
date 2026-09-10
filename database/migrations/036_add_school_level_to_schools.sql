-- Migration 036: Add School Level Support
-- This ensures schools, school admins, and accountants have school_level defined

-- Add school_level to schools table
ALTER TABLE schools ADD COLUMN IF NOT EXISTS school_level TEXT CHECK (school_level IN ('PRIMARY', 'SECONDARY')) DEFAULT 'SECONDARY';

-- Add school_level to school_admin table if it exists
CREATE TABLE IF NOT EXISTS school_admin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_level TEXT CHECK (school_level IN ('PRIMARY', 'SECONDARY')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, user_id)
);

-- Create index for school admin queries
CREATE INDEX IF NOT EXISTS idx_school_admin_school_id ON school_admin(school_id);
CREATE INDEX IF NOT EXISTS idx_school_admin_user_id ON school_admin(user_id);
CREATE INDEX IF NOT EXISTS idx_school_admin_school_level ON school_admin(school_level);

-- Enable RLS
ALTER TABLE school_admin ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to school_admin" ON school_admin;
CREATE POLICY "Allow all access to school_admin" ON school_admin FOR ALL USING (true);

-- Ensure accountants can belong to specific school levels
-- This is handled through the users table school_level column

-- Create a view for primary school users
CREATE OR REPLACE VIEW primary_school_users AS
SELECT u.*, s.name as school_name, s.id as school_id
FROM users u
JOIN schools s ON u.school_id = s.id
WHERE u.school_level = 'PRIMARY' OR s.school_level = 'PRIMARY';

-- Create a view for secondary school users
CREATE OR REPLACE VIEW secondary_school_users AS
SELECT u.*, s.name as school_name, s.id as school_id
FROM users u
JOIN schools s ON u.school_id = s.id
WHERE u.school_level = 'SECONDARY' OR s.school_level = 'SECONDARY';

-- Add function to get users by school level
CREATE OR REPLACE FUNCTION get_school_level_users(
  p_school_id UUID,
  p_level TEXT
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  school_level TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email, u.full_name, u.role, u.school_level
  FROM users u
  WHERE u.school_id = p_school_id
  AND (u.school_level = p_level OR p_level IS NULL);
END;
$$ LANGUAGE plpgsql;

-- Update school_level for users to match their school
UPDATE users u
SET school_level = s.school_level
FROM schools s
WHERE u.school_id = s.id
AND u.school_level IS NULL;
