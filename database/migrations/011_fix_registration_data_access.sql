-- Fix RLS for registration data access
-- Allow anyone authenticated to read classes, arms, and subjects for registration

-- Disable RLS on class_arm_combos
ALTER TABLE class_arm_combos DISABLE ROW LEVEL SECURITY;

-- Disable RLS on classes
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;

-- Disable RLS on arms
ALTER TABLE arms DISABLE ROW LEVEL SECURITY;

-- Disable RLS on subjects
ALTER TABLE subjects DISABLE ROW LEVEL SECURITY;

-- Add public read policy for classes
CREATE POLICY "Allow read on classes" ON classes
  FOR SELECT USING (true);

-- Add public read policy for arms
CREATE POLICY "Allow read on arms" ON arms
  FOR SELECT USING (true);

-- Add public read policy for class_arm_combos
CREATE POLICY "Allow read on class_arm_combos" ON class_arm_combos
  FOR SELECT USING (true);

-- Add public read policy for subjects
CREATE POLICY "Allow read on subjects" ON subjects
  FOR SELECT USING (true);
