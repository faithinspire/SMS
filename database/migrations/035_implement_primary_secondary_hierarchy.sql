-- Migration 035: Implement Primary/Secondary School Hierarchy
-- This creates the role hierarchy structure where:
-- - Primary school teachers report to HEAD_TEACHER
-- - Secondary school teachers report to PRINCIPAL
-- - Primary school has PREP, NURSERY, KG, PRIMARY 1-6 levels
-- - Secondary school has JSS 1-3, SSS 1-3 levels

-- Add school_level to classes table if not present
ALTER TABLE classes ADD COLUMN IF NOT EXISTS school_level TEXT CHECK (school_level IN ('PRIMARY', 'SECONDARY')) DEFAULT 'SECONDARY';

-- Update classes to mark their level based on name patterns
UPDATE classes 
SET school_level = 'PRIMARY' 
WHERE school_level IS NULL AND (
  name ILIKE '%PREP%' OR 
  name ILIKE '%NURSERY%' OR 
  name ILIKE '%KG%' OR 
  name ILIKE '%Primary%' OR
  name ILIKE '%Nursery%'
);

-- Add reporting_to column to users table to explicitly define role hierarchy
ALTER TABLE users ADD COLUMN IF NOT EXISTS reporting_to UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create migration function to link primary teachers to head teacher
CREATE OR REPLACE FUNCTION link_primary_teachers_to_headteacher()
RETURNS void AS $$
BEGIN
  -- For each primary school, find the head teacher and link all primary teachers to them
  UPDATE users u1
  SET reporting_to = (
    SELECT id FROM users u2
    WHERE u2.school_id = u1.school_id
    AND u2.role = 'HEAD_TEACHER'
    AND u2.school_level = 'PRIMARY'
    LIMIT 1
  )
  WHERE u1.school_id IN (
    SELECT DISTINCT school_id FROM schools WHERE school_level = 'PRIMARY'
  )
  AND u1.role = 'TEACHER'
  AND u1.school_level = 'PRIMARY';

  -- For secondary schools, link secondary teachers to principal
  UPDATE users u1
  SET reporting_to = (
    SELECT id FROM users u2
    WHERE u2.school_id = u1.school_id
    AND u2.role = 'PRINCIPAL'
    AND u2.school_level = 'SECONDARY'
    LIMIT 1
  )
  WHERE u1.school_id IN (
    SELECT DISTINCT school_id FROM schools WHERE school_level = 'SECONDARY'
  )
  AND u1.role = 'TEACHER'
  AND u1.school_level = 'SECONDARY';
END;
$$ LANGUAGE plpgsql;

-- Execute the function to set up existing data
SELECT link_primary_teachers_to_headteacher();

-- Create index for role hierarchy queries
CREATE INDEX IF NOT EXISTS idx_users_reporting_to ON users(reporting_to);
CREATE INDEX IF NOT EXISTS idx_users_school_level ON users(school_level);

-- Add trigger to automatically set reporting_to for new teachers
CREATE OR REPLACE FUNCTION set_teacher_reporting_to()
RETURNS TRIGGER AS $$
BEGIN
  -- For primary school teachers
  IF NEW.school_level = 'PRIMARY' AND NEW.role = 'TEACHER' THEN
    NEW.reporting_to := (
      SELECT id FROM users
      WHERE school_id = NEW.school_id
      AND role = 'HEAD_TEACHER'
      AND school_level = 'PRIMARY'
      LIMIT 1
    );
  
  -- For secondary school teachers
  ELSIF NEW.school_level = 'SECONDARY' AND NEW.role = 'TEACHER' THEN
    NEW.reporting_to := (
      SELECT id FROM users
      WHERE school_id = NEW.school_id
      AND role = 'PRINCIPAL'
      AND school_level = 'SECONDARY'
      LIMIT 1
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_teacher_reporting_to ON users;
CREATE TRIGGER trg_set_teacher_reporting_to
BEFORE INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION set_teacher_reporting_to();

-- Ensure RLS allows these queries
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to users" ON users;
CREATE POLICY "Allow all access to users" ON users FOR ALL USING (true);
